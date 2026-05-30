pub mod dalle;
pub mod flux;
pub mod e2b;
pub mod notion;
pub mod github;
pub mod tavily;
pub mod generic_api;
pub mod fal;
pub mod gemini;
pub mod firecrawl;
pub mod ideogram;
pub mod tts;

use serde_json::Value;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ToolKeys {
    pub openai: Option<String>,
    pub bfl: Option<String>,
    pub e2b: Option<String>,
    pub notion: Option<String>,
    pub github: Option<String>,
    pub tavily: Option<String>,
    // Toutes les autres clés (APIs génériques + custom HTTP)
    #[serde(default)]
    pub extra: std::collections::HashMap<String, String>,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct ToolResult {
    pub tool_use_id: String,
    pub content: String,
    pub is_error: bool,
    pub metadata: Option<Value>,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct ToolUseEvent {
    pub tool_use_id: String,
    pub tool_name: String,
    pub input: Value,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct ToolResultEvent {
    pub tool_use_id: String,
    pub tool_name: String,
    pub result: String,
    pub is_error: bool,
    pub cost_cents: u32,
    pub metadata: Option<Value>,
}

/// Dispatcher central — reçoit le nom d'outil et route vers le bon module
pub async fn execute_tool(
    tool_name: &str,
    tool_use_id: &str,
    input: &Value,
    keys: &ToolKeys,
) -> ToolResult {
    match tool_name {
        // ── Outils Phase 8 avec implémentation spécifique ────────────────────
        "generate_image_dalle" => dalle::execute(tool_use_id, input, keys).await,
        "generate_image_flux"  => flux::execute(tool_use_id, input, keys).await,
        "execute_code"         => e2b::execute(tool_use_id, input, keys).await,
        "export_to_notion"     => notion::execute(tool_use_id, input, keys).await,
        "github_push"          => github::execute(tool_use_id, input, keys).await,
        "web_search"           => tavily::execute(tool_use_id, input, keys).await,

        // ── Connecteurs avec implémentation Rust dédiée (nouveaux) ──────────────
        "generate_image_fal"   => fal::execute_image(tool_use_id, input, keys).await,
        "generate_video_fal"   => fal::execute_video(tool_use_id, input, keys).await,
        "generate_image_gemini"=> gemini::execute_image(tool_use_id, input, keys).await,
        "scrape_url"           => firecrawl::scrape(tool_use_id, input, keys).await,
        "web_search_firecrawl" => firecrawl::search(tool_use_id, input, keys).await,
        "generate_image_ideogram" => ideogram::execute(tool_use_id, input, keys).await,
        "text_to_speech_openai"=> tts::execute(tool_use_id, input, keys).await,

        // ── APIs génériques : api_{id} → HTTP call avec la clé correspondante ─
        name if name.starts_with("api_") => {
            let api_id = &name[4..];
            let api_key = keys.extra.get(api_id).cloned();
            generic_api::execute(tool_use_id, api_id, api_key, input).await
        }

        // ── Connecteurs HTTP custom : custom_{id} ─────────────────────────────
        name if name.starts_with("custom_") => {
            let connector_id = &name[7..];
            if let Some(cfg_json) = keys.extra.get(&format!("__cfg_{}", connector_id)) {
                generic_api::execute_custom(tool_use_id, cfg_json, keys, input).await
            } else {
                ToolResult {
                    tool_use_id: tool_use_id.to_string(),
                    content: format!("Configuration introuvable pour le connecteur custom {}", connector_id),
                    is_error: true,
                    metadata: None,
                }
            }
        }

        // ── Outils MCP : mcp__{server_id}__{tool_name} ───────────────────────────
        name if name.starts_with("mcp__") => {
            let rest = &name[5..];
            if let Some(sep) = rest.find("__") {
                let server_id = &rest[..sep];
                let tool_name = &rest[sep + 2..];
                crate::mcp::call_tool(tool_use_id, server_id, tool_name, input).await
            } else {
                ToolResult {
                    tool_use_id: tool_use_id.to_string(),
                    content: format!("Format MCP invalide : {} (attendu: mcp__serverId__toolName)", name),
                    is_error: true,
                    metadata: None,
                }
            }
        }

        unknown => ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Outil inconnu : {}", unknown),
            is_error: true,
            metadata: None,
        },
    }
}

/// Chemin de sauvegarde local pour les visuels générés
pub fn visuals_dir() -> std::path::PathBuf {
    let base = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    let dir = base.join("ronako").join("visuals");
    std::fs::create_dir_all(&dir).ok();
    dir
}

/// Chemin de sauvegarde local pour les fichiers générés (E2B)
pub fn outputs_dir() -> std::path::PathBuf {
    let base = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    let dir = base.join("ronako").join("outputs");
    std::fs::create_dir_all(&dir).ok();
    dir
}

/// Télécharge une image depuis une URL et la sauvegarde localement
pub async fn download_image(url: &str, filename: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let bytes = client
        .get(url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .bytes()
        .await
        .map_err(|e| e.to_string())?;

    let path = visuals_dir().join(filename);
    std::fs::write(&path, &bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}
