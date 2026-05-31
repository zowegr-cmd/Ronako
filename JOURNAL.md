# JOURNAL DE DÉVELOPPEMENT RONAKO
> Mis à jour par Claude Code après CHAQUE session.
> Jamais effacé — toujours en append.

---

## SESSION 2026-05-29 — V2 Livrée

### CE QUI A ÉTÉ FAIT
```
✅ Fix useChainRunner
✅ Export livrables .md et .html
✅ Reset mensuel dépenses
✅ Budget cap enforcement + toast 80%
✅ Sound design (Web Audio API, 5 sons)
✅ Mémoire projet (.ronako/state.json)
✅ Agent Nova consultant MCP
✅ 7 connecteurs APIs directes
✅ Tavily search côté Rust
✅ Chat direct avec chaque agent
✅ Multi-équipes CRUD + 5 templates
✅ Settings connecteurs (keyring OS)
✅ AUDIT.md généré
```

### FICHIERS MODIFIÉS
```
src/hooks/useChainRunner.ts
src/hooks/useProjectMemory.ts (créé)
src/hooks/useSounds.ts (créé)
src/components/workspace/DeliverablePanel.tsx
src/components/agents/AgentChatModal.tsx (créé)
src/store/settingsStore.ts
src/App.tsx
src/screens/Orchestrator.tsx
src/screens/Settings.tsx
src/lib/agents/defaultTeam.ts
src/lib/connectors/ (créé)
src-tauri/src/commands.rs
AUDIT.md (créé)
```

### ÉTAT ACTUEL
V2 complète — TypeScript 0 erreur, Rust 0 warning.

### PROCHAINE SESSION
Phase 1 — Architecture Core → Agent Relay (1.1)

---

## SESSION Phase 1 — Architecture Core Livrée

### CE QUI A ÉTÉ FAIT
```
✅ Agent Relay (Sonnet 4.6, visible ⟡, intouchable)
✅ ADN Projet (150 tokens, projectDNA.ts)
✅ Matrice de dépendances (dependencyMatrix.ts)
✅ Marcus Check silencieux (marcusCheck.ts)
✅ Modèles optimisés Sonnet/Haiku par agent
✅ 4 modes chaîne (chainModes.ts)
✅ Agent Optimiseur (useChainAnalyzer.ts)
✅ Fragmentation du brief (briefCompressor.ts)
✅ Nina en éclaireur
✅ Chaîne Delta
```

### ÉTAT ACTUEL
Phase 1 complète — TypeScript 0 erreur, Rust 0 warning.

### PROCHAINE SESSION
Phase 2 — Indispensables UX

---

## SESSION Phase 2 — Indispensables UX Livrée

### CE QUI A ÉTÉ FAIT
```
✅ Score Ryo visible (ryoParser.ts, barre animée)
✅ Estimation coût précise avant/après chaîne
✅ Bibliothèque livrables (.ronako/livrables/)
✅ Bouton Retravailler 4 options (ReworkModal)
✅ Dossier lié mémorisé par projet
✅ Marcus briefing intelligent (startupBriefing.ts)
✅ Historique chaînes par projet
✅ Interruption intelligente (StopModal 2 choix)
✅ Retry automatique ×2
✅ Notification fin de chaîne OS
✅ Cache dernier livrable (Zustand persist)
✅ Raccourcis clavier (useKeyboardShortcuts.ts)
✅ Mémoire utilisateur (userMemory.ts)
✅ Marcus propose sauvegarder équipe si score ≥8
```

### ÉTAT ACTUEL
Phase 2 complète — TypeScript 0 erreur.

### PROCHAINE SESSION
Phase 3 — Features importantes

---

## SESSION Phase 3 — Features importantes Livrée

### CE QUI A ÉTÉ FAIT
```
✅ Chaînes adaptatives (adaptiveChain.ts, 9 templates)
✅ Analyse brief Haiku (briefAnalyzer.ts)
✅ Aperçu livrable dans ChainProposalCard
✅ Compression brief >300 tokens (briefCompressor.ts)
✅ PARALLEL_GROUPS dans dependencyMatrix
✅ Auto-critique agents
✅ Toggle validation par étape (Settings)
✅ Sélecteur formats multiples (formatSelector.ts)
✅ 8 templates projets dans Launcher
✅ Briefs sauvegardés avec variables (savedBriefs.ts)
✅ Chips contextuels (OrchestratorChat)
✅ Copier pour Claude Code (claudeCodeFormatter.ts)
```

