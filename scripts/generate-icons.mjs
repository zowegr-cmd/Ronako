/**
 * Génère toutes les icônes Ronako depuis le SVG vectoriel.
 * Source : src/assets/logo.svg (fond transparent)
 * Usage  : node scripts/generate-icons.mjs
 */
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.join(__dirname, "..");
const svgPath   = path.join(root, "src", "assets", "logo.svg");
const iconsDir  = path.join(root, "src-tauri", "icons");
const assetsDir = path.join(root, "src", "assets");

fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });

const svgData = fs.readFileSync(svgPath, "utf8");
console.log("Logo SVG chargé depuis src/assets/logo.svg");

// ─── Rendre le SVG en PNG à la taille voulue ────────────────────────────────
function renderPng(svgStr, size, bgColor = null) {
  // Fond sombre optionnel : on entoure le SVG d'un rect
  const wrapped = bgColor
    ? svgStr.replace(
        "<svg",
        `<svg style="background:${bgColor}"`
      )
    : svgStr;

  const resvg = new Resvg(wrapped, {
    fitTo: { mode: "width", value: size },
    background: bgColor ?? "transparent",
  });
  return resvg.render().asPng();
}

// ─── Version transparente (pour l'app) ──────────────────────────────────────
const png512 = renderPng(svgData, 512);
fs.writeFileSync(path.join(assetsDir, "logo-transparent.png"), png512);
console.log("  src/assets/logo-transparent.png ✓");

// Version fond sombre (pour partager)
const png512dark = renderPng(svgData, 512, "#0B0B0C");
fs.writeFileSync(path.join(assetsDir, "logo-dark.png"), png512dark);
console.log("  src/assets/logo-dark.png ✓");

// Version fond blanc
const png512light = renderPng(svgData, 512, "#FFFFFF");
fs.writeFileSync(path.join(assetsDir, "logo-light.png"), png512light);
console.log("  src/assets/logo-light.png ✓");

// ─── Icônes OS depuis le SVG avec fond sombre ────────────────────────────────
const SIZES = [16, 32, 48, 64, 128, 256, 512];
const pngBuffers = {};

for (const s of SIZES) {
  pngBuffers[s] = renderPng(svgData, s, "#0B0B0C");
}

// PNG pour Tauri
for (const s of [32, 64, 128, 256, 512]) {
  fs.writeFileSync(path.join(iconsDir, `${s}x${s}.png`), pngBuffers[s]);
}
fs.writeFileSync(path.join(iconsDir, "128x128.png"),    pngBuffers[128]);
fs.writeFileSync(path.join(iconsDir, "128x128@2x.png"), pngBuffers[256]);
console.log("  PNG icônes OS : 32, 64, 128, 256, 512px ✓");

// ─── ICO Windows (PNG-in-ICO : 16, 32, 48, 256) ─────────────────────────────
function buildIco(entries) {
  const count  = entries.length;
  let   offset = 6 + count * 16;
  const dirs   = entries.map(({ size, buf }) => {
    const d = { size, buf, offset };
    offset += buf.length;
    return d;
  });
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const dir = Buffer.alloc(count * 16);
  dirs.forEach(({ size, buf, offset: off }, i) => {
    const b = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, b);
    dir.writeUInt8(size >= 256 ? 0 : size, b + 1);
    dir.writeUInt8(0, b + 2); dir.writeUInt8(0, b + 3);
    dir.writeUInt16LE(0, b + 4); dir.writeUInt16LE(32, b + 6);
    dir.writeUInt32LE(buf.length, b + 8);
    dir.writeUInt32LE(off, b + 12);
  });
  return Buffer.concat([header, dir, ...dirs.map((d) => d.buf)]);
}

const icoBuf = buildIco([16, 32, 48, 256].map((s) => ({ size: s, buf: pngBuffers[s] })));
fs.writeFileSync(path.join(iconsDir, "icon.ico"), icoBuf);
console.log("  icon.ico (16+32+48+256px) ✓");

// ICNS macOS (PNG 256px — Tauri génère le vrai ICNS sur macOS)
fs.writeFileSync(path.join(iconsDir, "icon.icns"), pngBuffers[256]);
console.log("  icon.icns ✓");

console.log(`
Icônes générées avec succès depuis logo.svg !
Relance l'app pour voir le logo dans la barre de titre et le Launcher.
`);
