/**
 * Traitement du logo Ronako.
 * Nécessite : src/assets/logo-source.png (fond blanc)
 * Génère :
 *   src/assets/logo-transparent.png  — fond transparent (usage sur fond sombre)
 *   src/assets/logo-dark.png         — fond #0B0B0C (usage général)
 *   src/assets/logo-light.png        — fond blanc propre (pour documents/exports)
 *   src-tauri/icons/                 — toutes tailles icônes OS depuis le vrai logo
 *
 * Usage : node scripts/process-logo.mjs
 */

import { Jimp } from "jimp";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const assetsDir = path.join(root, "src", "assets");
const iconsDir = path.join(root, "src-tauri", "icons");

const sourcePath = path.join(assetsDir, "logo-source.png");

if (!fs.existsSync(sourcePath)) {
  console.error(
    "\n Fichier introuvable : src/assets/logo-source.png\n" +
    " → Sauvegarde ton logo PNG dans ce dossier avec ce nom exact, puis relance le script.\n"
  );
  process.exit(1);
}

console.log("Chargement du logo source...");
const src = await Jimp.read(sourcePath);
const W = src.width;
const H = src.height;
console.log(`  Dimensions : ${W}x${H}px`);

// ─── Supprimer le fond blanc ─────────────────────────────────────────────────
// Parcourt chaque pixel, rend transparent tout ce qui est proche du blanc.
// Anti-aliasing : transition douce sur les bords (semi-transparent).
function removeWhiteBackground(img, threshold = 240, feather = 20) {
  const out = img.clone();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = img.getPixelColor(x, y);
      const r = (c >>> 24) & 0xFF;
      const g = (c >>> 16) & 0xFF;
      const b = (c >>> 8) & 0xFF;
      const brightness = (r + g + b) / 3;

      if (brightness >= threshold) {
        // Pixel blanc/quasi-blanc → transparent
        out.setPixelColor(0x00000000, x, y);
      } else if (brightness >= threshold - feather) {
        // Zone de transition → semi-transparent
        const alpha = Math.round(((threshold - brightness) / feather) * 255);
        out.setPixelColor(((r << 24) | (g << 16) | (b << 8) | alpha) >>> 0, x, y);
      }
    }
  }
  return out;
}

// ─── Ajouter un fond de couleur ──────────────────────────────────────────────
function addBackground(transparent, bgR, bgG, bgB) {
  const out = new Jimp({ width: W, height: H, color: ((bgR << 24) | (bgG << 16) | (bgB << 8) | 0xFF) >>> 0 });
  // Composite le logo transparent par-dessus
  out.composite(transparent, 0, 0);
  return out;
}

// ─── Générer les versions ─────────────────────────────────────────────────────
console.log("Suppression du fond blanc...");
const transparent = removeWhiteBackground(src);

console.log("Génération des versions...");

// 1. Transparent
await transparent.write(path.join(assetsDir, "logo-transparent.png"));
console.log("  logo-transparent.png ✓");

// 2. Fond sombre Onyx (#0B0B0C)
const dark = addBackground(transparent, 11, 11, 12);
await dark.write(path.join(assetsDir, "logo-dark.png"));
console.log("  logo-dark.png ✓");

// 3. Fond blanc propre
const light = addBackground(transparent, 255, 255, 255);
await light.write(path.join(assetsDir, "logo-light.png"));
console.log("  logo-light.png ✓");

// ─── Icônes OS depuis le vrai logo ───────────────────────────────────────────
fs.mkdirSync(iconsDir, { recursive: true });

// Version carrée avec padding (le logo est dans ~85% du carré, fond sombre)
async function makeIconSize(size) {
  const padding = Math.round(size * 0.08);
  const inner = size - padding * 2;
  const bg = new Jimp({ width: size, height: size, color: 0x0B0B0CFF });

  // Redimensionner le logo transparent
  const logo = transparent.clone().resize({ w: inner, h: inner });

  bg.composite(logo, padding, padding);
  return bg;
}

// PNG sizes pour Tauri
const pngSizes = [32, 64, 128, 256, 512];
for (const s of pngSizes) {
  const icon = await makeIconSize(s);
  await icon.write(path.join(iconsDir, `${s}x${s}.png`));
}
await (await makeIconSize(128)).write(path.join(iconsDir, "128x128.png"));
await (await makeIconSize(256)).write(path.join(iconsDir, "128x128@2x.png"));
console.log("  PNG icônes : 32, 64, 128, 256, 512px ✓");

// ICO Windows (PNG-in-ICO)
async function buildIco(sizes) {
  const entries = await Promise.all(sizes.map(async (s) => {
    const icon = await makeIconSize(s);
    return { size: s, buf: await icon.getBuffer("image/png") };
  }));
  const count = entries.length;
  let offset = 6 + count * 16;
  const dirs = entries.map(({ size, buf }) => {
    const d = { size, buf, offset };
    offset += buf.length;
    return d;
  });
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(count, 4);
  const dir = Buffer.alloc(count * 16);
  dirs.forEach(({ size, buf, offset: off }, i) => {
    const b = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, b); dir.writeUInt8(size >= 256 ? 0 : size, b + 1);
    dir.writeUInt8(0, b + 2); dir.writeUInt8(0, b + 3);
    dir.writeUInt16LE(0, b + 4); dir.writeUInt16LE(32, b + 6);
    dir.writeUInt32LE(buf.length, b + 8); dir.writeUInt32LE(off, b + 12);
  });
  return Buffer.concat([header, dir, ...dirs.map((d) => d.buf)]);
}

fs.writeFileSync(path.join(iconsDir, "icon.ico"), await buildIco([16, 32, 48, 256]));
console.log("  icon.ico ✓");

// ICNS macOS placeholder (vrai ICNS généré par Tauri sur macOS)
const icns256 = await makeIconSize(256);
fs.writeFileSync(path.join(iconsDir, "icon.icns"), await icns256.getBuffer("image/png"));
console.log("  icon.icns ✓");

console.log(`
Logo traité avec succès !

Fichiers générés :
  src/assets/logo-transparent.png  → sur fond sombre (app)
  src/assets/logo-dark.png         → fond Onyx (exports dark)
  src/assets/logo-light.png        → fond blanc (documents)
  src-tauri/icons/                 → icônes OS (${pngSizes.join(', ')}px)

Prochaine étape :
  npm run tauri dev  — le vrai logo apparaît dans la barre de titre et le Launcher
`);
