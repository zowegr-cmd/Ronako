// Analyse locale par mots-clés d'un livrable custom.
// Instantané, sans coût API.

export interface CustomDeliverableInsight {
  message: string;
  blocking: boolean;
  connectorIds?: string[];   // connecteurs à configurer
  skillIds?: string[];       // skills à activer
  agentHint?: string;        // quel agent produit ce livrable
}

interface Rule {
  pattern: RegExp;
  insight: CustomDeliverableInsight;
}

const RULES: Rule[] = [
  // ─── Fichiers bureau ──────────────────────────────────────────
  {
    pattern: /excel|xlsx|tableur|spreadsheet|feuille.*calcul|calc/i,
    insight: {
      message: "✅ Meilleur résultat : E2B sandbox — Sam écrit un script Python (openpyxl/pandas) qui génère un vrai .xlsx avec formules, onglets et mise en forme.\n\n💡 Sans connecteur : Sam produit CSV ou Markdown → tu importes dans Excel (moins de contrôle sur le format).",
      blocking: false,
      connectorIds: ["e2b"],
      agentHint: "sam",
    },
  },
  {
    pattern: /csv|données.*structurées|data.*export/i,
    insight: {
      message: "💡 Un fichier CSV peut être généré directement par Sam dans son livrable final.",
      blocking: false,
      agentHint: "sam",
    },
  },
  {
    pattern: /word|docx|\.doc\b|document.*word/i,
    insight: {
      message: "✅ Meilleur résultat : E2B sandbox — python-docx génère un vrai .docx avec styles, tableaux et mise en forme Word native.\n\n💡 Sans connecteur : Ella rédige en Markdown → colle dans Word/Google Docs (import natif, suffisant pour documents simples).",
      blocking: false,
      connectorIds: ["e2b"],
      agentHint: "ella",
    },
  },
  {
    pattern: /power\s*point|pptx|présentation.*slide|slide.*deck|slides?\b/i,
    insight: {
      message: "✅ Meilleur résultat : E2B sandbox — Sam génère un vrai .pptx via python-pptx (slides, layouts, images, thème). Ou Gamma.app API pour des slides design-ready générées par IA.\n\n💡 Sans connecteur : Sam rédige en Marp (Markdown) → VS Code → exporte en .pptx gratuitement.",
      blocking: false,
      connectorIds: ["e2b"],
      agentHint: "sam",
    },
  },
  {
    pattern: /pdf\b/i,
    insight: {
      message: "✅ Meilleur résultat : E2B sandbox — génère un PDF pixel-perfect via WeasyPrint (CSS avancé, en-têtes, pagination automatique).\n\n💡 Sans connecteur : Ella produit du HTML mis en page → Ctrl+P dans le navigateur → PDF (suffisant pour 90% des cas).",
      blocking: false,
      connectorIds: ["e2b"],
      agentHint: "ella",
    },
  },
  // ─── Visuels / images ─────────────────────────────────────────
  {
    pattern: /image|photo|illustration|visuel|logo|bannière|banner|thumbnail/i,
    insight: {
      message: "✅ Meilleur résultat : Flux ($0.003/img, rendu réaliste rapide) ou DALL-E 3 ($0.04/img, qualité supérieure) génèrent directement depuis Ronako.\n\n💡 Sans connecteur : Axel écrit un prompt optimisé que tu colles dans Midjourney, Canva ou Leonardo.ai.",
      blocking: false,
      connectorIds: ["bfl", "openai"],
      agentHint: "axel",
    },
  },
  {
    pattern: /vidéo|video|animation|gif|mp4|motion/i,
    insight: {
      message: "💡 Pour des vidéos ou animations, Runway ou Replicate peuvent générer des séquences courtes. Configurables via connecteur custom.",
      blocking: false,
    },
  },
  {
    pattern: /infographie|infographic|schema|diagramme|diagram/i,
    insight: {
      message: "💡 Axel peut créer des spécifications de diagrammes en SVG/Mermaid. Pour un rendu visuel, active Flux ou DALL-E.",
      blocking: false,
      agentHint: "axel",
      connectorIds: ["bfl"],
    },
  },
  // ─── Bases de données / code ──────────────────────────────────
  {
    pattern: /base.*données|database|sql|postgres|mysql|sqlite/i,
    insight: {
      message: "💡 Le connecteur PostgreSQL (MCP) peut lire et écrire en base directement. Nina peut concevoir le schéma.",
      blocking: false,
      connectorIds: ["e2b"],
      agentHint: "nina",
    },
  },
  {
    pattern: /code|script|programme|app|application|api\b/i,
    insight: {
      message: "💡 Sam rédige les instructions Claude Code. Le connecteur E2B peut exécuter du code pour valider la logique.",
      blocking: false,
      connectorIds: ["e2b"],
      agentHint: "sam",
    },
  },
  {
    pattern: /site.*web|landing.*page|page.*web|html|website/i,
    insight: {
      message: "💡 Axel conçoit le design, Nina l'architecture. Sam fournit le prompt Claude Code pour l'implémentation.",
      blocking: false,
      agentHint: "axel",
    },
  },
  // ─── Contenu marketing ────────────────────────────────────────
  {
    pattern: /email|newsletter|séquence.*mail|mail.*séquence/i,
    insight: {
      message: "💡 Active le skill Email Marketing sur Leo pour des séquences optimisées (deliverability, objet, CTA).",
      blocking: false,
      skillIds: ["email-marketing"],
      agentHint: "leo",
    },
  },
  {
    pattern: /post|social|instagram|linkedin|twitter|tiktok|réseaux/i,
    insight: {
      message: "💡 Active le skill Social Media Strategy sur Leo pour des posts adaptés par plateforme.",
      blocking: false,
      skillIds: ["social-strategy"],
      agentHint: "leo",
    },
  },
  {
    pattern: /notion\b/i,
    insight: {
      message: "⚠️ Pour exporter dans Notion, le connecteur Notion est indispensable. Configure ta clé API intégration dans les Paramètres.",
      blocking: true,
      connectorIds: ["notion"],
    },
  },
  {
    pattern: /audit|analyse|rapport.*seo|seo.*rapport/i,
    insight: {
      message: "💡 Sofia peut faire un audit SEO complet. Active le skill SEO Local ou SEO Produit pour plus de précision.",
      blocking: false,
      skillIds: ["seo-local"],
      agentHint: "sofia",
    },
  },
  {
    pattern: /pitch|deck|investisseur|startup|levée/i,
    insight: {
      message: "💡 Le skill Pitch Investisseur sur Omar structure le deck seed/série A (TAM/SAM/SOM, traction, ask).",
      blocking: false,
      skillIds: ["pitch-investisseur"],
      agentHint: "omar",
    },
  },
  {
    pattern: /legal|juridique|cgv|rgpd|contrat|mentions/i,
    insight: {
      message: "💡 Camille est l'experte juridique. Le skill Légal E-Commerce couvre CGV, RGPD et mentions légales FR/EU.",
      blocking: false,
      skillIds: ["legal-ecommerce"],
      agentHint: "camille",
    },
  },
];

