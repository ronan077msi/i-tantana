# i-Tantana — fiche de suivi du projet

Dernière mise à jour : 1 novembre 2026

## État général

**Phase actuelle : socle Expo initialisé ; le démarrage sur Android reste à vérifier. La réinstallation des dépendances est bloquée par un verrou npm désynchronisé et des erreurs Windows `EPERM` dans `node_modules`.**

Le dossier `ideas/` rassemble des notes et des propositions brutes. Ces documents aident à comprendre l’idée du produit, mais leurs propositions techniques ne sont pas la référence du projet. Pour les choix techniques et les règles de travail, suivre `AGENTS.md` et ses consignes complémentaires.

## Idée conservée

i-Tantana est une application Android hors ligne destinée aux propriétaires de tuk-tuks et de cyclos pousse. Elle doit les aider à suivre, pour chaque véhicule, les versements, les dépenses, le résultat, les échéances de crédit et l’entretien. L’interface vise des personnes peu habituées au numérique, avec de gros boutons et du français et du malgache.

## Décisions de cadrage

- **Stack du projet :** React Native, Expo, TypeScript strict, Expo Router et SQLite, selon `AGENTS.md`.
- **Fonctionnement :** hors ligne, sans serveur ni appels réseau.
- **Données :** Ariary entiers ; dates stockées au format `YYYY-MM-DD`.
- **Limites prévues :** jusqu’à 10 véhicules de chaque type, selon les règles d’activation de `AGENTS.md`.
- **Documents de `ideas/` :** conserver l’idée et les règles métier utiles, mais ignorer les anciennes propositions techniques contradictoires (PWA, IndexedDB, Capacitor, etc.).
- **Tarification et activation :** suivre les règles actuelles d’`AGENTS.md` ; ne pas reprendre un tarif brut d’une fiche d’idées comme décision de projet.

## Travail réalisé

- Lu `AGENTS.md` et les fiches disponibles dans `ideas/`.
- Comparé les deux versions de la fiche fonctionnelle et relevé qu’elles n’ont pas le même niveau de décision.
- Clarifié que les fiches d’idées sont des notes regroupées dans un même dossier, pas la source de vérité technique.
- Lu `agents-2.md`, qui précise notamment le début du suivi, les jours estimés, les deux chiffres de résultat et des règles de ROI.
- Créé `corriger-1.md` pour préciser le seuil de 14 jours, éviter la suppression automatique de données, clarifier le report mensuel, le calendrier des échéances et le décompte des dates.
- Créé cette fiche de suivi.
- Initialisé le projet Expo avec TypeScript strict, Expo Router, un écran d’accueil minimal et le socle i18n français/malgache.
- Installé les dépendances et généré `package-lock.json` ; `npm run typecheck` passe.
- Le démarrage sur appareil Android et la suite Jest restent à effectuer.

## Incident rencontré lors du lancement Android

Le 1 novembre 2026, le lancement de `npm start` depuis `C:\Users\HP\OneDrive\Desktop\i-tantana` a échoué avant le démarrage d’Expo avec `UNKNOWN: unknown error, lstat` sur `node_modules\@babel\helper-string-parser\lib`. Le dossier existait et Windows le signalait comme point de réanalyse (`ReparsePoint`), ce qui peut être lié à la synchronisation OneDrive ; cette cause reste une hypothèse.

### Tentatives et résultats