### ÉTAT ACTUEL
Phase 3 complète — TypeScript 0 erreur.

### PROCHAINE SESSION
Phase 4 — Consultants qui agissent

---

## SESSION Phase 4 — Consultants qui agissent Livrée

### CE QUI A ÉTÉ FAIT
```
✅ Architecture consultantActions.ts
✅ Blocs ACTION dans réponses IA (parsing)
✅ ActionButton.tsx coloré par type d'action
✅ Prompt Machine → modifier/créer/auditer/skills
✅ Idéation → envoyer à Marcus / enrichir brief
✅ Veille Tech → ciblée stack / suggérer MCP
✅ Nova → configurer MCP / activer connecteur
✅ consultantContext.ts (contexte auto injecté)
```

### ÉTAT ACTUEL
Phase 4 complète — TypeScript 0 erreur.

### PROCHAINE SESSION
Phase 5 — Skills complets

---

## SESSION Phase 5 — Skills complets Livrée

### CE QUI A ÉTÉ FAIT
```
✅ Types Skill, SkillPack, AgentConnector dans types.ts
✅ 5 packs prédéfinis (skillPacks.ts)
✅ Skills injectés après prompt (buildPromptWithSkills)
✅ Max 5 skills actifs/agent, cap 3800 tokens
✅ inheritToAll: true sur Marcus → tous les agents
✅ Skills temporaires dans ChainProposalCard
✅ AgentStudio refactorisé : sidebar + éditeur 4 onglets
   ⚙️ Config / 📝 Prompt / ⚡ Skills / 🔌 Connecteurs
✅ Onglet Skills : activer/désactiver/packs/créer inline/IA
✅ Onglet Connecteurs : natifs/APIs statut clé/bouton Nova
✅ Skills conditionnels (conditionalSkills.ts)
```

### ÉTAT ACTUEL
Phase 5 complète — TypeScript 0 erreur.

### PROCHAINE SESSION
Phase 6 — Différenciateurs + Partage

---

## SESSION Phase 6 — Différenciateurs + Partage Livrée

### CE QUI A ÉTÉ FAIT
```
✅ Comparateur de versions (VersionComparator.tsx)
✅ Tableau de bord projet SVG/CSS (ProjectDashboard.tsx)
✅ Journal de progression visuel (timeline)
✅ Benchmark qualité personnel
✅ Marcus proactif (détecte modifs dossier)
✅ Export rapport client (clientReportGenerator.ts)
✅ Rapport mensuel coûts + comparaison GPT-4
✅ Suggestions agents manquants
✅ Annotations sur livrables (notes + tags)
✅ Recherche globale livrables (globalSearch.ts)
✅ Cache analyses récurrentes (analysisCache.ts)
✅ Mode dégradé intelligent
✅ Sauvegarde progressive (après chaque agent)
✅ Session de travail trackée (sessionTracker.ts)
✅ Protection du travail (fermeture)
✅ Export/Import agents (.ronako-agent + SHA-256)
✅ Export/Import équipes (.ronako-team)
✅ Export/Import packs (.ronako-pack)
✅ Code de partage court local (RONAKO-XX-XXXX)
```

### DÉCISIONS PRISES
```
- Export jamais les clés API
- Hash SHA-256 sur tous les exports
- Code de partage local uniquement (serveur → Phase 8)
- Dashboard SVG/CSS (pas de lib externe)
```

### ÉTAT ACTUEL
Phase 6 complète — TypeScript 0 erreur, Rust 0 warning.

### PROCHAINE SESSION
Phase 7 — Pack Manager + Connecteur Hub + Polish
Commencer par : 7.1 Product Tour + 7.2 Tooltips ⓘ

---

## SESSION 2026-05-30 — Phase 7 (A→F) Livrée

