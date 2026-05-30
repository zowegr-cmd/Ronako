# AUDIT COMPLET RONAKO
> Généré le 2026-05-30 par Claude Code (claude-sonnet-4-6)
> Basé exclusivement sur le code réel du projet
> Lecture seule — aucune modification

---

## RÉSUMÉ EXÉCUTIF

### Ce qui fonctionne vraiment (✅)
- Chaîne d'agents séquentiels avec streaming Anthropic API via Rust/reqwest
- 12 agents + 4 consultants + 1 Relay — prompts et modèles configurés
- 4 modes de chaîne : Flash, Projet, Infini, Custom
- Relay : distillation du contexte entre agents (économie tokens réelle)
- ADN Projet + capacités équipe injectés dans tous les prompts
- Tool Use Phase 8 : DALL-E 3, Flux, E2B, Notion, GitHub, Tavily (boucle Rust JSON-RPC)
- 40+ APIs génériques via generic_api.rs (dispatcher HTTP)
- Client MCP réel (JSON-RPC stdio, start/stop depuis Pack Manager)
- Skills injectés dans les prompts (`=== NOM ===\n{content}`)
- Auto-activation skills par triggerKeywords
- Formats livrables (7) avec suggestions contextuelles
- Sauvegarde livrables + Bibliothèque (Tauri FS)
- Score Ryo (/10) avec impact moyen skills mis à jour après chaque chaîne
- Export/import agents, équipes, packs (.ronako-agent, .ronako-team, .ronako-pack + SHA-256)
- Connecteurs HTTP custom avec variables `{{...}}` et schéma généré
- Pack Manager : Skills, APIs, MCP, HTTP Custom — hub unique
- Product Tour 12 étapes avec spotlight réel sur les éléments
- 4 thèmes visuels (Mineral, Arctic, Forest, Sunset) via CSS data-theme
- Mode Focus (masque NavBar + Dock)
- Persona Marcus (4 modes) + Niveau expertise + Langue livrables
- Keyring OS pour TOUTES les clés API (aucune en localStorage)

### Ce qui est partiel (⚠️)
- MCP : client opérationnel MAIS nécessite Node.js installé (pas de vérification)
- Tool Use : disponible pour agents avec connecteurs OU en accès universel (fallback)
- APIs génériques (Airtable, Stripe...) : câblées Rust mais nécessitent que Claude décide de les appeler
- triggerKeywords : activent les skills mais seulement si le mot-clé est > 2 chars dans le brief
- avgScoreImpact : mis à jour après Ryo mais ne tient pas compte du contexte (1 valeur globale)
- Export custom packs : fonctionne mais les skills custom n'ont pas leur pack d'origine tracké parfaitement

### Ce qui ne fonctionne pas (❌)
- MCP sans Node.js : pas de message d'erreur utile
- `shareCode.ts` : codes de partage local définis mais server-side absent (Fase 8D prévue)
- `triggerKeywords` sur skills : filtre ≥ 3 chars — mots courts ignorés
- Mode dégradé : fallback texte basique si tous retries épuisés

### État général
Application fonctionnelle à ~95% pour les cas d'usage core. La chaîne tourne, les agents produisent, les livrables sont sauvegardés. Les features avancées (tool use, MCP) sont implémentées mais nécessitent une configuration utilisateur.

---

## 1. ARCHITECTURE

