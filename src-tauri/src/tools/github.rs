use serde_json::Value;
use super::{ToolKeys, ToolResult};

/// Encodage base64 minimal sans dépendance externe
fn base64_encode(data: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        out.push(TABLE[(triple >> 18 & 0x3f) as usize] as char);
        out.push(TABLE[(triple >> 12 & 0x3f) as usize] as char);
        if chunk.len() > 1 { out.push(TABLE[(triple >> 6 & 0x3f) as usize] as char); } else { out.push('='); }
        if chunk.len() > 2 { out.push(TABLE[(triple & 0x3f) as usize] as char); } else { out.push('='); }
    }
    out
}

pub async fn execute(tool_use_id: &str, input: &Value, keys: &ToolKeys) -> ToolResult {
    let api_key = match &keys.github {
        Some(k) if !k.is_empty() => k.clone(),
        _ => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Clé API GitHub manquante. Configure-la dans les Paramètres → Connecteurs.".to_string(),
            is_error: true,
            metadata: None,
        },
    };

    let repo = match input["repo"].as_str() {
        Some(r) => r.to_string(),
        None => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Champ 'repo' manquant (format: owner/repo)".to_string(),
            is_error: true,
            metadata: None,
        },
    };
    let path = input["path"].as_str().unwrap_or("ronako-output.md");
    let content = input["content"].as_str().unwrap_or("");
    let message = input["message"].as_str().unwrap_or("chore: update from Ronako");

    let content_b64 = base64_encode(content.as_bytes());
    let client = reqwest::Client::new();
    let url = format!("https://api.github.com/repos/{}/contents/{}", repo, path);

    // Vérifier si le fichier existe déjà (pour obtenir son SHA)
    let existing = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("User-Agent", "Ronako/1.0")
        .send()
        .await
        .ok();

    let mut body = serde_json::json!({
        "message": message,
        "content": content_b64
    });

    if let Some(resp) = existing {
        if let Ok(j) = resp.json::<Value>().await {
            if let Some(sha) = j["sha"].as_str() {
                body["sha"] = Value::String(sha.to_string());
            }
        }
    }

    let response = match client
        .put(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("User-Agent", "Ronako/1.0")
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur réseau GitHub : {}", e),
            is_error: true,
            metadata: None,
        },
    };

    if !response.status().is_success() {
        let text = response.text().await.unwrap_or_default();
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur GitHub : {}", text),
            is_error: true,
            metadata: None,
        };
    }

    let result: Value = response.json().await.unwrap_or_default();
    let html_url = result["content"]["html_url"].as_str().unwrap_or("").to_string();
    let sha = result["commit"]["sha"].as_str().unwrap_or("").to_string();

    ToolResult {
        tool_use_id: tool_use_id.to_string(),
        content: format!("Fichier poussé sur GitHub : {}", html_url),
        is_error: false,
        metadata: Some(serde_json::json!({
            "html_url": html_url,
            "commit_sha": sha,
            "repo": repo,
            "path": path
        })),
    }
}