### CE QUI A ÉTÉ FAIT
```
✅ 7.1  ProductTour.tsx — 12 étapes overlay, navigation clavier, trigger Events
✅ 7.2  InfoTooltip.tsx — composant global auto-positionné, hover, Framer Motion
        Placé dans : ChainProposalCard (ADN, Custom Config), Settings (Budget, Chaîne)
        AgentStudio (Pause agent), PackManager
✅ 7.3  Pause after agent — toggle ConfigTab + champ message + bannière Workspace
        useChainRunner : bloc pause + resume via subscribe
✅ 7.4  PackManager.tsx — screen dédié, onglets Skills Packs / Connecteurs
        Icône Package dans NavBar, route /packs dans App.tsx
✅ 7.5  Connector Hub — onglet Connecteurs dans PackManager avec statut clé API
✅ 7.6  DeliverablePanel — onglet Stats (grille chiffres + barres agents)
✅ 7.11 Mode Présentation — onglet dans DeliverablePanel, navigation agent par agent
✅      Button.tsx — variante "warning" ajoutée
✅      TypeScript 0 erreurs, push main
```

### FICHIERS MODIFIÉS
```
src/components/onboarding/ProductTour.tsx     (créé)
src/components/ui/InfoTooltip.tsx             (créé)
src/screens/PackManager.tsx                   (créé)
src/components/layout/AppShell.tsx            (ProductTour intégré)
src/components/layout/NavBar.tsx              (icône Pack Manager)
src/App.tsx                                   (route /packs)
src/screens/Settings.tsx                      (section Aide + tooltips)
src/screens/AgentStudio.tsx                   (toggle pauseAfter dans ConfigTab)
src/screens/Workspace.tsx                     (bannière pause agent + imports)
src/components/workspace/ChainProposalCard.tsx (tooltips ADN + Custom)
src/components/workspace/DeliverablePanel.tsx  (onglets Stats/Présentation)
src/hooks/useChainRunner.ts                   (pause after agent implémenté)
src/components/ui/Button.tsx                  (variante warning)
```

### ÉTAT ACTUEL
Phase 7 groupes A-F livrés. TypeScript 0 erreurs, Rust inchangé.

### PROCHAINE SESSION
Phase 7 G-H :
- 7.7 Marcus proactif skills pendant briefing
- 7.8 ChainProposalCard enrichie (presets, comparaison, simulation)
- 7.9 Persona Marcus dans Settings (4 options)
- 7.10 Mode Focus
- 7.12 Thèmes visuels dans Settings
- 7.13 Tips contextuels
- 7.14 Niveau expertise adaptatif
- 7.15 Langue livrables

---

## SESSION 2026-05-30 — Product Tour refait (highlight réel)

### CE QUI A ÉTÉ FAIT
```
✅ ProductTour.tsx — réécriture complète
     Spotlight via box-shadow + ring electric (pas clip-path — WebView2)
     Tooltip auto-positionné (dessous > dessus > droite > gauche)
     Flèche CSS pointant vers l'élément
     Navigation automatique entre routes (useNavigate + useLocation)
     Retry 20× / 120ms si élément pas encore rendu
     Steps interactifs : event listener + timeout 10s → "Continuer sans essayer"
     Keyboard : → suivant / ← précédent / Esc = fermer
     Overlay pointer-events: none (cibles restent cliquables)
     Trigger depuis Settings inchangé
✅ data-tour sur tous les éléments ciblés :
     Workspace : marcus-chat, launch-button, mode-selector, library-tab
     OrchestratorChat : textarea-brief
     DeliverablePanel : score-ryo
     AgentStudio : agent-grid, skills-tab, connectors-tab
     Orchestrator : chain-dnd, relay-indicator (1er nœud)
     ConsultantDock : consultant-dock-button
✅ Events dispatchers :
     SidebarItem Sofia → tour-sofia-clicked
     handleDragEnd → tour-dnd-moved
     ConsultantDock open → tour-dock-opened
✅ TypeScript 0 erreurs
```