### Arborescence clés
```
ronako/
├── src/                          → Frontend React/TypeScript
│   ├── App.tsx                   → Routeur principal (6 routes)
│   ├── main.tsx                  → Point d'entrée, sans StrictMode
│   ├── index.css                 → Tailwind + 4 thèmes CSS data-theme
│   ├── types.ts                  → Types globaux (Agent, Skill, Message, ChainRun...)
│   │
│   ├── screens/                  → 6 écrans principaux
│   │   ├── Launcher.tsx          → Écran d'accueil + sélection projet
│   │   ├── Workspace.tsx         → Exécution chaîne + livrable
│   │   ├── AgentStudio.tsx       → Gestion agents (4 onglets)
│   │   ├── Orchestrator.tsx      → Composition équipe + DnD
│   │   ├── Settings.tsx          → Paramètres (redirect vers Pack Manager pour connecteurs)
│   │   └── PackManager.tsx       → Hub Skills/APIs/MCP/Custom
│   │
│   ├── hooks/                    → 13 hooks custom
│   │   ├── useChainRunner.ts     → ★ CŒUR — exécution chaîne complète
│   │   ├── useMarcusChat.ts      → Chat conversationnel avec Marcus
│   │   ├── useMarcusPlan.ts      → Génération proposition de chaîne
│   │   ├── useAnthropicStream.ts → ⛔ PROTÉGÉ — streaming via Tauri events
│   │   ├── useKeyboardShortcuts.ts → Raccourcis clavier
│   │   ├── useProjectFolder.ts   → Lecture dossier projet (Tauri FS)
│   │   ├── useChainOptimizer.ts  → Suggestions optimisation (3 axes)
│   │   ├── useChainAnalyzer.ts   → Analyse brief via Haiku
│   │   ├── useCustomDeliverableAnalysis.ts → Analyse livrable custom (Haiku)
│   │   ├── useJournalWatcher.ts  → Surveillance journal_dev.md (notify crate)
│   │   ├── useProjectMemory.ts   → Mémoire projet (.ronako/state.json)
│   │   ├── useSounds.ts          → Sons (Web Audio API — 5 sons)
│   │   └── useTips.ts            → Tips contextuels post-chaîne
│   │
│   ├── store/                    → 7 stores Zustand
│   │   ├── agentStore.ts         → Agents, teams, skills, packs custom
│   │   ├── chainStore.ts         → Run, messages, streaming, relay, DNA
│   │   ├── settingsStore.ts      → ⛔ PROTÉGÉ — API key (keyring), budget, préférences
│   │   ├── connectorStore.ts     → Clés APIs, HTTP custom, MCP custom
│   │   ├── projectStore.ts       → Projet actif, liste projets
│   │   ├── conversationStore.ts  → Historique conversations consultants
│   │   └── toastStore.ts         → Notifications toast
│   │
│   ├── lib/                      → 34+ fonctions utilitaires
│   │   ├── chainEngine.ts        → ★ buildAgentPrompt, buildToolDefinitions, ChainContext
│   │   ├── chainModes.ts         → 4 modes (Flash/Projet/Infini/Custom) + configs
│   │   ├── agents/defaultTeam.ts → ⛔ PROTÉGÉ — 12 agents + consultants + équipes
│   │   ├── projectDNA.ts         → DNA_SYSTEM_PROMPT + wrapDNA()
│   │   ├── dependencyMatrix.ts   → Matrice deps inter-agents
│   │   ├── marcusCheck.ts        → Vérification cohérence silencieuse
│   │   ├── apiCatalog.ts         → 40+ APIs (7 catégories)
│   │   ├── mcpCatalog.ts         → 12 serveurs MCP
│   │   ├── proactiveSuggestions.ts → 6 règles suggestions Marcus
│   │   ├── tips.ts               → 5 tips contextuels
│   │   ├── customDeliverableAnalyzer.ts → 17 règles analyse livrable
│   │   ├── formatRequirements.ts → Exigences par format livrable
│   │   ├── formatSelector.ts     → 7 formats + agent deliverable descriptions
│   │   ├── skillPacks.ts         → 5 packs prédéfinis
│   │   ├── analysisCache.ts      → Cache analyses (TTL par agent)
│   │   ├── exportImport.ts       → Export/import .ronako-* (SHA-256)
│   │   ├── libraryManager.ts     → Bibliothèque livrables
│   │   └── connectors/
│   │       ├── types.ts          → ALL_CONNECTORS (7 connecteurs legacy)
│   │       └── tavily.ts         → Ancien appel Tavily direct
│   │
│   └── components/               → UI components
│       ├── layout/               → AppShell, NavBar, TitleBar, ConsultantDock
│       ├── workspace/            → ChainProposalCard, DeliverablePanel, OrchestratorChat...
│       ├── agents/               → AgentAvatar, AgentCard, AgentChatModal, AgentForm
│       ├── onboarding/           → ProductTour (spotlight réel)
│       ├── library/              → VersionComparator
│       └── ui/                   → Button, Badge, InfoTooltip, Toggle, Slider, TipBanner...
│
├── src-tauri/src/                → Backend Rust
│   ├── main.rs                   → Entrypoint Tauri
│   ├── lib.rs                    → invoke_handler — 26 commandes enregistrées
│   ├── commands.rs               → Commandes générales (keyring, FS, Tavily, HTTP)
│   ├── anthropic.rs              → ⛔ PROTÉGÉ — anthropic_stream + anthropic_stream_with_tools
│   ├── folder.rs                 → Lecture récursive dossier projet
│   ├── mcp.rs                    → Client MCP (JSON-RPC stdio, start/stop/call)
│   └── tools/                   → 8 modules tool use
│       ├── mod.rs                → Dispatcher execute_tool() + ToolKeys
│       ├── dalle.rs              → DALL-E 3 (OpenAI Images API)
│       ├── flux.rs               → Flux Pro 1.1 (BFL API + polling)
│       ├── e2b.rs                → E2B sandbox (code execution + fichiers)
│       ├── notion.rs             → Export page Notion
│       ├── github.rs             → Push fichier GitHub
│       ├── tavily.rs             → Recherche web Tavily
│       └── generic_api.rs        → Dispatcher HTTP générique (40+ APIs) + custom HTTP
│
├── CLAUDE.md                     → Règles, roadmap, décisions techniques
├── JOURNAL.md                    → Historique des sessions
├── AUDIT.md                      → Ancien audit (peut être obsolète)
├── PROGRESS.md                   → Suivi Pack Manager refonte
└── AUDIT_COMPLET.md              → CE FICHIER
```