// Analyse le brief Marcus pour pré-sélectionner les formats pertinents
export function inferFormatsFromBrief(brief: string, hasFolder: boolean): string[] {
  const t = brief.toLowerCase();
  const formats: string[] = [];

  if (/code|développement|technique|script|claude code|api\b|app\b/.test(t) || hasFolder)
    formats.push("prompt_cc");

  if (/synthèse|rapport|document|analyse|bilan|résumé|guide|stratégie/.test(t) || formats.length === 0)
    formats.push("markdown");

  if (/email|newsletter|séquence.*mail|mail.*séquence|campagne.*email/.test(t))
    formats.push("email_sequence");

  if (/social|post|instagram|linkedin|twitter|tiktok|réseaux/.test(t))
    formats.push("social_posts");

  if (/plan d'action|roadmap|étapes|actions|planning|feuille de route/.test(t))
    formats.push("action_plan");

  // Notion mentionné explicitement dans le brief
  if (/notion\b/.test(t)) formats.push("notion");

  // Fallback si rien n'a matché
  if (formats.length === 0) formats.push(hasFolder ? "prompt_cc" : "markdown");

  return [...new Set(formats)]; // dédoublonner
}

export function analyzeCustomDeliverable(text: string): CustomDeliverableInsight | null {
  if (!text.trim()) return null;
  const match = RULES.find((r) => r.pattern.test(text));
  return match?.insight ?? null;
}
