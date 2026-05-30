use futures_util::StreamExt;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};
use tauri::{AppHandle, Emitter};
use tokio::sync::oneshot;

// Registre des aborts actifs
static ABORT_MAP: LazyLock<Mutex<HashMap<String, oneshot::Sender<()>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(serde::Serialize, Clone)]
pub struct StreamDone {
    pub input_tokens: u64,
    pub output_tokens: u64,
}

#[tauri::command]
pub async fn anthropic_stream(
    app: AppHandle,
    api_key: String,
    model: String,
    system_prompt: String,
    user_message: String,
    request_id: String,
) -> Result<(), String> {
    let (tx, mut rx) = oneshot::channel::<()>();
    ABORT_MAP.lock().unwrap().insert(request_id.clone(), tx);

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "max_tokens": 4096,
        "stream": true,
        "system": system_prompt,
        "messages": [{ "role": "user", "content": user_message }]
    });

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status().as_u16();
        let text = response.text().await.unwrap_or_default();
        // Extraire le message d'erreur Anthropic si possible
        let msg = serde_json::from_str::<Value>(&text)
            .ok()
            .and_then(|v| v["error"]["message"].as_str().map(|s| s.to_string()))
            .unwrap_or_else(|| format!("Erreur HTTP {}", status));
        let _ = app.emit(&format!("anthropic-error-{}", request_id), &msg);
        ABORT_MAP.lock().unwrap().remove(&request_id);
        return Err(msg);
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut input_tokens: u64 = 0;
    let mut output_tokens: u64 = 0;

    loop {
        // Vérifier l'abort
        if rx.try_recv().is_ok() {
            break;
        }

        match stream.next().await {
            None => break,
            Some(Err(e)) => {
                let _ = app.emit(&format!("anthropic-error-{}", request_id), e.to_string());
                break;
            }
            Some(Ok(chunk)) => {
                buffer.push_str(&String::from_utf8_lossy(&chunk));

                // Traiter les lignes SSE complètes
                while let Some(nl) = buffer.find('\n') {
                    let line = buffer[..nl].trim().to_string();
                    buffer = buffer[nl + 1..].to_string();

                    if !line.starts_with("data: ") { continue; }
                    let data = &line[6..];
                    if data == "[DONE]" { continue; }

                    if let Ok(ev) = serde_json::from_str::<Value>(data) {
                        match ev["type"].as_str() {
                            Some("content_block_delta") => {
                                if let Some(text) = ev["delta"]["text"].as_str() {
                                    let _ = app.emit(
                                        &format!("anthropic-chunk-{}", request_id),
                                        text,
                                    );
                                }
                            }
                            Some("message_start") => {
                                input_tokens = ev["message"]["usage"]["input_tokens"]
                                    .as_u64().unwrap_or(0);
                            }
                            Some("message_delta") => {
                                output_tokens = ev["usage"]["output_tokens"]
                                    .as_u64().unwrap_or(0);
                            }
                            _ => {}
                        }
                    }
                }
            }
        }
    }

    let _ = app.emit(
        &format!("anthropic-done-{}", request_id),
        StreamDone { input_tokens, output_tokens },
    );

    ABORT_MAP.lock().unwrap().remove(&request_id);
    Ok(())
}