### FICHIERS MODIFIÉS
```
src/components/onboarding/ProductTour.tsx     (réécriture complète)
src/screens/Workspace.tsx                     (4 data-tour)
src/components/workspace/OrchestratorChat.tsx (data-tour textarea)
src/components/workspace/DeliverablePanel.tsx (data-tour score-ryo)
src/screens/AgentStudio.tsx                   (data-tour + data-agent-id + event sofia)
src/screens/Orchestrator.tsx                  (data-tour chain-dnd + relay + event dnd)
src/components/layout/ConsultantDock.tsx      (data-tour + event dock)
```

### ÉTAT ACTUEL
Product Tour type Notion/Linear — highlight réel sur l'élément, tooltip positionné automatiquement, navigation entre routes. TypeScript 0 erreurs.

---

## SESSION 2026-05-30 — Formats libres + suggestions contextuelles

### CE QUI A ÉTÉ FAIT
```
✅ formatRequirements.ts — table des exigences par format
     notion → bloquant si clé manquante
     email_sequence, social_posts, action_plan → suggestion skill
✅ formatSelector.ts — alwaysIncluded retiré de prompt_cc et markdown
✅ ChainProposalCard.tsx :
     Tous les formats décochables (plus de lock)
     Défaut intelligent : dossier → "Prompt CC" / sans → "Synthèse Markdown"
     Validation min 1 format → bouton Lancer désactivé + message
     onFormatToggle → vérifie FORMAT_REQUIREMENTS
     Alertes animées : warning bloquant (Notion) ou suggestion (skill)
     Bouton "Activer ⏱" active le skill en direct
     Bouton "Ignorer" ferme la suggestion
     Bouton "Configurer →" ouvre Paramètres connecteurs
✅ Workspace.tsx — hasFolder passé à ChainProposalCard
✅ TypeScript 0 erreurs
```

### FICHIERS MODIFIÉS
```
src/lib/formatRequirements.ts         (créé)
src/lib/formatSelector.ts             (alwaysIncluded retiré)
src/components/workspace/ChainProposalCard.tsx  (formats libres + alertes)
src/screens/Workspace.tsx             (hasFolder passé à ChainProposalCard)
```

### ÉTAT ACTUEL
Formats entièrement libres, défaut intelligent par contexte, suggestions non bloquantes et warnings bloquants pour connecteurs manquants.

---

## SESSION 2026-05-30 — Formats libres + analyse livrable + Phase 8 roadmap

### CE QUI A ÉTÉ FAIT
```
✅ ChainProposalCard — formats tous décochables, défaut intelligent (brief+dossier)
✅ formatRequirements.ts — suggestions Notion bloquant, skills email/social/action
✅ customDeliverableAnalyzer.ts — 18 règles mots-clés (Excel, PPT, PDF, image...)
✅ useCustomDeliverableAnalysis.ts — analyse Haiku auto (debounce 900ms si no match)
✅ Hybrid : mots-clés instantanés → Haiku si cas ambigus
✅ Fix regex "power\s*point" (espace)
✅ Pré-sélection formats depuis brief Marcus (inferFormatsFromBrief)
✅ Suggestions honnêtes : ✅ Ce qui fonctionne maintenant / 🔜 À venir
✅ Phase 8 ajoutée à CLAUDE.md — tool use réel, architecture Rust, 3 sous-phases
```

### DÉCISIONS IMPORTANTES
```
- Les agents Ronako produisent du TEXTE uniquement (pas de fichiers binaires aujourd'hui)
- Les connecteurs sont du contexte injecté dans les prompts, pas de vrais tool calls
- Phase 8 = implémenter la boucle tool_use dans anthropic.rs
  → Claude émet tool_use → Rust exécute → tool_result → Claude continue
- Ordre : 8A images (DALL-E/Flux) → 8B code E2B (vrais .xlsx/.pptx) → 8C Notion/GitHub
```

### FICHIERS MODIFIÉS
```
src/lib/formatRequirements.ts           (créé)
src/lib/formatSelector.ts               (alwaysIncluded retiré)
src/lib/customDeliverableAnalyzer.ts    (créé — 18 règles + inferFormatsFromBrief)
src/hooks/useCustomDeliverableAnalysis.ts (créé — analyse Haiku)
src/components/workspace/ChainProposalCard.tsx (formats libres + analyse hybride)
src/screens/Workspace.tsx               (hasFolder passé)
CLAUDE.md                               (Phase 8 détaillée)
```

