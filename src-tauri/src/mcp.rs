/// Client MCP (Model Context Protocol) — Phase 9
/// Protocole JSON-RPC 2.0 sur stdio avec les serveurs MCP npm.
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, LazyLock, Mutex};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin};
use tokio::time::{timeout, Duration};

// ─── Types publics ────────────────────────────────────────────────────────────

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct McpTool {
    pub name: String,
    pub description: String,
    pub input_schema: Value,
}

#[derive(serde::Serialize, Clone, Debug, PartialEq)]
pub enum McpStatus {
    Stopped,
    Starting,
    Running,
    Error(String),
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct McpServerInfo {
    pub server_id: String,
    pub package: String,
    pub status: McpStatus,
    pub tools: Vec<McpTool>,
}

// ─── Session interne ──────────────────────────────────────────────────────────

struct McpSession {
    #[allow(dead_code)]
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<tokio::process::ChildStdout>,
    tools: Vec<McpTool>,
    next_id: u64,
    package: String,
}

impl McpSession {
    /// Envoie une requête JSON-RPC et attend la réponse avec l'ID correspondant
    async fn request(&mut self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id;
        self.next_id += 1;

        let msg = serde_json::json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params
        });

        let line = format!("{}\n", msg);
        self.stdin.write_all(line.as_bytes()).await.map_err(|e| e.to_string())?;
        self.stdin.flush().await.map_err(|e| e.to_string())?;

        // Lire les lignes jusqu'à trouver la réponse avec notre ID
        let deadline = Duration::from_secs(30);
        let mut buf = String::new();

        loop {
            buf.clear();
            let read = timeout(deadline, self.stdout.read_line(&mut buf))
                .await
                .map_err(|_| format!("Timeout MCP (méthode: {})", method))?
                .map_err(|e| e.to_string())?;

            if read == 0 {
                return Err("Connexion MCP fermée par le serveur".to_string());
            }

            let trimmed = buf.trim();
            if trimmed.is_empty() { continue; }

            // Ignorer les lignes non-JSON (logs de démarrage du serveur)
            let Ok(resp) = serde_json::from_str::<Value>(trimmed) else { continue };

            // Ignorer les notifications (pas d'id)
            if resp.get("id").is_none() { continue; }

            if resp["id"].as_u64() == Some(id) {
                if let Some(err) = resp.get("error") {
                    return Err(err["message"].as_str().unwrap_or("Erreur MCP").to_string());
                }
                return Ok(resp["result"].clone());
            }
        }
    }

    /// Envoie une notification JSON-RPC (pas de réponse attendue)
    async fn notify(&mut self, method: &str, params: Value) -> Result<(), String> {
        let msg = serde_json::json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        });
        let line = format!("{}\n", msg);
        self.stdin.write_all(line.as_bytes()).await.map_err(|e| e.to_string())?;
        self.stdin.flush().await.map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Séquence d'initialisation MCP complète
    async fn initialize(&mut self) -> Result<Vec<McpTool>, String> {
        // 1. Initialize
        self.request("initialize", serde_json::json!({
            "protocolVersion": "2024-11-05",
            "capabilities": { "tools": {} },
            "clientInfo": { "name": "ronako", "version": "1.0" }
        })).await?;

        // 2. Notifications/initialized
        self.notify("notifications/initialized", serde_json::json!({})).await?;

        // 3. List tools
        let tools_resp = self.request("tools/list", serde_json::json!({})).await?;

        let tools: Vec<McpTool> = tools_resp["tools"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|t| {
                let name = t["name"].as_str()?.to_string();
                let description = t["description"].as_str().unwrap_or("").to_string();
                let input_schema = t.get("inputSchema").cloned().unwrap_or(serde_json::json!({"type":"object","properties":{}}));
                Some(McpTool { name, description, input_schema })
            })
            .collect();

        self.tools = tools.clone();
        Ok(tools)
    }
}

// ─── Registry global ──────────────────────────────────────────────────────────

// server_id → Arc<AsyncMutex<McpSession>>
static SESSIONS: LazyLock<Mutex<HashMap<String, Arc<tokio::sync::Mutex<McpSession>>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

// ─── Spawn cross-platform ─────────────────────────────────────────────────────

fn spawn_npx(package: &str, extra_args: &[&str]) -> Result<Child, String> {
    // Sur Windows, npx est un script .cmd qui nécessite cmd /c
    #[cfg(target_os = "windows")]
    {
        let mut args = vec!["/c", "npx", "-y", package];
        args.extend_from_slice(extra_args);
        tokio::process::Command::new("cmd")
            .args(&args)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Impossible de démarrer npx : {}. Node.js est-il installé ?", e))
    }
    #[cfg(not(target_os = "windows"))]
    {
        let mut args = vec!["-y", package];
        args.extend_from_slice(extra_args);
        tokio::process::Command::new("npx")
            .args(&args)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Impossible de démarrer npx : {}. Node.js est-il installé ?", e))
    }
}

