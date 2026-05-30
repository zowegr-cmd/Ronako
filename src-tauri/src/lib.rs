mod commands;
mod anthropic;
mod folder;
pub mod tools;
pub mod mcp;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
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
            anthropic::anthropic_stream_with_tools,
            mcp::mcp_start,
            mcp::mcp_stop,
            mcp::mcp_list_tools_cmd,
            mcp::mcp_status,
            mcp::mcp_running_servers,
            folder::read_project_folder,
            commands::tavily_search,
            commands::http_custom_call,
            commands::open_html_in_browser,
            // Bibliothèque livrables
            commands::save_deliverable,
            commands::list_deliverables,
            commands::load_deliverable_file,
            commands::delete_deliverable,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ronako");
}
