# AUDIT RONAKO — Rapport complet
> Généré le 2026-05-29 — État réel du code source

---

## 1. STRUCTURE DU PROJET

```
ronako/
├── src/                          Frontend React/TypeScript
│   ├── App.tsx                   Router MemoryRouter, chargement clé API au démarrage
│   ├── main.tsx                  Point d'entrée React (StrictMode RETIRÉ intentionnellement)
│   ├── index.css                 Tailwind directives + polices + scrollbar custom
│   ├── types.ts                  Tous les types TypeScript partagés
│   ├── vite-env.d.ts             Déclaration types Vite (import.meta.glob)
│   │
│   ├── screens/
│   │   ├── Launcher.tsx          Écran d'accueil — projets récents, créer/ouvrir
│   │   ├── Workspace.tsx         Écran principal — chat Marcus + chaîne + dossier
│   │   ├── AgentStudio.tsx       Grille des agents — CRUD complet
│   │   ├── Orchestrator.tsx      Drag & drop chaîne — DnD Kit
│   │   └── Settings.tsx          Paramètres — clé API keyring, budget, sons
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx      Shell avec TitleBar + NavBar + Outlet + Toasts
│   │   │   ├── TitleBar.tsx      Barre titre custom draggable (Tauri), min/max/close
│   │   │   ├── NavBar.tsx        Nav latérale 58px avec 3 icônes + settings
│   │   │   └── ConsultantDock.tsx Sidebar flottante — 3 consultants IA avec streaming
│   │   │
│   │   ├── agents/
│   │   │   ├── AgentAvatar.tsx   Gradients Siri-style avec effets lumineux
│   │   │   ├── AgentCard.tsx     Carte bento — hover, focus chaîne, badge modèle
│   │   │   ├── AgentForm.tsx     Formulaire création/édition agent complet
│   │   │   └── AgentChainItem.tsx Item drag & drop DnD Kit dans orchestrateur
│   │   │
│   │   ├── workspace/
│   │   │   ├── OrchestratorChat.tsx  Chat Marcus — streaming live + message système
│   │   │   ├── ChainProposalCard.tsx Proposition agents de Marcus — DnD reorder
│   │   │   ├── AgentFlowViz.tsx  Flow visuel agents — particules SVG animées
│   │   │   ├── BudgetCounter.tsx Compteur coût session + barre mensuelle
│   │   │   ├── DeliverablePanel.tsx  Panel livrables — copy + badge statut
│   │   │   ├── JournalPanel.tsx  Journal Claude Code — lecture live/manuelle
│   │   │   └── FolderContextBar.tsx  Barre dossier lié — picker + stats + analyser
│   │   │
│   │   └── ui/
│   │       ├── AppLogo.tsx       Logo SVG vectoriel (src/assets/logo.svg)
│   │       ├── Badge.tsx         Badges variants (electric/mystic/success/warning/danger)
│   │       ├── Button.tsx        Bouton avec effet glow, variants, loading
│   │       ├── Card.tsx          Carte bento Framer Motion avec hover
│   │       ├── Modal.tsx         Modal AnimatePresence backdrop + spring
│   │       ├── Slider.tsx        Slider personnalisé avec track coloré
│   │       ├── Toast.tsx         Notifications toast Framer Motion + ToastContainer
│   │       └── Toggle.tsx        Toggle iOS spring animation
│   │
│   ├── hooks/
│   │   ├── useAnthropicStream.ts Streaming via Tauri invoke + events Rust→frontend
│   │   ├── useChainRunner.ts     Exécution chaîne séquentielle — réel + mock
│   │   ├── useMarcusChat.ts      Chat 1:1 avec Marcus (mode conversation)
│   │   ├── useMarcusPlan.ts      Marcus analyse conversation → proposition JSON agents
│   │   ├── useProjectFolder.ts   Picker dossier OS + lecture fichiers + buildContext
│   │   └── useJournalWatcher.ts  Watcher journal_dev.md via Tauri events
│   │
│   ├── store/
│   │   ├── agentStore.ts         Agents + équipes — persist localStorage
│   │   ├── chainStore.ts         État chaîne + streaming + proposition Marcus
│   │   ├── projectStore.ts       Projets actifs — persist localStorage
│   │   ├── settingsStore.ts      Clé API keyring OS + budget + sons
│   │   └── toastStore.ts         Notifications toast éphémères (pas persisté)
│   │
│   ├── lib/
│   │   ├── agents/defaultTeam.ts 13 agents Alpha + 3 consultants préconfigurés
│   │   ├── chainEngine.ts        buildAgentPrompt + injection contexte dossier
│   │   ├── tokenCounter.ts       Estimation tokens + calcul coût centimes
│   │   └── utils.ts              cn(), formatCost(), generateId(), relativeTime()
│   │
│   └── assets/
│       ├── logo.svg              Logo Ronako SVG vectoriel (R gradient bleu→violet)
│       └── logo-*.png            Versions PNG générées par scripts/generate-icons.mjs
│
├── src-tauri/
│   ├── Cargo.toml                Dépendances Rust complètes
│   ├── tauri.conf.json           Config Tauri v2 — fenêtre 1280x820, décorations=false
│   ├── capabilities/default.json Permissions Tauri — core, fs, shell, dialog
│   ├── build.rs                  tauri_build::build()
│   └── src/
│       ├── main.rs               Point d'entrée — appelle lib::run()
│       ├── lib.rs                Builder Tauri — 3 plugins + 13 commandes enregistrées
│       ├── commands.rs           11 commandes : keyring, filesystem, journal watcher
│       ├── anthropic.rs          2 commandes : anthropic_stream + anthropic_abort
│       └── folder.rs             1 commande : read_project_folder (walkdir, filtres)
│
├── scripts/
│   ├── generate-icons.mjs        Génère icons OS depuis logo.svg (@resvg/resvg-js)
│   └── process-logo.mjs          Traitement logo PNG source (fond blanc → transparent)
│
├── package.json                  157 paquets Node, scripts dev/build/tauri
├── tsconfig.json                 Strict + paths @/* → src/*
├── tailwind.config.ts            Palette Minérale + animations + box-shadows glow
├── vite.config.ts                Port 1420, alias @/, HMR Tauri
├── install.ps1                   Script setup complet Windows (Rust + MSVC + npm)
├── SETUP.md                      Guide installation automatisé
└── AUDIT.md                      Ce fichier
```

