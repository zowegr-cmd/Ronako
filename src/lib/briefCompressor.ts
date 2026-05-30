import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { generateId } from "@/lib/utils";

const COMPRESS_PROMPT = `Compresse ce brief en gardant TOUTES les informations importantes.
Maximum 150 tokens.
Format : bullet points ultra-courts.
Pas de phrases — juste les faits essentiels.
Commence directement par les bullets, sans intro.`;

const MIN_TOKENS_FOR_COMPRESSION = 300;

export async function compressBrief(
  brief: string,
  apiKey: string,
): Promise<{ compressed: string; originalTokens: number; compressedTokens: number; savings: number } | null> {
  const originalTokens = estimateTokens(brief);
  if (originalTokens < MIN_TOKENS_FOR_COMPRESSION) return null; // pas besoin

  const requestId = generateId();
  let compressed = "";

  await new Promise<void>((resolve) => {
    const uns: Array<() => void> = [];
    const setup = async () => {
      const u1 = await listen<string>(`anthropic-chunk-${requestId}`, (ev) => { compressed += ev.payload; });
      const u2 = await listen<unknown>(`anthropic-done-${requestId}`, () => { uns.forEach(f => f()); resolve(); });
      const u3 = await listen<string>(`anthropic-error-${requestId}`, () => { uns.forEach(f => f()); resolve(); });
      uns.push(u1, u2, u3);
      invoke("anthropic_stream", {
        apiKey,
        model: "claude-haiku-4-5-20251001",
        systemPrompt: COMPRESS_PROMPT,
        userMessage: brief,
        requestId,
      }).catch(() => resolve());
    };
    setup();
  });

  if (!compressed || compressed.length < 20) return null;
  const compressedTokens = estimateTokens(compressed);
  const savings = Math.round(((originalTokens - compressedTokens) / originalTokens) * 100);

  return { compressed, originalTokens, compressedTokens, savings };
}

// Ré-exporter estimateTokens depuis utils si pas dispo
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.8);
}
