#Requires -Version 5.1
<#
.SYNOPSIS
  Ronako — Script d'installation automatique
  Lance ce script une seule fois pour configurer l'environnement de développement complet.
  Ensuite : npm run tauri dev
#>

$ErrorActionPreference = "Stop"

function Write-Step { param($msg) Write-Host "`n[Ronako] $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  !!  $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "  ERR $msg" -ForegroundColor Red }

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host ""
Write-Host "=========================================" -ForegroundColor Magenta
Write-Host "  Ronako — Setup automatique" -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Magenta

# ─── 1. WebView2 (requis Tauri / Windows) ───────────────────────────────────
Write-Step "Vérification WebView2..."
$wv2 = Get-ItemProperty "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
if ($wv2) {
  Write-OK "WebView2 présent (v$($wv2.pv))"
} else {
  Write-Warn "WebView2 absent — installation..."
  winget install Microsoft.EdgeWebView2Runtime --accept-source-agreements --accept-package-agreements --silent
  Write-OK "WebView2 installé"
}

# ─── 2. Rust ─────────────────────────────────────────────────────────────────
Write-Step "Vérification Rust..."
$env:PATH = "$env:USERPROFILE\.cargo\bin;" + $env:PATH
$rustVersion = & rustc --version 2>$null
if ($rustVersion) {
  Write-OK "Rust déjà installé : $rustVersion"
} else {
  Write-Warn "Rust absent — installation via winget..."
  winget install Rustlang.Rustup --accept-source-agreements --accept-package-agreements --silent
  $env:PATH = "$env:USERPROFILE\.cargo\bin;" + $env:PATH
  Write-OK "Rust installé : $(rustc --version)"
}

# ─── 3. MSVC Build Tools (linker Windows) ────────────────────────────────────
Write-Step "Vérification MSVC Build Tools..."
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$hasVCTools = $false
if (Test-Path $vswhere) {
  $installations = & $vswhere -products * -requires Microsoft.VisualCpp.Tools.HostX64.TargetX64 -property installationPath 2>$null
  if ($installations) { $hasVCTools = $true }
}
# Fallback: try compiling
if (-not $hasVCTools) {
  $testDir = New-Item -ItemType Directory -Path "$env:TEMP\ronako_rust_test" -Force
  "fn main() {}" | Set-Content "$testDir\main.rs"
  $result = & rustc "$testDir\main.rs" -o "$testDir\test.exe" 2>&1
  if ($LASTEXITCODE -eq 0) { $hasVCTools = $true }
  Remove-Item $testDir -Recurse -Force
}

if ($hasVCTools) {
  Write-OK "MSVC Build Tools présents"
} else {
  Write-Warn "MSVC Build Tools absents — installation (~2-3 Go, 15-25 min)..."
  Write-Host "  Téléchargement en cours, merci de patienter..." -ForegroundColor Gray
  winget install Microsoft.VisualStudio.2022.BuildTools `
    --accept-source-agreements --accept-package-agreements `
    --override "--quiet --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
  Write-OK "MSVC Build Tools installés"
}

# ─── 4. Node.js ──────────────────────────────────────────────────────────────
Write-Step "Vérification Node.js..."
$nodeVersion = & node --version 2>$null
if ($nodeVersion) {
  Write-OK "Node.js déjà installé : $nodeVersion"
} else {
  Write-Warn "Node.js absent — installation via winget..."
  winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent
  $env:PATH = "${env:ProgramFiles}\nodejs;" + $env:PATH
  Write-OK "Node.js installé : $(node --version)"
}

# ─── 5. npm install ──────────────────────────────────────────────────────────
Write-Step "Installation des dépendances Node..."
& npm install
Write-OK "node_modules prêt"

# ─── 6. Génération des icônes ────────────────────────────────────────────────
Write-Step "Génération des icônes..."
& node scripts/generate-icons.mjs
Write-OK "Icônes générées dans src-tauri/icons/"

# ─── 6. Résumé ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Setup terminé ! Pour lancer l'app :" -ForegroundColor Green
Write-Host ""
Write-Host "  npm run tauri dev" -ForegroundColor White
Write-Host ""
Write-Host "  Première compilation Rust : ~3-5 min" -ForegroundColor Gray
Write-Host "  Compilations suivantes    : ~5 sec" -ForegroundColor Gray
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
