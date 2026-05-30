import type { Project } from "@/types";
import type { FolderSummary, DeliverableEntry } from "@/types";

// ─── Construire le contexte de démarrage pour Marcus ─────────────────────────
// 4 cas selon les données disponibles :
//  1. Première ouverture (pas de journal, pas de livrable)
//  2. Journal récent (<24h) → reprise active
//  3. Journal ancien (>7j) → rappel contexte
//  4. Pas de journal mais dossier → proposition d'analyse

export function buildStartupContext(
  project: Project,
  journalContent: string | null,
  folderSummary: FolderSummary | null,
  lastDeliverable: DeliverableEntry | null,
): string {
  const folderInfo = folderSummary
    ? `Dossier connecté : ${folderSummary.total_files} fichiers (${folderSummary.total_size_kb.toFixed(0)} KB)`
    : null;

  const deliverableInfo = lastDeliverable
    ? `Dernier livrable : ${new Date(lastDeliverable.date).toLocaleDateString("fr-FR")} · Score ${lastDeliverable.score}/10`
    : null;

  // ── Cas 1 : Première ouverture ──────────────────────────────
  if (!journalContent && !lastDeliverable && !folderSummary) {
    return `Nouveau projet "${project.name}" ouvert pour la première fois.
Présente-toi brièvement comme Chef d'Orchestre Ronako et demande à l'utilisateur ce qu'il veut accomplir aujourd'hui.
Sois direct et enthousiaste. 2-3 phrases maximum.`;
  }

  // Analyser la fraîcheur du journal
  const journalAge = journalContent
    ? getJournalAge(journalContent)
    : null;

  // ── Cas 2 : Journal récent (<24h) ──────────────────────────
  if (journalAge !== null && journalAge < 24 * 60 * 60 * 1000) {
    const journalSnippet = journalContent!.slice(0, 400).trim();
    return `Projet "${project.name}" — session de reprise active.

Journal Claude Code (récent) :
${journalSnippet}${journalContent!.length > 400 ? "…" : ""}

${folderInfo ? folderInfo + "\n" : ""}${deliverableInfo ? deliverableInfo + "\n" : ""}
Fais un briefing de reprise concis (3-4 lignes) basé sur le journal. Résume ce qui a été fait et propose de continuer là où on s'est arrêtés. Pose une question concrète sur la prochaine étape.`;
  }

  // ── Cas 3 : Journal ancien (>7j) ──────────────────────────
  if (journalAge !== null && journalAge > 7 * 24 * 60 * 60 * 1000) {
    const daysSince = Math.round(journalAge / (24 * 60 * 60 * 1000));
    return `Projet "${project.name}" — reprise après ${daysSince} jours.

${journalContent!.slice(0, 300).trim()}

${deliverableInfo ? deliverableInfo + "\n" : ""}
Rappelle brièvement le contexte du projet en 2 lignes, mentionne que ça fait ${daysSince} jours, et demande ce que l'utilisateur veut faire aujourd'hui.`;
  }

  // ── Cas 4 : Pas de journal mais dossier ou livrable ────────
  const contextParts: string[] = [`Projet "${project.name}" ouvert.`];
  if (folderInfo) contextParts.push(folderInfo);
  if (deliverableInfo) contextParts.push(deliverableInfo);

  return `${contextParts.join("\n")}

${folderSummary
  ? "Le dossier est connecté. Propose d'analyser le projet avec Nina ou de démarrer un nouveau brief."
  : "Demande ce que l'utilisateur veut accomplir aujourd'hui."}
2-3 phrases, direct et concis.`;
}

// ─── Estimer l'âge du journal depuis son contenu ─────────────────────────────
function getJournalAge(content: string): number | null {
  // Chercher une date dans le journal (formats courants)
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/,
    /(\d{2}\/\d{2}\/\d{4})/,
    /(\d{2}-\d{2}-\d{4})/,
    /\b(\d{4}-\d{2}-\d{2})\b/,
  ];
  for (const pattern of datePatterns) {
    const match = content.match(pattern);
    if (match) {
      const d = new Date(match[1]);
      if (!isNaN(d.getTime())) return Date.now() - d.getTime();
    }
  }
  return null;
}