---

## 2. CE QUI FONCTIONNE

### Infrastructure
- ✅ App Tauri v2 compilée et lancée sur Windows (cargo build OK)
- ✅ Fenêtre native sans décoration — TitleBar custom draggable avec min/max/close
- ✅ Hot-reload Vite (port 1420) — modifications React appliquées en <1s
- ✅ Routing MemoryRouter entre 4 écrans + AppShell layout
- ✅ Transitions de page AnimatePresence (filter:blur RETIRÉ — fix black screen WebView2)
- ✅ Design system complet : palette Onyx, Electric Blue, Mystic Purple
- ✅ StrictMode React retiré (fix double-rendu du briefing Marcus)

### Clé API & Sécurité
- ✅ Clé API stockée dans **Windows Credential Manager** via crate `keyring`
- ✅ Jamais persisted en localStorage, jamais exposée dans le renderer
- ✅ Chargée en mémoire au démarrage via `loadApiKey()` → `secure_get_key`
- ✅ Validation `sk-ant-` + longueur > 20

### API Anthropic — Streaming
- ✅ Appels HTTP via **Rust/reqwest** (pas de fetch JS — CORS contourné)
- ✅ SSE parsing côté Rust → events Tauri `anthropic-chunk-{id}` / `anthropic-done-{id}`
- ✅ Abort via `oneshot::Sender` dans `ABORT_MAP` (LazyLock<Mutex<HashMap>>)
- ✅ Curseur clignotant pendant le streaming dans le chat
- ✅ `flushStreaming()` transfère le texte en streaming vers la liste permanente

### Workspace & Marcus
- ✅ Mode conversation — Marcus répond seul, ne lance pas la chaîne automatiquement
- ✅ Briefing Marcus automatique à l'ouverture d'un projet (une seule fois)
- ✅ Protection double (ref + workspaceMessages.length) contre le briefing multiple
- ✅ Bouton "Lancer la chaîne" → Marcus analyse la conversation → proposition JSON
- ✅ ChainProposalCard : brief résumé + agents sélectionnés + drag & drop inline
- ✅ Modification de la chaîne : ajouter/supprimer/réordonner des agents
- ✅ Option Chef : pause chaîne + validation manuelle

### Agents
- ✅ 13 agents Alpha préconfigurés avec prompts système + couleurs gradients
- ✅ 3 consultants système (Idéation, Prompt Machine, Veille Tech) avec API réelle
- ✅ CRUD agents complet dans AgentStudio (create/edit/delete)
- ✅ Drag & drop ordonnancement dans Orchestrator (DnD Kit)
- ✅ Avatars Siri-style avec dégradés multi-couches + halo lumineux
- ✅ Smart model tiers : Marcus=Opus4, analystes=Sonnet4.6, spécialistes=Haiku4.5

### Dossier projet
- ✅ Dialog natif OS pour sélectionner un dossier (`tauri-plugin-dialog`)
- ✅ Lecture récursive des fichiers (walkdir) avec filtres intelligents
- ✅ Exclusion auto : node_modules, .git, dist, target, .venv, etc.
- ✅ Extensions supportées : 40+ types (ts, py, rs, md, json, css, etc.)
- ✅ Limite 100KB/fichier, 600KB total, warning si truncated
- ✅ Arborescence ASCII avec icônes par type
- ✅ Injection automatique contexte fichiers dans le premier agent de la chaîne
- ✅ FolderContextBar avec stats fichiers + bouton Analyser

### Journal Claude Code
- ✅ Lecture initiale de `journal_dev.md` au démarrage
- ✅ Watcher Rust (`notify` crate) avec poll interval 2s
- ✅ Events push Rust → frontend → mise à jour live dans JournalPanel
- ✅ Voyant "live" vert quand watching actif

### Autres
- ✅ Système Toast notifications (success/error/info/warning) avec AnimatePresence
- ✅ BudgetCounter — coût session + barre mensuelle avec seuils warning/danger
- ✅ Fallback mock si pas de clé API (responses simulées)

---

## 3. CE QUI MANQUE

### Fonctionnel (bloquant)
- ❌ `@tauri-apps/plugin-dialog` pas dans `package.json` — `useProjectFolder.ts` importera `open` mais le module n'est pas installé → **CRASH au runtime**
  - Fix : `npm install @tauri-apps/plugin-dialog`
- ❌ `workspaceMessages` ne se vide pas entre projets — si on ferme et rouvre un projet, Marcus ne ré-envoie pas le briefing
  - Fix : `clearWorkspace()` à l'appel de `openProject()` ou au changement de `project.id`
