# Consignes pour ce dépôt

- Langue : français pour l'interface, les messages, les commentaires de code, les commits et les PR. Identifiants de code en anglais, sauf les valeurs métier (étapes, rôles) qui restent en français.
- Monorepo pnpm, TypeScript partout. Les paquets `packages/*` sont consommés en source (pas de build) : imports relatifs sans extension `.js`, sinon Turbopack ne les résout pas.
- Toute nouvelle étape ou transition passe par `packages/core/src/workflow.ts` et ses tests.
- Les agents n'écrivent jamais l'état du projet eux-mêmes : ils renvoient un résultat à l'Orchestrateur.
- Modèle Claude par défaut : `claude-opus-5-5`. Le mode démo (`DemoModel`) doit continuer à couvrir tout le parcours, pour tester sans clé API.
- Conventions détaillées : `docs/conventions.md`.
- Avant de pousser : `pnpm check && pnpm build` (format, lint, types, tests).
