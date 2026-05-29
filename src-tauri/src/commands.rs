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
