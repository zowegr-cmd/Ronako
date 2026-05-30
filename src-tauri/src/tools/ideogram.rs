/// Ideogram — génération d'images avec texte parfait
use serde_json::Value;
use super::{ToolKeys, ToolResult, download_image};

pub async fn execute(tool_use_id: &str, input: &Value, keys: &ToolKeys) -> ToolResult {
    let api_key = match keys.extra.get("ideogram") {
        Some(k) if !k.is_empty() => k.clone(),
        _ => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Clé API Ideogram manquante. Configure-la dans le Pack Manager.".to_string(),
            is_error: true, metadata: None,
        },
    };

    let prompt = input["prompt"].as_str().unwrap_or("A professional image");
    let aspect_ratio = input["aspect_ratio"].as_str().unwrap_or("ASPECT_1_1");
    let model = input["model"].as_str().unwrap_or("V_3");

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "image_request": {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "model": model,
            "magic_prompt_option": "AUTO"
        }
    });

    let response = match client
        .post("https://api.ideogram.ai/generate")
        .header("Api-Key", &api_key)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send().await
    {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur réseau Ideogram : {}", e),
            is_error: true, metadata: None,
        },
    };

    if !response.status().is_success() {
        let text = response.text().await.unwrap_or_default();
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur Ideogram : {}", text),
            is_error: true, metadata: None,
        };
    }

    let result: Value = response.json().await.unwrap_or_default();
    let image_url = result["data"][0]["url"].as_str().unwrap_or("").to_string();

    if image_url.is_empty() {
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Pas d'image dans la réponse Ideogram : {}", result),
            is_error: false, metadata: None,
        };
    }

    let timestamp = chrono::Utc::now().timestamp_millis();
    let filename = format!("ideogram-{}.png", timestamp);
    let local_path = download_image(&image_url, &filename).await.unwrap_or_else(|_| image_url.clone());

    ToolResult {
        tool_use_id: tool_use_id.to_string(),
        content: format!("Image Ideogram générée : {}", local_path),
        is_error: false,
        metadata: Some(serde_json::json!({
            "url": image_url,
            "local_path": local_path,
            "model": model,
            "prompt": prompt,
            "cost_cents": 4
        })),
    }
}
