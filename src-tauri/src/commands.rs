use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};

// ─── Structures ───────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
#[allow(dead_code)]
pub struct ProjectMeta {
    pub id: String,
    pub name: String,
    pub path: String,
    pub team_id: String,
    pub updated_at: String,
}

// ─── App data dir ─────────────────────────────────────────────────────────────

fn app_data_dir() -> PathBuf {
    let base = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    let dir = base.join("ronako");
    let _ = fs::create_dir_all(&dir);
    dir
}

// ─── Info ─────────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Ronako prêt, {}.", name)
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// ─── Clé API — chiffrement OS natif (keyring) ────────────────────────────────

const KEYRING_SERVICE: &str = "ronako";

#[tauri::command]
pub fn secure_set_key(account: String, secret: String) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, &account)
        .map_err(|e| e.to_string())?;
    entry.set_password(&secret).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn secure_get_key(account: String) -> Result<String, String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, &account)
        .map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn secure_delete_key(account: String) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, &account)
        .map_err(|e| e.to_string())?;
    entry.delete_credential().map_err(|e| e.to_string())
}

// ─── Filesystem ───────────────────────────────────────────────────────────────

#[tauri::command]
pub fn read_journal_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Lecture journal : {}", e))
}

#[tauri::command]
pub fn save_project_state(project_id: String, state: String) -> Result<(), String> {
    let dir = app_data_dir().join("projects");
    let _ = fs::create_dir_all(&dir);
    fs::write(dir.join(format!("{}.json", project_id)), state)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_project_state(project_id: String) -> Result<String, String> {
    let file = app_data_dir().join("projects").join(format!("{}.json", project_id));
    fs::read_to_string(file).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_projects_list() -> Result<Vec<String>, String> {
    let dir = app_data_dir().join("projects");
    if !dir.exists() { return Ok(vec![]); }
    let entries: Vec<String> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|x| x == "json").unwrap_or(false))
        .filter_map(|e| fs::read_to_string(e.path()).ok())
        .collect();
    Ok(entries)
}

// ─── Bibliothèque des livrables ──────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DeliverableMeta {
    pub id: String,
    pub path: String,
    pub date: String,
    pub brief: String,
    pub mode: String,
    pub agents: Vec<String>,
    pub score: f64,
    pub real_cost: f64,
    pub duration: u64,
}

#[tauri::command]
pub fn save_deliverable(
    project_path: String,
    folder_name: String,
    files: Vec<(String, String)>, // (nom_fichier, contenu)
) -> Result<String, String> {
    let base = if project_path.is_empty() || project_path == "/" {
        app_data_dir().join("livrables")
    } else {
        PathBuf::from(&project_path).join(".ronako").join("livrables")
    };
    let dir = base.join(&folder_name);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    for (name, content) in &files {
        // Créer les sous-dossiers si nécessaire (ex: "outputs/marcus.md")
        let file_path = dir.join(name);
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(&file_path, content).map_err(|e| e.to_string())?;
    }

    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn list_deliverables(project_path: String) -> Result<Vec<DeliverableMeta>, String> {
    let base = if project_path.is_empty() || project_path == "/" {
        app_data_dir().join("livrables")
    } else {
        PathBuf::from(&project_path).join(".ronako").join("livrables")
    };

    if !base.exists() { return Ok(vec![]); }

    let mut entries: Vec<DeliverableMeta> = fs::read_dir(&base)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .filter_map(|e| {
            let meta_path = e.path().join("meta.json");
            let content = fs::read_to_string(&meta_path).ok()?;
            serde_json::from_str::<DeliverableMeta>(&content).ok()
        })
        .collect();

    // Trier par date décroissante
    entries.sort_by(|a, b| b.date.cmp(&a.date));
    Ok(entries)
}

#[tauri::command]
pub fn load_deliverable_file(
    deliverable_path: String,
    file_name: String,
) -> Result<String, String> {
    let path = PathBuf::from(&deliverable_path).join(&file_name);
    fs::read_to_string(&path).map_err(|e| format!("Fichier non trouvé : {}", e))
}

#[tauri::command]
pub fn delete_deliverable(deliverable_path: String) -> Result<(), String> {
    fs::remove_dir_all(&deliverable_path).map_err(|e| e.to_string())
}

// ─── Connecteurs externos (Tavily, etc.) ─────────────────────────────────────

#[tauri::command]
pub async fn tavily_search(query: String, api_key: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut body = std::collections::HashMap::new();
    body.insert("query", query.clone());
    body.insert("api_key", api_key);
    body.insert("search_depth", "advanced".to_string());
    body.insert("max_results", "8".to_string());
    body.insert("include_answer", "true".to_string());

    let response = client
        .post("https://api.tavily.com/search")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Tavily erreur HTTP {}", response.status()));
    }
    response.text().await.map_err(|e| e.to_string())
}