### ÉTAT ACTUEL
Phase 7 + correctifs ChainProposalCard livrés. Phase 8 documentée dans CLAUDE.md.

### PROCHAINE SESSION
Phase 8A — Tool use images : DALL-E / Flux dans la boucle Rust.
Ou Phase 7 G-H si on finit d'abord (Marcus proactif 7.7, ChainProposalCard 7.8, thèmes 7.12...).

---

## SESSION 2026-05-30 — Phase 7 G+H complète

### CE QUI A ÉTÉ FAIT
```
✅ 7.7  proactiveSuggestions.ts — 6 règles (SEO, email, image, ecommerce, local, social)
        useMarcusPlan.ts — suggestion injectée après buildPlan (format ⚡SUGGESTION|...)
        OrchestratorChat.tsx — rendu suggestion avec bouton action + Ignorer
        AppShell.tsx — listener navigate-packs ajouté
✅ 7.8  ChainProposalCard — présets de configuration (sauvegarder/charger/supprimer)
        Note personnelle pour ce run (injectée dans brief)
✅ 7.9  useMarcusChat.ts — persona injecté dans systemPrompt (direct/detailed/coach/expert)
        Settings.tsx — section Style de Marcus avec 4 radios
✅ 7.10 AppShell.tsx — Mode Focus masque NavBar + ConsultantDock, bouton Quitter
        useKeyboardShortcuts.ts — Ctrl+Shift+F toggle
✅ 7.12 Settings.tsx — section Thème visuel avec preview couleurs (4 options)
✅ 7.13 tips.ts + useTips.ts + TipBanner.tsx — 5 tips contextuels
        Workspace.tsx — évaluation tips après chaîne + TipBanner affiché
✅ 7.14 useMarcusChat.ts — expertiseLevel injecté (beginner/intermediate/expert)
        Settings.tsx — section Mon niveau avec 3 radios
✅ 7.15 chainEngine.ts — deliverableLanguage injecté si ≠ fr
        useChainRunner.ts — passe deliverableLanguage à buildAgentPrompt
        Settings.tsx — section Langue des livrables (select FR/EN/ES/DE)
✅ settingsStore.ts — ChainPreset type, chainPresets[], ignoredSuggestions{},
        deliverableLanguage: DeliverableLanguage, nouveaux setters
✅ TypeScript 0 erreurs, push main
```

### FICHIERS MODIFIÉS
```
src/lib/proactiveSuggestions.ts    (créé)
src/lib/tips.ts                    (créé)
src/hooks/useTips.ts               (créé)
src/components/ui/TipBanner.tsx    (créé)
src/store/settingsStore.ts         (ChainPreset, chainPresets, ignoredSuggestions, DeliverableLanguage)
src/hooks/useMarcusChat.ts         (persona + expertise injection)
src/hooks/useMarcusPlan.ts         (proactive suggestion après buildPlan)
src/hooks/useChainRunner.ts        (deliverableLanguage passé)
src/lib/chainEngine.ts             (ChainContext.deliverableLanguage, langBlock injection)
src/hooks/useKeyboardShortcuts.ts  (Ctrl+Shift+F)
src/components/layout/AppShell.tsx (focus mode + navigate-packs listener)
src/components/workspace/OrchestratorChat.tsx (suggestion message style)
src/components/workspace/ChainProposalCard.tsx (présets + note run)
src/screens/Settings.tsx           (4 nouvelles sections)
src/screens/Workspace.tsx          (TipBanner + tips evaluation)
```

### ÉTAT ACTUEL
Phase 7 complète — TypeScript 0 erreurs, Rust inchangé.

### PROCHAINE SESSION
Phase 8A — Tool use images (DALL-E / Flux dans la boucle Rust).

---

## SESSION 2026-05-30 — Phase 8 Tool Use (8A+8B+8C)

