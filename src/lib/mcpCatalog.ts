export interface McpServer {
  id: string;
  name: string;
  description: string;
  icon: string;
  package: string;        // commande npx
  stars: string;          // GitHub stars
  category: string;
  official: boolean;      // @modelcontextprotocol officiel
  useCases: string[];
}

export const MCP_CATALOG: McpServer[] = [
  // ── Officiels @modelcontextprotocol ───────────────────────────────────────
  {
    id: "mcp-filesystem",
    name: "Filesystem",
    description: "Lit et écrit des fichiers locaux. Permet aux agents d'accéder directement à ton dossier projet.",
    icon: "📁",
    package: "npx -y @modelcontextprotocol/server-filesystem",
    stars: "12k",
    category: "Fichiers",
    official: true,
    useCases: ["Lire du code", "Écrire des fichiers", "Parcourir des dossiers"],
  },
  {
    id: "mcp-github",
    name: "GitHub",
    description: "Gère des repositories, issues, PRs et branches directement depuis les agents.",
    icon: "🐙",
    package: "npx -y @modelcontextprotocol/server-github",
    stars: "8k",
    category: "Dev",
    official: true,
    useCases: ["Créer des issues", "Lire du code", "Ouvrir des PRs"],
  },
  {
    id: "mcp-postgres",
    name: "PostgreSQL",
    description: "Connexion directe à une base PostgreSQL. Les agents peuvent lire et écrire des données.",
    icon: "🐘",
    package: "npx -y @modelcontextprotocol/server-postgres",
    stars: "6k",
    category: "Base de données",
    official: true,
    useCases: ["Requêtes SQL", "Analyse de données", "Exports structurés"],
  },
  {
    id: "mcp-brave-search",
    name: "Brave Search",
    description: "Recherche web sans tracking via Brave. Alternative gratuite à Tavily.",
    icon: "🦁",
    package: "npx -y @modelcontextprotocol/server-brave-search",
    stars: "5k",
    category: "Recherche",
    official: true,
    useCases: ["Recherche web", "Actualités", "Veille concurrentielle"],
  },
  {
    id: "mcp-puppeteer",
    name: "Puppeteer",
    description: "Automatisation de navigateur. Les agents peuvent naviguer et extraire des données de n'importe quel site.",
    icon: "🤖",
    package: "npx -y @modelcontextprotocol/server-puppeteer",
    stars: "4k",
    category: "Automation",
    official: true,
    useCases: ["Scraping", "Screenshots", "Tests automatisés"],
  },
  {
    id: "mcp-memory",
    name: "Memory",
    description: "Mémoire persistante pour les agents. Stocke et retrouve des informations entre sessions.",
    icon: "🧠",
    package: "npx -y @modelcontextprotocol/server-memory",
    stars: "3k",
    category: "Mémoire",
    official: true,
    useCases: ["Contexte long terme", "Préférences utilisateur", "Historique"],
  },

  // ── Communauté ────────────────────────────────────────────────────────────
  {
    id: "mcp-firecrawl",
    name: "Firecrawl",
    description: "Scraping web avancé — convertit n'importe quelle page en Markdown propre pour les LLMs.",
    icon: "🔥",
    package: "npx -y firecrawl-mcp",
    stars: "3k",
    category: "Recherche",
    official: false,
    useCases: ["Scraping structuré", "Documentation web", "Recherche approfondie"],
  },
  {
    id: "mcp-e2b",
    name: "E2B Code Sandbox",
    description: "Exécution de code sécurisée via E2B. Génère des fichiers Excel, PDF, scripts.",
    icon: "🖥️",
    package: "npx -y e2b-mcp",
    stars: "3k",
    category: "Code",
    official: false,
    useCases: ["Exécuter du code", "Générer des fichiers", "Analyser des données"],
  },
  {
    id: "mcp-slack",
    name: "Slack",
    description: "Envoie des messages et crée des posts dans Slack directement depuis les agents.",
    icon: "💬",
    package: "npx -y @modelcontextprotocol/server-slack",
    stars: "2k",
    category: "Communication",
    official: false,
    useCases: ["Notifications", "Rapports automatiques", "Collaboration"],
  },
  {
    id: "mcp-notion",
    name: "Notion",
    description: "Crée et met à jour des pages Notion. Exporte les livrables dans ton workspace.",
    icon: "📓",
    package: "npx -y notion-mcp-server",
    stars: "2k",
    category: "Productivité",
    official: false,
    useCases: ["Exporter livrables", "Créer des pages", "Sync base de données"],
  },
  {
    id: "mcp-stripe",
    name: "Stripe",
    description: "Lit les données de paiement, analyse revenus et transactions Stripe.",
    icon: "💳",
    package: "npx -y stripe-mcp",
    stars: "1k",
    category: "Business",
    official: false,
    useCases: ["Analyse revenus", "Rapports financiers", "Suivi transactions"],
  },
  {
    id: "mcp-linear",
    name: "Linear",
    description: "Gère des issues et le roadmap produit depuis les livrables Ronako.",
    icon: "📐",
    package: "npx -y linear-mcp",
    stars: "1k",
    category: "Dev",
    official: false,
    useCases: ["Créer des issues", "Planifier sprints", "Roadmap"],
  },
];