- ❌ `useChainRunner.ts` ligne 25 : double appel `getTeamAgents(teamId)` inutile — `customAgentIds.map(id => getTeamAgents(teamId).find(...) ?? getTeamAgents(teamId).find(...))` — la logique de fallback est identique, le double appel ne sert à rien
- ❌ `useChainRunner.ts` dépendance `run` dans le tableau `useCallback` — cause une re-création du callback à chaque changement de `run.status`, ce qui peut provoquer des re-renders en cascade
- ❌ `useMarcusChat.ts` : filtre de contexte incorrect ligne 60 — `m.role !== "system" && m.agentId === "marcus" || m.role === "user"` — la précédence opérateur est incorrecte, devrait être `(m.role !== "system" && m.agentId === "marcus") || m.role === "user"`

### Fonctionnel (non-bloquant)
- ❌ Export livrables `.md` / `.html` — boutons présents dans DeliverablePanel mais non fonctionnels (pas de handler)
- ❌ Sound design — toggle dans Settings mais aucun son implémenté (`useSounds.ts` inexistant)
- ❌ Web Search pour agents — toggle dans AgentForm, stocké dans `agent.tools`, mais aucune intégration API (Brave/Tavily)
- ❌ `save_project_state` / `load_project_state` — commandes Rust existent mais jamais appelées depuis le frontend
- ❌ Reset mensuel dépenses — `monthlySpend` s'accumule indéfiniment, jamais remis à zéro
- ❌ Budget cap enforcement — `monthlyBudgetCap` affiché mais la chaîne ne s'arrête pas si dépassé
- ❌ Historique des chaînes — chaque ouverture efface l'état précédent
- ❌ `useMarcusPlan.ts` : si `hasValidApiKey()` retourne false, la fonction retourne `undefined` silencieusement sans feedback utilisateur

### Écrans manquants
- ❌ Aucun écran d'onboarding / first-run pour guider la saisie de clé API
- ❌ Pas de confirmation avant suppression d'un agent (deleteAgent direct)

### Backend manquant
- ❌ `commands.rs` importe `AppHandle` et `Emitter` mais ces imports ne sont utilisés que dans `start_journal_watch` — warning potentiel Rust
- ❌ `folder.rs` : `Deserialize` dérivé sur `FileEntry` mais jamais deserializé (inutile)
- ❌ Pas de commande pour lister les fichiers d'un dossier avant de les lire (pas de preview)

---

## 4. BUGS ET PROBLÈMES

### Bug critique — @tauri-apps/plugin-dialog manquant
```
src/hooks/useProjectFolder.ts:3
import { open } from "@tauri-apps/plugin-dialog";
```
**Ce package n'est PAS dans package.json.** L'app crashe dès que l'utilisateur clique "Lier un dossier".
```bash
# Fix immédiat :
npm install @tauri-apps/plugin-dialog
```

### Bug — Précédence opérateur dans useMarcusChat.ts
```typescript
// LIGNE 60 — BUG : priorité opérateur incorrect
.filter((m) => m.role !== "system" && m.agentId === "marcus" || m.role === "user")
// Interprété comme : (m.role !== "system" && m.agentId === "marcus") || m.role === "user"
// Mais l'intent était probablement : m.role !== "system" && (m.agentId === "marcus" || m.role === "user")
// Résultat : les messages système "user" passent quand même dans le contexte
```

### Bug — useChainRunner dépendance `run` instable
```typescript
// LIGNE 155 — run dans les dépendances useCallback
[..., run]  // run change à chaque tick de streaming → recréation du callback → re-render
// Fix : retirer run des dépendances, utiliser useRef pour l'état si nécessaire
```

### Bug — Double getTeamAgents inutile
```typescript
// LIGNE 25
customAgentIds.map((id) => getTeamAgents(teamId).find((a) => a.id === id) ?? getTeamAgents(teamId).find((a) => a.id === id))
// Le ?? est inutile — les deux membres sont identiques
// Fix :
const allAgents = getTeamAgents(teamId);
customAgentIds.map((id) => allAgents.find((a) => a.id === id)).filter(Boolean)
```

### Bug — workspaceMessages jamais vidé entre projets
Si l'utilisateur ouvre projet A, discute avec Marcus, ferme, ouvre projet B :
- `briefingDone.current` est `false` (nouveau mount)
- Mais `workspaceMessages.length > 0` est `true` (ancien projet en mémoire)
- **Marcus ne se brieffe pas sur le nouveau projet**

### Bug UTF-8 potentiel — folder.rs
```rust
// LIGNE 100
let content = match std::fs::read_to_string(file_path) {
    Ok(c) => c,
    Err(_) => { skipped += 1; continue; }
};
```
Les fichiers avec encodage Latin-1/Windows-1252 courants dans les projets anciens seront silencieusement ignorés. Pas de log, pas d'erreur visible.

### Bug — ChainProposalCard : import inutilisé
```typescript
// Ancienne version avait Badge et useChainStore importés mais supprimés partiellement
// Vérifier avec tsc --noEmit si des résidus restent
```

### Problème de performance — appendStreaming
`appendStreaming` est appelé à chaque caractère → appelle `set()` Zustand → re-render React à chaque chunk. Sur une réponse longue (1000+ mots), cela génère des centaines de re-renders.
- Fix : batcher les updates avec `useTransition` ou throttle de 50ms

### Problème — WATCHER Mutex dans commands.rs
```rust
static WATCHER: Mutex<Option<RecommendedWatcher>> = Mutex::new(None);
```
Pas de `LazyLock` ici (contrairement à ABORT_MAP). Fonctionne car `Mutex::new(None)` est `const`, mais incohérent avec le pattern utilisé dans `anthropic.rs`.

---

## 5. CONNEXION API ANTHROPIC

### Architecture (correcte, sécurisée)

