// ─── Formatteur de livrables pour Claude Code ────────────────────────────────

export interface ProjectContext {
  name: string;
  path?: string;
  stack?: string;
  dna?: string;
}

export function formatForClaudeCode(
  deliverable: string,
  project: ProjectContext,
): string {
  const lines: string[] = [
    `# Instructions pour Claude Code`,
    ``,
    `## Contexte du projet`,
    `Projet : ${project.name}`,
  ];

  if (project.path && project.path !== "/") lines.push(`Dossier : ${project.path}`);
  if (project.stack) lines.push(`Stack : ${project.stack}`);

  if (project.dna) {
    lines.push(``, `## ADN Projet`, project.dna);
  }

  lines.push(
    ``,
    `## Instructions`,
    deliverable,
    ``,
    `## Règles absolues`,
    `- Mettre à jour .ronako/journal_dev.md après la session`,
    `- Vérifier CLAUDE.md avant toute modification`,
    `- Ne pas modifier les fichiers protégés`,
    `- Cocher les tâches terminées dans la roadmap`,
  );

  return lines.join("\n");
}

// Extraire uniquement le prompt Claude Code depuis l'output de Sam
export function extractClaudeCodeBlock(samOutput: string): string {
  // Sam délimite souvent son prompt avec des balises
  const patterns = [
    /```prompt[\s\S]*?```/i,
    /=== INSTRUCTIONS CLAUDE CODE ===([\s\S]*?)=== FIN ===/i,
    /## Instructions pour Claude Code([\s\S]*?)(?=##|$)/i,
  ];

  for (const pattern of patterns) {
    const match = samOutput.match(pattern);
    if (match) return match[0].replace(/```(prompt)?|```/g, "").trim();
  }
  return samOutput; // retourner l'output complet si pas de bloc trouvé
}
