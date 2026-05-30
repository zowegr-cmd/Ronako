use serde_json::Value;
use super::{ToolKeys, ToolResult};

pub async fn execute(tool_use_id: &str, input: &Value, keys: &ToolKeys) -> ToolResult {
    let api_key = match &keys.notion {
        Some(k) if !k.is_empty() => k.clone(),
        _ => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Clé API Notion manquante. Configure-la dans les Paramètres → Connecteurs.".to_string(),
            is_error: true,
            metadata: None,
        },
    };

    let title = input["title"].as_str().unwrap_or("Livrable Ronako");
    let content_md = input["content"].as_str().unwrap_or("");
    let database_id = input["database_id"].as_str();

    let client = reqwest::Client::new();

    // Construire le body Notion — page avec titre + contenu en blocs paragraphes
    let paragraphs: Vec<Value> = content_md
        .lines()
        .filter(|l| !l.is_empty())
        .take(100) // Notion a des limites sur les blocs
        .map(|line| serde_json::json!({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": line}}]
            }
        }))
        .collect();

    let mut page_body = serde_json::json!({
        "properties": {
            "title": {
                "title": [{"text": {"content": title}}]
            }
        },
        "children": paragraphs
    });

    // Parent : database si fourni, sinon page racine
    if let Some(db_id) = database_id {
        page_body["parent"] = serde_json::json!({"database_id": db_id});
    } else {
        page_body["parent"] = serde_json::json!({"type": "workspace", "workspace": true});
    }

    let response = match client
        .post("https://api.notion.com/v1/pages")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Notion-Version", "2022-06-28")
        .header("Content-Type", "application/json")
        .body(page_body.to_string())
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur réseau Notion : {}", e),
            is_error: true,
            metadata: None,
        },
    };

    if !response.status().is_success() {
        let text = response.text().await.unwrap_or_default();
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur Notion : {}", text),
            is_error: true,
            metadata: None,
        };
    }

    let result: Value = match response.json().await {
        Ok(j) => j,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur parsing Notion : {}", e),
            is_error: true,
            metadata: None,
        },
    };

    let page_url = result["url"].as_str().unwrap_or("").to_string();
    let page_id = result["id"].as_str().unwrap_or("").to_string();

    ToolResult {
        tool_use_id: tool_use_id.to_string(),
        content: format!("Page Notion créée : {}", page_url),
        is_error: false,
        metadata: Some(serde_json::json!({
            "page_url": page_url,
            "page_id": page_id,
            "title": title
        })),
    }
}
