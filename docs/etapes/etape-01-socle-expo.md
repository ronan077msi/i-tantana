# Étape 1 — Socle Expo, navigation et thème

**État : socle initialisé ; vérification sur Android encore à faire.**

## Réalisé

- Initialisé Expo SDK 58 avec React Native et TypeScript strict.
- Configuré Expo Router avec les routes dans `app/`.
- Configuré le nom d’application `i-Tantana`, son slug et son schéma de lien `itantana`.
- Désactivé la sauvegarde automatique Android (`allowBackup: false`).
- Ajouté un écran d’accueil minimal et une palette de couleurs de base.
- Mis en place i18next avec les ressources françaises et malgaches ; le français est le choix de repli.
- Ajouté une commande de contrôle TypeScript : `npm run typecheck`.
- Créé `package-lock.json` afin de figer les versions effectivement résolues.

## Fichiers principaux

- `package.json`, `package-lock.json`, `app.json`, `tsconfig.json`, `.gitignore`
- `app/_layout.tsx`, `app/index.tsx`
- `src/i18n/index.ts`, `src/i18n/locales/fr.json`, `src/i18n/locales/mg.json`
- `src/theme/couleurs.ts`

## Vérifications

- `npm run typecheck` : **réussi**.
- `npx expo config --json` a produit la configuration résolue avec `sdkVersion` `58.0.0`, mais le processus CLI n’a pas terminé proprement ; ne pas considérer cette commande comme une vérification réussie.
- L’application n’a pas été lancée sur Android ni testée sur un téléphone.
- npm a signalé **11 vulnérabilités de niveau modéré** pendant l’installation. Aucun audit détaillé ni correctif automatique n’a été effectué.

## Dépendances installées

Les dépendances fonctionnelles ajoutées sont dans la liste autorisée par `AGENTS.md` : Expo Router et ses modules Expo requis, `expo-localization`, `i18next` et `react-i18next`. Les versions Expo ont été choisies pour SDK 58.

Expo Router a des dépendances de pair facultatives pour le web. npm a rencontré un conflit de version React/React DOM ; l’installation d’i18n a été faite avec `--legacy-peer-deps` parce que le produit vise Android et n’utilise pas ces dépendances web. À surveiller si une cible web est ajoutée plus tard.

## Reste à faire pour terminer cette étape

- [ ] Démarrer le projet Expo et ouvrir l’accueil sur Android ou Expo Go.
- [ ] Vérifier visuellement que l’écran est lisible et que la langue de l’appareil sélectionne le français ou le malgache.
- [ ] Mettre à jour cette note et cocher l’étape 1 dans `etapes-a-suivre.md` après cette vérification.
