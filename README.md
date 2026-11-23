# Agentique

Plateforme où des agents IA cadrent, prototypent puis développent des applications web et mobiles, avec un suivi en temps réel de chaque projet.

Ce premier lot couvre le **recueil du besoin** : un entretien guidé par l'Analyste, la rédaction du cahier des charges par le Rédacteur, et sa validation par le client. Le prototypage suit dans le prochain lot.

## Démarrer

Prérequis : Node.js 22 et pnpm 10.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Sans clé API, la plateforme tourne en **mode démo** : l'Analyste pose des questions scriptées et le cahier des charges est assemblé à partir de vos réponses, sans appel à l'IA. Pour utiliser Claude, copiez `apps/web/.env.example` en `apps/web/.env.local` et renseignez `ANTHROPIC_API_KEY`.

Les données sont en mémoire pour l'instant : elles disparaissent au redémarrage du serveur.

## Commandes

| Commande         | Effet                                 |
| ---------------- | ------------------------------------- |
| `pnpm dev`       | Lance l'interface en développement    |
| `pnpm build`     | Construit l'interface                 |
| `pnpm test`      | Lance les tests (Vitest)              |
| `pnpm typecheck` | Vérifie les types de tous les paquets |

## Organisation

| Dossier                | Contenu                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `packages/core`        | Modèle métier : étapes, transitions, événements, livrables, format du cahier des charges, accès aux données |
| `packages/agents`      | Orchestrateur et agents (Analyste, Rédacteur), modèle Claude et modèle démo                                 |
| `apps/web`             | Interface Next.js : tableau de bord, page projet, API et flux temps réel (SSE)                              |
| `supabase/migrations`  | Schéma Postgres, sécurité par ligne et publication temps réel pour Supabase                                 |
| `docs/architecture.md` | Parcours, rôles des agents, choix techniques et suite prévue                                                |
