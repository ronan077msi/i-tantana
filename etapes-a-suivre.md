# i-Tantana — étapes de développement à suivre

Cette feuille de route organise le développement selon `AGENTS.md`, `agents-2.md` et `corriger-1.md`. Le dossier `ideas/` reste une source d’idées métier, pas une référence pour la stack technique.

## Principe d’organisation

i-Tantana fonctionne hors ligne. Il n’y a donc **pas de serveur ni de backend distant**. La partie données, parfois appelée « back » dans cette feuille, désigne SQLite sur le téléphone, les migrations, les dépôts SQL et les fonctions métier.

On prépare d’abord le socle Expo, puis la base locale et les calculs. Les écrans s’appuient ensuite sur ces éléments.

## État actuel

- [x] Arborescence de dossiers créée (`app/`, `assets/`, `src/`, `docs/`, `tools/`).
- [x] Projet Expo initialisé avec TypeScript et Expo Router ; le premier écran d’accueil existe.
- [ ] L’application n’a pas encore été ouverte sur Android.
- [ ] Aucune table SQLite ni aucun dépôt de données ne sont encore implémentés.

## Étapes

### 0. Stabiliser les références du projet

- [x] Ajouter dans `AGENTS.md` la référence à `agents-2.md`, comme celui-ci le demande.
- [ ] Garder `AGENTS.md`, `agents-2.md` et `corriger-1.md` comme consignes de développement.
- [ ] Lorsqu’une règle métier est ambiguë, la préciser dans les consignes avant de coder la fonction concernée.

**Prêt à passer à l’étape suivante quand :** les règles applicables sont identifiables sans devoir choisir entre plusieurs notes brutes.

### 1. Initialiser le projet Expo

- [x] Créer le projet React Native avec Expo et TypeScript strict dans ce dossier.
- [x] Configurer Expo Router et un premier écran d’accueil minimal.
- [x] Ajouter les dépendances Expo et i18n prévues par `AGENTS.md`.
- [x] Vérifier le contrôle TypeScript (`npm run typecheck`).
- [ ] Ouvrir l’application sur Android et vérifier le démarrage à l’écran.

**Prêt à passer à l’étape suivante quand :** l’application squelette démarre sur Android et la configuration est comprise et documentée. Le démarrage sur appareil reste à vérifier.

### 2. Préparer la base SQLite

- [ ] Écrire le schéma initial à partir de `AGENTS.md` et de `docs/i-tantana-fiche-technique-stack.md` une fois cette référence rangée ou créée.
- [ ] Créer l’ouverture de la base et activer les clés étrangères.
- [ ] Mettre en place les migrations numérotées avec `PRAGMA user_version`.
- [ ] Ajouter les colonnes prévues par `agents-2.md` et `corriger-1.md` dans une migration additive : `jour.confirme`, `vehicule.echeances_deja_payees`, `mois_cloture.partiel`.
- [ ] Tester la migration depuis la version précédente sans supprimer ni recréer de table contenant des données.

**Prêt à passer à l’étape suivante quand :** une base neuve s’initialise et une base à la version précédente migre en préservant ses données.

### 3. Construire les dépôts de données

- [ ] Définir des types TypeScript explicites pour les lignes de chaque table.
- [ ] Créer les dépôts SQL dans `src/db/repositories/`.
- [ ] Commencer par les véhicules, puis les jours, dépenses, échéances, entretiens et clôtures mensuelles.
- [ ] Utiliser exclusivement des requêtes SQL paramétrées.
- [ ] Utiliser une transaction pour toute opération qui écrit dans plusieurs tables.

**Prêt à passer à l’étape suivante quand :** les opérations de lecture et d’écriture essentielles fonctionnent via les dépôts, sans SQL dans les écrans.

### 4. Écrire le domaine métier et ses tests

- [ ] Écrire les tests avant chaque calcul.
- [ ] Implémenter les fonctions pures dans `src/domain/` : dates, résultats, échéances, report et ROI.
- [ ] Appliquer les règles de `agents-2.md` et `corriger-1.md`, notamment le seuil de 14 jours complets et les jours estimés.
- [ ] Garder les montants en Ariary entiers et passer les dates explicitement aux fonctions.
- [ ] Vérifier les cas normaux, limites, négatifs, périodes vides et mois partiels.

**Prêt à passer à l’étape suivante quand :** les fonctions métier ont des tests automatisés et ne dépendent ni de SQLite ni de l’interface.

### 5. Gérer les véhicules et leur configuration

- [ ] Implémenter l’ajout, la modification et la consultation d’un véhicule.
- [ ] Enregistrer les versements semaine/dimanche et la date de début du suivi.
- [ ] Valider les dates de début et les limites de véhicules par type.
- [ ] Pour les véhicules à crédit, enregistrer les informations de financement et les échéances déjà payées.

**Prêt à passer à l’étape suivante quand :** les véhicules sont persistés localement avec leurs données validées.

### 6. Gérer le quotidien

