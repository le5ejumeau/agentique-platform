# Conventions de code

Ces règles valent pour les humains comme pour les agents. Celles qui peuvent l'être sont vérifiées automatiquement, en local (`pnpm check`) et en CI. Une PR ne passe pas si l'une d'elles échoue.

## Vérifié automatiquement

| Outil             | Ce qu'il garantit                                                                        | Commande                                                       |
| ----------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Prettier          | Mise en forme identique partout (largeur 120, classes Tailwind triées)                   | `pnpm format` pour corriger, `pnpm format:check` pour vérifier |
| ESLint            | Règles TypeScript strictes, règles React et Next.js (hooks, accessibilité, performances) | `pnpm lint`                                                    |
| TypeScript strict | `strict` et `noUncheckedIndexedAccess` : un accès à un tableau peut renvoyer `undefined` | `pnpm typecheck`                                               |
| Vitest            | Tests unitaires des paquets                                                              | `pnpm test`                                                    |
| EditorConfig      | UTF-8, fins de ligne LF, indentation 2 espaces dans tous les éditeurs                    | automatique                                                    |

## Structure

- **Logique métier dans `packages/core`**, sans dépendance à React ni à Next.js. Elle se teste seule.
- **Agents dans `packages/agents`**. Un agent reçoit des données et renvoie un résultat. Seul l'Orchestrateur modifie l'état d'un projet.
- **`apps/web`** ne fait qu'afficher et appeler l'API. Pas de règle métier dans un composant.
- Les routes d'API valident leurs entrées et renvoient un message d'erreur en français, avec le bon code HTTP (400 entrée invalide, 404 introuvable, 409 action impossible à cette étape).

## Front (React et Next.js)

- Composant serveur par défaut. `"use client"` seulement pour ce qui a besoin d'état, d'effets ou d'événements navigateur.
- Pas de `setState` directement dans un `useEffect` : dériver la valeur pendant le rendu, ou la mettre à jour dans un rappel (réponse réseau, événement).
- Un fichier par page, les composants réutilisés dans `components/`, les utilitaires dans `lib/`.
- Styles en classes Tailwind, sans CSS spécifique sauf pour le contenu Markdown des livrables.
- Textes de l'interface en français, en phrases simples, sans jargon technique.

## Tests

- Toute règle du parcours (étape, transition, validation) a un test dans `packages/core`.
- Tout comportement de l'Orchestrateur a un test avec `DemoModel`, sans appel réseau.
- Un bug corrigé arrive avec le test qui l'aurait détecté.

## Git

- Une branche par sujet, une PR par branche, fusion seulement quand la CI est verte.
- Messages de commit en français, à l'impératif ou au nominal, première ligne sous 72 caractères.
