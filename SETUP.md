# Ronako — Setup Guide

## Installation automatique (recommandé)

Ouvre PowerShell dans le dossier Ronako et lance :

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\install.ps1
```

Le script installe automatiquement : Rust, MSVC Build Tools, Node.js (si absent), les dépendances npm.

## Lancer l'app

```bash
npm run tauri dev
```

Première compilation Rust : ~3-5 min. Les suivantes : ~5 sec.

---

## Setup manuel (si besoin)

### 1. Rust
**Windows** : https://rustup.rs/ → `rustup-init.exe`
**macOS** : `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

### 2. C++ Build Tools (Windows uniquement)
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --override "--quiet --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

### 3. Xcode CLI (macOS uniquement)
```bash
xcode-select --install
```

### 4. Dépendances
```bash
npm install
```

## Build production
```bash
npm run tauri build
```