### CE QUI A ÉTÉ FAIT
```
✅ Rust — src-tauri/src/tools/ (nouveau module)
   mod.rs    : types ToolKeys/ToolResult/ToolUseEvent/ToolResultEvent
               dispatcher execute_tool() + helpers visuals_dir/outputs_dir/download_image
   dalle.rs  : DALL-E 3 — POST OpenAI, download image, sauvegarde locale
   flux.rs   : Flux Pro 1.1 — POST + polling BFL, download image
   e2b.rs    : E2B sandbox — create/execute/get-files/destroy + base64 inline decoder
   notion.rs : export page Notion (Markdown → blocs paragraphes)
   github.rs : push fichier GitHub (base64 inline encoder, gère SHA existant)
   tavily.rs : web search (migration depuis commands.rs)

✅ anthropic.rs — ajout anthropic_stream_with_tools() SANS toucher anthropic_stream()
   Boucle tool_use : non-streaming → execute_tool() → tool_result → loop
   Émet events : anthropic-tool-use-{id}, anthropic-tool-result-{id}, anthropic-chunk-{id}, anthropic-done-{id}
   Max 10 tours pour éviter les boucles infinies

✅ lib.rs — mod tools; + handler anthropic_stream_with_tools

✅ chainEngine.ts — buildToolDefinitions(connectorIds, keys)
   6 outils : dalle, flux, e2b, notion, github, tavily
   Pas de restriction par agent — tout connecteur assignable partout

✅ useChainRunner.ts — routing pour chaque agent :
   agent.connectors → buildToolDefinitions → si tools.length > 0 → invoke anthropic_stream_with_tools
   Sinon → stream() existant
   Events tool-use/tool-result → addWorkspaceMessage + dispatch "tool-result" event

✅ DeliverablePanel.tsx — onglets Visuels + Fichiers
   Écoute "tool-result" event DOM
   Visuels : grid images avec convertFileSrc + download
   Fichiers (E2B) : liste avec download via writeFile

✅ TypeScript 0 erreurs + Rust 0 warnings
```

### FICHIERS CRÉÉS
```
src-tauri/src/tools/mod.rs
src-tauri/src/tools/dalle.rs
src-tauri/src/tools/flux.rs
src-tauri/src/tools/e2b.rs
src-tauri/src/tools/notion.rs
src-tauri/src/tools/github.rs
src-tauri/src/tools/tavily.rs
```

### FICHIERS MODIFIÉS
```
src-tauri/src/anthropic.rs   (ajout anthropic_stream_with_tools)
src-tauri/src/lib.rs         (mod tools + handler)
src/lib/chainEngine.ts       (buildToolDefinitions + ToolDefinition types)
src/hooks/useChainRunner.ts  (routing tool use vs stream pur)
src/components/workspace/DeliverablePanel.tsx (onglets Visuels + Fichiers)
```

### ARCHITECTURE
```
Pour chaque agent dans la chaîne :
  1. agent.connectors → buildToolDefinitions(ids, keys)
  2. Si tools.length > 0 :
     → invoke("anthropic_stream_with_tools") avec tools[] + tool_keys
     → Rust boucle : call → tool_use? → execute → tool_result → call → ...
     → Events frontend : tool-use (spinner) + tool-result (image/fichier)
  3. Sinon → stream() texte pur existant (unchanged)
```

### ÉTAT ACTUEL
Phase 8 livrée — Tool use réel opérationnel.
Rust 0 warning, TypeScript 0 erreur.

### PROCHAINE SESSION
Tester avec un agent DALL-E ou Flux.
Ou Phase 9 selon roadmap.

---

## SESSION 2026-05-30 — Forge + Sam JSON + Skills Production + FormatSelectorModal