// ─── Ouvrir HTML dans le navigateur ──────────────────────────────────────────

#[tauri::command]
pub async fn open_html_in_browser(html_content: String) -> Result<(), String> {
    let temp_dir = std::env::temp_dir();
    let filename = format!("ronako-{}.html", chrono::Utc::now().timestamp_millis());
    let path = temp_dir.join(filename);
    std::fs::write(&path, html_content.as_bytes()).map_err(|e| e.to_string())?;

    // Ouvrir avec le navigateur par défaut
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/c", "start", "", &path.to_string_lossy()])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ─── Connecteur HTTP custom (Phase 9) ────────────────────────────────────────

#[tauri::command]
pub async fn http_custom_call(
    url: String,
    method: String,
    headers: Vec<(String, String)>,
    body: Option<String>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let method_parsed = match method.to_uppercase().as_str() {
        "GET"    => reqwest::Method::GET,
        "POST"   => reqwest::Method::POST,
        "PUT"    => reqwest::Method::PUT,
        "PATCH"  => reqwest::Method::PATCH,
        "DELETE" => reqwest::Method::DELETE,
        other    => return Err(format!("Méthode HTTP inconnue : {}", other)),
    };

    let mut req = client.request(method_parsed, &url);
    for (name, value) in &headers {
        req = req.header(name.as_str(), value.as_str());
    }
    if let Some(b) = body {
        req = req.header("content-type", "application/json").body(b);
    }

    let response = req.send().await.map_err(|e| e.to_string())?;
    let status = response.status().as_u16();
    let text = response.text().await.map_err(|e| e.to_string())?;
    if status >= 400 {
        return Err(format!("HTTP {} : {}", status, &text[..text.len().min(500)]));
    }
    Ok(text)
}

// ─── Watcher journal_dev.md ───────────────────────────────────────────────────

use std::sync::Mutex;
use notify::{Watcher, RecursiveMode, RecommendedWatcher, Config};
use std::time::Duration;

// Watcher global — gardé en vie le temps de la session
static WATCHER: Mutex<Option<RecommendedWatcher>> = Mutex::new(None);

#[tauri::command]
pub fn start_journal_watch(app: AppHandle, path: String) -> Result<(), String> {
    let app_clone = app.clone();
    let path_clone = path.clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: notify::Result<notify::Event>| {
            if let Ok(event) = res {
                use notify::EventKind::*;
                if matches!(event.kind, Modify(_) | Create(_)) {
                    if let Ok(content) = fs::read_to_string(&path_clone) {
                        let _ = app_clone.emit("journal-updated", content);
                    }
                }
            }
        },
        Config::default().with_poll_interval(Duration::from_secs(2)),
    )
    .map_err(|e| e.to_string())?;

    watcher
        .watch(std::path::Path::new(&path), RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    *WATCHER.lock().unwrap() = Some(watcher);
    Ok(())
}

#[tauri::command]
pub fn stop_journal_watch() {
    *WATCHER.lock().unwrap() = None;
}
