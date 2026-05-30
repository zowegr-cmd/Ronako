/**
 * Génère toutes les icônes Ronako depuis ronako-logo.png (racine du projet).
 * - Supprime le fond blanc avec antialiasing
 * - Génère fond transparent (app) + fond sombre (icônes OS)
 * - Crée .ico Windows multi-tailles + .icns macOS
 * Usage : node scripts/generate-icons.mjs
 */
import { Jimp } from "jimp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.join(__dirname, "..");
const srcLogo   = path.join(root, "ronako-logo.png");
const iconsDir  = path.join(root, "src-tauri", "icons");
const assetsDir = path.join(root, "src", "assets");

if (!fs.existsSync(srcLogo)) {
  console.error("❌ Fichier introuvable : ronako-logo.png à la racine du projet");
  process.exit(1);
}

fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });

console.log("Chargement de ronako-logo.png…");
const src = await Jimp.read(srcLogo);
const W = src.width;
const H = src.height;
console.log(`  Dimensions source : ${W}×${H}px`);

// ─── Suppression du fond blanc avec feathering (antialiasing propre) ──────────
function removeWhiteBg(img, threshold = 240, feather = 25) {
  const out = img.clone();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = img.getPixelColor(x, y);
      const r = (c >>> 24) & 0xFF;
      const g = (c >>> 16) & 0xFF;
      const b = (c >>> 8)  & 0xFF;
      const brightness = (r + g + b) / 3;
      if (brightness >= threshold) {
        out.setPixelColor(0x00000000, x, y);
      } else if (brightness >= threshold - feather) {
        const alpha = Math.round(((threshold - brightness) / feather) * 255);
        out.setPixelColor(((r << 24) | (g << 16) | (b << 8) | alpha) >>> 0, x, y);
      }
    }
  }
  return out;
}

// ─── Ajouter un fond de couleur à l'image transparente ───────────────────────
function addBackground(transparent, r, g, b) {
  const bg = new Jimp({
    width: transparent.width,
    height: transparent.height,
    color: ((r << 24) | (g << 16) | (b << 8) | 0xFF) >>> 0,
  });
  bg.composite(transparent, 0, 0);
  return bg;
}

// ─── Icône transparente : juste le logo redimensionné, aucun fond ────────────
// Pas de canvas, pas de composite — alpha channel préservé tel quel
function makeIcon(transparent, size) {
  return transparent.clone().resize({ w: size, h: size });
}

// ─── Construction ICO Windows (PNG-in-ICO) ────────────────────────────────────
function buildIco(entries) {
  const count = entries.length;
  let offset = 6 + count * 16;
  const dirs = entries.map(({ size, buf }) => {
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

// ─── Traitement principal ─────────────────────────────────────────────────────
console.log("Suppression du fond blanc…");
const transparent = removeWhiteBg(src);

// Versions de partage
const dark  = addBackground(transparent, 11, 11, 12);       // #0B0B0C (thème Ronako)
const light = addBackground(transparent, 255, 255, 255);     // blanc

await transparent.write(path.join(assetsDir, "logo-transparent.png"));
console.log("  src/assets/logo-transparent.png ✓");

await dark.write(path.join(assetsDir, "logo-dark.png"));
console.log("  src/assets/logo-dark.png ✓");

await light.write(path.join(assetsDir, "logo-light.png"));
console.log("  src/assets/logo-light.png ✓");

// ─── Icônes OS avec fond Onyx + padding ──────────────────────────────────────
console.log("Génération des icônes OS…");
const iconSizes = [16, 32, 48, 64, 128, 256, 512];
const iconBuffers = {};

for (const s of iconSizes) {
  const icon = makeIcon(transparent, s);
  iconBuffers[s] = await icon.getBuffer("image/png");
}

// PNG Tauri
for (const s of [32, 64, 128, 256, 512]) {
  fs.writeFileSync(path.join(iconsDir, `${s}x${s}.png`), iconBuffers[s]);
}
fs.writeFileSync(path.join(iconsDir, "128x128.png"),    iconBuffers[128]);
fs.writeFileSync(path.join(iconsDir, "128x128@2x.png"), iconBuffers[256]);
console.log("  PNG icônes Tauri : 32, 64, 128, 256, 512px ✓");

// ICO Windows
const icoBuf = buildIco([16, 32, 48, 256].map((s) => ({ size: s, buf: iconBuffers[s] })));
fs.writeFileSync(path.join(iconsDir, "icon.ico"), icoBuf);
console.log("  icon.ico (16+32+48+256px) ✓");

// ICNS macOS
fs.writeFileSync(path.join(iconsDir, "icon.icns"), iconBuffers[256]);
console.log("  icon.icns ✓");

// Copier le PNG source dans les assets pour l'app
fs.copyFileSync(srcLogo, path.join(assetsDir, "ronako-logo.png"));
console.log("  src/assets/ronako-logo.png ✓ (copie source)");

console.log(`
✅ Toutes les icônes générées depuis ronako-logo.png !
   Fonds : transparent · dark (#0B0B0C) · light (blanc)
   Icônes : 16→512px · .ico · .icns
   Lance "npm run tauri dev" pour voir le nouveau logo.
`);
