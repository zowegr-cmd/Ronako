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