- [ ] Générer les jours manquants à partir de `date_service`.
- [ ] Marquer les jours générés comme estimés (`confirme = 0`).
- [ ] Permettre la confirmation et la correction d’un jour, sans confirmer l’entrée lorsqu’une dépense seule est ajoutée.
- [ ] Ajouter les dépenses et les motifs d’exception.
- [ ] Empêcher la confirmation du jour courant avant la fin de la journée.

**Prêt à passer à l’étape suivante quand :** l’utilisateur peut corriger rapidement un jour estimé, saisir une dépense et voir le résultat journalier cohérent.

### 7. Gérer les mois et les archives

- [ ] Calculer le résultat mensuel et afficher la période réelle du premier mois partiel.
- [ ] Clôturer un mois explicitement et enregistrer le report dans une transaction.
- [ ] Reporter uniquement un déficit ; ne pas reporter un excédent.
- [ ] Afficher les mois clôturés et leur détail quotidien.

**Prêt à passer à l’étape suivante quand :** les résultats provisoires et clôturés sont cohérents et le report est vérifié avec des exemples chiffrés.

### 8. Gérer crédits et échéances

- [ ] Construire le calendrier à partir de la prochaine échéance et du nombre déjà payé.
- [ ] Traiter les dates de fin de mois selon la règle de `corriger-1.md`.
- [ ] Enregistrer le paiement réel d’une échéance et sa date.
- [ ] Afficher « Reste après échéances » uniquement pour les véhicules à crédit.
- [ ] Afficher les alertes d’échéance et de budget selon les règles métier.

**Prêt à passer à l’étape suivante quand :** les échéances déjà payées, restantes, payées dans la période et alertes sont vérifiées.

### 9. Gérer les entretiens et notifications

- [ ] Créer les entretiens récurrents et leurs dates de rappel.
- [ ] Le bouton « Fait » enregistre le coût comme dépense et reprogramme le prochain entretien.
- [ ] Programmer les notifications locales autorisées.
- [ ] Afficher aussi les alertes dans l’application à son ouverture.

**Prêt à passer à l’étape suivante quand :** les entretiens terminés mettent à jour la dépense et la prochaine date, et les alertes sont visibles dans l’app.

### 10. Construire les écrans et le tableau de bord

- [ ] Construire les écrans sur les dépôts et hooks existants ; aucun SQL ni formule dans les écrans.
- [ ] Afficher le résultat, les jours à confirmer, le reste après échéances pour le crédit et les phrases de ROI.
- [ ] Prévoir les états vide, chargement et erreur sur chaque écran.
- [ ] Respecter les grands boutons, les textes lisibles et les parcours courts.

**Prêt à passer à l’étape suivante quand :** les parcours principaux peuvent être réalisés sur l’appareil et les chiffres correspondent aux calculs du domaine.

### 11. Ajouter le français et le malgache

- [ ] Configurer i18next, react-i18next et expo-localization.
- [ ] Ajouter chaque texte d’interface dans les traductions française et malgache.
- [ ] Documenter les traductions provisoires dans `docs/a-traduire.md`.

**Prêt à passer à l’étape suivante quand :** aucun texte d’écran n’est écrit en dur et les deux langues sont sélectionnables.

### 12. Ajouter essai et activation

- [ ] Implémenter l’essai de 15 jours, le verrouillage prévu et l’affichage du code d’installation.
- [ ] Stocker les éléments requis dans SQLite et SecureStore.
- [ ] Vérifier la clé à chaque lancement, les limites par type, le recul de date et l’identifiant d’appareil.
- [ ] Créer `tools/keygen/` en réutilisant le même algorithme de domaine.
- [ ] Ne jamais écrire le secret réel dans le dépôt, les tests ou la documentation.

**Prêt à passer à l’étape suivante quand :** les scénarios d’activation et de limite sont testés avec un secret de test uniquement.

### 13. Ajouter export et sauvegarde

- [ ] Exporter toutes les données locales dans un fichier JSON.
- [ ] Restaurer une sauvegarde avec validation et transaction.
- [ ] Exporter un relevé mensuel en CSV et PDF.
- [ ] Vérifier le parcours de partage sur Android.

**Prêt à passer à l’étape suivante quand :** une sauvegarde exportée peut être restaurée et les données sont identiques.

### 14. Préparer et tester la distribution Android

- [ ] Configurer le nom et l’identifiant de paquet définitifs, `allowBackup: false` et le profil APK.
- [ ] Conserver la même clé de signature pour les mises à jour.
- [ ] Produire et installer un APK sur un appareil Android modeste.
- [ ] Vérifier l’usage hors ligne, les notifications, les performances et les sauvegardes.
- [ ] Faire un essai terrain avec les propriétaires ciblés et corriger les problèmes observés.

**Prêt à publier quand :** le parcours complet a été vérifié sur APK installé et les critères de fin d’`AGENTS.md` sont satisfaits.

## Règle de fin de chaque tâche

- [ ] Suivre `AGENTS.md` et ses compléments.
- [ ] Exécuter `npx tsc --noEmit` et `npm test` lorsque le projet et les tests sont en place.
- [ ] Expliquer les fichiers modifiés et les vérifications réellement effectuées.
- [ ] Ne pas déclarer une vérification réussie si elle n’a pas été exécutée.
