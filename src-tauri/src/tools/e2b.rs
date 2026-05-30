use serde_json::Value;
use super::{ToolKeys, ToolResult, outputs_dir};

/// Décodage base64 minimal sans dépendance externe
fn base64_decode(s: &str) -> Vec<u8> {
    let table: &[u8; 128] = &{
        let mut t = [0u8; 128];
        for (i, c) in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
            .bytes()
            .enumerate()
        {
            t[c as usize] = i as u8;
        }
        t
    };
    let s = s.trim_matches('=').as_bytes();
    let mut out = Vec::with_capacity(s.len() * 3 / 4);
    let mut i = 0;
    while i + 3 < s.len() {
        let b0 = table[s[i] as usize] as u32;
        let b1 = table[s[i + 1] as usize] as u32;
        let b2 = table[s[i + 2] as usize] as u32;
        let b3 = table[s[i + 3] as usize] as u32;
        let triple = (b0 << 18) | (b1 << 12) | (b2 << 6) | b3;
        out.push((triple >> 16) as u8);
        out.push((triple >> 8) as u8);
        out.push(triple as u8);
        i += 4;
    }
    out
}

pub async fn execute(tool_use_id: &str, input: &Value, keys: &ToolKeys) -> ToolResult {
    let api_key = match &keys.e2b {
        Some(k) if !k.is_empty() => k.clone(),
        _ => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Clé API E2B manquante. Configure-la dans les Paramètres → Connecteurs.".to_string(),
            is_error: true,
            metadata: None,
        },
    };

    let language = input["language"].as_str().unwrap_or("python");
    let code = match input["code"].as_str() {
        Some(c) => c.to_string(),
        None => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "Champ 'code' manquant dans l'input".to_string(),
            is_error: true,
            metadata: None,
        },
    };
    let packages: Vec<String> = input["packages"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|v| v.as_str().map(|s| s.to_string()))
        .collect();

    let client = reqwest::Client::new();

    // 1. Créer une sandbox
    let sandbox_body = serde_json::json!({ "template": language });
    let sandbox_resp = match client
        .post("https://api.e2b.dev/sandboxes")
        .header("X-API-Key", &api_key)
        .header("Content-Type", "application/json")
        .body(sandbox_body.to_string())
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur création sandbox E2B : {}", e),
            is_error: true,
            metadata: None,
        },
    };

    if !sandbox_resp.status().is_success() {
        let text = sandbox_resp.text().await.unwrap_or_default();
        return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur E2B sandbox : {}", text),
            is_error: true,
            metadata: None,
        };
    }

    let sandbox: Value = match sandbox_resp.json().await {
        Ok(j) => j,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur parsing sandbox E2B : {}", e),
            is_error: true,
            metadata: None,
        },
    };

    let sandbox_id = match sandbox["sandboxId"].as_str() {
        Some(id) => id.to_string(),
        None => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: "ID sandbox E2B absent".to_string(),
            is_error: true,
            metadata: None,
        },
    };

    // 2. Préparer le code (avec installation des packages si nécessaire)
    let full_code = if !packages.is_empty() && language == "python" {
        let pkg_list = packages.join(" ");
        format!("import subprocess\nsubprocess.run(['pip', 'install', '-q', '{}'])\n\n{}", pkg_list, code)
    } else {
        code.clone()
    };

    // 3. Exécuter le code
    let exec_body = serde_json::json!({ "code": full_code });
    let exec_url = format!("https://api.e2b.dev/sandboxes/{}/code", sandbox_id);
    let exec_resp = match client
        .post(&exec_url)
        .header("X-API-Key", &api_key)
        .header("Content-Type", "application/json")
        .body(exec_body.to_string())
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => return ToolResult {
            tool_use_id: tool_use_id.to_string(),
            content: format!("Erreur exécution E2B : {}", e),
            is_error: true,
            metadata: None,
        },
    };

    let exec_result: Value = exec_resp.json().await.unwrap_or_default();
    let stdout = exec_result["stdout"].as_str().unwrap_or("").to_string();
    let stderr = exec_result["stderr"].as_str().unwrap_or("").to_string();

    // 4. Récupérer les fichiers générés
    let files_url = format!("https://api.e2b.dev/sandboxes/{}/files", sandbox_id);
    let files_resp = client
        .get(&files_url)
        .header("X-API-Key", &api_key)
        .send()
        .await
        .ok();

    let mut saved_files: Vec<Value> = vec![];
    if let Some(resp) = files_resp {
        if let Ok(files_json) = resp.json::<Value>().await {
            if let Some(files) = files_json.as_array() {
                for f in files {
                    let name = f["name"].as_str().unwrap_or("file");
                    let content_b64 = f["content"].as_str().unwrap_or("");
                    if !content_b64.is_empty() {
                        let bytes = base64_decode(content_b64);
                        let timestamp = chrono::Utc::now().timestamp_millis();
                        let filename = format!("{}-{}", timestamp, name);
                        let path = outputs_dir().join(&filename);
                        if std::fs::write(&path, &bytes).is_ok() {
                            saved_files.push(serde_json::json!({
                                "name": name,
                                "local_path": path.to_string_lossy(),
                                "size_bytes": bytes.len()
                            }));
                        }
                    }
                }
            }
        }
    }

    // 5. Détruire la sandbox
    let _ = client
        .delete(&format!("https://api.e2b.dev/sandboxes/{}", sandbox_id))
        .header("X-API-Key", &api_key)
        .send()
        .await;

    let content = if !stderr.is_empty() {
        format!("stdout:\n{}\n\nstderr:\n{}", stdout, stderr)
    } else {
        stdout.clone()
    };

    ToolResult {
        tool_use_id: tool_use_id.to_string(),
        content,
        is_error: !stderr.is_empty() && stdout.is_empty(),
        metadata: Some(serde_json::json!({
            "files": saved_files,
            "language": language,
            "stdout": stdout,
            "stderr": stderr
        })),
    }
}
