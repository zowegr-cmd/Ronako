# AUDIT RÉSUMÉ RONAKO
> 2026-05-30 — Une page — Voir AUDIT_COMPLET.md pour les détails

---

## État global : Fonctionnel à ~95%

---

## Ce qui tourne vraiment

**Core (100% opérationnel)**
- Chaîne 12 agents séquentiels + Relay + streaming SSE via Rust
- 4 modes : Flash (Haiku), Projet (Sonnet/Haiku mix), Infini (Opus), Custom
- ADN Projet partagé + capacités équipe injectées dans tous les prompts
- Skills injectés dans les prompts (max 5, max 3800 tokens, auto-activation keywords)
- Score Ryo /10 + export .md/.html + Bibliothèque livrables (Tauri FS)

**Tool Use Phase 8 (si clé configurée)**
- DALL-E 3, Flux Pro, E2B sandbox, Notion, GitHub, Tavily — boucle Rust JSON-RPC
- 40+ APIs génériques (Airtable, Stripe, Slack...) via generic_api.rs
- HTTP Custom avec `{{variables}}` — schéma généré automatiquement

**MCP Phase 9 (si Node.js installé)**
- Client MCP réel : JSON-RPC stdio, start/stop depuis Pack Manager
- 12 serveurs catalogue (filesystem, github, postgres...)
- Outils MCP inclus dans allTools → Claude peut les appeler

**UX**
- Product Tour 12 étapes avec spotlight réel (4 rectangles, no clip-path)
- Pack Manager hub : Skills + APIs + MCP + HTTP Custom
- 4 thèmes, persona Marcus, expertise, langue livrables, mode focus

---

## Ce qui est partiel

| Feature | Statut |
|---|---|
| APIs génériques (Airtable...) | Câblées mais Claude doit décider de les appeler |
| Blocs ACTION consultants | Parsés, exécution manuelle seulement |
| avgScoreImpact | Mis à jour mais sans pondération par pertinence |
| Parallel agents | PARALLEL_GROUPS défini, pas de vraie parallélisation |

---

## Ce qui manque

- Node.js requis pour MCP — pas de vérification préalable
- Thèmes visuels partiels (Tailwind hardcoded, pas CSS vars)
- mcpStates perdu au rechargement (non persisté)
- Ronako Cloud, marketplace, multi-modèles — Phase 8D future

---

## Chiffres clés

| Metric | Valeur |
|---|---|
| Agents | 12 principaux + 4 consultants + 1 Relay |
| Commandes Tauri | 26 |
| Stores Zustand | 7 |
| APIs catalogue | 40+ (7 catégories) |
| Skill packs | 5 prédéfinis + custom illimités |
| Serveurs MCP | 12 catalogue + import GitHub |
| Formats livrables | 7 |
| Règles analyse livrable | 17 |
| Étapes Product Tour | 12 |

---

## Fichiers critiques

```
useChainRunner.ts   → Cœur d'exécution chaîne
chainEngine.ts      → Construction prompts + tools
anthropic.rs        → Streaming + tool use (PROTÉGÉ)
agentStore.ts       → Agents, skills, packs
connectorStore.ts   → Clés APIs, MCP, HTTP custom
PackManager.tsx     → Hub connecteurs
```

---

*TypeScript 0 erreur | Rust 0 warning | commit 1b5632e*
