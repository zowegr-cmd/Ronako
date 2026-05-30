import type { ConnectorKeys } from "@/store/settingsStore";

export interface FormatRequirement {
  suggestedSkills?: string[];
  requiredConnectors?: Array<keyof ConnectorKeys>;
  tip?: string | null;
  blockIfMissing?: boolean;
}

export const FORMAT_REQUIREMENTS: Record<string, FormatRequirement> = {
  prompt_cc: {
    tip: null,
  },
  markdown: {
    tip: null,
  },
  pdf_brief: {
    tip: "💡 Un connecteur PDF permettrait d'exporter directement en vrai PDF.",
  },
  notion: {
    requiredConnectors: ["notion"],
    tip: "⚠️ Le connecteur Notion est requis pour exporter directement dans Notion.",
    blockIfMissing: true,
  },
  email_sequence: {
    suggestedSkills: ["email-marketing"],
    tip: "💡 Le skill Email Marketing sur Leo optimiserait la structure des emails.",
  },
  social_posts: {
    suggestedSkills: ["social-strategy"],
    tip: "💡 Le skill Social Media Strategy sur Leo améliorerait le format des posts.",
  },
  action_plan: {
    suggestedSkills: ["launch-strategy"],
    tip: "💡 Le skill Launch Strategy sur Omar structurerait mieux le plan d'action.",
  },
};
