# i-Tantana : instructions pour Codex CLI

> Ce fichier se place à la **racine du projet** sous le nom `AGENTS.md`. Codex le lit automatiquement au démarrage.
> Les sections 1 à 10 sont les **règles** que Codex doit suivre. La section 11 est une **bibliothèque de prompts** pour toi (Ronan).

---

## 1. Contexte du projet

**i-Tantana** est une application Android **100 % hors ligne** qui aide les propriétaires de **tuk-tuk** et de **cyclos pousse** (Moramanga, Tamatave, Brickaville, Madagascar) à connaître leur **résultat net**, leur **ROI**, et à ne pas rater une **échéance** ou un **entretien**.

Idée centrale : le versement journalier est quasi fixe, donc l'**entrée d'argent est générée automatiquement**. Le propriétaire ne saisit que les **exceptions** (dépenses, jours sans versement).

**Utilisateurs** : propriétaires de 1 à 10 véhicules, peu habitués au numérique, téléphone Android modeste, réseau irrégulier. Langues : **français** et **malgache**. Monnaie : **Ariary (Ar)**.

**Le développeur est débutant en React, TypeScript et Expo.** Il connaît SQL et SQLite. Il apprend en pilotant Codex.

Documents de référence (à lire avant de coder une fonctionnalité) :
- `docs/fiche-technique-app-tuktuk-cyclo.md` : fonctionnalités, formules, écrans
- `docs/i-tantana-fiche-technique-stack.md` : stack, structure, schéma SQL
- `docs/i-tantana-securite-activation.md` : essai, activation, paliers
- `docs/i-tantana-fiche-realisation.md` : plan d'étapes

---

## 2. Stack (ne pas en changer sans me demander)

| Besoin | Outil |
|---|---|
| Framework | React Native + Expo, **TypeScript strict** |
| Navigation | Expo Router |
| Base de données | `expo-sqlite`, **SQL pur, sans ORM** |
| Dates | `date-fns` |
| Langues | `i18next`, `react-i18next`, `expo-localization` (fr et mg) |
| Notifications | `expo-notifications` (**locales** uniquement) |
| Clés d'activation | `@noble/hashes` (HMAC-SHA256) ; `expo-crypto` pour l'aléatoire |
| Appareil / stockage sécurisé | `expo-application`, `expo-secure-store` |
| Fichiers | `expo-file-system`, `expo-sharing`, `expo-document-picker`, `expo-print` |
| Tests | Jest (`jest-expo`) |

**Interdit sans mon accord** : Redux ou autre gestionnaire d'état lourd, bibliothèque d'interface lourde, ORM, serveur, backend, appel réseau, analytics, publicité, Firebase, toute dépendance non listée.

---

## 3. Règles générales de travail

1. **Une tâche à la fois.** Fais uniquement ce que je demande. Ne modifie pas les fichiers sans rapport avec la tâche.
2. **Code simple et lisible**, adapté à un débutant. Pas de abstractions inutiles, pas de « magie ».
3. **Commente en français** les passages qui ne sont pas évidents (surtout React et TypeScript).
4. **Explique à la fin** de chaque réponse, en français et en termes simples : ce que tu as fait, quels fichiers ont changé, et un concept nouveau expliqué en 2 ou 3 phrases s'il y en a un.
5. **Avant de coder** une tâche non triviale, donne un **plan court** (5 lignes maximum) puis continue sans attendre, sauf s'il y a une ambiguïté réelle.
6. **En cas d'ambiguïté réelle** sur une règle métier, pose **une seule question précise** plutôt que de deviner.
7. **Vérifie avant de terminer** : lance `npx tsc --noEmit` et `npm test`, et corrige les erreurs. Dis-moi clairement si quelque chose échoue ou n'a pas pu être vérifié.
8. **Ne prétends jamais** que quelque chose fonctionne sans l'avoir vérifié. Si tu ne peux pas tester sur un téléphone, dis-le et donne-moi les étapes de test manuel.
9. **Petites modifications** : privilégie plusieurs petits changements à un gros refactoring. Pas de réécriture complète d'un fichier sans raison.
10. **N'ajoute pas de dépendance** sans me la présenter (nom, rôle, poids approximatif) et attendre mon accord.
11. **Ne supprime jamais** de fichier, de table ou de donnée sans me le demander explicitement.
12. Ne lance **aucune commande destructrice** (`rm -rf`, `git reset --hard`, `git clean`, suppression de la base) sans mon accord.