```
useAnthropicStream.ts (Frontend)
    │
    ├── invoke("anthropic_stream", { apiKey, model, systemPrompt, userMessage, requestId })
    │         │
    │         ▼
    │   src-tauri/src/anthropic.rs
    │   async fn anthropic_stream()
    │         │
    │         ├── reqwest::Client::new()
    │         ├── POST https://api.anthropic.com/v1/messages
    │         │   headers: x-api-key, anthropic-version: 2023-06-01
    │         │   body: { model, max_tokens: 4096, stream: true, system, messages }
    │         │
    │         ├── response.bytes_stream() → loop SSE parsing
    │         │   ├── "content_block_delta" → app.emit("anthropic-chunk-{id}", text)
    │         │   ├── "message_start"       → capture input_tokens
    │         │   └── "message_delta"       → capture output_tokens
    │         │
    │         └── app.emit("anthropic-done-{id}", StreamDone { input_tokens, output_tokens })
    │
    ├── listen("anthropic-chunk-{requestId}") → onChunk(chunk) → appendStreaming(chunk)
    ├── listen("anthropic-done-{requestId}")  → onDone(full, in, out) → flushStreaming()
    └── listen("anthropic-error-{requestId}") → onError(msg) → message système dans chat
```

### Pourquoi via Rust et pas fetch() ?
Le protocole Tauri utilise `tauri://localhost` comme origine. L'API Anthropic rejette cette origine avec CORS. La solution : faire l'appel HTTP depuis Rust (reqwest), qui n'a pas de contrainte CORS.

### Abort
```rust
// ABORT_MAP : LazyLock<Mutex<HashMap<String, oneshot::Sender<()>>>>
// Quand anthropic_abort(request_id) est appelé :
// → tx.send(()) → rx.try_recv().is_ok() dans la loop → break
```

### Stockage clé API
1. L'utilisateur entre sa clé dans Settings
2. `saveApiKey(key)` → `invoke("secure_set_key", { account: "anthropic-api-key", secret: key })`
3. Rust : `keyring::Entry::new("ronako", account).set_password(secret)` → **Windows Credential Manager**
4. Au démarrage : `loadApiKey()` → `invoke("secure_get_key")` → la clé est en mémoire dans `settingsStore.apiKey`
5. La clé **n'est jamais** dans localStorage, jamais dans le code source, jamais logguée

### Le streaming fonctionne-t-il vraiment ?
**Oui**, à condition que :
- La clé API soit valide (`hasValidApiKey()` → `startsWith("sk-ant-")`)
- La compilation Rust inclut reqwest avec feature `stream`
- Les events Tauri sont correctement écoutés avant l'invoke

---

## 6. CHAQUE ÉCRAN — ÉTAT ACTUEL

### Launcher (`src/screens/Launcher.tsx`)
**Fonctionnel :**
- ✅ Liste projets récents avec chemin + timestamp relatif
- ✅ Créer projet (modal avec nom + chemin optionnel)
- ✅ "Demo rapide" — crée un projet fictif et navigue vers Workspace
- ✅ Supprimer projet
- ✅ Animation stagger sur l'entrée (orbes de fond, logo animé)
- ✅ Logo AppLogo (SVG)

