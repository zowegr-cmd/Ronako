import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { generateId } from "@/lib/utils";

export interface BriefAnalysis {
  score: number;       // 0-10
  issues: string[];    // problèmes détectés
  questions: string[]; // questions à poser
  isReady: boolean;    // assez pour lancer
}

const ANALYZER_PROMPT = `Analyse ce brief en 3 secondes.
Réponds UNIQUEMENT en JSON valide, sans texte autour :
{
  "score": 0-10,
  "issues": ["problème 1", "problème 2"],
  "questions": ["question 1"],
  "isReady": true/false
}

Règles :
- score < 5 = brief trop vague, incomplet
- score 5-7 = brief acceptable mais améliorable
- score > 7 = brief bon, prêt à lancer
- Maximum 3 issues courtes et 2 questions
- isReady = false si score < 5
- Répondre en français`;

export async function analyzeBrief(
  brief: string,
  apiKey: string,
): Promise<BriefAnalysis> {
  const requestId = generateId();
  let fullText = "";

  await new Promise<void>((resolve) => {
    const unlisteners: Array<() => void> = [];
    const setup = async () => {
      const u1 = await listen<string>(`anthropic-chunk-${requestId}`, (ev) => { fullText += ev.payload; });
      const u2 = await listen<unknown>(`anthropic-done-${requestId}`, () => { unlisteners.forEach(f => f()); resolve(); });
      const u3 = await listen<string>(`anthropic-error-${requestId}`, () => { unlisteners.forEach(f => f()); resolve(); });
      unlisteners.push(u1, u2, u3);
      invoke("anthropic_stream", {
        apiKey,
        model: "claude-haiku-4-5-20251001", // Haiku — rapide et pas cher
        systemPrompt: ANALYZER_PROMPT,
        userMessage: brief.slice(0, 500), // limiter l'input
        requestId,
      }).catch(() => resolve());
    };
    setup();
  });

  try {
    const match = fullText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    return JSON.parse(match[0]) as BriefAnalysis;
  } catch {
    // Fallback : considérer le brief comme acceptable
    return { score: 6, issues: [], questions: [], isReady: true };
  }
}
