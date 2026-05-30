# PROGRESS — Pack Manager Refonte

> Mis à jour en temps réel pendant la session.

## OBJECTIF
Transformer Pack Manager en hub unique : Skills + APIs (40+) + MCP + HTTP Custom.
Plus rien dans Paramètres pour les connecteurs.

---

## ÉTAPES

### ✅ 1. apiCatalog.ts — Catalogue 40+ APIs
`src/lib/apiCatalog.ts`
- 7 catégories : Génération, Recherche, Productivité, Dev, Communication, Business, Analytics
- 40+ entrées avec pricing, icône, description, keyField
- Marquées hasToolDef si déjà câblées dans tool use (Phase 8)

### ✅ 2. mcpCatalog.ts — Catalogue MCP servers
`src/lib/mcpCatalog.ts`
- 12 serveurs officiels + communauté
- Avec package npm, stars, description

### ✅ 3. connectorStore.ts — Store unifié
`src/store/connectorStore.ts`
- Gère TOUS les connecteurs (ancien + nouveau)
- Clés via keyring OS (secure_set_key / secure_get_key)
- Custom HTTP connectors (CRUD)
- Persiste la liste custom dans localStorage

### ✅ 4. http_custom_call — Rust command
`src-tauri/src/commands.rs` (append)
`src-tauri/src/lib.rs` (register)
- Exécute n'importe quel appel HTTP authentifié
- Headers, body, méthode configurables
- Retourne la réponse brute

### ✅ 5. PackManager.tsx — Refonte complète
`src/screens/PackManager.tsx`
- 4 onglets : Skills / APIs / MCP / Custom HTTP
- Inline key config dans l'onglet APIs
- Statut temps réel (✅ Actif / ⚠️ Clé manquante)
- MCP : liste + copier commande npx
- Custom HTTP : créer / tester / supprimer

### ✅ 6. Settings.tsx — Nettoyage
- Section connecteurs retirée
- Lien "Gérer dans Pack Manager →" à la place

### ✅ 7. useChainRunner.ts — Lit connectorStore
- Lit les clés depuis connectorStore (pas settingsStore)

### ✅ 8. TypeScript 0 erreur + push
