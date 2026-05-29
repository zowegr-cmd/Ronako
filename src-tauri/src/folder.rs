use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

// ─── Dossiers et fichiers à exclure ──────────────────────────────────────────

const EXCLUDED_DIRS: &[&str] = &[
    "node_modules", ".git", "dist", "build", "target", ".next", ".nuxt",
    "__pycache__", ".venv", "venv", ".env", "coverage", ".cache", ".turbo",
    "out", ".output", ".svelte-kit", ".parcel-cache", "vendor", ".idea",
    ".vscode", "Pods", "DerivedData",
];

const INCLUDED_EXTENSIONS: &[&str] = &[
    // Web / JS
    "ts", "tsx", "js", "jsx", "mjs", "cjs", "vue", "svelte",
    // Styles
    "css", "scss", "sass", "less",
    // Markup
    "html", "htm", "xml", "svg",
    // Back-end
    "py", "rs", "go", "java", "cs", "cpp", "c", "h", "rb", "php",
    "swift", "kt", "dart",
    // Config / Data
    "json", "jsonc", "yaml", "yml", "toml", "ini", "env",
    // Docs
    "md", "mdx", "txt", "rst",
    // DB
    "sql", "graphql", "gql",
];

const MAX_FILE_SIZE_BYTES: u64 = 100 * 1024;   // 100 KB par fichier
const MAX_TOTAL_BYTES: usize  = 600 * 1024;   // 600 KB total

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileEntry {
    pub path: String,        // chemin relatif depuis la racine du projet
    pub content: String,
    pub size: usize,
    pub extension: String,
}

#[derive(Serialize, Debug)]
pub struct FolderSummary {
    pub root: String,
    pub tree: String,        // représentation ASCII de l'arborescence
    pub files: Vec<FileEntry>,
    pub total_files: usize,
    pub total_size_kb: f64,
    pub skipped_files: usize, // fichiers ignorés (trop gros, non supportés)
    pub truncated: bool,      // vrai si on a atteint la limite totale
}

// ─── Lecture du dossier ───────────────────────────────────────────────────────

#[tauri::command]
pub fn read_project_folder(path: String) -> Result<FolderSummary, String> {
    let root = PathBuf::from(&path);
    if !root.exists() || !root.is_dir() {
        return Err(format!("Dossier introuvable : {}", path));
    }

    let mut files: Vec<FileEntry> = Vec::new();
    let mut total_size: usize = 0;
    let mut skipped = 0usize;
    let mut truncated = false;

    for entry in WalkDir::new(&root)
        .into_iter()
        .filter_entry(|e| !is_excluded(e.path()))
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let file_path = entry.path();

        // Filtre extension
        let ext = file_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        if !INCLUDED_EXTENSIONS.contains(&ext.as_str()) {
            continue;
        }

        // Filtre taille fichier individuel
        let metadata = match std::fs::metadata(file_path) {
            Ok(m) => m,
            Err(_) => { skipped += 1; continue; }
        };
        if metadata.len() > MAX_FILE_SIZE_BYTES {
            skipped += 1;
            continue;
        }

        // Lire le contenu
        let content = match std::fs::read_to_string(file_path) {
            Ok(c) => c,
            Err(_) => { skipped += 1; continue; } // binaire ou encodage non UTF-8
        };

        // Limite globale
        if total_size + content.len() > MAX_TOTAL_BYTES {
            truncated = true;
            break;
        }

        let rel_path = file_path
            .strip_prefix(&root)
            .unwrap_or(file_path)
            .to_string_lossy()
            .replace('\\', "/");

        total_size += content.len();
        files.push(FileEntry {
            path: rel_path,
            size: content.len(),
            extension: ext,
            content,
        });
    }

    let total_files = files.len();
    let total_size_kb = total_size as f64 / 1024.0;
    let tree = build_tree(&root, &files);

    Ok(FolderSummary {
        root: path,
        tree,
        files,
        total_files,
        total_size_kb,
        skipped_files: skipped,
        truncated,
    })
}

// ─── Construire l'arborescence ASCII ─────────────────────────────────────────

fn build_tree(root: &Path, files: &[FileEntry]) -> String {
    let root_name = root.file_name().and_then(|n| n.to_str()).unwrap_or(".");
    let mut lines = vec![format!("{}/", root_name)];

    let mut paths: Vec<&str> = files.iter().map(|f| f.path.as_str()).collect();
    paths.sort();

    // Grouper par dossier pour un affichage propre
    let mut seen_dirs: std::collections::HashSet<String> = std::collections::HashSet::new();
    for path in &paths {
        let parts: Vec<&str> = path.split('/').collect();
        for depth in 0..parts.len() {
            if depth < parts.len() - 1 {
                let dir = parts[..=depth].join("/");
                if seen_dirs.insert(dir.clone()) {
                    let indent = "  ".repeat(depth + 1);
                    lines.push(format!("{}📁 {}/", indent, parts[depth]));
                }
            } else {
                let indent = "  ".repeat(depth + 1);
                let icon = match parts[depth].split('.').last().unwrap_or("") {
                    "ts" | "tsx" => "🔷",
                    "js" | "jsx" => "🟡",
                    "py" => "🐍",
                    "rs" => "🦀",
                    "md" => "📝",
                    "json" | "yaml" | "toml" => "⚙️",
                    "css" | "scss" => "🎨",
                    _ => "📄",
                };
                lines.push(format!("{}{} {}", indent, icon, parts[depth]));
            }
        }
    }

    lines.join("\n")
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn is_excluded(path: &Path) -> bool {
    path.components().any(|comp| {
        if let std::path::Component::Normal(name) = comp {
            let s = name.to_string_lossy();
            EXCLUDED_DIRS.iter().any(|ex| s == *ex) || s.starts_with('.')
        } else {
            false
        }
    })
}
