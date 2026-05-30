use serde_json::Value;
use super::{ToolKeys, ToolResult, download_image};

pub async fn execute(tool_use_id: &str, input: &Value, keys: &ToolKeys) -> ToolResult {
    let api_key = match &keys.bfl {
        Some(k) if !k.is_empty() => k.clone(),
        _ => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Clé API Flux (BFL) manquante. Configure-la dans les Paramètres → Connecteurs.".to_string(),
            is_error: true,
            metadata: None,
        },
    };

    let prompt = input["prompt"].as_str().unwrap_or("A professional image");
    let client = reqwest::Client::new();

    // 1. Soumettre la génération
    let body = serde_json::json!({
        "prompt": prompt,
        "width": 1024,
        "height": 1024
    });

    let response = match client
        .post("https://api.bfl.ml/v1/flux-pro-1.1")
        .header("X-Key", &api_key)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur réseau Flux : {}", e),
            is_error: true,
            metadata: None,
        },
    };

    if !response.status().is_success() {
        let text = response.text().await.unwrap_or_default();
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur Flux soumission : {}", text),
            is_error: true,
            metadata: None,
        };
    }

    let submission: Value = match response.json().await {
        Ok(j) => j,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur parsing Flux : {}", e),
            is_error: true,
            metadata: None,
        },
    };

    let polling_id = match submission["id"].as_str() {
        Some(id) => id.to_string(),
        None => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "ID de polling Flux absent".to_string(),
            is_error: true,
            metadata: None,
        },
    };

    // 2. Polling jusqu'à Ready (max 60s)
    let url = loop {
        tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;

        let poll_response = match client
            .get(&format!("https://api.bfl.ml/v1/get_result?id={}", polling_id))
            .header("X-Key", &api_key)
            .send()
            .await
        {
            Ok(r) => r,
            Err(e) => return ToolResult {
                tool_use_id: tool_use_id.to_string(),
                content: format!("Erreur polling Flux : {}", e),
                is_error: true,
                metadata: None,
            },
        };

        let poll: Value = match poll_response.json().await {
            Ok(j) => j,
            Err(e) => return ToolResult {
                tool_use_id: tool_use_id.to_string(),
                content: format!("Erreur parsing poll Flux : {}", e),
                is_error: true,
                metadata: None,
            },
        };

        match poll["status"].as_str() {
            Some("Ready") => {
                if let Some(url) = poll["result"]["sample"].as_str() {
                    break url.to_string();
                }
                return ToolResult {
                    tool_use_id: tool_use_id.to_string(),
                    content: "URL image Flux absente".to_string(),
                    is_error: true,
                    metadata: None,
                };
            }
            Some("Error") | Some("Failed") => {
                return ToolResult {
                    tool_use_id: tool_use_id.to_string(),
                    content: format!("Flux erreur génération : {:?}", poll["error"]),
                    is_error: true,
                    metadata: None,
                };
            }
            _ => continue, // Pending / Processing
        }
    };

    // 3. Télécharger et sauvegarder
    let timestamp = chrono::Utc::now().timestamp_millis();
    let filename = format!("flux-{}.png", timestamp);
    let local_path = download_image(&url, &filename).await
        .unwrap_or_else(|_| url.clone());

    ToolResult {
        tool_use_id: tool_use_id.to_string(),
        content: format!("Image Flux générée : {}", local_path),
        is_error: false,
        metadata: Some(serde_json::json!({
            "url": url,
            "local_path": local_path,
            "model": "flux-pro-1.1",
            "prompt": prompt,
            "cost_cents": 1
        })),
    }
}