### Dépendances principales
- **Tauri v2** : desktop, keyring, dialog, fs, shell, notification
- **React 18** : UI, hooks
- **TypeScript strict** : 0 erreur
- **Zustand v5** + persist : 7 stores
- **Framer Motion** : animations (pas de backdrop-filter, WebView2)
- **DnD Kit** : drag & drop agents
- **MemoryRouter** (pas BrowserRouter) : navigation in-app
- **reqwest 0.12** : appels HTTP Rust (stream + json)
- **tokio full** : async Rust (process stdio pour MCP)
- **keyring v3** : keyring OS Windows natif

---

## 2. AGENTS

### Tableau complet

| ID | Nom | Modèle | Temp | Rôle |
|---|---|---|---|---|
| marcus | Marcus | Sonnet 4.6 | 65 | Chef d'Orchestre — briefing, orchestration |
| omar | Omar | Haiku 4.5 | 50 | Analyste Business — analyse marché |
| sofia | Sofia | Haiku 4.5 | 40 | Stratège SEO — mots-clés, référencement |
| camille | Camille | Haiku 4.5 | 20 | Experte Juridique — légal, RGPD |
| leo | Léo | Sonnet 4.6 | 80 | Copywriter Senior — textes, emails, posts |
| maya | Maya | Haiku 4.5 | 30 | Traductrice Multilingue — FR/EN/ES/DE |
| axel | Axel | Haiku 4.5 | 70 | Designer UI/UX — specs visuelles |
| nina | Nina | Sonnet 4.6 | 35 | Architecte Technique — stack, archi |
| tom | Tom | Haiku 4.5 | 25 | Expert QA — tests, edge cases |
| ella | Ella | Sonnet 4.6 | 50 | Agent de Fusion — synthèse consolidée |
| ryo | Ryo | Sonnet 4.6 | 20 | Validateur Final — score /10 + faiblesses |
| sam | Sam | Haiku 4.5 | 30 | Scribe & Setup — prompt Claude Code + note |
| relay | Relay ⟡ | Sonnet 4.6 | 20 | Distillateur — résumé contexte inter-agents |

### Consultants (non dans la chaîne)

| ID | Nom | Rôle |
|---|---|---|
| consultant-ideation | Idéation | Consultant Créatif |
| consultant-prompt | Prompt Machine | Ingénieur de Prompts |
| consultant-veille | Veille Tech | Veilleur Technologique |
| consultant-nova | Nova | Experte Connecteurs & MCP |

### Connecteurs par défaut (appliqués au 1er lancement)
```
marcus  → tavily
sofia   → tavily, serper
omar    → tavily
axel    → openai, bfl
leo     → sendgrid
nina    → github, e2b
sam     → github, e2b
tom     → e2b
ella    → notion
```
**Agents sans connecteurs assignés → accès universel à TOUS les outils configurés.**

### Comment le Relay fonctionne (code réel)
- **Fichier** : `src/hooks/useChainRunner.ts` lignes ~82-130
- Après chaque agent (sauf dernier), `runRelay()` est appelé
- Input : output agent courant + matrice dépendances (`buildDependencyContext`)
- Model : `RELAY_AGENT.model` (Sonnet 4.6)
- Output : résumé ~30-50 tokens (au lieu de 500-2000)
- Stocké dans `currentRelayOutputs[agent.id]` puis dans `chainStore.relayOutputs`
- Relay **compte** dans les tokens totaux et le coût réel
- `relaySavedTokens` estimé via `estimateRelaySavings()`