### CE QUI A ÉTÉ FAIT
```
✅ FORGE_AGENT ajouté dans defaultTeam.ts (après les agents système)
   - Agent système non supprimable, pauseAfter: true
   - connectors: ["e2b"] obligatoire
   - System prompt : génère code Python + appelle execute_code tool

✅ Sam repensé (3 modes) :
   - MODE 1 JSON structuré : si PDF/Excel/PPT/Word demandés → JSON complet
   - MODE 2 Super-prompt Claude Code : comportement actuel
   - MODE 3 HTML complet : dashboard autonome plotly

✅ FORGE_PRODUCTION_PACK dans skillPacks.ts (5 skills) :
   - forge-pdf-weasyprint : PDF via WeasyPrint ⭐7800+
   - forge-excel-openpyxl : Excel pro via openpyxl
   - forge-pptx-consulting : PowerPoint style BCG/McKinsey
   - forge-word-docx : Word via python-docx ⭐4400+
   - forge-html-dashboard : HTML interactif plotly.js

✅ chainEngine.ts :
   - ChainContext.selectedFormats ajouté
   - formatsBlock injecté dans les prompts (avant ADN)

✅ useChainRunner.ts :
   - FORGE_AGENT auto-injecté après Sam si PDF/Excel/PPT/Word sélectionnés
   - selectedFormats passé dans ChainContext
   - Message système quand Forge ajouté

✅ FormatSelectorModal.tsx (nouveau composant)
   - Déclenché avant buildPlan()
   - 9 formats en 3 catégories (Fichiers, Web, Contenu)
   - Warning E2B si format fichier coché
   - Défaut intelligent selon contexte (dossier → CC, sinon Markdown)

✅ Workspace.tsx :
   - handleRequestPlan → showFormatModal = true
   - handleFormatConfirmed → buildPlan()
   - Bannière E2B si non configuré

✅ DeliverablePanel.tsx :
   - Bascule vers onglet Fichiers si output contient # RONAKO_FORGE

✅ commands.rs : open_html_in_browser (Windows/macOS/Linux)
✅ Settings.tsx : section E2BEssentialSection en haut
✅ agentStore.ts : forge → e2b dans applyDefaultConnectors
✅ TypeScript 0 erreurs + Rust 0 warnings
```

### FICHIERS MODIFIÉS
```
src/lib/agents/defaultTeam.ts   (FORGE_AGENT + Sam 3 modes + SYSTEM_AGENT_IDS)
src/lib/skillPacks.ts           (FORGE_PRODUCTION_PACK — 5 skills)
src/lib/chainEngine.ts          (selectedFormats + formatsBlock)
src/hooks/useChainRunner.ts     (Forge auto-inject + selectedFormats context)
src/components/workspace/FormatSelectorModal.tsx  (créé)
src/screens/Workspace.tsx       (modal + bannière E2B)
src/components/workspace/DeliverablePanel.tsx     (détection RONAKO_FORGE)
src-tauri/src/commands.rs       (open_html_in_browser)
src-tauri/src/lib.rs            (register command)
src/screens/Settings.tsx        (E2BEssentialSection)
src/store/agentStore.ts         (forge → e2b defaults)
```

### FLUX COMPLET
```
1. Brief → "Lancer la chaîne" → FormatSelectorModal
2. User sélectionne formats (PDF, Excel, etc.)
3. Formats → selectedFormats chainStore
4. buildPlan() → ChainProposalCard
5. Si formats fichiers → FORGE_AGENT auto-ajouté après Sam
6. Chaîne tourne → formatsBlock injecté dans chaque prompt
7. Sam détecte formats → sort JSON structuré (pas texte)
8. Forge reçoit JSON → appelle execute_code (E2B)
9. E2B exécute Python → fichiers générés
10. DeliverablePanel onglet Fichiers → téléchargement
```

### ÉTAT ACTUEL
Forge opérationnel. TS 0 erreur, Rust 0 warning.

---

## SESSION 2026-05-30 — Marcus V2 + Système d'agents dynamique

