# RONAKO — Contexte, Roadmap et Règles
> Fichier lu automatiquement à chaque ouverture du projet.
> Mis à jour après chaque session par Claude Code.
> Dernière mise à jour : 30/05/2026

---

## QU'EST-CE QUE RONAKO

Application desktop **Tauri v2 + React + TypeScript** qui orchestre des chaînes d'agents IA spécialisés. L'utilisateur parle à Marcus (chef d'orchestre) qui compose et lance une chaîne d'agents séquentiels produisant des livrables exploitables.

Stack complète : voir AUDIT.md

---

## ÉTAT ACTUEL — CE QUI FONCTIONNE

```
✅ Streaming API Anthropic via Rust/reqwest
✅ Chaîne séquentielle 12 agents
✅ Chat Marcus en mode conversation
✅ Dossier projet connecté (Tauri dialog)
✅ Journal watcher temps réel (notify crate)
✅ Budget counter session + mensuel
✅ Multi-équipes CRUD + 5 templates
✅ Export livrables .md et .html
✅ Sons Web Audio API (useSounds.ts)
✅ Mémoire projet (.ronako/state.json)
✅ Nova consultant MCP/connecteurs
✅ Chat direct avec chaque agent (AgentChatModal)
✅ Fix useChainRunner (run hors dépendances)
✅ Budget cap enforcement + toast 80%
✅ Reset mensuel automatique
✅ 7 connecteurs (Tavily, DALL-E, Flux...)
✅ Tavily search côté Rust (sans CORS)
✅ Settings connecteurs (keyring OS)

Phase 1 livrée :
✅ Agent Relay (Sonnet 4.6, visible, intouchable)
✅ ADN Projet (150 tokens, envoyé à tous)
✅ Matrice de dépendances (dependencyMatrix.ts)
✅ Marcus Check (cohérence silencieuse)
✅ Modèles optimisés Sonnet/Haiku par agent
✅ 4 modes chaîne (Éclair/Projet/Infini/Custom)
✅ Agent Optimiseur (3 axes avant lancement)
✅ Fragmentation du brief
✅ Nina en éclaireur
✅ Chaîne Delta

Phase 2 livrée :
✅ Score Ryo visible + actionnable
✅ Estimation coût précise avant/après
✅ Bibliothèque livrables (.ronako/livrables/)
✅ Bouton Retravailler (4 options)
✅ Dossier lié mémorisé par projet
✅ Marcus briefing intelligent (4 cas)
✅ Historique chaînes par projet
✅ Interruption intelligente (StopModal)
✅ Notification fin de chaîne OS
✅ Retry automatique ×2
✅ Cache dernier livrable
✅ Raccourcis clavier (Cmd+1/2/3/4/L/S/↵/?)
✅ Mémoire utilisateur (user_memory.json)
✅ Marcus propose sauvegarder équipe si ≥8

Phase 3 livrée :
✅ Chaînes adaptatives (9 templates)
✅ Analyse brief Haiku (score 0-10)
✅ Aperçu livrable dans ChainProposalCard
✅ Compression brief >300 tokens (-80%)
✅ PARALLEL_GROUPS dans dependencyMatrix
✅ Auto-critique agents
✅ Toggle validation par étape (Settings)
✅ Sélecteur formats multiples
✅ 8 templates projets dans Launcher
✅ Briefs sauvegardés avec variables [VILLE]
✅ Chips contextuels
✅ Copier pour Claude Code (claudeCodeFormatter)

Phase 4 livrée :
✅ Architecture consultantActions.ts
✅ Blocs ACTION dans réponses IA
✅ ActionButton.tsx coloré par type
✅ Prompt Machine → modifier/créer/auditer/skills
✅ Idéation → envoyer à Marcus / enrichir brief
✅ Veille Tech → ciblée stack / suggérer MCP
✅ Nova → configurer MCP / activer connecteur
✅ consultantContext.ts (contexte auto injecté)

Phase 5 livrée :
✅ Types Skill, SkillPack, AgentConnector
✅ 5 packs (E-Commerce, SaaS, Local, Marketing, Tech)
✅ Skills injectés après prompt (buildPromptWithSkills)
✅ Max 5 skills actifs/agent, cap 3800 tokens
✅ inheritToAll: true sur Marcus → tous les agents
✅ Skills temporaires dans ChainProposalCard
✅ AgentStudio refactorisé sidebar + 4 onglets
✅ Onglet Skills : activer/désactiver/packs/créer/IA
✅ Onglet Connecteurs : natifs/APIs/statut/Nova

Phase 6 livrée :
✅ Comparateur de versions (diff coloré)
✅ Tableau de bord projet (SVG/CSS)
✅ Journal de progression visuel (timeline)
✅ Benchmark qualité personnel
✅ Marcus proactif (détecte modifs dossier)
✅ Export rapport client (sans données techniques)
✅ Rapport mensuel coûts + comparaison GPT-4
✅ Suggestions agents manquants
✅ Annotations sur livrables (notes + tags)
✅ Recherche globale livrables (Cmd+F)
✅ Cache analyses récurrentes (TTL par agent)
✅ Mode dégradé intelligent (livrable partiel)
✅ Sauvegarde progressive (après chaque agent)
✅ Session de travail trackée + export CSV
✅ Protection du travail (confirmation fermeture)
✅ Export/Import agents (.ronako-agent)
✅ Export/Import équipes (.ronako-team)
✅ Export/Import packs (.ronako-pack)
✅ Code de partage court local (RONAKO-XX-XXXX)
```

---

## RÈGLES ABSOLUES

```
⛔ Ne jamais casser ce qui fonctionne
⛔ TypeScript strict — 0 erreur
⛔ Rust — 0 warning
⛔ Pas de fetch() JS pour APIs externes → Rust/reqwest
⛔ Pas de backdrop-filter en animation → WebView2
⛔ Pas de dépendances npm inutiles

✅ Lire AUDIT.md avant de modifier un fichier existant
✅ Après chaque session : JOURNAL.md + cocher les tâches
✅ Nouvelles idées → intercaler dans roadmap + documenter
```

---

## FICHIERS PROTÉGÉS

```
src-tauri/src/anthropic.rs
src/hooks/useAnthropicStream.ts
src/store/settingsStore.ts
src-tauri/Cargo.toml
src/lib/agents/defaultTeam.ts
```

---

## DÉCISIONS TECHNIQUES VALIDÉES

```
Architecture  : Tauri v2 + React + TypeScript
Streaming     : Rust/reqwest → events Tauri
Clé API       : Keyring OS Windows
State         : Zustand avec persist
Drag & Drop   : DnD Kit
Animations    : Framer Motion
Router        : MemoryRouter
StrictMode    : Retiré intentionnellement
MCP install   : npx -y [package] via Tauri Command
Skills GitHub : Import via API GitHub → parse SKILL.md
Tooltips      : Composant InfoTooltip global réutilisable
Export        : .ronako-agent / .ronako-team / .ronako-pack
Pause agent   : agent.pauseAfter: boolean dans agentStore
Visuels       : URLs images stockées dans .ronako/visuals/
```

---

## ROADMAP COMPLÈTE ET PRIORISÉE

### ✅ PHASES 1-6 LIVRÉES

---

### 🟡 PHASE 7 — Pack Manager + Connecteur Hub + Polish

```
[x] 7.1  Product Tour interactif — 12 étapes
         Overlay + highlight + tooltips positionnés
         Navigation automatique entre les écrans
         3 étapes interactives
         Skip à tout moment — ~3 minutes
         Déclenché au premier lancement
         Rejouable depuis Paramètres

         ÉTAPES :
         1.  Marcus + zone chat
         2.  Textarea du brief
         3.  Bouton Lancer la chaîne
         4.  Sélecteur de modes
         5.  Relay + estimation coût
         6.  Livrable + score Ryo
         7.  Bibliothèque
         8.  AgentStudio (interactif)
         9.  Skills + Connecteurs onglets
         10. Orchestrator (interactif)
         11. ConsultantDock (interactif)
         12. Fin + C'est parti !

[x] 7.2  Tooltips informatifs (ⓘ) partout
         Composant InfoTooltip réutilisable
         Hover → tooltip positionné automatiquement
         Contenu : titre + description courte

         EMPLACEMENTS PRIORITAIRES :
         Workspace :
           ⓘ "Lancer la chaîne"
           ⓘ Sélecteur de mode
           ⓘ Relay ⟡
           ⓘ Score Ryo
           ⓘ Estimation coût
           ⓘ ADN Projet
         AgentStudio :
           ⓘ Température
           ⓘ Modèle (Haiku/Sonnet/Opus)
           ⓘ Skills
           ⓘ inheritToAll
           ⓘ Connecteurs
           ⓘ Pause après agent
         Orchestrator :
           ⓘ Option Chef
           ⓘ Coût estimé
         ChainProposalCard :
           ⓘ Par mode de chaîne
           ⓘ Skills temporaires
           ⓘ Connecteurs
         Settings :
           ⓘ Par clé API connecteur
           ⓘ Budget mensuel
           ⓘ Validation par étape
         Pack Manager :
           ⓘ Par section et fonctionnalité

[x] 7.3  Pause après agent — Toggle dans AgentStudio
         Dans l'onglet Config de chaque agent :
         Toggle "Pause après cet agent" ON/OFF
         Champ message de pause personnalisable
         Par défaut : OFF sur tous les agents
         Stocké dans agent.pauseAfter: boolean
         
         Comportement :
           Après l'agent → statut "paused_agent"
           Bannière dans le Workspace :
           "[Nom agent] a terminé.
            Valide son output avant de continuer."
           Bouton [▶ Continuer] [⏹ Arrêter]
           Même mécanique que Option Chef
           mais au milieu de la chaîne
         
         Cas d'usage typiques :
           Agents visuels (voir Pixel 7.5)
           Agents de validation intermédiaire
           Tout agent dont l'output nécessite
           une validation humaine

[x] 7.4  Pack Manager — Écran dédié (base : Skills Packs + Connecteur Hub)
         3 onglets : [📦 Packs] [⚡ Skills] [🔌 Connecteurs]

         ONGLET SKILLS :
           Liste tous les skills disponibles
           Filtrables : agent / catégorie / source
           Skills libres (sans pack) visibles
           Drag & drop vers un pack
           [+ Créer] [📥 Importer GitHub]
           Renommage et modification possible
           Changement d'agent assigné

         IMPORT DEPUIS GITHUB :
           URL du repo ou sélection dans liste
           Repos recommandés :
             ⭐ coreyhaines31/marketingskills
                26 600 stars · 35 skills pro
           Import via API GitHub :
             → Liste les dossiers /skills/
             → Télécharge chaque SKILL.md
             → Parse : name, description, contenu
             → Assigne automatiquement aux agents :
               copywriting    → Leo
               seo-audit      → Sofia
               ai-seo         → Sofia
               email-sequence → Leo
               cro            → Yuna + Tom
               cold-email     → Leo
               analytics      → Tom
               customer-research → Omar
               pricing        → Omar
               [inconnu]      → choix manuel
             → Mise à jour auto disponible

         ONGLET PACKS :
           CRUD complet
           Éditeur : nom + icône + secteur +
                     skills + connecteurs +
                     aperçu impact tokens + coût
           Création depuis :
             Zéro
             Repo GitHub (import direct)
             Duplication d'un existant
             Marcus compose le pack optimal
           Export .ronako-pack
           Import .ronako-pack

         PACKS PRÉ-INCLUS AU LANCEMENT :
           Pack Marketing Pro :
             copywriting → Leo
             seo-audit → Sofia
             ai-seo → Sofia
             email-sequence → Leo
             cro → Yuna + Tom
             cold-email → Leo
           Pack Growth & Business :
             customer-research → Omar
             pricing → Omar
             launch-strategy → Marcus + Omar
             referral → Leo + Omar
           Pack Tech & Analytics :
             analytics-tracking → Tom
             schema-markup → Sofia + Nina
             site-architecture → Nina
           Pack Légal France (custom) :
             RGPD + CGV + Mentions légales → Camille
           Pack Local Business (custom) :
             SEO Local France → Sofia
             Ton Proximité → Leo

[ ] 7.5  Connecteur Hub — Onglet dans Pack Manager

         TYPE 1 — APIs directes :
           Clé API dans keyring Tauri
           Toggle ON/OFF par agent
           Tavily, DALL-E, Flux, Screenshot,
           E2B, Notion, Replicate, Stripe...

         TYPE 2 — MCP serveurs :
           Installation npx via Tauri Command
           Démarrage/arrêt automatique
           Status temps réel ● Running
           Registre pré-listé :
             📁 filesystem   ⭐12k
             🐙 github       ⭐8k
             🗄️ postgres     ⭐6k
             🌐 brave-search ⭐5k
             🤖 puppeteer    ⭐4k
             🔥 firecrawl    ⭐3k
             📊 e2b          ⭐3k
             💬 slack        ⭐2k
           Ajouter URL GitHub custom
           Ajouter URL remote HTTP

         TYPE 3 — CLI scripts :
           git, npm, python, scripts custom

         ASSIGNATION PAR AGENT :
           Checklist agents par connecteur
           Suggestions auto par rôle
           Max 3 connecteurs actifs par agent
           Détection si non utilisé → suggestion

         MCP RECOMMANDÉS PAR AGENT :
           Nina  : filesystem, github, postgres
           Sofia : brave-search, puppeteer, firecrawl
           Omar  : brave-search, firecrawl
           Tom   : e2b, filesystem
           Sam   : filesystem, notion
           Nova  : tous (gestionnaire MCP)

[x] 7.6  DeliverablePanel — onglets Stats + Présentation ajoutés

         CONCEPT :
           Pixel = agent standard créé par l'utilisateur
           dans AgentStudio (pas un agent système)
           N'importe quel nom possible :
           "Pixel", "Lumière", "Motion", "Brand"...
           Prompt Machine peut le créer automatiquement
           
           L'utilisateur assigne via Connecteur Hub :
             Flux ($0.003/img, 3s) → images rapides
             DALL-E 3 ($0.04/img) → haute qualité
             Runway → vidéos courtes
             Replicate → modèles flexibles
           
           Toggle "Pause après cet agent" = ON
           (obligatoire pour les agents visuels
            pour valider avant de continuer)

         DELIVERABLE PANEL — Onglet Visuels :
           Apparaît automatiquement si un agent
           de la chaîne a généré des visuels
           Grille d'images générées
           Par image : prompt + modèle + coût
           Actions : Variantes / Ajuster / Sauvegarder
           Lecteur vidéo inline si vidéo
           Sauvegarde dans .ronako/visuals/

         COMMANDES RUST NÉCESSAIRES :
           src-tauri/src/visual.rs :
             save_visual_to_project(url, path)
             list_project_visuals(path)

         ÉQUIPES PRÉDÉFINIES :
           "Identité Visuelle" :
             Marcus → Agent DA → Agent Prompt Visuel
             → Pixel → Ryo → Sam
           "Social Media" :
             Marcus → Leo → Agent Prompt Social
             → Pixel (formats multiples) → Sam
           "Campagne Publicitaire" :
             Marcus → Omar → Leo
             → Agent Prompt Pub → Pixel → Ryo → Sam
           "Site Web + Maquettes" :
             Chaîne standard + Pixel après Axel

         PROMPT MACHINE — Créer agent visuel :
           "Crée un agent spécialisé en [domaine visuel]"
           → Prompt Machine génère tout :
             Nom, rôle, prompt optimisé,
             modèle, température
           → Bouton [Créer cet agent]
           → L'utilisateur assigne ensuite
             les connecteurs visuels via
             l'onglet Connecteurs de l'agent

[ ] 7.7  Marcus proactif — Skills + Connecteurs
         Pendant le briefing :
           Détecte skills/connecteurs pertinents
           Max 1 suggestion par session
           Coût affiché
           [Ignorer] disponible
           Si ignoré 3× → arrête
         Après score bas :
           Identifie l'agent responsable
           Suggère le correctif
         Marcus compose un pack personnalisé

[ ] 7.8  ChainProposalCard — Améliorations
         Skills + connecteurs dans la popup
         Temporaires par défaut (badge ⏱)
         Coût mis à jour en temps réel
         Présets de configuration sauvegardables
         Indicateur qualité estimée
         Checklist pré-lancement Marcus
         Simulation avant lancement (Haiku ~$0.005)
         Comparaison avec chaîne similaire passée
         Note personnelle sur le run
         Drag & drop agents dans la popup

[ ] 7.9  Persona de Marcus
         Direct / Détaillé / Coach / Expert

[ ] 7.10 Mode Focus
         Que le chat Marcus visible

[x] 7.11 Mode Présentation
         Livrable plein écran pour client (onglet dans DeliverablePanel)

[ ] 7.12 Thèmes visuels
         Minéral / Arctic / Forest / Sunset

[ ] 7.13 Tips contextuels
         Différents des tooltips ⓘ
         Basés sur l'usage réel
         Disparaissent après lecture

[ ] 7.14 Niveau d'expertise adaptatif
         Débutant / Intermédiaire / Expert

[ ] 7.15 Langue des livrables séparée
         Interface FR + livrables EN possible

[ ] 7.16 Ronako Score mensuel
         Efficacité / Qualité / Progression
```

---

### 🔵 PHASE 8 — Vision long terme

```
[ ] 8.1  Batch mode
[ ] 8.2  Connecteur GitHub (Nina lit le repo)
[ ] 8.3  Connecteur mémoire longue
[ ] 8.4  Veille automatique hebdomadaire
[ ] 8.5  Partage et collaboration
[ ] 8.6  Serveur codes partage cloud
[ ] 8.7  Marketplace skills et agents
[ ] 8.8  Support multi-modèles
[ ] 8.9  Ronako Cloud
[ ] 8.10 Briefing vocal
[ ] 8.11 Connecteur Google Analytics
[ ] 8.12 Analytics avancés
[ ] 8.13 API Ronako
[ ] 8.14 Connecteur calendrier
[ ] 8.15 Split test intégré
[ ] 8.16 Victor — Validateur d'équipe
```

---

## INSTRUCTIONS POUR CLAUDE CODE

### À chaque ouverture
```
1. Lire CLAUDE.md en entier
2. Lire JOURNAL.md — dernière entrée
3. Identifier la prochaine tâche non cochée
4. Lire AUDIT.md si tu touches un fichier existant
5. Ne pas refaire ce qui est déjà coché ✅
```

### Pendant le travail
```
1. Cocher [x] les tâches au fur et à mesure
2. Respecter les RÈGLES ABSOLUES
3. Ne pas toucher aux fichiers protégés
4. Nouvelles idées → intercaler + documenter
```

### Après chaque session — OBLIGATOIRE
```
1. Cocher toutes les tâches terminées
2. Ajouter une entrée dans JOURNAL.md
3. Mettre à jour "CE QUI FONCTIONNE"
4. Signaler tout problème rencontré
```
