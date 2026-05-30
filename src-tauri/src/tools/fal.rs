/// fal.ai — génération image et vidéo avec polling de queue
use serde_json::Value;
use super::{ToolKeys, ToolResult, download_image, visuals_dir};

pub async fn execute_image(tool_use_id: &str, input: &Value, keys: &ToolKeys) -> ToolResult {
    let api_key = match keys.extra.get("fal") {
        Some(k) if !k.is_empty() => k.clone(),
        _ => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Clé API fal.ai manquante. Configure-la dans le Pack Manager.".to_string(),
            is_error: true, metadata: None,
        },
    };

    let model_id = input["model_id"].as_str().unwrap_or("fal-ai/flux-pro/v1.1");
    let prompt = input["prompt"].as_str().unwrap_or("A professional image");
    let aspect_ratio = input["aspect_ratio"].as_str().unwrap_or("1:1");
    let num_images = input["num_images"].as_u64().unwrap_or(1);

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
        "num_images": num_images
    });

    // Soumettre la requête
    let submit_url = format!("https://queue.fal.run/{}", model_id);
    let response = match client
        .post(&submit_url)
        .header("Authorization", format!("Key {}", api_key))
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send().await
    {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur réseau fal.ai : {}", e),
            is_error: true, metadata: None,
        },
    };

    if !response.status().is_success() {
        let text = response.text().await.unwrap_or_default();
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur fal.ai soumission : {}", text),
            is_error: true, metadata: None,
        };
    }

    let submit_json: Value = match response.json().await {
        Ok(j) => j,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur parsing fal.ai : {}", e),
            is_error: true, metadata: None,
        },
    };

    let request_id = match submit_json["request_id"].as_str() {
        Some(id) => id.to_string(),
        None => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Pas de request_id dans la réponse fal.ai".to_string(),
            is_error: true, metadata: None,
        },
    };

    // Polling du statut (max 120s)
    let status_url = format!("https://queue.fal.run/{}/requests/{}/status", model_id, request_id);
    loop {
        tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
        let status_resp = match client.get(&status_url)
            .header("Authorization", format!("Key {}", api_key))
            .send().await
        {
            Ok(r) => r,
            Err(e) => return ToolResult {
                tool_use_id: tool_use_id.to_string(),
                content: format!("Erreur polling fal.ai : {}", e),
                is_error: true, metadata: None,
            },
        };
        let status_json: Value = status_resp.json().await.unwrap_or_default();
        match status_json["status"].as_str() {
            Some("COMPLETED") => break,
            Some("FAILED") => return ToolResult {
                tool_use_id: tool_use_id.to_string(),
                content: "Génération fal.ai échouée".to_string(),
                is_error: true, metadata: None,
            },
            _ => continue,
        }
    }

    // Récupérer le résultat
    let result_url = format!("https://queue.fal.run/{}/requests/{}", model_id, request_id);
    let result_resp = match client.get(&result_url)
        .header("Authorization", format!("Key {}", api_key))
        .send().await
    {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur résultat fal.ai : {}", e),
            is_error: true, metadata: None,
        },
    };
    let result_json: Value = result_resp.json().await.unwrap_or_default();

    // Extraire URL image
    let image_url = result_json["images"][0]["url"].as_str()
        .or_else(|| result_json["image"]["url"].as_str())
        .unwrap_or("").to_string();

    if image_url.is_empty() {
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Pas d'image dans la réponse fal.ai : {}", result_json),
            is_error: false,
            metadata: Some(serde_json::json!({ "raw": result_json })),
        };
    }

    let timestamp = chrono::Utc::now().timestamp_millis();
    let filename = format!("fal-{}.png", timestamp);
    let local_path = download_image(&image_url, &filename).await.unwrap_or_else(|_| image_url.clone());

    ToolResult {
        tool_use_id: tool_use_id.to_string(),
        content: format!("Image fal.ai générée : {}", local_path),
        is_error: false,
        metadata: Some(serde_json::json!({
            "url": image_url,
            "local_path": local_path,
            "model": model_id,
            "prompt": prompt,
            "cost_cents": 5
        })),
    }
}

