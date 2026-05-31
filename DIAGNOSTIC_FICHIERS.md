# DIAGNOSTIC FICHIERS & FORGE
> Généré le 2026-05-30 — lecture seule du code réel

---

## Q1 — Forge dans defaultTeam.ts

**✅ EXISTE** — 2 définitions :
- `DEFAULT_AGENTS` array : ligne 321 (dans la chaîne standard)
- `FORGE_AGENT` export : ligne 540 (importé par useChainRunner.ts)

Forge a `connectors: ["e2b"]`, `pauseAfter: true`, `isSystem: false`.
`FORGE_AGENT` est importé dans `useChainRunner.ts` et injecté après Sam automatiquement.

---

## Q2 — FormatSelectorModal

**✅ EXISTE et EST CONNECTÉE** :
- Fichier : `src/components/workspace/FormatSelectorModal.tsx`
- Connectée dans `Workspace.tsx` via `showFormatModal` state
- Déclenchée par `handleRequestPlan()` → `setShowFormatModal(true)`
- `handleFormatConfirmed()` → `setSelectedFormats()` → `buildPlan()`
- Formats E2B (pdf, excel, pptx, word) grisés si E2B non configuré

---

## Q3 — E2B configuré

**⚠️ DÉPEND DE L'UTILISATEUR** — Clé E2B stockée dans keyring OS.
- `FormatSelectorModal` vérifie `getKey("e2b") || keys.e2b`
- Si absent : bouton "Continuer sans E2B" disponible
- Sans E2B : `buildToolDefinitions(["e2b"], toolKeyMap)` → outil non ajouté → Forge tourne en stream texte → aucun fichier

---

## Q4 — Sam produit du JSON

**✅ OUI** — Sam a un prompt 3-modes :
- MODE 1 JSON si `[FORMAT(S) DEMANDÉ(S)]` contient pdf/excel/pptx/word
- MODE 2 Super-prompt Claude Code
- MODE 3 HTML complet

Le `formatsBlock` est injecté par `buildAgentPrompt` pour TOUS les agents.

---

## Q5 — DeliverablePanel onglet Fichiers

**✅ EXISTE** (`DeliverablePanel.tsx` ligne 462) :
- Bascule auto vers "files" si message Forge contient `# RONAKO_FORGE`
- Écoute event DOM `tool-result` (dispatch depuis `useChainRunner.ts`)
- `downloadFile()` : `saveDialog()` + `writeFile()` (plugins Tauri) → fonctionne

---

## Q6 — Commandes Tauri

**✅ SUFFISANT** — `downloadFile` utilise les plugins Tauri directement :
- `saveDialog` (plugin-dialog ✅)
- `writeFile` (plugin-fs ✅)
Aucune commande custom `save_file_to_disk` nécessaire.

---

## ═══ BUGS CRITIQUES TROUVÉS ═══

### BUG 1 — CRITIQUE : Stale closure sur `selectedFormats`

**Fichier** : `src/hooks/useChainRunner.ts`
**Ligne** : 112 (`const { selectedFormats } = useChainStore()`) + 791 (deps runChain)

`selectedFormats` est lu EN DEHORS du `useCallback` mais N'EST PAS dans ses deps.
Résultat : quand l'utilisateur sélectionne PDF et que `selectedFormats` change en store,
le callback `runChain` utilise l'ANCIENNE valeur (stale closure).

`needsForge = selectedFormats.some(...)` → lit `[]` → `needsForge = false` → Forge jamais ajouté.

**C'EST LE CAUSE PRINCIPALE du "Pas de Forge dans la chaîne".**

Fix : lire `useChainStore.getState().selectedFormats` à l'intérieur du callback.

---

### BUG 2 — CRITIQUE : Skills Forge non injectés dans systemPrompt

**Fichier** : `src/lib/chainEngine.ts` + `src/hooks/useChainRunner.ts`

`buildAgentPrompt()` calcule `enrichedSystemPrompt` via `buildPromptWithSkills`
mais le résultat est `void agentWithSkills` — dead code.

Les appels API utilisent `systemPrompt: agent.systemPrompt` (prompt brut).
Les 5 skills Forge (forge-pdf-weasyprint, forge-excel-openpyxl, etc.) ne sont JAMAIS injectés.
Forge n'a donc pas les instructions Python précises pour générer les fichiers.

Fix : appeler `buildPromptWithSkills` dans `useChainRunner` et passer le résultat
comme `systemPrompt` aux deux APIs (stream + tool use).

---

### BUG 3 — CRITIQUE : E2B file retrieval cassé

**Fichier** : `src-tauri/src/tools/e2b.rs` lignes 144-176

`GET /sandboxes/{id}/files` → retourne liste `[{name, path, is_dir, last_modified}]`
Le code cherche `f["content"]` → toujours vide → aucun fichier jamais sauvegardé.

Pour récupérer le contenu d'un fichier, il faut un appel séparé :
`GET /sandboxes/{id}/files?path=/path/to/file` → retourne le contenu base64.

Fix : après le listing, pour chaque fichier non-dossier, faire un GET de téléchargement séparé.

---

## Résumé

| Bug | Impact | Fichier | Ligne |
|-----|--------|---------|-------|
| Stale closure selectedFormats | Forge jamais ajouté | useChainRunner.ts | 112, 243, 791 |
| Skills non injectés (systemPrompt) | Forge sans instructions Python | chainEngine.ts + useChainRunner.ts | 96, 520, 535 |
| E2B fichiers jamais récupérés | Aucun fichier même si E2B actif | e2b.rs | 144-176 |

*Tous les 3 doivent être corrigés pour que le flow complet fonctionne.*
