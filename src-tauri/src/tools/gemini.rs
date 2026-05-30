/// Google Gemini — génération d'images avec décodage base64
use serde_json::Value;
use super::{ToolKeys, ToolResult, visuals_dir};

pub async fn execute_image(tool_use_id: &str, input: &Value, keys: &ToolKeys) -> ToolResult {
    let api_key = match keys.extra.get("gemini") {
        Some(k) if !k.is_empty() => k.clone(),
        _ => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Clé API Google Gemini manquante. Configure-la dans le Pack Manager.".to_string(),
            is_error: true, metadata: None,
        },
    };

    let model = input["model"].as_str().unwrap_or("gemini-3.1-flash-image-preview");
    let prompt = input["prompt"].as_str().unwrap_or("A professional image");

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]}
    });

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );

    let response = match client.post(&url)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send().await
    {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur réseau Gemini : {}", e),
            is_error: true, metadata: None,
        },
    };

    if !response.status().is_success() {
        let text = response.text().await.unwrap_or_default();
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur Gemini : {}", text),
            is_error: true, metadata: None,
        };
    }

    let result: Value = match response.json().await {
        Ok(j) => j,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur parsing Gemini : {}", e),
            is_error: true, metadata: None,
        },
    };

    // Chercher la partie inlineData (base64 image)
    let parts = result["candidates"][0]["content"]["parts"]
        .as_array()
        .cloned()
        .unwrap_or_default();

    for part in &parts {
        if let Some(inline_data) = part.get("inlineData") {
            let mime_type = inline_data["mimeType"].as_str().unwrap_or("image/png");
            let data_b64 = inline_data["data"].as_str().unwrap_or("");
            if !data_b64.is_empty() {
                // Décoder base64 → PNG
                let bytes = decode_base64(data_b64);
                let ext = if mime_type.contains("jpeg") { "jpg" } else { "png" };
                let timestamp = chrono::Utc::now().timestamp_millis();
                let filename = format!("gemini-{}.{}", timestamp, ext);
                let path = visuals_dir().join(&filename);
                if std::fs::write(&path, &bytes).is_ok() {
                    let local_path = path.to_string_lossy().to_string();
                    return ToolResult {
                        tool_use_id: tool_use_id.to_string(),
                        content: format!("Image Gemini générée : {}", local_path),
                        is_error: false,
                        metadata: Some(serde_json::json!({
                            "local_path": local_path,
                            "model": model,
                            "prompt": prompt,
                            "cost_cents": 0
                        })),
                    };
                }
            }
        }
    }

    // Si pas d'image, retourner le texte
    let text_content = parts.iter()
        .find_map(|p| p["text"].as_str())
        .unwrap_or("Aucune image générée")
        .to_string();

    ToolResult {
        tool_use_id: tool_use_id.to_string(),
        content: text_content,
        is_error: false,
        metadata: Some(serde_json::json!({ "model": model, "prompt": prompt })),
    }
}

fn decode_base64(s: &str) -> Vec<u8> {
    let table: &[u8; 128] = &{
        let mut t = [0u8; 128];
        for (i, c) in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".bytes().enumerate() {
            t[c as usize] = i as u8;
        }
        t
    };
    let s = s.trim_matches('=').as_bytes();
    let mut out = Vec::with_capacity(s.len() * 3 / 4);
    let mut i = 0;
    while i + 3 < s.len() {
        let b0 = table[s[i] as usize] as u32;
        let b1 = table[s[i+1] as usize] as u32;
        let b2 = table[s[i+2] as usize] as u32;
        let b3 = table[s[i+3] as usize] as u32;
        let triple = (b0 << 18) | (b1 << 12) | (b2 << 6) | b3;
        out.push((triple >> 16) as u8);
        out.push((triple >> 8) as u8);
        out.push(triple as u8);
        i += 4;
    }
    out
}