**Manquant :**
- ❌ Dialog natif pour sélectionner le dossier lors de la création (`open()` du plugin dialog — qui n'est pas installé)
- ❌ Aucune icône/preview par équipe associée dans la liste des projets récents
- ❌ Pas de confirmation pour supprimer

---

### Workspace (`src/screens/Workspace.tsx`)
**Fonctionnel :**
- ✅ Chat 1:1 avec Marcus (mode conversation par défaut)
- ✅ Briefing Marcus automatique à l'ouverture (une seule fois)
- ✅ Bouton "Lancer la chaîne" → planning Marcus → ChainProposalCard
- ✅ ChainProposalCard : brief + agents DnD + ajouter/supprimer
- ✅ Chaîne séquentielle avec streaming live
- ✅ Bouton Stop (abort immédiat)
- ✅ Option Chef (pause + validation)
- ✅ AgentFlowViz (visible uniquement pendant/après chaîne)
- ✅ FolderContextBar (lier dossier + stats + analyser)
- ✅ JournalPanel (lecture + watcher live)
- ✅ DeliverablePanel (messages assistants après chaîne)
- ✅ BudgetCounter (session + mensuel)
- ✅ Toast notifications
- ✅ Bandeaux contextuels (conversation / en cours / chef / terminé)

**Manquant / Cassé :**
- ❌ `@tauri-apps/plugin-dialog` manquant → crash au clic "Lier un dossier"
- ❌ `workspaceMessages` non vidé entre projets → pas de briefing sur nouveau projet
- ❌ Export livrables — boutons présents mais non fonctionnels
- ❌ La chaîne d'analyse (`handleAnalyzeProject`) utilise agents `["nina", "tom", "sam"]` hardcodés — ces IDs doivent exister dans l'agentStore

---

### AgentStudio (`src/screens/AgentStudio.tsx`)
**Fonctionnel :**
- ✅ Grille bento de tous les agents avec animation stagger
- ✅ Créer / modifier / supprimer un agent
- ✅ Formulaire complet (nom, rôle, modèle, température, gradient, tools, prompt)
- ✅ Search/filtre par nom ou rôle
- ✅ Carte "+ Créer un agent" avec border dashed
- ✅ Badge modèle coloré par tier

**Manquant :**
- ❌ Pas de prévisualisation de l'avatar pendant la saisie du nom (fonctionne mais uniquement si nom non vide)
- ❌ Pas de confirmation avant suppression

---

### Orchestrator (`src/screens/Orchestrator.tsx`)
**Fonctionnel :**
- ✅ Affichage de la chaîne de l'équipe active avec drag & drop vertical (DnD Kit)
- ✅ Suppression d'un agent de la chaîne
- ✅ Ajout d'un agent depuis le panneau "Agents disponibles"
- ✅ Toggle Option Chef
- ✅ Estimation coût approximatif du run
- ✅ Indicateur actif pendant l'exécution

**Manquant :**
- ❌ Création de nouvelles équipes (hardcodé sur `teamId = "alpha"`)
- ❌ Renommer l'équipe
- ❌ Sauvegarder un preset d'équipe

---

### Settings (`src/screens/Settings.tsx`)
**Fonctionnel :**
- ✅ Affichage / saisie / sauvegarde clé API via keyring OS
- ✅ Affichage "Clé valide" / "Aucune clé"
- ✅ Suppression clé
- ✅ Toggle son
- ✅ Slider plafond mensuel
- ✅ Affichage dépenses du mois
- ✅ Tableau coûts par modèle
- ✅ Section "À propos"

**Manquant :**
- ❌ Bouton "Réinitialiser les dépenses du mois" absent
- ❌ Sons non implémentés (toggle sans effet)
- ❌ Pas de champ clé API Brave/Tavily pour le web search

---

## 7. STORES ZUSTAND

### agentStore (`src/store/agentStore.ts`)
```typescript
// État
agents: Agent[]           // 13 agents Alpha — persisté localStorage "ronako-agents-v1"
teams: Team[]             // 1 équipe Alpha — persistée
consultants: Agent[]      // 3 consultants système — NON persistés (rechargés depuis defaultTeam)

// Actions
addAgent(data)            → génère id, push dans agents[]
updateAgent(id, updates)  → map + merge
deleteAgent(id)           → filtre agents[] + retire des teams
getAgent(id)              → cherche dans agents + consultants
addTeam / updateTeam      → CRUD équipes
getTeam(id)               → find dans teams[]
getTeamAgents(teamId)     → team.agentIds.map → agents[]
```
**Manque :** `resetToDefaults()` pour restaurer les 13 agents si l'utilisateur les modifie tous.

---

### chainStore (`src/store/chainStore.ts`)
```typescript
// État
run: ChainRun             // { status, currentAgentIndex, messages[], totalTokens, totalCost }
workspaceMessages: Message[]  // messages affichés dans le chat — NON persistés
streamingText: string     // texte en cours de streaming (curseur clignotant)
streamingAgentId: string|null
proposal: ChainProposal|null  // proposition Marcus avant lancement
proposalLoading: boolean

// Actions
setProposal / setProposalLoading
startRun()                → status="running", currentAgentIndex=0
setAgentIndex(i)
addMessage(msg)           → ajoute à run.messages + totalTokens + totalCost
completeRun()             → status="completed"
pauseForChef()            → status="paused_chef"
resumeFromChef()          → status="running" (l'Option Chef attend ce changement)
errorRun(error)           → status="error"
stopRun()                 → status="idle"
resetRun()                → EMPTY_RUN
addWorkspaceMessage(msg)  → workspaceMessages[] (affiché dans le chat)
clearWorkspace()          → vide workspaceMessages[]
setStreaming(agentId)     → début streaming
appendStreaming(chunk)    → concaténation texte
flushStreaming()          → transfère streamingText → workspaceMessages[]
```
**Manque :** `clearWorkspace()` n'est jamais appelé entre projets.
**Manque :** Pas de persistance des résultats de chaîne (tout disparaît au rechargement).

---

### projectStore (`src/store/projectStore.ts`)
```typescript
// État — persisté "ronako-projects-v1"
projects: Project[]
activeProjectId: string | null

// Actions
createProject(name, path, teamId?)
openProject(id)           → activeProjectId + lastOpened
updateProject(id, updates) → path, name, teamId, etc.
deleteProject(id)         → retire + reset activeProjectId si c'était l'actif
getActiveProject()        → find par activeProjectId
closeProject()            → activeProjectId = null
```
**Manque :** Sync avec le backend Tauri (`save_project_state` jamais appelé).

---

### settingsStore (`src/store/settingsStore.ts`)
```typescript
// État — persist partiel "ronako-settings-v2" (apiKey EXCLUE de la persistence)
apiKey: string            // en mémoire seulement, chargé depuis keyring au démarrage
keyLoaded: boolean
soundEnabled: boolean
monthlyBudgetCap: number  // centimes (défaut: 500 = 5€)
monthlySpend: number      // cumulatif — jamais remis à zéro
sessionSpend: number      // remis à zéro avec resetSessionSpend()

// Actions
loadApiKey()              → invoke("secure_get_key") → apiKey en mémoire
saveApiKey(key)           → invoke("secure_set_key") + set en mémoire
deleteApiKey()            → invoke("secure_delete_key") + vide mémoire
hasValidApiKey()          → apiKey.startsWith("sk-ant-") && length > 20
addSpend(cents)           → +monthlySpend +sessionSpend
resetSessionSpend()
```
**Manque :** Reset mensuel automatique (comparer date avec `createdAt` ou stocker le mois).

---

### toastStore (`src/store/toastStore.ts`)
```typescript
// État — NON persisté
toasts: Toast[]

// Actions — setTimeout auto-dismiss
push({ type, title, message?, duration? })
dismiss(id)
success/error/info/warning(title, message?)
// error: duration = 6000ms, autres: 4000ms
```

---

## 8. HOOKS CUSTOM

### useAnthropicStream
**Ce qu'il fait :** Gère le streaming via Tauri events. Crée un `requestId` unique, enregistre 3 listeners (chunk/done/error), appelle `invoke("anthropic_stream")` en non-bloquant. `cleanup()` unlisten + reset state.

**Fonctionne-t-il ?** ✅ Oui — testé en production. L'abort via `invoke("anthropic_abort")` fonctionne.

**Ce qui manque :** Timeout si Rust ne répond jamais (edge case réseau).

---

### useChainRunner
**Ce qu'il fait :** Exécute une chaîne séquentielle d'agents. Pour chaque agent : appelle `useAnthropicStream.stream()` avec son prompt + contexte + dossier. En mode mock (pas de clé), simule avec `setTimeout`.

**Fonctionne-t-il ?** ✅ Oui avec clé API valide. ⚠️ Bug dépendance `run` dans `useCallback`.

**Ce qui manque :**
- `customAgentIds` : la logique `?? getTeamAgents(teamId).find(...)` est un doublon inutile
- Pas d'ajout du message `addWorkspaceMessage` en mode réel (messages affichés via `flushStreaming` uniquement)

---

### useMarcusChat
**Ce qu'il fait :** Envoie un message à Marcus uniquement (mode conversation). Construit le contexte des 10 derniers messages, stream la réponse.

**Fonctionne-t-il ?** ✅ Oui. ⚠️ Bug précédence opérateur sur le filtre contexte (ligne 60).

**Ce qui manque :** Pas de gestion d'abort si l'utilisateur renvoie un message pendant que Marcus répond.

---

### useMarcusPlan
**Ce qu'il fait :** Demande à Marcus d'analyser la conversation et de produire un JSON `{ brief, agents[] }`. Parse le JSON, valide les IDs, stocke dans `chainStore.proposal`.

**Fonctionne-t-il ?** ✅ Oui si l'API répond du JSON valide. Fallback sur l'équipe Alpha si le parse échoue.

**Ce qui manque :** Si `hasValidApiKey()` est false, retourne `undefined` silencieusement → le bouton "Lancer" ne donne aucun feedback.

---

### useProjectFolder
**Ce qu'il fait :** `pickFolder()` → dialog natif OS → met à jour `project.path`. `readFolder(path)` → invoke `read_project_folder` → FolderSummary. `buildFolderContext()` → formate le contenu pour injection dans les prompts.

**Fonctionne-t-il ?** ❌ **CASSÉ** — `@tauri-apps/plugin-dialog` non installé → crash à l'import.

**Fix :** `npm install @tauri-apps/plugin-dialog`

---

### useJournalWatcher
**Ce qu'il fait :** Lit `journal_dev.md` initialement, démarre le watcher Rust, écoute l'event `journal-updated`. Cleanup : unlisten + stop_journal_watch.

**Fonctionne-t-il ?** ✅ Oui si le fichier existe. Silencieux si non existant.

**Ce qui manque :** Pas de retry si le fichier est créé après que le watcher a échoué.

---

## 9. BACKEND TAURI (src-tauri/src/)

### lib.rs — 3 plugins + 13 commandes

| Plugin | Description |
|--------|-------------|
| `tauri_plugin_shell` | Ouverture liens externes |
| `tauri_plugin_fs` | Accès système de fichiers |
| `tauri_plugin_dialog` | Dialog natif OS (open/save) |

### commands.rs — 11 commandes

| Commande | Description |
|----------|-------------|
| `greet(name)` | Test basique → "Ronako prêt, {name}." |
| `get_app_version()` | → "0.1.0" (CARGO_PKG_VERSION) |
| `secure_set_key(account, secret)` | Keyring OS → Windows Credential Manager |
| `secure_get_key(account)` | Lecture keyring |
| `secure_delete_key(account)` | Suppression keyring |
| `read_journal_file(path)` | Lecture fichier texte → String |
| `save_project_state(id, state)` | Écriture JSON dans %LOCALAPPDATA%/ronako/projects/ |
| `load_project_state(id)` | Lecture JSON projet |
| `get_projects_list()` | Liste tous les JSON projets |
| `start_journal_watch(app, path)` | Démarre notify watcher (poll 2s) |
| `stop_journal_watch()` | Arrête le watcher |

### anthropic.rs — 2 commandes

| Commande | Description |
|----------|-------------|
| `anthropic_stream(app, api_key, model, system_prompt, user_message, request_id)` | Stream SSE depuis api.anthropic.com via reqwest → events Tauri |
| `anthropic_abort(request_id)` | Envoie signal abort via oneshot channel |

### folder.rs — 1 commande

| Commande | Description |
|----------|-------------|
| `read_project_folder(path)` | Lecture récursive (walkdir), filtres intelligents, 100KB/fichier, 600KB total, arborescence ASCII → FolderSummary |

---

## 10. PRIORITÉS RECOMMANDÉES

| # | Tâche | Complexité | Impact |
|---|-------|-----------|--------|
| 1 | **URGENT** : `npm install @tauri-apps/plugin-dialog` | **Facile** (1 cmd) | ❌ Crash bloquant |
| 2 | **Fix bug précédence** useMarcusChat.ts ligne 60 | **Facile** (1 ligne) | Contexte conversation incorrect |
| 3 | **Vider workspaceMessages** au changement de projet | **Facile** (1 appel) | Briefing Marcus cassé multi-projets |
| 4 | **Fix useChainRunner** — retirer `run` des dépendances + simplifier customAgentIds | **Facile** | Re-renders inutiles |
| 5 | **Export livrables** — télécharger/copier `.md` depuis DeliverablePanel | **Facile** | Fonctionnalité core manquante |
| 6 | **Reset mensuel dépenses** — bouton dans Settings + auto-reset si nouveau mois | **Moyen** | UX budget |
| 7 | **Budget cap enforcement** — stopper la chaîne si `monthlySpend > monthlyBudgetCap` | **Moyen** | Sécurité financière |
| 8 | **Persistance chaînes** — sauvegarder résultats via `save_project_state` | **Moyen** | Perte données au rechargement |
| 9 | **Sound design** — Web Audio API (clic DnD, clochette fin chaîne) | **Moyen** | Polish premium |
| 10 | **Web Search** — intégration Brave/Tavily pour agents avec `web_search` tool | **Difficile** | Feature core manquante |

---

## 11. CONTENU COMPLET DES FICHIERS CLÉS

### src/hooks/useAnthropicStream.ts
```typescript
import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { generateId } from "@/lib/utils";
import type { ModelId } from "@/types";

interface StreamOptions {
  apiKey: string;
  model: ModelId;
  systemPrompt: string;
  userMessage: string;
  onChunk: (chunk: string) => void;
  onDone: (fullText: string, inputTokens: number, outputTokens: number) => void;
  onError: (err: string) => void;
}

interface DonePayload {
  input_tokens: number;
  output_tokens: number;
}

export function useAnthropicStream() {
  const [streaming, setStreaming] = useState(false);
  const requestIdRef = useRef<string | null>(null);
  const unlistenersRef = useRef<UnlistenFn[]>([]);

  const cleanup = useCallback(() => {
    unlistenersRef.current.forEach((fn) => fn());
    unlistenersRef.current = [];
    requestIdRef.current = null;
    setStreaming(false);
  }, []);

  const stream = useCallback(async (options: StreamOptions) => {
    cleanup();
    const requestId = generateId();
    requestIdRef.current = requestId;
    setStreaming(true);
    let fullText = "";

    const unChunk = await listen<string>(`anthropic-chunk-${requestId}`, (ev) => {
      fullText += ev.payload;
      options.onChunk(ev.payload);
    });
    const unDone = await listen<DonePayload>(`anthropic-done-${requestId}`, (ev) => {
      options.onDone(fullText, ev.payload.input_tokens, ev.payload.output_tokens);
      cleanup();
    });
    const unError = await listen<string>(`anthropic-error-${requestId}`, (ev) => {
      options.onError(ev.payload);
      cleanup();
    });
    unlistenersRef.current = [unChunk, unDone, unError];

    invoke("anthropic_stream", {
      apiKey: options.apiKey,
      model: options.model,
      systemPrompt: options.systemPrompt,
      userMessage: options.userMessage,
      requestId,
    }).catch((err: unknown) => {
      options.onError(String(err));
      cleanup();
    });
  }, [cleanup]);

  const abort = useCallback(() => {
    if (requestIdRef.current) {
      invoke("anthropic_abort", { requestId: requestIdRef.current }).catch(() => {});
      cleanup();
    }
  }, [cleanup]);

  return { stream, streaming, abort };
}
```

---

### src/hooks/useChainRunner.ts
(Voir contenu complet section 8 + fichier src/hooks/useChainRunner.ts ci-dessus)

---

### src/store/chainStore.ts
(Voir contenu complet section 7 ci-dessus)

---

### src/store/settingsStore.ts
(Voir contenu complet section 7 ci-dessus)

---

### src/types.ts
(Voir contenu complet section 7 ci-dessus)

---

### src-tauri/src/main.rs
```rust
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ronako_lib::run()
}
```

---

### src-tauri/src/anthropic.rs
(Voir contenu complet section 9 ci-dessus)

---

### src-tauri/src/folder.rs
(Voir contenu complet section 9 ci-dessus)

---

### tailwind.config.ts
(Voir contenu complet section 1 ci-dessus)

---

## 12. CORRECTIONS APPLIQUÉES — 2026-05-29

### ✅ Fix 1 — @tauri-apps/plugin-dialog installé
```bash
npm install @tauri-apps/plugin-dialog
# Résultat : @tauri-apps/plugin-dialog@^2.7.1 ajouté à package.json
```
**Impact :** `useProjectFolder.ts` → `open()` ne crashe plus. La fonctionnalité "Lier un dossier" est maintenant opérationnelle.

---

### ✅ Fix 2 — Précédence opérateur useMarcusChat.ts
```typescript
// Fichier : src/hooks/useMarcusChat.ts — ligne 60
// AVANT (incorrect — messages système "user" passaient dans le contexte) :
.filter((m) => m.role !== "system" && m.agentId === "marcus" || m.role === "user")

// APRÈS (correct) :
.filter((m) => (m.role !== "system" && m.agentId === "marcus") || m.role === "user")
```
**Impact :** Le contexte de conversation transmis à Marcus ne contient plus les messages système parasites. La qualité des réponses contextuelle est améliorée.

---

### ✅ Fix 3 — Workspace vidé au changement de projet
```typescript
// Fichier : src/store/projectStore.ts
// Ajout dans openProject() et createProject() :
useChainStore.getState().clearWorkspace();
useChainStore.getState().resetRun();
```
**Impact :**
- Ouvrir un projet B après un projet A → workspace vide → Marcus se brieffe correctement sur B
- Créer un nouveau projet → workspace vide → pas de résidus du projet précédent
- `briefingDone.current` se remet à `false` au re-mount du composant Workspace → briefing envoyé une seule fois sur le bon projet

---

### État post-correctifs V1 (2026-05-29)
| Priorité | Bug | Statut |
|----------|-----|--------|
| 1 | `@tauri-apps/plugin-dialog` manquant | ✅ Corrigé |
| 2 | Précédence opérateur useMarcusChat | ✅ Corrigé |
| 3 | workspaceMessages non vidé entre projets | ✅ Corrigé |
| 4 | `useChainRunner` dépendance `run` instable | ✅ Corrigé |
| 5 | Export livrables non fonctionnel | ✅ Corrigé |
| 6 | Reset mensuel dépenses absent | ✅ Corrigé |
| 7 | Budget cap non enforced | ✅ Corrigé |
| 8 | Persistance chaînes | ✅ Corrigé |
| 9 | Sound design | ✅ Corrigé |
| 10 | Web Search agents (Tavily) | ✅ Corrigé |

---

## 13. RONAKO V2 — ÉVOLUTIONS APPLIQUÉES (2026-05-29)

### ✅ Fix 4 — useChainRunner refactorisé
- `run` retiré des dépendances `useCallback` (stop re-renders en cascade)
- `customAgentIds` simplifié : `const allAgents = getTeamAgents(teamId); customAgentIds.map(id => allAgents.find(...))`
- Budget cap + toast 80% intégrés dans la boucle
- Sounds intégrés : `playChainStart()` au lancement, `playChime()` à la fin

### ✅ Fix 5 — Export livrables fonctionnel (DeliverablePanel)
- "Tout copier en Markdown" → `navigator.clipboard.writeText()`
- "Télécharger .md" → `save()` dialog + `writeTextFile()` Tauri fs
- "Télécharger .html" → export complet avec mise en forme
- Package `@tauri-apps/plugin-fs` installé

### ✅ Fix 6 — Reset mensuel dépenses (settingsStore)
- `lastResetMonth: string` (format "YYYY-MM") persisté dans localStorage
- `checkMonthlyReset()` appelé au démarrage dans App.tsx — reset auto si nouveau mois
- Bouton manuel RotateCcw dans Settings
- Version store migrée vers `ronako-settings-v3`

### ✅ Fix 7 — Budget cap enforcement (useChainRunner)
- Avant chaque agent : `if (monthlySpend >= monthlyBudgetCap)` → stop + toast error
- Toast warning à 80% du budget (affiché une seule fois au 1er agent)

### ✅ Sound design (src/hooks/useSounds.ts)
- Web Audio API — zéro fichier externe, générés programmatiquement
- `playClick()` : micro-clic mécanique sawtooth (DnD)
- `playChime()` : clochette cristalline zen 4 harmoniques (fin de chaîne)
- `playChainStart()` : accord de do majeur ascendant (démarrage)
- `playNotification()` : double bip sine (toast)
- `playError()` : descente grave sawtooth (erreur)
- Respecte `soundEnabled` depuis settingsStore

### ✅ Mémoire projet persistante (src/hooks/useProjectMemory.ts)
- `saveState()` : sauvegarde dans app data dir Tauri + `.ronako/state.json` dans le dossier projet
- `loadState()` : charge depuis dossier projet puis app data dir en fallback
- `buildMemoryContext()` : formate le contexte pour Marcus
- Intégré dans Workspace.tsx : briefing enrichi + auto-save à la fin de chaque chaîne

### ✅ Nova — 4ème consultant (src/lib/agents/defaultTeam.ts)
- `id: "consultant-nova"`, couleurs `["#00D2FF", "#3A7BD5"]`
- Experte connecteurs MCP et APIs — web_search activé
- Prompt optimisé pour recherche GitHub + évaluation qualité + guide installation

### ✅ Connecteurs (src/lib/connectors/)
- `types.ts` : interface `Connector` + `ALL_CONNECTORS` (7 connecteurs : Tavily, DALL-E, Flux, E2B, Notion, GitHub, ScreenshotOne)
- `tavily.ts` : `tavilySearch()` via Rust `tavily_search`, `formatTavilyForPrompt()`
- Clés stockées via keyring OS (même pattern que clé Anthropic)

### ✅ Tavily Web Search (Rust)
- Commande `tavily_search(query, api_key)` dans commands.rs
- Appel HTTP via reqwest → `https://api.tavily.com/search`
- Retourne JSON structuré avec résultats + answer

### ✅ Conversation directe agents (AgentChatModal)
- Bouton 💬 sur chaque AgentCard (hover)
- Modal 520×620 avec streaming live, historique session, contexte projet
- Store global `useAgentChat` (Zustand) — accessible depuis n'importe où
- Monté dans AppShell → disponible dans tous les écrans
- Fonctionne aussi pour les consultants (Nova, Idéation, etc.)

### ✅ Multi-équipes Orchestrator
- Dropdown sélecteur d'équipe dans l'header
- Créer une nouvelle équipe (bouton +)
- Renommer l'équipe active (bouton Pencil + inline edit)
- Associer l'équipe active au projet via `updateProject`
- 5 templates prédéfinis dans `TEAM_TEMPLATES` :
  - Analyse Business, Contenu SEO, Audit Technique, Production Créative, Lancement Produit
- Modal "Templates" avec descriptions et agents par template

### ✅ Settings connecteurs & APIs
- Section "Connecteurs & APIs" avec les 7 connecteurs listés
- Champ clé API par connecteur avec show/hide + save via keyring
- Bouton reset mensuel avec icône RotateCcw
- Toggle son mis à jour avec description des sons

### État V2 — TypeScript et Rust
- TypeScript : **0 erreur** (`npx tsc --noEmit`)
- Rust : **0 warning** (`cargo build`)
- Packages ajoutés : `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-dialog`
