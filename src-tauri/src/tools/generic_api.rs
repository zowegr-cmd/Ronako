/// Exécution d'APIs génériques via HTTP.
/// Couvre toutes les APIs du catalogue qui n'ont pas d'implémentation Rust dédiée.
use serde_json::Value;
use super::{ToolKeys, ToolResult};

/// Registry des APIs : (id, base_url, auth_type)
/// auth_type : "bearer" | "apikey" | "header:{nom}" | "none"
static API_REGISTRY: &[(&str, &str, &str)] = &[
    ("airtable",    "https://api.airtable.com",           "bearer"),
    ("googlesheets","https://sheets.googleapis.com",       "bearer"),
    ("slack",       "https://slack.com/api",               "bearer"),
    ("linear",      "https://api.linear.app",              "bearer"),
    ("jira",        "https://api.atlassian.com",           "bearer"),
    ("gitlab",      "https://gitlab.com/api/v4",           "bearer"),
    ("vercel",      "https://api.vercel.com",              "bearer"),
    ("supabase",    "https://api.supabase.com",            "bearer"),
    ("sendgrid",    "https://api.sendgrid.com",            "bearer"),
    ("resend",      "https://api.resend.com",              "bearer"),
    ("mailchimp",   "https://us1.api.mailchimp.com/3.0",   "bearer"),
    ("twilio",      "https://api.twilio.com",              "basic"),
    ("stripe",      "https://api.stripe.com/v1",           "bearer"),
    ("hubspot",     "https://api.hubapi.com",              "bearer"),
    ("salesforce",  "https://login.salesforce.com",        "bearer"),
    ("pipedrive",   "https://api.pipedrive.com/v1",        "header:x-api-token"),
    ("replicate",   "https://api.replicate.com/v1",        "bearer"),
    ("elevenlabs",  "https://api.elevenlabs.io/v1",        "header:xi-api-key"),
    ("runway",      "https://api.runwayml.com/v1",         "bearer"),
    ("stability",   "https://api.stability.ai/v1",         "bearer"),
    ("brave",       "https://api.search.brave.com/res/v1", "header:x-subscription-token"),
    ("serper",      "https://google.serper.dev",           "header:x-api-key"),
    ("firecrawl",   "https://api.firecrawl.dev/v1",        "bearer"),
    ("apify",       "https://api.apify.com/v2",            "bearer"),
    ("screenshot",  "https://api.screenshotone.com",       "none"),
    ("ga4",         "https://analyticsdata.googleapis.com","bearer"),
    ("mixpanel",    "https://api.mixpanel.com",            "bearer"),
    ("plausible",   "https://plausible.io/api/v1",         "bearer"),
];

fn find_registry(api_id: &str) -> Option<(&'static str, &'static str, &'static str)> {
    API_REGISTRY.iter()
        .find(|(id, _, _)| *id == api_id)
        .map(|(id, base, auth)| (*id, *base, *auth))
}

pub async fn execute(
    tool_use_id: &str,
    api_id: &str,
    api_key: Option<String>,
    input: &Value,
) -> ToolResult {
    let (_, base_url, auth_type) = match find_registry(api_id) {
        Some(r) => r,
        None => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("API '{}' non trouvée dans le registre.", api_id),
            is_error: true,
            metadata: None,
        },
    };

    let api_key = match api_key {
        Some(k) if !k.is_empty() => k,
        _ => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Clé API manquante pour '{}'. Configure-la dans le Pack Manager.", api_id),
            is_error: true,
            metadata: None,
        },
    };

    // Construction de l'URL
    let endpoint = input["endpoint"].as_str().unwrap_or("/");
    let url = if endpoint.starts_with("http") {
        endpoint.to_string()
    } else {
        format!("{}{}", base_url.trim_end_matches('/'), endpoint)
    };

    let method = input["method"].as_str().unwrap_or("GET").to_uppercase();
    let body = input["body"].as_object().map(|b| serde_json::to_string(b).unwrap_or_default());

    // Headers d'authentification
    let mut headers: Vec<(String, String)> = vec![];
    match auth_type {
        "bearer"       => headers.push(("Authorization".into(), format!("Bearer {}", api_key))),
        "basic"        => {
            // Pour Twilio et autres : format "sid:token" encodé en base64
            let encoded = base64_basic(&api_key);
            headers.push(("Authorization".into(), format!("Basic {}", encoded)));
        }
        auth if auth.starts_with("header:") => {
            let header_name = &auth[7..];
            headers.push((header_name.to_string(), api_key.clone()));
        }
        _ => {} // none — pas d'auth
    }

    // Appel HTTP
    let client = reqwest::Client::new();
    let method_parsed = match method.as_str() {
        "GET"    => reqwest::Method::GET,
        "POST"   => reqwest::Method::POST,
        "PUT"    => reqwest::Method::PUT,
        "PATCH"  => reqwest::Method::PATCH,
        "DELETE" => reqwest::Method::DELETE,
        _        => reqwest::Method::GET,
    };

    let mut req = client.request(method_parsed, &url);
    for (name, value) in &headers {
        req = req.header(name.as_str(), value.as_str());
    }
    if let Some(b) = body {
        req = req.header("content-type", "application/json").body(b);
    }

    let response = match req.send().await {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur réseau {} : {}", api_id, e),
            is_error: true,
            metadata: None,
        },
    };

    let status = response.status().as_u16();
    let text = response.text().await.unwrap_or_default();

    if status >= 400 {
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur HTTP {} de {} : {}", status, api_id, &text[..text.len().min(500)]),
            is_error: true,
            metadata: None,
        };
    }

    ToolResult {
        tool_use_id: tool_use_id.to_string(),
        content: text.clone(),
        is_error: false,
        metadata: Some(serde_json::json!({ "api": api_id, "status": status, "url": url })),
    }
}