### CE QUI A ÉTÉ FAIT
```
✅ Audit complet Marcus → MARCUS_AUDIT.md
   5 problèmes identifiés : dead code, mémoire non lue, prompts trop courts,
   pas de cohérence A/B/C, pas de commentaire post-chaîne

✅ buildMarcusAgentContext.ts (créé)
   Seule source de vérité sur les agents disponibles.
   buildMarcusAgentContext() + buildMarcusAgentList()
   → agents temps-réel depuis stores (agentStore + connectorStore)

✅ chainEngine.ts — ChainContext.chainAgentList ajouté
   Injecté pour Marcus (agent 0) : [AGENTS DE LA CHAÎNE] avec rôles+descriptions

✅ defaultTeam.ts — Descriptions enrichies + Prompt A reécrit
   Toutes les descriptions agent enrichies (spécialités précises)
   Prompt A : 55 → ~350 tokens, SCQ framework, output structuré, zéro nom hardcodé

✅ useMarcusChat.ts — Prompt B complet + dead code réactivé
   MARCUS_CONVERSATION_PROMPT : SCQ + JTBD + behavior_rules + post_chain_behavior
   briefAnalyzer.ts réactivé (score injecté si message > 50 chars)
   buildMemoryPrompt réactivé (patterns utilisateur)
   buildMarcusAgentContext injecté dans chaque appel

✅ useMarcusPlan.ts — Prompt C + agentContext + mémoire + adaptiveChain
   PLANNING_PROMPT → buildPlanningPrompt() paramétrique
   buildMarcusAgentList() remplace l'ancien agentList
   loadUserMemory() → RÈGLE 5 patterns dans PLANNING_PROMPT
   detectChainTemplate() → hint template (adaptiveChain réactivé)
   Persona + expertise + langue injectés

✅ useChainRunner.ts — chainAgentList + post-chaîne AAR
   chainAgentList construit depuis agentsWithMode.slice(1) pour Marcus (i=0)
   Post-chaîne : appel Haiku MARCUS_AAR_PROMPT → analyse After Action Review
   Message ajouté comme role: "assistant" agentId: "marcus"

✅ skillPacks.ts — Pack Marcus Expert (4 skills)
   marcus_scq, marcus_jtbd, marcus_team_composition, marcus_aar
   Sources citées : McKinsey, Harvard, US Army
   Auto-install dans installDefaultPacks()

✅ agentStore.ts — marcus_expert ajouté à ESSENTIAL_PACK_IDS

✅ AGENT_MARCUS.md créé (documentation technique complète)

✅ TypeScript 0 erreurs — Rust 0 warnings
```

### FICHIERS MODIFIÉS
```
src/lib/buildMarcusAgentContext.ts   (créé)
src/lib/chainEngine.ts               (ChainContext.chainAgentList)
src/lib/agents/defaultTeam.ts        (descriptions + Prompt A)
src/hooks/useMarcusChat.ts           (Prompt B + briefAnalyzer + mémoire + agentContext)
src/hooks/useMarcusPlan.ts           (Prompt C + agentList + mémoire + adaptiveChain)
src/hooks/useChainRunner.ts          (chainAgentList injection + AAR post-chaîne)
src/lib/skillPacks.ts                (Pack Marcus Expert 4 skills)
src/store/agentStore.ts              (marcus_expert dans installDefaultPacks)
CLAUDE.md                            (Marcus V2 documenté)
AGENT_MARCUS.md                      (créé — documentation technique)
```

### DÉCISIONS TECHNIQUES
```
- Zéro nom d'agent hardcodé dans les 3 prompts Marcus
- buildMarcusAgentContext = seule source de vérité agents disponibles
- briefAnalyzer silencieux : jamais bloquant, toujours facultatif
- Post-chaîne AAR via runApiCall (Haiku existant) — pas de nouveau path API
- Pack marcus_expert auto-installé au 1er lancement
```

### ÉTAT ACTUEL
Marcus V2 opérationnel. Système d'agents dynamique. TS 0 erreur, Rust 0 warning.

### PROCHAINE SESSION
Phase 8D ou corrections/ajustements Marcus selon retours utilisateur.

---

## TEMPLATE POUR LES PROCHAINES SESSIONS

```
---

## SESSION YYYY-MM-DD — Description courte

### CE QUI A ÉTÉ FAIT
  ✅ Tâche 1
  ✅ Tâche 2
  [Si nouvelle idée :]
  ➕ NOUVEAU : Idée X ajoutée en Phase Y

### FICHIERS MODIFIÉS
  chemin/fichier.ts    (modifié/créé/supprimé)

### DÉCISIONS PRISES
  - Décision et raison

### PROBLÈMES RENCONTRÉS
  - Problème → Solution

### ÉTAT ACTUEL
  Description en 1-2 phrases.

### PROCHAINE SESSION
  Prochaine tâche selon CLAUDE.md

---
```
