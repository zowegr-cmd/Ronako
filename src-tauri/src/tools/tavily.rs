use serde_json::Value;
use super::{ToolKeys, ToolResult};

pub async fn execute(tool_use_id: &str, input: &Value, keys: &ToolKeys) -> ToolResult {
    let api_key = match &keys.tavily {
        Some(k) if !k.is_empty() => k.clone(),
        _ => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Clé API Tavily manquante. Configure-la dans les Paramètres → Connecteurs.".to_string(),
            is_error: true,
            metadata: None,
        },
    };

    let query = match input["query"].as_str() {
        Some(q) => q.to_string(),
        None => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Champ 'query' manquant".to_string(),
            is_error: true,
            metadata: None,
        },
    };
    let max_results = input["max_results"].as_u64().unwrap_or(5).to_string();

    let client = reqwest::Client::new();
    let mut body = std::collections::HashMap::new();
    body.insert("query", query.clone());
    body.insert("api_key", api_key);
    body.insert("search_depth", "advanced".to_string());
    body.insert("max_results", max_results);
    body.insert("include_answer", "true".to_string());

    let response = match client
        .post("https://api.tavily.com/search")
        .json(&body)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur réseau Tavily : {}", e),
            is_error: true,
            metadata: None,
        },
    };

    if !response.status().is_success() {
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur Tavily HTTP {}", response.status()),
            is_error: true,
            metadata: None,
        };
    }

    let result: Value = match response.json().await {
        Ok(j) => j,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur parsing Tavily : {}", e),
            is_error: true,
            metadata: None,
        },
    };

    // Formater les résultats pour Claude
    let answer = result["answer"].as_str().unwrap_or("").to_string();
    let results_text: Vec<String> = result["results"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .take(5)
        .filter_map(|r| {
            let title = r["title"].as_str()?;
            let url = r["url"].as_str()?;
            let snippet = r["content"].as_str().unwrap_or("");
            Some(format!("**{}**\n{}\n{}", title, url, &snippet[..snippet.len().min(300)]))
        })
        .collect();

    let content = if !answer.is_empty() {
        format!("Réponse synthèse : {}\n\nSources :\n{}", answer, results_text.join("\n\n---\n"))
    } else {
        results_text.join("\n\n---\n")
    };

    ToolResult {
        tool_use_id: tool_use_id.to_string(),
        content,
        is_error: false,
        metadata: Some(serde_json::json!({ "query": query, "results_count": results_text.len() })),
    }
}
