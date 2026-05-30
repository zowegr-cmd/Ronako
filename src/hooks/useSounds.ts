import { useCallback } from "react";
import { useSettingsStore } from "@/store/settingsStore";

// Toutes les synthèses sonores sont générées via Web Audio API.
// Aucun fichier externe — sons créés programmatiquement.

function createCtx() {
  return new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
}

export function useSounds() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);

  // ── Micro-clic mécanique (DnD drag & drop) ───────────────────────
  const playClick = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = createCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
    ctx.close();
  }, [soundEnabled]);

  // ── Clochette cristalline zen (fin de chaîne) ────────────────────
  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = createCtx();
    const now = ctx.currentTime;
    [880, 1108, 1320, 1760].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22 / (i + 1), t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
      osc.start(t);
      osc.stop(t + 1.4);
    });
    setTimeout(() => ctx.close(), 2000);
  }, [soundEnabled]);

  // ── Accord de lancement de chaîne ───────────────────────────────
  const playChainStart = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = createCtx();
    const now = ctx.currentTime;
    [261.63, 329.63, 392.00].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.07;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    });
    setTimeout(() => ctx.close(), 600);
  }, [soundEnabled]);

  // ── Notification toast ───────────────────────────────────────────
  const playNotification = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = createCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(550, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
    setTimeout(() => ctx.close(), 400);
  }, [soundEnabled]);

  // ── Erreur (grave) ───────────────────────────────────────────────
  const playError = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = createCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.setValueAtTime(196, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.38);
    setTimeout(() => ctx.close(), 500);
  }, [soundEnabled]);

  return { playClick, playChime, playChainStart, playNotification, playError };
}