pub async fn execute_video(tool_use_id: &str, input: &Value, keys: &ToolKeys) -> ToolResult {
    let api_key = match keys.extra.get("fal") {
        Some(k) if !k.is_empty() => k.clone(),
        _ => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Clé API fal.ai manquante. Configure-la dans le Pack Manager.".to_string(),
            is_error: true, metadata: None,
        },
    };

    let model_id = input["model_id"].as_str().unwrap_or("alibaba/happy-horse/text-to-video");
    let prompt = input["prompt"].as_str().unwrap_or("A cinematic video");

    let mut body_map = serde_json::Map::new();
    body_map.insert("prompt".to_string(), serde_json::json!(prompt));
    if let Some(image_url) = input["image_url"].as_str() {
        body_map.insert("image_url".to_string(), serde_json::json!(image_url));
    }
    if let Some(duration) = input["duration"].as_u64() {
        body_map.insert("duration".to_string(), serde_json::json!(duration));
    }

    let client = reqwest::Client::new();
    let submit_url = format!("https://queue.fal.run/{}", model_id);
    let response = match client.post(&submit_url)
        .header("Authorization", format!("Key {}", api_key))
        .header("Content-Type", "application/json")
        .body(serde_json::Value::Object(body_map).to_string())
        .send().await
    {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur fal.ai vidéo : {}", e),
            is_error: true, metadata: None,
        },
    };

    let submit_json: Value = response.json().await.unwrap_or_default();
    let request_id = match submit_json["request_id"].as_str() {
        Some(id) => id.to_string(),
        None => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Pas de request_id".to_string(),
            is_error: true, metadata: None,
        },
    };

    // Polling (vidéos plus longues à générer)
    let status_url = format!("https://queue.fal.run/{}/requests/{}/status", model_id, request_id);
    for _ in 0..60 {
        tokio::time::sleep(tokio::time::Duration::from_millis(3000)).await;
        let status_resp = client.get(&status_url)
            .header("Authorization", format!("Key {}", api_key))
            .send().await.ok();
        if let Some(resp) = status_resp {
            let status_json: Value = resp.json().await.unwrap_or_default();
            match status_json["status"].as_str() {
                Some("COMPLETED") => break,
                Some("FAILED") => return ToolResult {
                    tool_use_id: tool_use_id.to_string(),
                    content: "Génération vidéo fal.ai échouée".to_string(),
                    is_error: true, metadata: None,
                },
                _ => {}
            }
        }
    }

    // Récupérer résultat
    let result_url = format!("https://queue.fal.run/{}/requests/{}", model_id, request_id);
    let result_json: Value = match client.get(&result_url)
        .header("Authorization", format!("Key {}", api_key))
        .send().await
    {
        Ok(r) => r.json().await.unwrap_or_default(),
        Err(_) => serde_json::json!({}),
    };

    let video_url = result_json["video"]["url"].as_str().unwrap_or("").to_string();

    // Télécharger la vidéo
    let timestamp = chrono::Utc::now().timestamp_millis();
    let filename = format!("fal-video-{}.mp4", timestamp);
    let videos_dir = {
        let base = dirs::data_local_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
        let dir = base.join("ronako").join("visuals").join("videos");
        std::fs::create_dir_all(&dir).ok();
        dir
    };
    let local_path = if !video_url.is_empty() {
        let path = videos_dir.join(&filename);
        if let Ok(resp) = reqwest::Client::new().get(&video_url).send().await {
            if let Ok(bytes) = resp.bytes().await {
                std::fs::write(&path, &bytes).ok();
            }
        }
        path.to_string_lossy().to_string()
    } else { video_url.clone() };

    ToolResult {
        tool_use_id: tool_use_id.to_string(),
        content: format!("Vidéo fal.ai générée : {}", local_path),
        is_error: false,
        metadata: Some(serde_json::json!({
            "url": video_url,
            "local_path": local_path,
            "model": model_id,
            "prompt": prompt,
            "cost_cents": 14
        })),
    }
}
