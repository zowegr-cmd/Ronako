mod commands;
mod anthropic;
mod folder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::get_app_version,
            commands::secure_set_key,
            commands::secure_get_key,
            commands::secure_delete_key,
            commands::read_journal_file,
            commands::save_project_state,
            commands::load_project_state,
            commands::get_projects_list,
            commands::start_journal_watch,
            commands::stop_journal_watch,
            anthropic::anthropic_stream,
            anthropic::anthropic_abort,
            folder::read_project_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ronako");
}
