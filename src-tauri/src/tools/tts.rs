/// OpenAI TTS — synthèse vocale (binaire audio → MP3 local)
use serde_json::Value;
use super::{ToolKeys, ToolResult, outputs_dir};

pub async fn execute(tool_use_id: &str, input: &Value, keys: &ToolKeys) -> ToolResult {
    let api_key = match &keys.openai {
        Some(k) if !k.is_empty() => k.clone(),
        _ => match keys.extra.get("openai") {
            Some(k) if !k.is_empty() => k.clone(),
            _ => return ToolResult {
                tool_use_id: tool_use_id.to_string(),
                content: "Clé API OpenAI manquante (réutilisée pour TTS). Configure-la dans le Pack Manager.".to_string(),
                is_error: true, metadata: None,
            },
        },
    };

    let text = match input["text"].as_str() {
        Some(t) => t.to_string(),
        None => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Paramètre 'text' manquant pour TTS".to_string(),
            is_error: true, metadata: None,
        },
    };

    let voice = input["voice"].as_str().unwrap_or("nova");
    let model = input["model"].as_str().unwrap_or("tts-1-hd");
    let response_format = "mp3";

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "input": text,
        "voice": voice,
        "response_format": response_format
    });

    let response = match client
        .post("https://api.openai.com/v1/audio/speech")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send().await
    {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur réseau OpenAI TTS : {}", e),
            is_error: true, metadata: None,
        },
    };

    if !response.status().is_success() {
        let text_err = response.text().await.unwrap_or_default();
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur OpenAI TTS : {}", text_err),
            is_error: true, metadata: None,
        };
    }

    // Réponse binaire → MP3
    let audio_bytes = match response.bytes().await {
        Ok(b) => b,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur lecture audio TTS : {}", e),
            is_error: true, metadata: None,
        },
    };

    // Sauvegarder dans .ronako/visuals/audio/
    let audio_dir = {
        let base = dirs::data_local_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
        let dir = base.join("ronako").join("visuals").join("audio");
        std::fs::create_dir_all(&dir).ok();
        dir
    };

    let timestamp = chrono::Utc::now().timestamp_millis();
    let filename = format!("tts-{}-{}.mp3", voice, timestamp);
    let path = audio_dir.join(&filename);

    if let Err(e) = std::fs::write(&path, &audio_bytes) {
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur sauvegarde audio : {}", e),
            is_error: true, metadata: None,
        };
    }

    let local_path = path.to_string_lossy().to_string();
    let words = text.split_whitespace().count();
    let duration_estimate = (words as f32 / 150.0 * 60.0) as u32; // ~150 mots/min

    ToolResult {
        tool_use_id: tool_use_id.to_string(),
        content: format!("Audio TTS généré : {}", local_path),
        is_error: false,
        metadata: Some(serde_json::json!({
            "local_path": local_path,
            "model": model,
            "voice": voice,
            "duration_estimate_sec": duration_estimate,
            "cost_cents": 2
        })),
    }
}