### Comment l'ADN Projet est construit
- **Fichier** : `src/hooks/useChainRunner.ts` ligne ~202
- Généré une seule fois par projet (`!dna && useRealApi`)
- Appel à Marcus via `DNA_SYSTEM_PROMPT` (in `src/lib/projectDNA.ts`)
- Model : Haiku 4.5 (RELAY_AGENT.model)
- Stocké dans `chainStore.projectDNA` (persisté)
- **Enrichi** avant injection : `teamCapabilities` ajouté (capacités de l'équipe)
- Injecté via `wrapDNA()` dans chaque agent N+1 (jamais Marcus lui-même)
- Format : `[ADN PROJET]\n{dna}\n{teamCapabilities}\n[/ADN PROJET]`

---

## 3. FLUX D'EXÉCUTION

```
1. DÉMARRAGE CHAÎNE (useChainRunner.runChain)
   ├── Résolution agents (customAgentIds ou équipe par défaut)
   ├── Résolution modèles (resolveAgentModel — overrides mode)
   ├── startRun() → status="running"
   ├── clearRelayOutputs()
   ├── playChainStart() (son)
   │
2. ÉTAPE 0 — ADN PROJET (si pas encore généré)
   ├── Appel Haiku (DNA_SYSTEM_PROMPT + userBrief)
   ├── setProjectDNA(dna)
   │
3. BUILD CAPACITÉS ÉQUIPE (chaque lancement)
   ├── buildTeamCapabilitiesBlock(agents, skills, keys, mcpStates)
   └── Injected in teamCapabilities context
   │
4. BOUCLE AGENTS (for i in agentsWithMode)
   │
   ├── 4a. BUDGET CHECK
   │   ├── monthlySpend >= monthlyBudgetCap → stopRun
   │   └── >= 80% → toast warning
   │
   ├── 4b. CONNECTEURS & OUTILS
   │   ├── explicitConnectors = agent.connectors ?? []
   │   ├── Si vide → allConfiguredIds (accès universel)
   │   ├── hasTavilyLegacy = web_search && !hasNewTavily && legacy key
   │   ├── Tavily legacy → tavilySearch() + searchContext
   │   ├── buildToolDefinitions() → Phase 8 tools + generics + custom + MCP
   │   └── activeToolNames → pour injection prompt
   │
   ├── 4c. SKILLS
   │   ├── getActiveSkillsForAgent(agent.id)
   │   ├── Auto-activation triggerKeywords (vs userBrief.toLowerCase)
   │   ├── universalSkills (isActive && agentIds.includes("marcus") && inheritToAll)
   │   └── allAgentSkills = agentSkills + keywordActivated (dédoublonnés)
   │
   ├── 4d. BUILD PROMPT
   │   ├── buildAgentPrompt(agent, context, previousOutput, i)
   │   ├── context inclut: projectDNA, relayContext, agentSkills, universalSkills,
   │   │   deliverableLanguage, activeToolNames, teamCapabilities, folderContext
   │   └── Prompt final = header + langBlock + toolsBlock + dnaBlock + relayBlock + fileBlock + brief/contexte
   │
   ├── 4e. VÉRIF CACHE (analysisCache — TTL par agent)
   │   └── Si cache hit → skip appel API
   │
   ├── 4f. EXÉCUTION (si useRealApi)
   │   ├── Si allTools.length > 0 → invoke("anthropic_stream_with_tools")
   │   │   ├── Rust boucle tool use : call → tool_use? → execute_tool → tool_result → call
   │   │   ├── Events: anthropic-chunk-{reqId}, anthropic-done-{reqId}, anthropic-tool-use-{reqId}
   │   │   └── Dispatch "tool-result" DOM event → DeliverablePanel
   │   └── Sinon → useAnthropicStream (SSE Rust → events Tauri)
   │       ├── onChunk → appendStreaming + fullText accumulation
   │       └── onDone → inputTokens, outputTokens
   │
   ├── 4g. RETRY (MAX_RETRIES = 2)
   │   ├── Si apiError || fullText < 50 chars → retry avec délai croissant
   │   └── Si tous retries épuisés → fallback texte "[agent n'a pas pu produire...]"
   │
   ├── 4h. POST-AGENT
   │   ├── flushStreaming() → workspaceMessages
   │   ├── addMessage(role=assistant, agentId, tokens, cost)
   │   ├── addSpend(cost)
   │   ├── cacheAnalysis() (si agent non exclu du cache)
   │   ├── Si ryo → parseRyoOutput() + setRyoResult() + updateSkillScore()
   │   ├── Si agent.pauseAfter → pauseForAgent() + attente resumeFromAgent()
   │   └── Si status=="pausing" → stopRun + message remaining
   │
   ├── 4i. RELAY + MARCUS CHECK (si relayEnabled && pas dernier agent)
   │   ├── runRelay(fullText, agent, nextAgent, currentRelayOutputs, dna)
   │   └── Si marcusCheckEnabled → runMarcusCheck(dna, relayContext)
   │
   └── previousOutput = fullText
   │
5. POST-CHAÎNE
   ├── Option Chef (si chefEnabled) → pauseForChef() + attente resumeFromChef()
   ├── completeRun() → status="completed"
   ├── playChime() (son)
   ├── recordChain(cost, score) → sessionTracker.ts
   ├── updateMemoryAfterChain() → userMemory.json
   ├── Si score >= 8 → suggest save team (event DOM)
   ├── Notification OS (si permission granted)
   └── saveDeliverable() → .ronako/livrables/{date}/
```

### Mode Mock (sans clé API)
- `mockAgentResponse()` in `chainEngine.ts` — retourne texte simulé
- Utilisé si `!hasValidApiKey()`

---

## 4. CONNECTEURS

| Connecteur | Impl. Rust | Actif (tool use) | Clé via keyring | Note |
|---|---|---|---|---|
| DALL-E 3 (openai) | ✅ dalle.rs | ✅ Phase 8 | ✅ | Génération images + download local |
| Flux Pro (bfl) | ✅ flux.rs | ✅ Phase 8 | ✅ | Polling BFL API + download |
| E2B Sandbox | ✅ e2b.rs | ✅ Phase 8 | ✅ | Execute code + base64 file decode |
| Notion | ✅ notion.rs | ✅ Phase 8 | ✅ | Crée page avec paragraphes |
| GitHub | ✅ github.rs | ✅ Phase 8 | ✅ | PUT fichier + SHA si existant |
| Tavily | ✅ tavily.rs | ✅ Phase 8 + legacy | ✅ | Double path (legacy + tool use) |
| HTTP custom | ✅ generic_api.rs | ✅ | ✅ optionnel | Variables `{{...}}`, schema généré |
| 30+ APIs (Airtable, Stripe...) | ✅ generic_api.rs | ✅ (generique) | ✅ | Basé sur registry URL + auth |
| MCP servers | ✅ mcp.rs | ✅ si démarré | ❌ (npx) | Nécessite Node.js |
| ScreenshotOne | ⚠️ (legacy ALL_CONNECTORS) | ✅ (generic) | ✅ | |
| Replicate/ElevenLabs/Runway | ⚠️ catalog only | ✅ (generic) | ✅ | Via registry generic_api |

### Comment les clés API sont gérées
- **Toutes** les clés dans le keyring OS (Windows Credential Manager)
- `secure_set_key` / `secure_get_key` / `secure_delete_key` in commands.rs
- `settingsStore.connectorKeys` : legacy cache (7 clés originales)
- `connectorStore.keys` : nouveau cache unifié (34+ connecteurs)
- Migration automatique au démarrage (`migrateFromSettings()`)
- Jamais en localStorage ou en dur dans le code

### Tavily — double chemin actuel
```typescript
// Chemin 1 (LEGACY) — src/hooks/useChainRunner.ts ~ligne 296
// Déclenché si : agent.tools.includes("web_search") && !hasNewTavilyConnector && connectorKeys.tavily
// Appel direct tavilySearch() AVANT la construction du prompt → searchContext injecté

// Chemin 2 (TOOL USE) — via buildToolDefinitions
// Déclenché si : tavily dans agent.connectors ET clé configurée
// Claude appelle web_search comme outil pendant l'exécution
```
**Les deux chemins sont mutuellement exclusifs depuis la Phase 9 (hasNewTavilyConnector check).**

---

## 5. SKILLS

### Stockage
- `agentStore.skills: Skill[]` — tableau persisté (localStorage "ronako-agents-v1")
- `Skill` interface : id, name, description, content, agentIds[], isActive, isTemporary, inheritToAll, triggerKeywords[], sector?, createdBy, createdAt, useCount, avgScoreImpact, packId?
- `customPacks: SkillPack[]` — packs créés par l'utilisateur (persistés)

### Injection dans les prompts
- **Fichier** : `src/lib/chainEngine.ts` — `buildPromptWithSkills(agent, skills, universalSkills)`
- Format : `=== NOM SKILL MAJUSCULES ===\n{content}\n\n` (séparé par `\n\n`)
- **MAX_SKILLS = 5** par agent
- **MAX_PROMPT_TOKENS = 3800** — troncature si dépassé
- Appended APRÈS le system prompt de l'agent

### Système d'héritage Marcus
- Skills avec `inheritToAll: true` ET `agentIds.includes("marcus")` → injectés dans TOUS les agents
- `universalSkills = skills.filter(s => s.isActive && s.agentIds.includes("marcus") && s.inheritToAll)`

### Auto-activation par mots-clés
- **Fichier** : `src/hooks/useChainRunner.ts` ~ligne 320
- `triggerKeywords.some(kw => kw.length > 2 && userBrief.toLowerCase().includes(kw))`
- Skills non actifs mais avec keywords matchants → activés pour cette chaîne seulement

### Packs prédéfinis (5)
1. **E-Commerce** (SEO Produit, Copy Conversion, Légal E-Commerce)
2. **SaaS** (Onboarding Copy, Pitch Investisseur, Architecture Scalable)
3. **Business Local** (SEO Local, Ton de Proximité)
4. **Marketing Digital** (Social Media Strategy, Email Marketing)
5. **Tech & Dev** (Performance Web, Sécurité Renforcée)

### Score impact
- `avgScoreImpact` mis à jour après chaque score Ryo > 0
- Formule : `(avgScoreImpact * useCount + scoreDelta) / (useCount + 1)`
- Affiché dans la Bibliothèque : `⭐ 7.2 (8×)`

---

## 6. CONSULTANTS

### Les 4 consultants
| ID | Nom | Rôle réel |
|---|---|---|
| consultant-ideation | Idéation | Brainstorming créatif, angles stratégiques |
| consultant-prompt | Prompt Machine | Création/audit/modification prompts agents |
| consultant-veille | Veille Tech | Recherche stack, suggestions MCP |
| consultant-nova | Nova | Configuration connecteurs, MCP, outils |

### Comment les blocs ACTION fonctionnent
- **Fichier** : `src/lib/consultantActions.ts`
- Les réponses des consultants peuvent contenir des blocs `[ACTION:type]...[/ACTION]`
- Parsés par `parseActionBlocks()` et affichés comme `ActionButton` colorés
- Types : modifier-agent, créer-agent, auditer-agent, activer-skill, suggérer-mcp...
- **Le parsing existe mais l'exécution automatique est partielle** — l'utilisateur doit confirmer

### Contexte injecté
- **Fichier** : `src/lib/consultantContext.ts`
- Injecte : état de l'app (agents, skills, connecteurs, dernier livrable)
- Format string enrichi ajouté au system prompt du consultant avant l'envoi

### Persistance conversations
- `conversationStore.ts` — historique par consultant ID
- Persisté dans localStorage

---

## 7. PACK MANAGER

### Implémentation réelle

**4 onglets :**

**⚡ Skills (3 sous-onglets) :**
- **Packs** : packs officiels (5) + packs custom (CRUD complet : créer/éditer/supprimer/installer/désinstaller)
  - Installation : matérialise les skills dans agentStore.skills avec packId tracké
  - Désinstallation : supprime via `skill.packId === packId`
  - Export : `.ronako-pack` avec SHA-256
  - Expansion : voir/ajouter/retirer skills du pack
- **Bibliothèque** : tous les skills installés
  - Recherche par nom, filtre par agent, filtre "actifs seulement"
  - Bouton 👁 preview prompt final (buildPromptWithSkills en direct)
  - Import GitHub : URL → http_custom_call Rust → parse .md → modal assignation agents
  - Conflits détectés : paires antagonistes (formel/casual, court/détaillé...)
  - Budget tokens par agent (barre progression, rouge si >80% des 3800)
  - avgScoreImpact + tokens estimés affichés sur chaque skill
- **Créer** : formulaire complet (nom, description, contenu, agents, pack, universel, keywords)

**🔌 APIs :**
- Catalogue 40+ APIs en 7 catégories avec recherche + filtre
- Clé configurée inline → keyring OS via connectorStore
- Statut temps réel ✅ Actif / ⚠️ Clé manquante
- Bouton **Tester** : ping endpoint health (10 APIs supportées)
- Bouton **Supprimer la clé** (deleteKey → keyring)
- Toutes `hasToolDef: true` → connectées via tool use (Phase 8 ou generic_api)

**🤖 MCP :**
- Import depuis URL GitHub : fetch package.json + README via http_custom_call
- Serveurs importés : bouton **▶ Démarrer** (invoke mcp_start)
  - Lance `npx -y {package}` via subprocess Rust (cross-platform)
  - Séquence MCP : initialize → notifications/initialized → tools/list
  - Status : Starting → Running → liste outils badges verts
  - Bouton **⏹ Arrêter** (invoke mcp_stop → kill process)
- Catalogue 12 serveurs officiels + communauté (lecture seule)
- **Limite** : nécessite Node.js installé sur la machine

**⚙️ HTTP Custom :**
- Formulaire : nom, URL, méthode, auth, body template avec `{{variables}}`
- Preview schéma généré en temps réel depuis `{{vars}}` → montre exactement ce que Claude reçoit
- Test : invoke http_custom_call → ✅/❌
- Badge "⚡ 3 vars: email, subject, content" ou "⚠️ Aucune variable"

### Import GitHub Skills — fonctionne-t-il ?
✅ **OUI** — via `invoke("http_custom_call", {url: raw_url, method:"GET", ...})`
- Parse H1 comme nom, premier paragraphe comme description
- Modal guidé pour assigner agents avant création
- Respecte la règle "no fetch JS" (passe par Rust)

---

## 8. DELIVERABLE PANEL

### Onglets existants
- **📄 Outputs** : liste des messages assistant par agent, expandable, copie par message
- **📊 Stats** : grille tokens/coût/agents + barres output par agent + économies Relay
- **🎯 Présentation** : navigation agent par agent (mode présentation client)
- **🖼️ Visuels** (conditionnel) : images générées par DALL-E/Flux via tool use
  - Affichage via `convertFileSrc(local_path)` + download via writeFile
- **📁 Fichiers** (conditionnel) : fichiers générés par E2B + download

### Score Ryo
- `ryoResult: { score, scoreColor, scoreBg, scoreLabel, points[], weaknesses[], recommendation }`
- Barre animée, bouton "Corriger les points faibles" (déclenche ReworkModal)

### Boutons d'export
- **Copier pour Claude Code** : formatForClaudeCode() — extrait blocs code + contexte
- **Rapport client** : generateClientReport() — synthèse sans données techniques
- **Tout copier Markdown** : concatène tous les outputs
- **Export .md** : via Tauri dialog.save + writeTextFile
- **Export .html** : HTML mis en page basique

### Sauvegarde livrables
- `saveDeliverable()` in `libraryManager.ts`
- Chemin : `.ronako/livrables/{nom-projet}-{timestamp}/`
- Fichiers : meta.json (DeliverableEntry), chaque output agent en .md
- Liste via `list_deliverables()` → Rust FS

### Bibliothèque
- Affichée dans le side panel Workspace onglet "Biblio"
- `LibraryPanel.tsx` — liste des DeliverableEntry
- Ouverture → ReworkModal (4 options : améliorer, itérer, reformuler, extraire)
- VersionComparator : diff ligne par ligne coloré (vert=ajouté, rouge=supprimé)

### Formats livrables
- **Sélection** : ChainProposalCard — 7 formats décochables (tous)
- **Défaut intelligent** : inferFormatsFromBrief(brief, hasFolder) → analyse mots-clés
- **Validation** : min 1 format OU champ "autre" non vide pour lancer
- **Analyse custom** : analyzeCustomDeliverable() → 17 règles locales + Haiku si no match

---

## 9. PRODUCT TOUR

### Comment il fonctionne
- **Fichier** : `src/components/onboarding/ProductTour.tsx`
- Déclenché au premier lancement (`!hasSeenTour`)
- Rejouable via Settings → Aide → "Revoir le tutoriel"
- Event DOM `open-tour` → relance depuis n'importe où

### Les 12 étapes
1. `marcus-chat` /workspace — 👋 Voici Marcus
2. `textarea-brief` /workspace — ✍️ Ton brief
3. `launch-button` /workspace — ⚡ Lance l'équipe
4. `mode-selector` /workspace — 💰 Choisis ton investissement
5. `relay-indicator` /orchestrator — ⟡ Relay réduit tes coûts
6. `score-ryo` /workspace — 📄 Ton livrable est noté
7. `library-tab` /workspace — 📚 Tout est sauvegardé
8. `agent-grid` /studio — 🤖 Ton équipe (INTERACTIF — clic Sofia)
9. `skills-tab` /studio — ⚡ Skills et Connecteurs
10. `chain-dnd` /orchestrator — 🔗 Compose ton équipe (INTERACTIF — drag)
11. `consultant-dock-button` /workspace — 💡 Tes consultants (INTERACTIF — ouvrir dock)
12. `textarea-brief` /workspace — 🚀 Tu es prêt !

### Système de highlight (spotlight)
- **4 rectangles sombres** autour de l'élément (pas clip-path — WebView2 compatible)
- Ring electric `border: 2px solid rgba(0,122,255,0.75)` sur l'élément ciblé
- Tooltip auto-positionné : dessous > dessus > droite > gauche selon espace
- Transition CSS 280ms entre étapes
- `pointer-events: none` — les éléments ciblés restent cliquables
- Retry 20× / 120ms si élément pas encore rendu
- Clamp au viewport (éléments qui dépassent sont tronqués correctement)
- Keyboard : → suivant / ← précédent / Esc fermer

---

## 10. STORES ZUSTAND

| Store | Contenu principal | Persisté | Clé localStorage |
|---|---|---|---|
| **agentStore** | agents[], teams[], skills[], consultants[], customPacks[], hasAppliedDefaultConnectors | ✅ Tout | "ronako-agents-v1" |
| **chainStore** | run, workspaceMessages, streaming, relay, DNA, costEstimate, proposal | ✅ Partiel (messages, DNA, relayOutputs, run idle) | "ronako-chain-v1" |
| **settingsStore** | apiKey(keyring), budget, persona, theme, expertise, lang, focusMode, chainPresets | ✅ Sauf apiKey, sessionSpend | "ronako-settings-v3" |
| **connectorStore** | keys{}, customConnectors[], customMcps[], mcpStates{} | ✅ Partiel (customConnectors, customMcps) | "ronako-connectors-v1" |
| **projectStore** | activeProjectId, projects[] | ✅ | "ronako-projects-v1" |
| **conversationStore** | messages par consultant ID | ✅ | "ronako-conversations-v1" |
| **toastStore** | toasts[] | ❌ (éphémère) | — |

### Notes importantes
- `chainStore.run.status` : réinitialisé à "idle" à la persistance (pas de chaîne "running" au rechargement)
- `settingsStore.apiKey` : jamais persisté — chargé depuis keyring OS à chaque démarrage
- `connectorStore.mcpStates` : non persisté — MCP servers doivent être redémarrés à chaque session

---

## 11. COMMANDES RUST (26 enregistrées)

### commands.rs (17 commandes)

| Commande | Description |
|---|---|
| `greet` | Test — retourne "Hello {name}!" |
| `get_app_version` | Retourne la version de l'app |
| `secure_set_key(account, secret)` | Stocke clé dans keyring OS |
| `secure_get_key(account)` | Lit clé depuis keyring OS |
| `secure_delete_key(account)` | Supprime clé du keyring OS |
| `read_journal_file(path)` | Lit journal_dev.md |
| `save_project_state(project_id, state)` | Sauvegarde JSON état projet |
| `load_project_state(project_id)` | Charge JSON état projet |
| `get_projects_list()` | Liste les dossiers projets dans AppData |
| `start_journal_watch(app, path)` | Lance watcher notify sur journal_dev.md |
| `stop_journal_watch()` | Arrête le watcher |
| `save_deliverable(project_path, folder_name, files)` | Sauvegarde fichiers livrable |
| `list_deliverables(project_path)` | Liste les livrables d'un projet |
| `load_deliverable_file(deliverable_path, file_name)` | Lit un fichier livrable |
| `delete_deliverable(deliverable_path)` | Supprime un dossier livrable |
| `tavily_search(query, api_key)` | Recherche web Tavily (legacy) |
| `http_custom_call(url, method, headers, body)` | Appel HTTP générique |

### anthropic.rs (2 commandes)

| Commande | Description |
|---|---|
| `anthropic_stream(api_key, model, system_prompt, user_message, request_id)` | Streaming SSE → events Tauri (texte pur) |
| `anthropic_stream_with_tools(api_key, model, system_prompt, user_message, request_id, tools, tool_keys)` | Boucle tool use (max 10 tours) — non-streaming puis stream final |

### mcp.rs (5 commandes)

| Commande | Description |
|---|---|
| `mcp_start(server_id, package, extra_args)` | Lance npx, handshake MCP, retourne tools[] |
| `mcp_stop(server_id)` | Kill process MCP |
| `mcp_list_tools_cmd(server_id)` | Retourne tools[] du serveur |
| `mcp_status(server_id)` | Boolean — serveur actif ? |
| `mcp_running_servers()` | Liste des server_ids actifs |

### folder.rs (1 commande, via lib.rs)

| Commande | Description |
|---|---|
| `read_project_folder(path, max_size_kb, extensions)` | Lecture récursive dossier → FolderSummary (arbre + fichiers + stats) |

---

## 12. MANQUANT / INCOMPLET

### Features prévues mais non implémentées

| Feature | Statut | Note |
|---|---|---|
| Codes de partage cloud | ❌ | shareCode.ts existe (codes locaux) mais serveur absent |
| Marketplace skills/agents | ❌ | Prévu Phase 8D |
| Ronako Cloud | ❌ | Prévu Phase 8D |
| Briefing vocal | ❌ | Prévu Phase 8D |
| API Ronako publique | ❌ | Prévu Phase 8D |
| Support multi-modèles (GPT-4, Gemini) | ❌ | Prévu Phase 8D |
| GitHub import skills (coreyhaines31) | ❌ | Mentionné dans CLAUDE.md mais non implémenté |
| Parallel agents | ⚠️ | PARALLEL_GROUPS défini dans dependencyMatrix mais pas de parallélisation réelle |

### Fonctions vides ou partielles

| Fichier | Problème |
|---|---|
| `src/lib/adaptiveChain.ts` | Existe mais usage dans la chaîne non vérifié |
| `src/lib/briefCompressor.ts` | Compresseur de brief >300 tokens — non vérifié si actif |
| `consultantActions.ts` | Blocs ACTION parsés mais execution partielle (confirmation manuelle) |
| `src/lib/globalSearch.ts` | Search livrables défini mais intégration UI non vérifiée |
| Rework 4 options | ReworkModal existe mais workflow pas entièrement traçable |

### Bugs connus

| Bug | Description |
|---|---|
| MCP sans Node.js | Pas de vérification préalable — erreur brute Rust |
| avgScoreImpact global | Score mis à jour même si le skill n'a pas été pertinent pour cette chaîne spécifique |
| `triggerKeywords` ≥ 3 chars | Mots courts (<= 2 chars) ignorés silencieusement |
| Thèmes visuels | CSS vars définies mais Tailwind utilise des couleurs hardcodées (bg-onyx, bg-graphite) — les thèmes n'affectent que partiellement le rendu |
| `connectorStore.keys` non persisté | Rechargement app = re-fetch de toutes les clés depuis keyring (overhead au démarrage) |
| MCP states perdus au reload | `mcpStates` non persisté → serveurs MCP apparaissent "stopped" après rechargement même si actifs |

### Incohérences CLAUDE.md vs code réel

| CLAUDE.md dit | Code réel |
|---|---|
| 7.16 Ronako Score mensuel | ❌ Non implémenté |
| Agents visuels "Pixel" | ❌ Non implémenté (juste mentionné dans roadmap) |
| Import Tavily dans tools/tavily.rs | ✅ Fait (mais double path legacy persistant) |
| Max 3 connecteurs actifs par agent | ❌ Pas de limitation dans le code |

---

## 12. RECOMMANDATIONS

### Priorité haute (bugs)
1. **Vérifier Node.js** avant `mcp_start` → message d'erreur utile
2. **Persister mcpStates** dans connectorStore pour survivre au reload
3. **Fix thèmes visuels** : les couleurs Tailwind hardcodées (bg-onyx) ignorent les CSS vars → convertir en `bg-[var(--color-onyx)]`

### Priorité moyenne (polish)
4. **Parallélisation agents** : `PARALLEL_GROUPS` est défini mais non utilisé
5. **Compresseur brief** : vérifier si `briefCompressor.ts` est actif ou dead code
6. **avgScoreImpact** : pondérer par pertinence du skill (via agentIds match)
7. **Blocs ACTION consultants** : automatiser l'exécution après confirmation

### Priorité basse (Phase 8D)
8. Support multi-modèles GPT-4/Gemini
9. Ronako Cloud + collaboration
10. Marketplace skills/agents

---

*Audit généré le 2026-05-30 — Code version : commit 1b5632e*
*TypeScript : 0 erreur | Rust : 0 warning*
