/// Firecrawl — scraping web et recherche en Markdown propre
use serde_json::Value;
use super::{ToolKeys, ToolResult};

pub async fn scrape(tool_use_id: &str, input: &Value, keys: &ToolKeys) -> ToolResult {
    let api_key = match keys.extra.get("firecrawl") {
        Some(k) if !k.is_empty() => k.clone(),
        _ => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Clé API Firecrawl manquante. Configure-la dans le Pack Manager.".to_string(),
            is_error: true, metadata: None,
        },
    };

    let url = match input["url"].as_str() {
        Some(u) => u.to_string(),
        None => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Paramètre 'url' manquant".to_string(),
            is_error: true, metadata: None,
        },
    };

    let only_main = input["only_main_content"].as_bool().unwrap_or(true);

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "url": url,
        "formats": ["markdown"],
        "onlyMainContent": only_main
    });

    let response = match client
        .post("https://api.firecrawl.dev/v1/scrape")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send().await
    {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur réseau Firecrawl : {}", e),
            is_error: true, metadata: None,
        },
    };

    if !response.status().is_success() {
        let text = response.text().await.unwrap_or_default();
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur Firecrawl scrape : {}", text),
            is_error: true, metadata: None,
        };
    }

    let result: Value = response.json().await.unwrap_or_default();
    let markdown = result["data"]["markdown"].as_str()
        .or_else(|| result["markdown"].as_str())
        .unwrap_or("Contenu non disponible")
        .to_string();
    let title = result["data"]["metadata"]["title"].as_str().unwrap_or(&url).to_string();

    ToolResult {
        tool_use_id: tool_use_id.to_string(),
        content: format!("# {}\n\n{}", title, &markdown[..markdown.len().min(8000)]),
        is_error: false,
        metadata: Some(serde_json::json!({ "url": url, "title": title })),
    }
}

pub async fn search(tool_use_id: &str, input: &Value, keys: &ToolKeys) -> ToolResult {
    let api_key = match keys.extra.get("firecrawl") {
        Some(k) if !k.is_empty() => k.clone(),
        _ => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Clé API Firecrawl manquante.".to_string(),
            is_error: true, metadata: None,
        },
    };

    let query = match input["query"].as_str() {
        Some(q) => q.to_string(),
        None => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Paramètre 'query' manquant".to_string(),
            is_error: true, metadata: None,
        },
    };

    let limit = input["limit"].as_u64().unwrap_or(5);

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "query": query,
        "limit": limit,
        "scrapeOptions": { "formats": ["markdown"] }
    });

    let response = match client
        .post("https://api.firecrawl.dev/v1/search")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send().await
    {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur Firecrawl search : {}", e),
            is_error: true, metadata: None,
        },
    };

    if !response.status().is_success() {
        let text = response.text().await.unwrap_or_default();
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur Firecrawl : {}", text),
            is_error: true, metadata: None,
        };
    }

    let result: Value = response.json().await.unwrap_or_default();
    let data = result["data"].as_array().cloned().unwrap_or_default();

    let formatted: Vec<String> = data.iter().map(|item| {
        let url = item["url"].as_str().unwrap_or("");
        let title = item["metadata"]["title"].as_str().unwrap_or(url);
        let md = item["markdown"].as_str().unwrap_or("");
        format!("**{}**\n{}\n{}", title, url, &md[..md.len().min(500)])
    }).collect();

    ToolResult {
        tool_use_id: tool_use_id.to_string(),
        content: format!("Résultats Firecrawl pour \"{}\" :\n\n{}", query, formatted.join("\n\n---\n\n")),
        is_error: false,
        metadata: Some(serde_json::json!({ "query": query, "count": data.len() })),
    }
}
