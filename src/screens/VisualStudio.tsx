import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, ChevronLeft, ChevronRight, Search, Sparkles, Volume2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVisualStore, type VisualEntry } from "@/store/visualStore";
import { useProjectStore } from "@/store/projectStore";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { useToastStore } from "@/store/toastStore";

type StudioTab = "images" | "videos" | "audio";

export function VisualStudio() {
  const [tab, setTab] = useState<StudioTab>("images");
  const [search, setSearch] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { visuals, isGenerating, generatingType } = useVisualStore();
  const { getActiveProject } = useProjectStore();
  const toast = useToastStore();
  const project = getActiveProject();

  // Écouter les events tool-result pour ajouter les visuels générés en live
  useEffect(() => {
    const handler = (e: Event) => {
      const { tool_name, is_error, metadata } = (e as CustomEvent).detail as {
        tool_name: string; is_error: boolean; metadata?: Record<string, unknown>;
      };
      if (!metadata || is_error) return;
      const { addVisual } = useVisualStore.getState();
      if (tool_name === "generate_image_dalle" || tool_name === "generate_image_flux") {
        const local_path = String(metadata.local_path ?? "");
        if (local_path) {
          addVisual({
            type: "image",
            local_path,
            url: String(metadata.url ?? ""),
            model: String(metadata.model ?? tool_name),
            prompt: String(metadata.prompt ?? ""),
            cost_cents: Number(metadata.cost_cents ?? 0),
            agentId: "pixel",
            projectName: project?.name,
          });
        }
      }
    };
    document.addEventListener("tool-result", handler);
    return () => document.removeEventListener("tool-result", handler);
  }, [project?.name]);

  const filtered = visuals.filter((v) => {
    const typeMatch = tab === "images" ? v.type === "image" : tab === "videos" ? v.type === "video" : v.type === "audio";
    const searchMatch = !search || v.prompt.toLowerCase().includes(search.toLowerCase()) || v.model.toLowerCase().includes(search.toLowerCase());
    return typeMatch && searchMatch;
  });

  const images = filtered.filter((v) => v.type === "image");
  const videos = filtered.filter((v) => v.type === "video");
  const audios = filtered.filter((v) => v.type === "audio");

  const handleDownload = useCallback(async (v: VisualEntry) => {
    try {
      const ext = v.type === "image" ? "png" : v.type === "video" ? "mp4" : "mp3";
      const defaultName = `${v.model.replace(/[^a-z0-9]/gi, "-")}-${Date.now()}.${ext}`;
      await invoke("download_visual_dialog", { path: v.local_path, defaultName });
      toast.success("Téléchargé !", defaultName);
    } catch (e) {
      toast.error("Erreur téléchargement", String(e));
    }
  }, [toast]);

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setLightboxIndex((i) => i !== null ? Math.min(i + 1, images.length - 1) : null);
      if (e.key === "ArrowLeft") setLightboxIndex((i) => i !== null ? Math.max(i - 1, 0) : null);
      if (e.key === "Escape") setLightboxIndex(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, images.length]);

  const TABS: { id: StudioTab; label: string; icon: string; count: number }[] = [
    { id: "images", label: "Images", icon: "🖼️", count: visuals.filter((v) => v.type === "image").length },
    { id: "videos", label: "Vidéos", icon: "🎬", count: visuals.filter((v) => v.type === "video").length },
    { id: "audio",  label: "Audio",  icon: "🔊", count: visuals.filter((v) => v.type === "audio").length },
  ];

  return (
    <div className="h-full flex flex-col bg-onyx overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-crystal/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <Sparkles size={18} className="text-electric" />
          <div>
            <h1 className="text-base font-bold text-silk">Studio Visuel</h1>
            <p className="text-[10px] text-silk/30">
              {project?.name ?? "Aucun projet"} · {visuals.length} fichier{visuals.length !== 1 ? "s" : ""}
              {isGenerating && <span className="text-electric/60 ml-2 animate-pulse">· Génération en cours…</span>}
            </p>
          </div>
        </div>
        {/* Search */}
        <div className="relative w-48">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-silk/25 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full bg-graphite border border-crystal rounded-xl pl-7 pr-3 py-1.5 text-xs text-silk/60 placeholder-silk/20 focus:outline-none focus:border-electric/40" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-crystal/30 shrink-0">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 -mb-px",
              tab === t.id ? "text-electric border-electric bg-electric/5" : "text-silk/40 border-transparent hover:text-silk/60",
            )}>
            <span>{t.icon}</span> {t.label}
            {t.count > 0 && <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full", tab === t.id ? "bg-electric/15 text-electric" : "bg-crystal/50 text-silk/30")}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <AnimatePresence mode="wait">
          {tab === "images" && (
            <motion.div key="images" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ImagesTab
                images={images} isGenerating={isGenerating && generatingType === "image"}
                onImageClick={(idx) => setLightboxIndex(idx)}
                onDownload={handleDownload}
              />
            </motion.div>
          )}
          {tab === "videos" && (
            <motion.div key="videos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <VideosTab videos={videos} isGenerating={isGenerating && generatingType === "video"} onDownload={handleDownload} />
            </motion.div>
          )}
          {tab === "audio" && (
            <motion.div key="audio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AudioTab audios={audios} isGenerating={isGenerating && generatingType === "audio"} onDownload={handleDownload} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && images[lightboxIndex] && (
          <ImageLightbox
            image={images[lightboxIndex]}
            index={lightboxIndex}
            total={images.length}
            onClose={() => setLightboxIndex(null)}
            onPrev={() => setLightboxIndex((i) => i !== null ? Math.max(i - 1, 0) : null)}
            onNext={() => setLightboxIndex((i) => i !== null ? Math.min(i + 1, images.length - 1) : null)}
            onDownload={handleDownload}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Onglet Images ─────────────────────────────────────────────────────────────

function ImagesTab({ images, isGenerating, onImageClick, onDownload }: {
  images: VisualEntry[];
  isGenerating: boolean;
  onImageClick: (idx: number) => void;
  onDownload: (v: VisualEntry) => void;
}) {
  if (images.length === 0 && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-graphite border border-crystal flex items-center justify-center text-2xl">🖼️</div>
        <p className="text-sm font-medium text-silk/40">Aucune image générée</p>
        <p className="text-xs text-silk/25 max-w-xs">Ajoute <strong className="text-silk/40">Pixel</strong> dans ta chaîne avec les connecteurs DALL-E ou Flux pour générer des visuels.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Grille 3 colonnes */}
      <div className="grid grid-cols-3 gap-3">
        {/* Placeholders si génération en cours */}
        {isGenerating && Array.from({ length: 3 }).map((_, i) => (
          <div key={`gen-${i}`} className="aspect-square bg-graphite border border-crystal/50 rounded-xl overflow-hidden relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <motion.div className="w-8 h-8 rounded-full border-2 border-electric/30 border-t-electric"
                animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} />
              <span className="text-[10px] text-silk/30">{i === 0 ? "Génération…" : "En attente"}</span>
            </div>
          </div>
        ))}

        {images.map((img, idx) => (
          <div key={img.id} className="group relative aspect-square bg-graphite border border-crystal/50 rounded-xl overflow-hidden cursor-pointer"
            onClick={() => onImageClick(idx)}>
            <img src={convertFileSrc(img.local_path)} alt={img.prompt} className="w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => { if (img.url) (e.target as HTMLImageElement).src = img.url; }} />
            {/* Overlay actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 gap-1.5">
              <button onClick={(e) => { e.stopPropagation(); void onDownload(img); }}
                className="flex items-center gap-1 text-[9px] text-white/80 bg-black/50 hover:bg-black/70 rounded-lg px-2 py-1">
                <Download size={9} /> PNG
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] text-white/50 truncate">{img.model}</p>
                <p className="text-[8px] text-white/30">${(img.cost_cents / 100).toFixed(3)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Prompt affiché sous la dernière image */}
      {images.length > 0 && (
        <div className="bg-graphite border border-crystal/40 rounded-xl px-4 py-3">
          <p className="text-[9px] text-silk/30 uppercase tracking-widest mb-1">Dernier prompt utilisé</p>
          <p className="text-xs text-silk/60 leading-relaxed font-mono">{images[images.length - 1].prompt}</p>
        </div>
      )}
    </div>
  );
}

// ── Onglet Vidéos ─────────────────────────────────────────────────────────────

function VideosTab({ videos, isGenerating, onDownload }: { videos: VisualEntry[]; isGenerating: boolean; onDownload: (v: VisualEntry) => void }) {
  if (videos.length === 0 && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-graphite border border-crystal flex items-center justify-center text-2xl">🎬</div>
        <p className="text-sm font-medium text-silk/40">Aucune vidéo générée</p>
        <p className="text-xs text-silk/25 max-w-xs">Ajoute <strong className="text-silk/40">Motion</strong> avec le connecteur Runway pour générer des vidéos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {isGenerating && (
        <div className="bg-graphite border border-crystal/50 rounded-xl p-6 flex flex-col items-center gap-3">
          <motion.div className="w-10 h-10 rounded-full border-2 border-mystic/30 border-t-mystic"
            animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} />
          <p className="text-xs text-silk/40">Runway ML · génération en cours · ~60s</p>
          <div className="w-48 h-1 bg-crystal rounded-full overflow-hidden">
            <motion.div className="h-full bg-mystic rounded-full"
              initial={{ width: "5%" }} animate={{ width: "90%" }} transition={{ duration: 55, ease: "linear" }} />
          </div>
        </div>
      )}
      {videos.map((v) => (
        <div key={v.id} className="bg-graphite border border-crystal/50 rounded-xl overflow-hidden">
          <video src={convertFileSrc(v.local_path)} controls className="w-full" style={{ maxHeight: 320 }} />
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-silk/50 mb-1 font-mono line-clamp-1">{v.prompt}</p>
              <p className="text-[10px] text-silk/30">{v.model} · ${(v.cost_cents / 100).toFixed(3)}</p>
            </div>
            <button onClick={() => void onDownload(v)}
              className="flex items-center gap-1.5 text-[10px] text-electric/70 hover:text-electric border border-electric/30 rounded-lg px-3 py-1.5">
              <Download size={11} /> MP4
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Onglet Audio ──────────────────────────────────────────────────────────────

function AudioTab({ audios, isGenerating, onDownload }: { audios: VisualEntry[]; isGenerating: boolean; onDownload: (v: VisualEntry) => void }) {
  const [showScript, setShowScript] = useState<string | null>(null);

  if (audios.length === 0 && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-graphite border border-crystal flex items-center justify-center text-2xl">🔊</div>
        <p className="text-sm font-medium text-silk/40">Aucun audio généré</p>
        <p className="text-xs text-silk/25 max-w-xs">Ajoute <strong className="text-silk/40">Voice</strong> avec le connecteur ElevenLabs pour générer des narrations.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {isGenerating && (
        <div className="bg-graphite border border-crystal/50 rounded-xl p-4 flex items-center gap-3">
          <Volume2 size={16} className="text-success animate-pulse" />
          <p className="text-xs text-silk/40">ElevenLabs · synthèse vocale en cours · ~5s</p>
        </div>
      )}
      {audios.map((a) => (
        <div key={a.id} className="bg-graphite border border-crystal/50 rounded-xl px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-silk">{a.voiceName ? `Voix : ${a.voiceName}` : "Audio généré"}</p>
              <p className="text-[10px] text-silk/30">{a.model}</p>
            </div>
            <button onClick={() => void onDownload(a)}
              className="flex items-center gap-1.5 text-[10px] text-electric/70 hover:text-electric border border-electric/30 rounded-lg px-2.5 py-1">
              <Download size={10} /> MP3
            </button>
          </div>
          <audio src={convertFileSrc(a.local_path)} controls className="w-full h-8" />
          {a.script && (
            <div>
              <button onClick={() => setShowScript(showScript === a.id ? null : a.id)}
                className="text-[10px] text-silk/40 hover:text-silk/60 flex items-center gap-1">
                <Play size={9} /> {showScript === a.id ? "Masquer" : "Voir"} le script
              </button>
              <AnimatePresence>
                {showScript === a.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-2">
                    <p className="text-[11px] text-silk/50 font-mono leading-relaxed bg-graphite-light rounded-lg p-3">{a.script}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Lightbox Image ────────────────────────────────────────────────────────────

function ImageLightbox({ image, index, total, onClose, onPrev, onNext, onDownload }: {
  image: VisualEntry; index: number; total: number;
  onClose: () => void; onPrev: () => void; onNext: () => void;
  onDownload: (v: VisualEntry) => void;
}) {
  return (
    <>
      <motion.div className="fixed inset-0 z-[300] bg-black/90" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} />
      <motion.div className="fixed inset-0 z-[301] flex items-center justify-center p-8"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
        <div className="relative max-w-4xl w-full flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
          {/* Close */}
          <button onClick={onClose} className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-graphite border border-crystal flex items-center justify-center text-silk/50 hover:text-silk">
            <X size={14} />
          </button>

          {/* Image */}
          <div className="rounded-2xl overflow-hidden bg-graphite border border-crystal/50">
            <img src={convertFileSrc(image.local_path)} alt={image.prompt} className="w-full object-contain max-h-[65vh]"
              onError={(e) => { if (image.url) (e.target as HTMLImageElement).src = image.url; }} />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button onClick={onPrev} disabled={index === 0}
              className="w-9 h-9 rounded-xl bg-graphite border border-crystal flex items-center justify-center text-silk/40 hover:text-silk disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            <div className="flex-1 bg-graphite border border-crystal/50 rounded-xl px-4 py-2.5">
              <p className="text-[10px] text-silk/30 mb-0.5">{image.model} · ${(image.cost_cents / 100).toFixed(3)} · {index + 1}/{total}</p>
              <p className="text-xs text-silk/60 font-mono line-clamp-2">{image.prompt}</p>
            </div>
            <button onClick={onNext} disabled={index === total - 1}
              className="w-9 h-9 rounded-xl bg-graphite border border-crystal flex items-center justify-center text-silk/40 hover:text-silk disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => void onDownload(image)}
              className="flex items-center gap-1.5 h-9 px-3 bg-electric text-white rounded-xl text-xs font-medium hover:bg-electric/90">
              <Download size={13} /> PNG
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