- `npm ci` a refusé l’installation car `package.json` et `package-lock.json` ne sont pas synchronisés. npm a notamment signalé des entrées manquantes pour `react-dom`, `react-native-gesture-handler`, `react-native-reanimated` et des dépendances Metro/Babel.
- `npm ci --legacy-peer-deps` dans le dossier OneDrive a échoué avec `EPERM` pendant la suppression (`unlink`) de `node_modules\@babel\helper-string-parser\lib`.
- Le projet a ensuite été utilisé depuis `C:\Users\HP\Documents\Projet\i-tantana`, hors du dossier OneDrive. `npm ci` y a encore signalé le décalage entre le manifeste et le verrou.
- La commande proposée pour régénérer le verrou, `npm install --legacy-peer-deps`, a échoué dans ce dossier avec `EPERM` pendant des opérations de création/déplacement de fichiers dans `node_modules` (d’abord `mkdir`, puis `copyfile`). Une tentative relancée avec des droits plus élevés n’a pas abouti et a été interrompue ; l’installation n’est donc pas réparée.
- Après suppression de `node_modules` dans le dossier Documents, `npm install --legacy-peer-deps` a réussi : 522 paquets ajoutés, 523 paquets audités, en environ 8 minutes. npm signale encore 11 vulnérabilités modérées ; elles n’ont pas été auditées ni corrigées automatiquement.
- `npm start` a ensuite démarré Metro depuis le dossier Documents et affiché le QR code Expo Go (`exp://172.20.10.7:8081`). L’avertissement de téléchargement des React Native DevTools indique qu’une version de secours est utilisée ; le serveur Expo a tout de même démarré.
- L’utilisateur a scanné le QR code avec l’application Photo, pas avec Expo Go. Il ne souhaite pas télécharger Expo Go à cause de son forfait limité et indique que son téléphone ralentit beaucoup ; le test avec Expo Go n’est donc pas adapté dans ces conditions.
- L’utilisateur indique disposer du SDK Android et prévoit de télécharger/installer Android Studio dans un cybercafé afin de tester le projet sans téléphone, avec un émulateur Android. L’émulateur, son appareil virtuel et le projet devront encore être installés/configurés dans cet environnement. L’écran n’a pas encore été vérifié sur Android.

### Prochaine procédure proposée

1. L’installation dans le dossier Documents a réussi ; la suppression de `node_modules` et la réinstallation sont donc terminées.
2. Dans le cybercafé, installer/configurer Android Studio et un appareil virtuel (émulateur), ouvrir le projet ou le compiler avec le SDK, puis vérifier l’écran d’accueil et la langue. Le SDK Android est signalé comme disponible, mais la compilation et le test sur émulateur restent à vérifier.

Le lancement Expo est confirmé ; le test sur téléphone reste à faire. Ne pas considérer l’étape 1 comme terminée avant cette vérification.

## Fichiers de référence

| Fichier | Rôle |
|---|---|
| `AGENTS.md` | Consignes principales : stack, architecture, règles métier et méthode de travail. |
| `agents-2.md` | Consignes complémentaires sur le suivi, les jours estimés, le résultat et le ROI. |
| `corriger-1.md` | Précisions destinées à lever certaines ambiguïtés de `agents-2.md`. |
| `ideas/` | Notes brutes sur le produit ; leurs choix techniques ne font pas autorité. |

**À faire :** `agents-2.md` demande d’ajouter une référence à lui-même dans `AGENTS.md`. Cette ligne n’a pas encore été ajoutée.

## Points à préciser au moment de développer

- Lorsqu’une date de début de suivi plus récente est demandée, `corriger-1.md` refuse le changement s’il existe déjà des données antérieures. Le parcours permettant à l’utilisateur de résoudre ce cas reste à concevoir, sans suppression automatique de données.
- Définir le cas où toutes les échéances sont déjà payées et où il n’existe donc pas de prochaine date d’échéance.
- Vérifier que les règles de `agents-2.md` et `corriger-1.md` sont appliquées ensemble avant de développer les fonctions de dates, de résultats, de ROI et d’échéances.

## Prochaines étapes suggérées

1. Ajouter dans `AGENTS.md` le lien vers `agents-2.md`, comme celui-ci le demande.
2. Démarrer le squelette Expo et la navigation, en suivant les étapes du projet.
3. Mettre en place SQLite et les migrations additives.
4. Implémenter les calculs métier avec leurs tests, avant les écrans qui les utilisent.
5. Construire progressivement les écrans, l’i18n français/malgache, les alertes et l’activation.
6. Tester sur un appareil Android modeste avant la distribution.

## Modifications et vérifications

Le contrôle TypeScript a été lancé et passe. Aucun test Jest ni build APK n’a été lancé. L’installation npm a signalé 11 vulnérabilités de niveau modéré ; elles n’ont pas été auditées ni corrigées automatiquement.
