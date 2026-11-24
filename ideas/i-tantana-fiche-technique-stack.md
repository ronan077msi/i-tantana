# i-Tantana : fiche technique (stack)

Version 1.0 | Cette fiche **remplace la section 3 (choix techniques)** de la première fiche : SQLite à la place d'IndexedDB, React Native à la place d'une PWA.

Documents liés :
- `fiche-technique-app-tuktuk-cyclo.md` : fonctionnalités, formules, écrans
- `i-tantana-securite-activation.md` : activation et paliers
- `i-tantana-fiche-realisation.md` : étapes de construction avec Codex

---

## 1. Résumé

| Élément | Choix |
|---|---|
| Type d'app | Android natif via React Native, **100 % hors ligne** |
| Framework | React Native + **Expo** |
| Langage | **TypeScript** |
| Base de données | **SQLite** locale (`expo-sqlite`) |
| Distribution | APK partagé par **Google Drive** (pas de Play Store pour l'instant) |
| Serveur | **Aucun** |
| Outil de développement | Codex en terminal + VS Code |

---

## 2. Stack détaillée

| Besoin | Outil | Remarque |
|---|---|---|
| Base | React Native + Expo (SDK stable la plus récente) | Créer avec `npx create-expo-app@latest` |
| Langage | TypeScript (mode strict) | Le compilateur détecte les erreurs que l'IA peut introduire |
| Navigation | Expo Router | Fourni par défaut dans le modèle Expo |
| Base de données | `expo-sqlite` | SQL pur, sans ORM, pour rester léger et lisible |
| Dates | `date-fns` | Fuseau Indian/Antananarivo (UTC+3, pas d'heure d'été) |
| Langues | `i18next` + `react-i18next` + `expo-localization` | FR et MG |
| Notifications | `expo-notifications` | Notifications **locales** uniquement |
| HMAC (clés d'activation) | `@noble/hashes` | Pas de Web Crypto en React Native ; laisser Codex lire la doc de la version installée |
| Aléatoire | `expo-crypto` | Pour le code d'installation à 7 chiffres |
| Identifiant appareil | `expo-application` | Lier l'activation au téléphone |
| Stockage sécurisé | `expo-secure-store` | Date d'essai, clé d'activation (en plus de SQLite) |
| Fichiers / partage | `expo-file-system`, `expo-sharing`, `expo-document-picker` | Export et import de sauvegarde |
| PDF | `expo-print` | Export du tableau mensuel |
| Tests | Jest (`jest-expo`) | Pour les calculs métier |
| Build APK | EAS Build (profil `preview`) | Compte Expo gratuit |

**À éviter** (pour rester léger et simple) : Redux, bibliothèques d'interface lourdes, ORM. L'état de l'app tient avec les hooks React et des requêtes SQLite.

---

## 3. Architecture

```
Écrans (app/)  ->  Hooks (src/hooks)  ->  Dépôts (src/db/repositories)  ->  SQLite
                         |
                         v
              Domaine pur (src/domain)   <- calculs sans accès à la base ni à l'écran
```

Règle d'or : **tout calcul d'argent, de dates, de ROI, de prix ou de clé** vit dans `src/domain/` sous forme de **fonctions pures** (entrées -> sortie), avec des tests Jest. C'est ce qui rend l'app fiable, et c'est facile à faire écrire et vérifier par Codex.

---

## 4. Structure du projet

```
i-tantana/
├─ AGENTS.md                 # consignes pour Codex (voir fiche de réalisation)
├─ app/                      # écrans (Expo Router)
│  ├─ (tabs)/                # accueil/dashboard, véhicules, mois, paramètres
│  ├─ vehicule/[id].tsx      # fiche véhicule
│  ├─ vehicule/nouveau.tsx   # ajout (payé ou crédit)
│  ├─ historique.tsx         # mois archivés
│  └─ activation.tsx         # écran de verrouillage
├─ src/
│  ├─ db/
│  │  ├─ schema.ts           # SQL des tables + migrations
│  │  ├─ database.ts         # ouverture, PRAGMA, migrations
│  │  └─ repositories/       # vehicules.ts, jours.ts, depenses.ts, echeances.ts, entretiens.ts...
│  ├─ domain/                # fonctions pures + tests
│  │  ├─ net.ts  mois.ts  roi.ts  facilite.ts  prix.ts  activation.ts
│  │  └─ __tests__/
│  ├─ hooks/
│  ├─ services/              # notifications.ts, export.ts, sauvegarde.ts, essai.ts
│  ├─ components/
│  ├─ i18n/                  # fr.json, mg.json
│  └─ theme/                 # couleurs, tailles de texte
├─ tools/
│  └─ keygen/                # générateur de clés (script Node qui réutilise domain/activation.ts)
└─ docs/                     # les fiches .md
```

---

## 5. Schéma SQLite

Conventions : montants en **entiers** (Ariary), dates en **texte ISO** `YYYY-MM-DD`, identifiants `INTEGER PRIMARY KEY`. Activer `PRAGMA foreign_keys = ON;`. La version du schéma est suivie par `PRAGMA user_version` (migrations numérotées).

```sql
CREATE TABLE vehicule (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  type                TEXT NOT NULL CHECK (type IN ('tuktuk','cyclo')),
  nom                 TEXT NOT NULL,
  prix_achat          INTEGER NOT NULL,
  mode_achat          TEXT NOT NULL CHECK (mode_achat IN ('paye','credit')),
  apport_initial      INTEGER NOT NULL DEFAULT 0,
  echeance_montant    INTEGER,
  echeance_frequence  INTEGER,           -- en mois : 1, 2, 3, 6, 12
  echeance_prochaine  TEXT,
  nb_echeances        INTEGER,
  versement_semaine   INTEGER NOT NULL,
  versement_dimanche  INTEGER NOT NULL,
  date_service        TEXT NOT NULL,
  actif               INTEGER NOT NULL DEFAULT 1,
  cree_le             TEXT NOT NULL      -- sert à verrouiller les plus récents si la limite est dépassée
);

CREATE TABLE jour (
  vehicule_id   INTEGER NOT NULL REFERENCES vehicule(id) ON DELETE CASCADE,
  date          TEXT NOT NULL,
  entree        INTEGER NOT NULL,
  motif_entree  TEXT NOT NULL DEFAULT 'normal'
                CHECK (motif_entree IN ('normal','panne','chauffeur_absent','fourriere','autre')),
  note          TEXT,
  PRIMARY KEY (vehicule_id, date)
);

CREATE TABLE depense (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicule_id  INTEGER NOT NULL REFERENCES vehicule(id) ON DELETE CASCADE,
  date         TEXT NOT NULL,
  montant      INTEGER NOT NULL CHECK (montant >= 0),
  motif        TEXT NOT NULL,
  note         TEXT
);
CREATE INDEX idx_depense_veh_date ON depense (vehicule_id, date);

CREATE TABLE echeance (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicule_id    INTEGER NOT NULL REFERENCES vehicule(id) ON DELETE CASCADE,
  date_prevue    TEXT NOT NULL,
  montant        INTEGER NOT NULL,
  statut         TEXT NOT NULL DEFAULT 'a_payer' CHECK (statut IN ('a_payer','payee')),
  date_paiement  TEXT
);

CREATE TABLE entretien (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicule_id         INTEGER NOT NULL REFERENCES vehicule(id) ON DELETE CASCADE,
  libelle             TEXT NOT NULL,
  frequence_jours     INTEGER NOT NULL,
  derniere_date       TEXT,
  prochaine_date      TEXT NOT NULL,
  rappel_jours_avant  INTEGER NOT NULL DEFAULT 3
);

CREATE TABLE mois_cloture (
  vehicule_id     INTEGER NOT NULL REFERENCES vehicule(id) ON DELETE CASCADE,
  mois            TEXT NOT NULL,         -- 'YYYY-MM'
  total_entrees   INTEGER NOT NULL,
  total_depenses  INTEGER NOT NULL,
  net             INTEGER NOT NULL,
  report_sortant  INTEGER NOT NULL,      -- 0 ou un nombre négatif (déficit reporté)
  PRIMARY KEY (vehicule_id, mois)
);

CREATE TABLE parametre (
  cle     TEXT PRIMARY KEY,
  valeur  TEXT NOT NULL
);
-- clés : langue, code_installation, date_installation, derniere_date_vue,
--        cle_activation, id_appareil, derniere_ouverture
```

---

## 6. Règles métier (rappel)

Détail dans `fiche-technique-app-tuktuk-cyclo.md`, sections 5 à 7. Résumé :

- `net_du_jour = entree - somme(depenses)` (peut être négatif).
- `cumul_mois = report_entrant + somme(net_du_jour)` ; un déficit se reporte au mois suivant, un excédent non.
- Les **échéances ne sont pas des dépenses** (pas de double comptage).
- `cout_total` = prix d'achat (payé) ou apport + `nb_echeances x echeance_montant` (crédit).
- `mois_restants = reste_a_recuperer / net_mensuel_moyen`.
- À chaque ouverture : génération des **jours manquants** avec le versement standard.

---

## 7. Activation et sécurité

Détail dans `i-tantana-securite-activation.md`. Adaptations pour React Native :

- Code d'installation : 7 chiffres via `expo-crypto`, **stocké une fois** (SQLite + SecureStore).
- Clé : `T{tuk}C{cyclo}-{10 chiffres}` calculée par HMAC-SHA256 avec `@noble/hashes`.
- Date de début d'essai et **date la plus récente jamais vue** stockées aussi dans SecureStore (protège contre le recul de la date).
- Identifiant appareil : `expo-application` ; si différent de celui enregistré à l'activation, reverrouiller.
- Désactiver la sauvegarde automatique Android (`android.allowBackup: false` dans la config Expo).
- **Secret** : jamais en clair dans le dépôt. L'injecter au moment du build (variable d'environnement EAS, à vérifier dans la documentation EAS) et le **découper en plusieurs morceaux** dans le code. Ne jamais l'écrire dans les fichiers `docs/`.
- Le **même fichier** `src/domain/activation.ts` sert à l'app et à l'outil `tools/keygen/` : l'algorithme est identique des deux côtés.

---

## 8. Notifications

- Notifications **locales** programmées à l'avance : échéances (J-3 et jour J), entretiens, fin d'essai.
- Au premier lancement : demander la permission de notifier (Android 13+).
- **Reprogrammer** les notifications à chaque ouverture (après une modification de date, un paiement, un entretien « fait »).
- Certains téléphones Android coupent les applications en arrière-plan pour économiser la batterie, ce qui peut retarder les notifications. **Toujours doubler** par des **alertes visibles à l'ouverture de l'app** (bandeau en haut du dashboard).
- Tester sur l'**APK installé**, pas seulement dans Expo Go.

---

## 9. Export et sauvegarde

- **Sauvegarde JSON** complète (toutes les tables) : partage via WhatsApp, Messenger, Drive.
- **Restauration** depuis un fichier JSON choisi dans le téléphone (avec avertissement : remplace les données actuelles).
- **Tableau mensuel** : export CSV et PDF (`expo-print`).
- Rappel mensuel de sauvegarde.

---

## 10. Build et distribution

1. Compte Expo gratuit, EAS CLI installé.
2. Dans `eas.json`, profil `preview` avec `"android": { "buildType": "apk" }`.
3. `eas build -p android --profile preview` produit l'APK.
4. **Signature** : conserver la **même clé de signature** pour toutes les versions, sinon les clients ne pourront pas mettre à jour sans désinstaller (et perdraient leurs données). **Télécharger et sauvegarder** les identifiants de signature (`eas credentials`) dans un endroit sûr.
5. Nom de paquet fixe, par exemple `mg.itantana.app` (à choisir une fois pour toutes).
6. Partager l'APK dans un dossier Google Drive ; incrémenter `versionCode` à chaque nouvelle version.
7. Fournir un **guide d'installation illustré** : télécharger l'APK, autoriser les sources inconnues, installer, ignorer l'avertissement Play Protect si besoin.

---

## 11. Poids et performance

- Cible : APK d'environ 25 à 35 Mo, démarrage rapide sur un téléphone Android d'entrée de gamme.
- Pas de bibliothèque de composants lourde, pas d'images volumineuses (icônes simples).
- Requêtes SQLite avec index (déjà prévus), listes paginées si l'historique grossit.
- Tester sur un **vrai téléphone modeste**, pas seulement sur un téléphone récent.

---

## 12. Conventions de code

- Fichiers et variables en **français** pour le métier (`depense`, `versement`), anglais accepté pour le technique.
- TypeScript strict : pas de `any`.
- Une fonction = une responsabilité ; les calculs vont dans `src/domain/`.
- Tout texte affiché passe par i18n (jamais en dur dans un écran).
- Commits petits et fréquents (voir la fiche de réalisation).

---

## 13. Risques et réponses

| Risque | Réponse |
|---|---|
| Tu découvres React, TypeScript et Expo en même temps | Avancer par petites étapes, tests sur les calculs, commits fréquents, demander à Codex d'expliquer chaque concept nouveau |
| Codex produit du code qui marche mais que tu ne comprends pas | Relire le diff, demander une explication en français, refuser les gros changements d'un coup |
| Perte de la clé de signature | La sauvegarder dès le premier build |
| Fuite du secret d'activation | Version `v2` du secret, voir la fiche sécurité |
| Perte de données client | Sauvegarde JSON facile et rappelée chaque mois |
| Notifications non fiables | Alertes aussi affichées à l'ouverture |
