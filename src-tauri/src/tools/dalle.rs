use serde_json::Value;
use super::{ToolKeys, ToolResult, download_image};

pub async fn execute(tool_use_id: &str, input: &Value, keys: &ToolKeys) -> ToolResult {
    let api_key = match &keys.openai {
        Some(k) if !k.is_empty() => k.clone(),
        _ => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Clé API OpenAI manquante. Configure-la dans les Paramètres → Connecteurs.".to_string(),
            is_error: true,
            metadata: None,
        },
    };

    let prompt = input["prompt"].as_str().unwrap_or("A professional image");
    let size = input["size"].as_str().unwrap_or("1024x1024");

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": "dall-e-3",
        "prompt": prompt,
        "n": 1,
        "size": size,
        "response_format": "url"
    });

    let response = match client
        .post("https://api.openai.com/v1/images/generations")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur réseau DALL-E : {}", e),
            is_error: true,
            metadata: None,
        },
    };

    if !response.status().is_success() {
        let text = response.text().await.unwrap_or_default();
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur DALL-E : {}", text),
            is_error: true,
            metadata: None,
        };
    }

    let json: Value = match response.json().await {
        Ok(j) => j,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur parsing DALL-E : {}", e),
            is_error: true,
            metadata: None,
        },
    };

    let url = match json["data"][0]["url"].as_str() {
        Some(u) => u.to_string(),
        None => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "URL image absente dans la réponse DALL-E".to_string(),
            is_error: true,
            metadata: None,
        },
    };

    // Télécharger et sauvegarder localement
    let timestamp = chrono::Utc::now().timestamp_millis();
    let filename = format!("dalle-{}.png", timestamp);
    let local_path = match download_image(&url, &filename).await {
        Ok(p) => p,
        Err(e) => {
            // Si le téléchargement échoue, retourner l'URL directement
            return ToolResult {
                tool_use_id: tool_use_id.to_string(),
                content: format!("Image générée (URL) : {}", url),
                is_error: false,
                metadata: Some(serde_json::json!({
                    "url": url,
                    "local_path": null,
                    "model": "dall-e-3",
                    "prompt": prompt,
                    "cost_cents": 4,
                    "error_download": e
                })),
            };
        }
    };

    ToolResult {
        tool_use_id: tool_use_id.to_string(),
        content: format!("Image DALL-E générée et sauvegardée : {}", local_path),
        is_error: false,
        metadata: Some(serde_json::json!({
            "url": url,
            "local_path": local_path,
            "model": "dall-e-3",
            "prompt": prompt,
            "cost_cents": 4
        })),
    }
}