#[tauri::command]
pub fn anthropic_abort(request_id: String) {
    if let Some(tx) = ABORT_MAP.lock().unwrap().remove(&request_id) {
        let _ = tx.send(());
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOUVELLE COMMANDE — Tool Use (Phase 8)
// Ne modifie PAS anthropic_stream() ci-dessus.
// Les deux coexistent et sont indépendantes.
// ─────────────────────────────────────────────────────────────────────────────

use crate::tools::{ToolKeys, ToolResultEvent, ToolUseEvent, execute_tool};

/// Appel non-streaming vers l'API Anthropic (utilisé dans la boucle tool use)
async fn anthropic_call_once(
    client: &reqwest::Client,
    api_key: &str,
    model: &str,
    system_prompt: &str,
    messages: &[Value],
    tools: &[Value],
) -> Result<Value, String> {
    let mut body = serde_json::json!({
        "model": model,
        "max_tokens": 4096,
        "system": system_prompt,
        "messages": messages
    });
    if !tools.is_empty() {
        body["tools"] = Value::Array(tools.to_vec());
    }

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let text = response.text().await.unwrap_or_default();
        let msg = serde_json::from_str::<Value>(&text)
            .ok()
            .and_then(|v| v["error"]["message"].as_str().map(|s| s.to_string()))
            .unwrap_or_else(|| format!("Erreur HTTP {}", text));
        return Err(msg);
    }

    response.json::<Value>().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn anthropic_stream_with_tools(
    app: AppHandle,
    api_key: String,
    model: String,
    system_prompt: String,
    user_message: String,
    request_id: String,
    tools: Vec<Value>,       // Définitions des outils (JSON schema Anthropic)
    tool_keys: ToolKeys,     // Clés API pour chaque outil
) -> Result<(), String> {
    let client = reqwest::Client::new();

    // Conversation accumulative (multi-tour)
    let mut messages: Vec<Value> = vec![
        serde_json::json!({ "role": "user", "content": user_message })
    ];

    let mut total_input_tokens: u64 = 0;
    let mut total_output_tokens: u64 = 0;

    // Boucle tool use — max 10 tours pour éviter les boucles infinies
    for _turn in 0..10 {
        let response = match anthropic_call_once(
            &client, &api_key, &model, &system_prompt, &messages, &tools
        ).await {
            Ok(r) => r,
            Err(e) => {
                let _ = app.emit(&format!("anthropic-error-{}", request_id), &e);
                return Err(e);
            }
        };

        // Tokens
        total_input_tokens += response["usage"]["input_tokens"].as_u64().unwrap_or(0);
        total_output_tokens += response["usage"]["output_tokens"].as_u64().unwrap_or(0);

        let stop_reason = response["stop_reason"].as_str().unwrap_or("end_turn");
        let content_blocks = response["content"].as_array().cloned().unwrap_or_default();

        // Extraire texte et tool_use depuis les blocs
        let mut text_parts: Vec<String> = vec![];
        let mut tool_uses: Vec<Value> = vec![];

        for block in &content_blocks {
            match block["type"].as_str() {
                Some("text") => {
                    if let Some(t) = block["text"].as_str() {
                        text_parts.push(t.to_string());
                    }
                }
                Some("tool_use") => {
                    tool_uses.push(block.clone());
                }
                _ => {}
            }
        }

        // Émettre le texte partiel si présent
        if !text_parts.is_empty() {
            let combined = text_parts.join("");
            // Émettre par chunks de ~100 chars pour simuler le streaming
            for chunk in combined.as_bytes().chunks(100) {
                let s = String::from_utf8_lossy(chunk).to_string();
                let _ = app.emit(&format!("anthropic-chunk-{}", request_id), &s);
            }
        }

        // Fin de conversation — pas d'outils à exécuter
        if stop_reason == "end_turn" || tool_uses.is_empty() {
            break;
        }

        // Exécuter les outils
        let mut tool_results: Vec<Value> = vec![];

        for tool_use in &tool_uses {
            let tool_name = tool_use["name"].as_str().unwrap_or("unknown");
            let tool_use_id = tool_use["id"].as_str().unwrap_or("unknown");
            let tool_input = &tool_use["input"];

            // Notifier le frontend que l'outil tourne
            let _ = app.emit(
                &format!("anthropic-tool-use-{}", request_id),
                ToolUseEvent {
                    tool_use_id: tool_use_id.to_string(),
                    tool_name: tool_name.to_string(),
                    input: tool_input.clone(),
                },
            );

            // Exécuter l'outil
            let result = execute_tool(tool_name, tool_use_id, tool_input, &tool_keys).await;

            // Notifier le frontend du résultat
            let _ = app.emit(
                &format!("anthropic-tool-result-{}", request_id),
                ToolResultEvent {
                    tool_use_id: tool_use_id.to_string(),
                    tool_name: tool_name.to_string(),
                    result: result.content.clone(),
                    is_error: result.is_error,
                    cost_cents: 0,
                    metadata: result.metadata.clone(),
                },
            );

            // Construire le tool_result pour Claude
            tool_results.push(serde_json::json!({
                "type": "tool_result",
                "tool_use_id": tool_use_id,
                "content": result.content,
                "is_error": result.is_error
            }));
        }

        // Ajouter le tour assistant + les résultats des outils à la conversation
        messages.push(serde_json::json!({
            "role": "assistant",
            "content": content_blocks
        }));
        messages.push(serde_json::json!({
            "role": "user",
            "content": tool_results
        }));
    }

    // Émettre l'événement de fin avec les tokens totaux
    let _ = app.emit(
        &format!("anthropic-done-{}", request_id),
        StreamDone {
            input_tokens: total_input_tokens,
            output_tokens: total_output_tokens,
        },
    );

    Ok(())
}