// ─── API publique ─────────────────────────────────────────────────────────────

/// Démarre un serveur MCP et retourne ses outils disponibles
pub async fn start_server(server_id: String, package: String, extra_args: Vec<String>) -> Result<Vec<McpTool>, String> {
    // Arrêter un éventuel serveur déjà en place
    let _ = stop_server(&server_id).await;

    let extra: Vec<&str> = extra_args.iter().map(|s| s.as_str()).collect();
    let mut child = spawn_npx(&package, &extra)?;

    let stdin = child.stdin.take().ok_or("stdin non disponible")?;
    let stdout = child.stdout.take().ok_or("stdout non disponible")?;

    let mut session = McpSession {
        child,
        stdin,
        stdout: BufReader::new(stdout),
        tools: vec![],
        next_id: 1,
        package: package.clone(),
    };

    let tools = session.initialize().await?;
    let session_arc = Arc::new(tokio::sync::Mutex::new(session));
    SESSIONS.lock().unwrap().insert(server_id, session_arc);

    Ok(tools)
}

/// Arrête un serveur MCP et libère les ressources
pub async fn stop_server(server_id: &str) -> Result<(), String> {
    let session_arc = {
        SESSIONS.lock().unwrap().remove(server_id)
    };
    if let Some(arc) = session_arc {
        let mut session = arc.lock().await;
        let _ = session.child.kill().await;
    }
    Ok(())
}

/// Liste les outils d'un serveur en cours d'exécution
pub async fn list_tools(server_id: &str) -> Result<Vec<McpTool>, String> {
    let arc = {
        SESSIONS.lock().unwrap().get(server_id).cloned()
    }.ok_or(format!("Serveur MCP '{}' non démarré", server_id))?;

    let session = arc.lock().await;
    Ok(session.tools.clone())
}

/// Vérifie si un serveur est actif
pub fn is_running(server_id: &str) -> bool {
    SESSIONS.lock().unwrap().contains_key(server_id)
}

/// Retourne les IDs de tous les serveurs actifs
pub fn running_servers() -> Vec<String> {
    SESSIONS.lock().unwrap().keys().cloned().collect()
}

/// Appelle un outil MCP et retourne le résultat
pub async fn call_tool(tool_use_id: &str, server_id: &str, tool_name: &str, arguments: &Value) -> crate::tools::ToolResult {
    let arc = {
        SESSIONS.lock().unwrap().get(server_id).cloned()
    };

    let Some(arc) = arc else {
        return crate::tools::ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Serveur MCP '{}' non démarré. Démarre-le dans le Pack Manager.", server_id),
            is_error: true,
            metadata: None,
        };
    };

    let mut session = arc.lock().await;

    match session.request("tools/call", serde_json::json!({
        "name": tool_name,
        "arguments": arguments
    })).await {
        Ok(result) => {
            // MCP retourne content: [{type: "text", text: "..."}] ou [{type: "resource", ...}]
            let fallback = result.to_string();
            let content = result["content"]
                .as_array()
                .and_then(|arr| arr.first())
                .and_then(|item| item["text"].as_str())
                .unwrap_or(&fallback)
                .to_string();

            let content_str = if content.is_empty() { fallback } else { content };

            crate::tools::ToolResult {
                tool_use_id: tool_use_id.to_string(),
                content: content_str,
                is_error: false,
                metadata: Some(serde_json::json!({ "mcp_server": server_id, "tool": tool_name })),
            }
        }
        Err(e) => crate::tools::ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur MCP ({}/{}): {}", server_id, tool_name, e),
            is_error: true,
            metadata: None,
        },
    }
}

// ─── Commandes Tauri ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn mcp_start(server_id: String, package: String, extra_args: Vec<String>) -> Result<Vec<McpTool>, String> {
    start_server(server_id, package, extra_args).await
}

#[tauri::command]
pub async fn mcp_stop(server_id: String) -> Result<(), String> {
    stop_server(&server_id).await
}

#[tauri::command]
pub async fn mcp_list_tools_cmd(server_id: String) -> Result<Vec<McpTool>, String> {
    list_tools(&server_id).await
}

#[tauri::command]
pub fn mcp_status(server_id: String) -> bool {
    is_running(&server_id)
}

#[tauri::command]
pub fn mcp_running_servers() -> Vec<String> {
    running_servers()
}
