import { invoke } from "@tauri-apps/api/core";

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilyResponse {
  query: string;
  results: TavilyResult[];
  answer?: string;
}

// Formate les résultats pour injection dans un prompt agent
export function formatTavilyForPrompt(response: TavilyResponse): string {
  const lines = [
    `[RÉSULTATS DE RECHERCHE WEB — "${response.query}"]`,
    "",
  ];
  if (response.answer) {
    lines.push(`Résumé : ${response.answer}`, "");
  }
  response.results.slice(0, 5).forEach((r, i) => {
    lines.push(`${i + 1}. **${r.title}**`, `   ${r.url}`, `   ${r.content.slice(0, 300)}...`, "");
  });
  lines.push("[FIN RÉSULTATS WEB]");
  return lines.join("\n");
}

export async function tavilySearch(query: string, apiKey: string): Promise<TavilyResponse> {
  const raw = await invoke<string>("tavily_search", { query, apiKey });
  return JSON.parse(raw) as TavilyResponse;
}
