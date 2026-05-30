export type ConnectorCategory = "search" | "image" | "code" | "data" | "productivity";

export interface Connector {
  id: string;
  name: string;
  description: string;
  apiKeyName: keyof import("@/store/settingsStore").ConnectorKeys;
  category: ConnectorCategory;
  icon: string;
  docsUrl?: string;
}

export interface ConnectorResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Registre de tous les connecteurs disponibles
export const ALL_CONNECTORS: Connector[] = [
  {
    id: "tavily",
    name: "Tavily Search",
    description: "Recherche web optimisée pour LLMs — résultats structurés + résumés",
    apiKeyName: "tavily",
    category: "search",
    icon: "🔍",
    docsUrl: "https://tavily.com",
  },
  {
    id: "dalle",
    name: "DALL-E 3",
    description: "Génération d'images haute qualité via OpenAI",
    apiKeyName: "openai",
    category: "image",
    icon: "🎨",
    docsUrl: "https://platform.openai.com",
  },
  {
    id: "flux",
    name: "Flux (BFL)",
    description: "Génération d'images ultra-réalistes via Black Forest Labs",
    apiKeyName: "bfl",
    category: "image",
    icon: "⚡",
    docsUrl: "https://api.bfl.ml",
  },
  {
    id: "e2b",
    name: "E2B Code Sandbox",
    description: "Exécution de code sécurisée dans des sandboxes cloud",
    apiKeyName: "e2b",
    category: "code",
    icon: "🖥️",
    docsUrl: "https://e2b.dev",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Export direct des livrables vers Notion",
    apiKeyName: "notion",
    category: "productivity",
    icon: "📓",
    docsUrl: "https://developers.notion.com",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Accès aux repos, issues et PRs",
    apiKeyName: "github",
    category: "productivity",
    icon: "🐙",
    docsUrl: "https://docs.github.com/rest",
  },
  {
    id: "screenshot",
    name: "ScreenshotOne",
    description: "Capture de sites web pour analyse visuelle",
    apiKeyName: "screenshot",
    category: "data",
    icon: "📸",
    docsUrl: "https://screenshotone.com",
  },
];
