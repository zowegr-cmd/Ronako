import type { DeliverableData } from "@/types";

export interface ClientReportOptions {
  clientName: string;
  projectName: string;
  yourName: string;
  includeScore: boolean;
  language: "fr" | "en";
}

const LABELS = {
  fr: {
    title: "Rapport de projet",
    date: "Date",
    preparedBy: "Préparé par",
    preparedFor: "Préparé pour",
    execSummary: "Résumé exécutif",
    keyRecommendations: "Recommandations clés",
    actionPlan: "Plan d'action",
    qualityScore: "Score de qualité",
    confidential: "Document confidentiel — usage interne",
  },
  en: {
    title: "Project Report",
    date: "Date",
    preparedBy: "Prepared by",
    preparedFor: "Prepared for",
    execSummary: "Executive Summary",
    keyRecommendations: "Key Recommendations",
    actionPlan: "Action Plan",
    qualityScore: "Quality Score",
    confidential: "Confidential — internal use only",
  },
};

// Nettoyer les références techniques internes
function cleanTechnicalContent(text: string): string {
  return text
    .replace(/\[Sam\s*—.*?\]/gi, "")
    .replace(/\[Ella\s*—.*?\]/gi, "")
    .replace(/\[Ryo\s*—.*?\]/gi, "")
    .replace(/\[\w+\s*—\s*[^\]]+\]/g, "")
    .replace(/##? (MARCUS|OMAR|SOFIA|CAMILLE|LEO|MAYA|AXEL|NINA|TOM|ELLA|RYO|SAM)[^\n]*/gi, "")
    .replace(/ADN PROJET[\s\S]*?==================/g, "")
    .replace(/CONTEXTE RELAY[\s\S]*?\[\/CONTEXTE RELAY\]/g, "")
    .replace(/OUTPUT PRÉCÉDENT[\s\S]*?\[\/OUTPUT PRÉCÉDENT\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function generateClientReport(
  deliverable: DeliverableData,
  options: ClientReportOptions,
): string {
  const L = LABELS[options.language];
  const date = new Date(deliverable.date).toLocaleDateString(
    options.language === "fr" ? "fr-FR" : "en-GB",
    { dateStyle: "long" },
  );

  // Extraire les sections pertinentes
  const ellaOutput = cleanTechnicalContent(deliverable.outputs["ella"] ?? "");
  const ryoOutput  = cleanTechnicalContent(deliverable.outputs["ryo"] ?? "");
  const samOutput  = cleanTechnicalContent(deliverable.outputs["sam"] ?? "");

  // Simplifier l'output Sam pour le client (garder seulement les étapes)
  const actionSteps = samOutput
    .split("\n")
    .filter((l) => l.match(/^[-•*]\s|^\d+\./))
    .slice(0, 8)
    .join("\n");

  const lines: string[] = [
    `# ${options.projectName}`,
    `## ${L.title}`,
    ``,
    `${L.date} : ${date}`,
    `${L.preparedBy} : ${options.yourName}`,
    `${L.preparedFor} : ${options.clientName}`,
    ``,
    `---`,
    ``,
  ];

  if (options.includeScore && deliverable.score > 0) {
    lines.push(`**${L.qualityScore} : ${deliverable.score}/10**`, ``);
  }

  if (ellaOutput) {
    lines.push(`## ${L.execSummary}`, ``, ellaOutput, ``);
  }

  if (ryoOutput) {
    // Extraire les recommandations de Ryo (sans le score)
    const recommendations = ryoOutput
      .replace(/^SCORE\s*:.*$/im, "")
      .replace(/^VERDICT\s*:.*$/im, "")
      .trim();
    lines.push(`## ${L.keyRecommendations}`, ``, recommendations, ``);
  }

  if (actionSteps) {
    lines.push(`## ${L.actionPlan}`, ``, actionSteps, ``);
  }

  lines.push(`---`, ``, `*${L.confidential}*`);

  return lines.join("\n");
}