---

## 4. Architecture et organisation du code

```
Écrans (app/)  ->  Hooks (src/hooks)  ->  Dépôts (src/db/repositories)  ->  SQLite
                         |
                         v
              Domaine pur (src/domain)   <- calculs sans accès à la base ni à l'écran
```

```
app/                  # écrans Expo Router
src/db/               # schema.ts, database.ts, repositories/
src/domain/           # fonctions pures + __tests__/
src/hooks/
src/services/         # notifications, export, sauvegarde, essai
src/components/
src/i18n/             # fr.json, mg.json
src/theme/
tools/keygen/         # générateur de clés (administrateur)
docs/
```

**Règles d'architecture**
- **Tout calcul** d'argent, de dates, de ROI, de prix, d'échéance ou de clé vit dans `src/domain/` sous forme de **fonctions pures** (mêmes entrées = même sortie, pas d'accès à la base, à l'écran ou à l'heure système : la date est passée en paramètre).
- Chaque fonction du domaine a des **tests Jest**. **Écris les tests d'abord** pour les calculs.
- Les écrans n'écrivent **jamais** de SQL ni de formule : ils appellent des hooks ou des dépôts.
- Les dépôts (`src/db/repositories/`) contiennent **tout le SQL**, avec des requêtes **paramétrées** (jamais de concaténation de texte dans le SQL).
- Types TypeScript explicites pour chaque table et chaque fonction publique. **Pas de `any`.**

---

## 5. Règles sur les données

- **Montants** : toujours des **entiers** en Ariary (jamais de décimales ni de nombres flottants pour l'argent).
- **Dates stockées** : texte ISO **`YYYY-MM-DD`** ; mois : `YYYY-MM`.
- **Fuseau** : Madagascar, **UTC+3**, pas d'heure d'été. **Ne pas utiliser `toISOString()` pour obtenir une date locale** (décalage UTC possible) : construis la date locale avec `date-fns` (`format(date, 'yyyy-MM-dd')`).
- **Affichage des dates** : `JJ/MM/AAAA`. **Affichage des montants** : `25 000 Ar` (espace comme séparateur de milliers).
- **Schéma SQL** : suivre `docs/i-tantana-fiche-technique-stack.md` section 5. `PRAGMA foreign_keys = ON`.
- **Migrations** : numérotées avec `PRAGMA user_version`, **additives uniquement** (ajout de colonne ou de table). Ne jamais supprimer ni recréer une table contenant des données client sans migration de recopie testée.
- **Transactions** pour toute opération qui écrit dans plusieurs tables (clôture de mois, restauration de sauvegarde, génération des échéances).

---

## 6. Règles métier (à respecter exactement)

### Entrée et net du jour
- `entree_du_jour` = `versement_dimanche` si la date est un dimanche, sinon `versement_semaine`. Les versements sont **saisis par le propriétaire** pour chaque véhicule (aucune valeur par défaut imposée).
- `net_du_jour = entree - somme(depenses du jour)`. **Il peut être négatif.**
- **Jours manquants** : à chaque ouverture ou reprise de l'app, générer pour chaque véhicule actif les jours entre la dernière date enregistrée et aujourd'hui, avec le versement standard.
- **Motifs d'exception** (entrée à 0 ou partielle) : `panne`, `chauffeur_absent`, `fourriere`, `autre`.

### Mois et report
- `cumul_mois = report_entrant + somme(net_du_jour du mois)`.
- Si `cumul_mois < 0`, le déficit est **reporté** sur le mois suivant (`report_sortant = cumul_mois`). Un **excédent ne se reporte pas** (`report_sortant = 0`).
- Chaque mois repart d'une page vide ; les mois passés sont **archivés** (`mois_cloture`) et consultables en tableau : date, entrée, dépense, motif, net.

### Facilités de paiement (véhicules à crédit uniquement)
- Un véhicule **payé** n'a **aucune** fonction de facilité : ni champs, ni alertes d'échéance, ni alerte de budget.
- Les **échéances ne sont PAS des dépenses** (elles n'entrent pas dans le net, pour éviter un double comptage avec le ROI).
- Fréquences : 1, 2, 3, 6 ou 12 mois.
- `fonds_disponibles = somme(net depuis la dernière échéance payée) + report`.
- `prevision = fonds_disponibles + net_moyen_par_jour x jours_restants_avant_echeance`.
- Alerte « à découvert » si `prevision < montant de l'échéance`.

### Coût, ROI, amortissement
- `cout_total` = `prix_achat` (payé) ; `apport_initial + nb_echeances x echeance_montant` (crédit).
- `net_cumule = somme(net_du_jour depuis date_service)`.
- `reste_a_recuperer = cout_total - net_cumule`.
- `net_mensuel_moyen` = moyenne des 3 derniers mois (ou depuis le début s'il y en a moins).
- `mois_restants = reste_a_recuperer / net_mensuel_moyen` ; si `net_mensuel_moyen <= 0` : afficher « Pas encore rentable ».
- `seuil_vente_sans_perte = reste_a_recuperer` (si > 0).
- **Tout est affiché en phrases simples**, pas en tableaux complexes. Exemples :
  - « Tu as récupéré 8 200 000 Ar sur 12 000 000 Ar. »
  - « Au rythme actuel, ce tuk-tuk sera rentabilisé dans environ 9 mois. »
  - « Si tu le vends maintenant, il faut au moins 3 800 000 Ar pour ne pas perdre d'argent. »

### Entretien
- Chaque entretien a une fréquence en jours et un rappel (3 jours avant par défaut). Le bouton « Fait » crée une **dépense** (le montant est demandé), met à jour la dernière date et **reprogramme** le suivant.

---

## 7. Essai, activation et sécurité

Détail complet : `docs/i-tantana-securite-activation.md`. Points impératifs :

- **Essai gratuit de 15 jours**, puis **verrouillage total** de l'app.
- **Code d'installation** : 7 chiffres aléatoires (`expo-crypto`), généré **une seule fois**, stocké dans SQLite **et** `expo-secure-store`. Il ne change jamais.
- **Clé d'activation** au format `T{limite_tuktuk}C{limite_cyclos}-{10 chiffres}`, par exemple `T3C7-4829105736`.
- **Calcul** : `HMAC-SHA256(SECRET, "v1|" + code + "|T" + tuk + "C" + cyclo)`, 5 premiers octets lus comme un entier, modulo `10 000 000 000`, rempli à 10 chiffres avec des zéros.
- **Vérification** à **chaque lancement** (on stocke la **clé**, pas un simple booléen « activé »).
- **Limites** : l'ajout d'un véhicule est refusé au-delà de la limite de son type ; les véhicules en trop (les plus récents d'abord) passent en **lecture seule verrouillée**, **sans suppression de données**.
- **Anti-recul de date** : mémoriser la date la plus récente jamais vue ; si la date actuelle est plus ancienne, verrouiller.
- **Anti-brute-force** : après 5 clés fausses, délai d'attente croissant.
- **Liaison à l'appareil** : identifiant via `expo-application` ; s'il change, reverrouiller.
- **Prix** (paiement unique, MVola) : tuk-tuk 20 000 / 40 000 / 60 000 Ar ; cyclos 10 000 / 20 000 / 30 000 Ar ; les deux 25 000 / 45 000 / 70 000 Ar pour les paliers 1 à 3 (1-3, 4-7, 8-10 véhicules). Règle : `prix = min(somme des prix séparés, tarif combiné du palier max)`. Au-delà de 10 véhicules : sur devis.
- L'**algorithme de clé** (`src/domain/activation.ts`) et le **calcul de prix** (`src/domain/prix.ts`) sont **partagés** avec l'outil `tools/keygen/` : une seule version du code.

### Règles de secret (CRITIQUE)
- **Ne jamais écrire le vrai secret** dans le code versionné, les tests, les commentaires, les docs, les prompts, les journaux ou les messages de commit.
- Dans les tests, utiliser un **secret de test** évident (par exemple `"SECRET_DE_TEST_UNIQUEMENT"`).
- Le vrai secret est injecté **au moment du build** (variable d'environnement) et **découpé en plusieurs morceaux** dans le code.
- L'outil `tools/keygen/` lit le secret depuis une **variable d'environnement**. Son registre (`*.csv`) est dans le `.gitignore`.
- Si tu as besoin du secret pour avancer, **demande-moi** et utilise un secret de test en attendant.

---

## 8. Interface et expérience utilisateur

- **Très simple** : l'utilisateur est peu habitué au numérique. Peu de champs, **2 ou 3 boutons par action**, vocabulaire courant.
- **Gros boutons** (zone tactile d'au moins 48 px) et **gros textes** (16 sp minimum, titres plus grands).
- **Contraste élevé** (lisible en plein soleil). Net négatif en **rouge**, positif en **vert**, avec aussi un signe (+ ou −) pour ne pas dépendre de la couleur seule.
- **Saisie d'une dépense en moins de 10 secondes** : montant, motif prédéfini, valider.
- Pas d'animations lourdes, pas d'images volumineuses.
- **Tout texte affiché passe par i18n** (`fr.json` et `mg.json`). Jamais de texte en dur dans un écran. Lorsque tu ajoutes une clé en français, ajoute la même clé en malgache (traduction provisoire) et note-la dans `docs/a-traduire.md`.
- États **vide** (aucun véhicule), **chargement** et **erreur** gérés pour chaque écran.
- Les alertes (échéance, découvert, entretien) sont **aussi affichées en bandeau à l'ouverture de l'app**, pas seulement en notification.

---

## 9. Performance et poids

- Cible : APK d'environ 25 à 35 Mo, démarrage rapide sur un **téléphone Android d'entrée de gamme** (2 Go de RAM).
- Pas de bibliothèque lourde ; pas de gros fichiers dans l'app.
- Index SQL sur `(vehicule_id, date)` ; listes paginées si l'historique grossit.
- Pas de calculs lourds sur le thread d'affichage ; agréger en SQL quand c'est possible.

---

## 10. Git, tests et « définition de terminé »

- **Un commit par étape qui marche**, avec un message clair, par exemple `feat: jours automatiques et dépenses`, `fix: report du déficit`, `test: cas du dimanche`.
- Ne committe **jamais** : secrets, `.env`, registre de ventes (`*.csv`), clés de signature, `node_modules`.
- Une tâche est **terminée** quand :
  1. `npx tsc --noEmit` ne signale aucune erreur ;
  2. `npm test` est entièrement vert ;
  3. le comportement demandé est vérifié (ou les étapes de test manuel sont données) ;
  4. les textes sont en i18n (fr et mg) ;
  5. aucune règle des sections 3 à 9 n'est violée ;
  6. tu as expliqué ce que tu as fait, en français simple.

---

## 11. Bibliothèque de prompts (pour Ronan)

> Copie-colle ces prompts dans Codex. Remplace ce qui est entre `[crochets]`.

### 11.1 Démarrer une étape
```
Lis AGENTS.md et docs/i-tantana-fiche-realisation.md.
Nous faisons l'étape [numéro et titre]. Donne d'abord un plan court (5 lignes max),
puis implémente. Respecte toutes les règles d'AGENTS.md.
À la fin : lance npx tsc --noEmit et npm test, et explique-moi ce que tu as fait.
```

### 11.2 Écrire un calcul métier (tests d'abord)
```
Dans src/domain/[fichier].ts, écris d'abord les tests Jest puis la fonction pure [nom].
Règle métier : [décris la règle ou cite la section d'AGENTS.md].
Cas à tester : [cas normal], [cas limite], [cas négatif ou vide].
Montants en entiers, dates en YYYY-MM-DD passées en paramètre (pas d'accès à l'heure système).
Montre-moi les cas de test en français avant d'implémenter.
```

### 11.3 Créer un écran
```
Crée l'écran [nom] dans app/[chemin].tsx. Il doit [description].
Respecte la section 8 d'AGENTS.md (gros boutons, textes en i18n fr et mg, états vide/chargement/erreur).
Aucun SQL ni calcul dans l'écran : utilise un hook ou un dépôt. Explique la structure du composant.
```

### 11.4 Ajouter une table ou une colonne
```
Ajoute [table ou colonne] avec une migration additive numérotée (PRAGMA user_version).
Ne supprime ni ne recrée aucune table existante. Mets à jour les types TypeScript et le dépôt concerné,
et ajoute un test de migration à partir de la version précédente de la base.
```

### 11.5 Expliquer du code (apprentissage)
```
Explique-moi en français, simplement et ligne par ligne, ce que fait [fichier ou fonction].
Donne un exemple concret avec des valeurs (par exemple un tuk-tuk à 25 000 Ar de versement).
Dis-moi quels concepts React, TypeScript ou Expo je dois retenir ici.
```

### 11.6 Corriger un bug
```
Problème observé : [ce que je vois]. Comportement attendu : [ce qui devrait se passer].
Trouve la cause racine (pas un contournement), propose la correction la plus simple,
ajoute un test qui échoue avant la correction et passe après, puis explique-moi la cause.
Ne modifie rien d'autre.
```

### 11.7 Relire avant commit
```
Relis mes changements (git diff) comme un relecteur exigeant. Vérifie :
règles d'AGENTS.md, erreurs TypeScript, calculs d'argent, dates et fuseau, textes sans i18n,
requêtes SQL non paramétrées, secret ou donnée sensible dans le code.
Liste les problèmes par gravité, sans rien modifier tant que je n'ai pas validé.
```

### 11.8 Vérifier un calcul à la main
```
Prends ce cas : [données]. Calcule à la main, étape par étape, le net du jour, le cumul du mois,
le report, le ROI et la phrase affichée. Compare avec ce que renvoie notre code et signale tout écart.
```

### 11.9 Tester l'activation
```
Parcours la liste de tests de la section 12 de docs/i-tantana-securite-activation.md.
Pour chaque cas, dis s'il est couvert par un test automatique, sinon écris le test, ou donne la procédure
de test manuel sur téléphone. N'utilise qu'un secret de test.
```

### 11.10 Préparer un build
```
Vérifie la configuration de build : nom de l'app i-Tantana, nom de paquet fixe, android.allowBackup false,
versionCode incrémenté, profil eas preview en APK. Liste ce qui manque et explique chaque réglage.
Ne mets aucun secret dans les fichiers de configuration versionnés.
```

### 11.11 Revenir en arrière proprement
```
Mon dernier changement a cassé [quoi]. Montre-moi avec git log et git diff ce qui a changé,
propose comment annuler seulement la partie fautive, et n'exécute aucune commande destructrice
sans mon accord explicite.
```

### 11.12 Revue de simplicité
```
Relis [fichier ou dossier] et propose des simplifications pour un débutant : noms plus clairs,
fonctions plus courtes, commentaires utiles. Ne change pas le comportement ; garde tous les tests verts.
```

---

## 12. Plan des étapes (rappel)

| # | Étape |
|---|---|
| 0 | Projet Expo, fiches et AGENTS.md |
| 1 | Squelette, navigation, thème |
| 2 | SQLite, migrations, dépôt véhicules |
| 3 | Calculs du quotidien (domaine + tests) |
| 4 | Écrans véhicules (espaces séparés, payé ou crédit) |
| 5 | Jours automatiques, dépenses, jours sans versement |
| 6 | Mois, report, archives |
| 7 | Facilités et alerte budget |
| 8 | Entretiens et notifications |
| 9 | ROI, phrases, dashboard |
| 10 | i18n fr/mg |
| 11 | Essai et activation par paliers |
| 12 | Générateur de clés |
| 13 | Export et sauvegarde |
| 14 | Build APK et distribution Google Drive |
| 15 | Test terrain de 15 jours |
| 16 | Version 1.0 |

Le détail de chaque étape (objectif, prompt, vérification, commit) est dans `docs/i-tantana-fiche-realisation.md`.

Lire aussi `agents-2.md` à la racine : ses règles complètent ce fichier et prévalent en cas de conflit.
