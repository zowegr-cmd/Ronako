# AGENT MARCUS — Documentation Technique
> Créé le 2026-05-30 — Marcus V2 + Système d'agents dynamique
> Mise à jour après chaque modification de Marcus

---

## Ce que Marcus fait maintenant (V2)

Marcus opère sur **3 niveaux distincts** — chacun avec son propre prompt et son propre contexte.

### Niveau 1 — Conversation libre (`useMarcusChat.ts`)
- Prompt : `MARCUS_CONVERSATION_PROMPT` (~220 tokens)
- Contexte injecté : agents temps-réel via `buildMarcusAgentContext`, mémoire utilisateur via `buildMemoryPrompt`, analyse brief via `analyzeBrief` (Haiku, ~200ms)
- Persona + niveau expertise depuis `settingsStore`
- Comportement : SCQ + JTBD, questions ciblées si score < 4, propose lancer si score > 7

### Niveau 2 — Composition de chaîne (`useMarcusPlan.ts`)
- Prompt : `buildPlanningPrompt()` (~300 tokens + liste agents + contexte)
- Contexte injecté : agents via `buildMarcusAgentList`, mémoire patterns, template adaptatif via `detectChainTemplate`, persona + expertise + langue
- Retourne JSON `{brief, agents}` validé par `enforceIndispensable`

### Niveau 3 — Premier agent de la chaîne (`useChainRunner.ts` → `chainEngine.ts`)
- Prompt : Prompt A de `defaultTeam.ts` (~350 tokens)
- Contexte injecté : liste agents de la chaîne via `chainAgentList` (bloc `[AGENTS DE LA CHAÎNE]`)
- Produit un brief structuré SCQ pour l'équipe
- Après la chaîne : appel Haiku pour analyse AAR (After Action Review)

---

## Système d'agents dynamique

### `buildMarcusAgentContext(options)` — `src/lib/buildMarcusAgentContext.ts`
Génère le bloc `[AGENTS DISPONIBLES — Temps réel]` depuis les stores.
- Source : `agentStore.agents` + `agentStore.skills` + `connectorStore.keys`
- Utilisé dans : `useMarcusChat`, `useMarcusPlan`
- Format par agent : nom [id], rôle, spécialité, skills actifs, connecteurs, pause validation

### `buildMarcusAgentList(agents, skills, connectors)` — même fichier
Version compacte pour `PLANNING_PROMPT` — 1 ligne par agent avec extras.

### `chainAgentList` dans `ChainContext`
Injecté pour Marcus (agent 0 uniquement) dans `useChainRunner.ts`.
Format : `[AGENTS DE LA CHAÎNE]\n- Nom [id] — Rôle: description\n[/AGENTS DE LA CHAÎNE]`

---

## Dead code réactivé

| Fichier | Fonction | Maintenant utilisé dans |
|---------|----------|------------------------|
| `briefAnalyzer.ts` | `analyzeBrief()` | `useMarcusChat.ts` — pour chaque message > 50 chars |
| `userMemory.ts` | `buildMemoryPrompt()` | `useMarcusChat.ts` — injecté dans le prompt |
| `userMemory.ts` | `loadUserMemory()` | `useMarcusPlan.ts` — patterns → RÈGLE 5 |
| `adaptiveChain.ts` | `detectChainTemplate()` | `useMarcusPlan.ts` — hint template dans PLANNING_PROMPT |

---

## Pack Marcus Expert — `skillPacks.ts`

4 skills auto-installés au premier lancement (via `installDefaultPacks`) :

| ID | Nom | Source | Trigger |
|----|-----|--------|---------|
| `marcus_scq` | Qualification Brief SCQ | McKinsey/Minto | "brief", "projet", "objectif" |
| `marcus_jtbd` | Jobs To Be Done | Christensen/Harvard | "pourquoi", "besoin", "client" |
| `marcus_team_composition` | Team Composition Rules | McKinsey staffing | "équipe", "agents", "composition" |
| `marcus_aar` | After Action Review | US Army → McKinsey | "score", "résultat", "analyse" |

---

## Règles absolues (jamais enfreindre)

1. **Zéro nom d'agent hardcodé** dans les prompts A, B, C — Marcus lit `[AGENTS DISPONIBLES]` injectés dynamiquement
2. **`buildMarcusAgentContext` est la seule source de vérité** sur les agents disponibles
3. **Ne pas modifier `useAnthropicStream.ts`** ni **`anthropic.rs`**
4. Le commentaire post-chaîne utilise **`runApiCall` existant avec Haiku** — ne pas créer de nouveau path API
5. `briefAnalyzer` : silencieux si erreur, jamais bloquant

---

## Changelog

| Date | Version | Changement |
|------|---------|------------|
| 2026-05-30 | V1 | Audit complet — `MARCUS_AUDIT.md` |
| 2026-05-30 | V2 | Reconstruction complète : prompts A/B/C, dead code réactivé, pack Expert, système dynamique |
