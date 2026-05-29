import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { generateId } from "@/lib/utils";
import type { ModelId } from "@/types";

interface StreamOptions {
  apiKey: string;
  model: ModelId;
  systemPrompt: string;
  userMessage: string;
  onChunk: (chunk: string) => void;
  onDone: (fullText: string, inputTokens: number, outputTokens: number) => void;
  onError: (err: string) => void;
}

interface DonePayload {
  input_tokens: number;
  output_tokens: number;
}

export function useAnthropicStream() {
  const [streaming, setStreaming] = useState(false);
  const requestIdRef = useRef<string | null>(null);
  const unlistenersRef = useRef<UnlistenFn[]>([]);

  const cleanup = useCallback(() => {
    unlistenersRef.current.forEach((fn) => fn());
    unlistenersRef.current = [];
    requestIdRef.current = null;
    setStreaming(false);
  }, []);

  const stream = useCallback(async (options: StreamOptions) => {
    // Nettoyer l'éventuel stream précédent
    cleanup();

    const requestId = generateId();
    requestIdRef.current = requestId;
    setStreaming(true);

    let fullText = "";

    // Écouter les events Rust → frontend
    const unChunk = await listen<string>(`anthropic-chunk-${requestId}`, (ev) => {
      fullText += ev.payload;
      options.onChunk(ev.payload);
    });

    const unDone = await listen<DonePayload>(`anthropic-done-${requestId}`, (ev) => {
      options.onDone(fullText, ev.payload.input_tokens, ev.payload.output_tokens);
      cleanup();
    });

    const unError = await listen<string>(`anthropic-error-${requestId}`, (ev) => {
      options.onError(ev.payload);
      cleanup();
    });

    unlistenersRef.current = [unChunk, unDone, unError];

    // Lancer le stream côté Rust (appel non-bloquant)
    invoke("anthropic_stream", {
      apiKey: options.apiKey,
      model: options.model,
      systemPrompt: options.systemPrompt,
      userMessage: options.userMessage,
      requestId,
    }).catch((err: unknown) => {
      options.onError(String(err));
      cleanup();
    });
  }, [cleanup]);

  const abort = useCallback(() => {
    if (requestIdRef.current) {
      invoke("anthropic_abort", { requestId: requestIdRef.current }).catch(() => {});
      cleanup();
    }
  }, [cleanup]);

  return { stream, streaming, abort };
}