/// Exécute un connecteur HTTP custom (défini par l'utilisateur)
pub async fn execute_custom(
    tool_use_id: &str,
    cfg_json: &str,
    keys: &ToolKeys,
    input: &Value,
) -> ToolResult {
    let cfg: Value = match serde_json::from_str(cfg_json) {
        Ok(v) => v,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Config custom invalide : {}", e),
            is_error: true,
            metadata: None,
        },
    };

    let key_field = cfg["keyField"].as_str().unwrap_or("custom");
    let api_key = keys.extra.get(key_field).cloned().unwrap_or_default();

    let url = cfg["url"].as_str().unwrap_or("");
    let method = cfg["method"].as_str().unwrap_or("POST").to_uppercase();
    let auth_type = cfg["authType"].as_str().unwrap_or("none");
    let auth_header = cfg["authHeader"].as_str().unwrap_or("X-API-Key");
    let body_template = cfg["bodyTemplate"].as_str().unwrap_or("");

    // Appliquer les variables {{var}} depuis input
    let final_url = interpolate(url, input);
    let final_body = if body_template.is_empty() {
        input["body"].as_str().map(|s| s.to_string())
    } else {
        Some(interpolate(body_template, input))
    };

    let mut headers: Vec<(String, String)> = vec![];
    if !api_key.is_empty() {
        match auth_type {
            "bearer"      => headers.push(("Authorization".into(), format!("Bearer {}", api_key))),
            "apikey_header" => headers.push((auth_header.to_string(), api_key.clone())),
            _ => {}
        }
    }

    let client = reqwest::Client::new();
    let method_parsed = match method.as_str() {
        "GET" => reqwest::Method::GET, "PUT" => reqwest::Method::PUT,
        "PATCH" => reqwest::Method::PATCH, "DELETE" => reqwest::Method::DELETE,
        _ => reqwest::Method::POST,
    };

    let mut req = client.request(method_parsed, &final_url);
    for (n, v) in &headers { req = req.header(n.as_str(), v.as_str()); }
    if let Some(b) = final_body { req = req.header("content-type", "application/json").body(b); }

    match req.send().await {
        Err(e) => ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur réseau custom : {}", e),
            is_error: true, metadata: None,
        },
        Ok(resp) => {
            let status = resp.status().as_u16();
            let text = resp.text().await.unwrap_or_default();
            ToolResult {
                tool_use_id: tool_use_id.to_string(),
                content: text,
                is_error: status >= 400,
                metadata: Some(serde_json::json!({ "status": status, "url": final_url })),
            }
        }
    }
}

/// Interpolation simple {{variable}} → valeur dans input JSON
fn interpolate(template: &str, input: &Value) -> String {
    let mut result = template.to_string();
    if let Some(obj) = input.as_object() {
        for (key, val) in obj {
            let placeholder = format!("{{{{{}}}}}", key);
            let owned = val.as_str().map(|s| s.to_string()).unwrap_or_else(|| val.to_string());
            result = result.replace(&placeholder, &owned);
        }
    }
    result
}

/// Encodage base64 minimal pour Basic auth
fn base64_basic(s: &str) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let data = s.as_bytes();
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
