# i-Tantana : consignes complémentaires pour Codex (agents-2.md)

> **Place ce fichier à la racine du projet**, à côté de `AGENTS.md`.
> Il **complète** `AGENTS.md`. **En cas de conflit, ce fichier prévaut.**
> Codex ne lit automatiquement que `AGENTS.md` : ajoute cette ligne à la fin de `AGENTS.md` :
>
> `Lire aussi agents-2.md à la racine : ses règles complètent ce fichier et prévalent en cas de conflit.`

Les règles ci-dessous viennent de l'analyse de l'idée et de tes décisions : jours estimés à confirmer, deux chiffres de résultat, règles de ROI plus précises, date de début de suivi, échéances déjà payées.

---

## 0. Documents de référence (nettoyage)

- La **fiche fonctionnelle de référence** est la version la plus récente (`fiche-technique-app-tuktuk-cyclo.md` mise à jour). **Ne pas utiliser** d'ancienne copie (par exemple `...(1).md` ou une version qui parle de PWA, d'IndexedDB, de Capacitor ou de 20 véhicules).
- **Limites officielles** : jusqu'à **10 véhicules par type** (au-delà : sur devis, via la clé).
- **Stack officielle** : React Native + Expo + TypeScript + SQLite (voir `AGENTS.md`). Ignorer toute mention contraire dans les anciens documents.
- En cas de doute entre deux documents, **demande-moi** (une seule question précise).

---

## 1. Date de début de suivi

### Principe
À l'ajout d'un véhicule, le propriétaire indique **depuis quand il le suit dans l'app**. Le suivi et le premier mois **commencent à cette date**.

Exemple : s'il installe l'app et commence le suivi le **15/02**, le premier mois va du 15/02 à la fin du mois.

### Champ
- Colonne existante `vehicule.date_service` (texte `YYYY-MM-DD`), désormais **saisie par l'utilisateur**.
- Libellé : « **Depuis quand suis-tu ce véhicule dans l'app ?** » (clé i18n dédiée, fr et mg).
- Sélecteur de date, affichage `JJ/MM/AAAA`, **valeur par défaut : aujourd'hui**.

### Règles
1. **Génération des jours** : uniquement **à partir de `date_service`**, jamais avant.
2. **Date dans le passé** : les jours sont créés jusqu'à aujourd'hui, tous **estimés** (voir section 2).
3. **Limite** : au-delà de **12 mois dans le passé**, demander une confirmation explicite en indiquant le nombre de jours qui seront créés (« Cela va créer 400 jours estimés »). En dessous, pas de confirmation.
4. **Date dans le futur** : autorisée jusqu'à **30 jours** ; aucun jour n'est généré avant cette date. Au-delà : refuser avec un message clair.
5. **Modification de la date** :
   - vers une date **plus ancienne** : ajouter les jours manquants (estimés) ;
   - vers une date **plus récente** : demander confirmation ; ne supprimer que les jours **sans dépense** ; s'il existe des dépenses avant la nouvelle date, **refuser** et expliquer pourquoi.
6. **Premier mois partiel** : le cumul du premier mois ne compte que les jours depuis `date_service`. L'écran affiche « **du 15/02 au 28/02** ». Dans `mois_cloture`, ce mois est marqué `partiel = 1`.
7. **ROI** : tous les cumuls (`net_cumule`) partent de `date_service`.

### Fonctions de domaine (avec tests)
- `premierJourDeSuivi(dateService, aujourdhui)`
- `joursAGenerer(dateService, derniereDateGeneree, aujourdhui)`
- `periodeDuMois(mois, dateService)` : renvoie début et fin réels (mois partiel)
- `estMoisPartiel(mois, dateService)`
- `validerDateDebut(dateService, aujourdhui)` : renvoie `ok`, `confirmationRequise` (avec nombre de jours) ou `refuse`

---

## 2. Jours estimés et jours confirmés

### Pourquoi
Les entrées sont **générées automatiquement** avec le versement standard. Tant que le propriétaire n'a pas vérifié, ces jours sont des **estimations** : une panne ou une absence oubliée rend le résultat trop optimiste.

### Données
- Nouvelle colonne **`jour.confirme`** : `INTEGER NOT NULL DEFAULT 0 CHECK (confirme IN (0,1))`.
- Jour généré automatiquement : `confirme = 0`.
- `confirme` passe à `1` **seulement** quand le propriétaire :
  - valide explicitement le jour ;
  - modifie l'entrée ou le motif du jour (y compris « Pas de versement » ou versement partiel) ;
  - utilise le bouton « Tout s'est passé normalement ».
- **Ajouter une dépense ne confirme pas** l'entrée du jour (une dépense ne prouve pas que le versement a été reçu).

### Comportement
- Les jours estimés **comptent** dans les calculs (c'est la meilleure estimation disponible), mais l'interface les signale.
- Le **jour en cours n'est jamais confirmable** avant la fin de la journée (il est généré à l'ouverture).
- **Badge** « à confirmer » sur chaque jour estimé (liste du mois, fiche véhicule).
- Bouton **« Tout s'est passé normalement »** : confirme d'un coup tous les jours estimés **avant aujourd'hui** du véhicule choisi, avec une confirmation (« Confirmer N jours ? »).
- Le dashboard et la fiche véhicule affichent sous le résultat : « **dont N jours à confirmer** » (masqué si N = 0).
- Tous les calculs de domaine renvoient aussi `nbJoursEstimes`.

### Fonctions de domaine (avec tests)
- `joursAConfirmer(jours, aujourdhui)`
- `confirmerJoursAvant(jours, aujourdhui)` (fonction pure qui renvoie la liste des jours à mettre à jour)
- `compterJoursEstimes(jours, periode)`

---

## 3. Deux chiffres : « Résultat » et « Reste après échéances »

### Pourquoi
Le « net » ne doit pas être compris comme l'argent réellement disponible. On sépare les deux notions avec des **mots du quotidien**.

| Chiffre | Définition | Affiché pour |
|---|---|---|
| **Résultat du véhicule** | `somme(entrées) - somme(dépenses)` sur la période | Tous les véhicules |
| **Reste après échéances** | `Résultat - somme(échéances payées sur la période)` | **Véhicules à crédit seulement** |

### Règles
- Le mot « net » **ne s'affiche plus** à l'écran : utiliser « Résultat » et « Reste après échéances » (clés i18n fr et mg).
- Texte d'aide court sous chaque chiffre (ex. fr) :
  - Résultat : « Ce que le véhicule a rapporté, moins ses dépenses. »
  - Reste après échéances : « Ce qu'il te reste après avoir payé les échéances. »
- **Période** : jour, mois, année ou depuis le début, selon l'écran.
- Les échéances comptées sont celles au statut `payee` dont la **`date_paiement` est dans la période**. Les échéances déjà payées **avant le suivi** (voir section 6, `date_paiement` inconnue) **ne sont pas** comptées.
- Un véhicule **payé** n'affiche **que** « Résultat ».
- **Inchangé** : les échéances ne sont **toujours pas** des dépenses ; le ROI et le report de déficit s'appuient sur le **Résultat**.

### Fonctions de domaine (avec tests)
- `resultatPeriode(entrees, depenses)`
- `resteApresEcheances(resultat, echeancesPayeesDansLaPeriode)`

---

## 4. Règles de ROI précisées

Ces règles **remplacent** la moyenne « des 3 derniers mois » de `AGENTS.md`.

### Moyenne du résultat
- Fenêtre : les **90 derniers jours complets** (jusqu'à **hier**, jamais aujourd'hui), ou **depuis `date_service`** si le suivi est plus court.
- `resultat_moyen_par_jour = somme(Résultat de la fenêtre) / nombre de jours de la fenêtre`
- `resultat_mensuel_estime = resultat_moyen_par_jour x 30`
- Les **jours sans activité** (panne, absence, fourrière) comptent avec une entrée à **0**, pour ne pas surestimer.

### Seuil de données
- Avec **moins de 14 jours** de suivi complets : ne pas calculer de prévision ; afficher « **Pas encore assez de données (il faut au moins 14 jours).** »

### Calculs
```
reste_a_recuperer = cout_total - resultat_cumule        (depuis date_service)
mois_restants     = arrondi_superieur(reste_a_recuperer / resultat_mensuel_estime)
```

### Cas particuliers (phrases)
| Cas | Phrase (fr) |
|---|---|
| `resultat_mensuel_estime <= 0` | « Pas encore rentable : ce véhicule ne rapporte pas assez pour récupérer son prix. » |
| `reste_a_recuperer <= 0` | « Ce véhicule a remboursé son prix. Il t'a rapporté X Ar de bénéfice depuis le début du suivi. » |
| `mois_restants > 120` | « Plus de 10 ans au rythme actuel. » |
| 14 jours ou moins | « Pas encore assez de données (il faut au moins 14 jours). » |
| Cas normal | « Au rythme actuel, ce véhicule sera rentabilisé dans environ N mois. » |

- **Seuil de vente sans perte** : `reste_a_recuperer` s'il est positif. S'il est négatif ou nul : « Tu peux vendre à n'importe quel prix sans perdre d'argent. »
- **Si des jours sont estimés** dans la fenêtre : ajouter « (estimation : N jours à confirmer) » aux phrases de ROI.
- **Arrondi** : les mois restants sont toujours arrondis **à l'entier supérieur** ; les montants en Ariary sont des **entiers** (arrondi à l'entier le plus proche pour la moyenne).

### Fonctions de domaine (avec tests)
- `fenetreDeCalcul(dateService, aujourdhui)`
- `resultatMoyenParJour(jours, depenses, fenetre)`
- `resultatMensuelEstime(...)`
- `moisRestants(resteARecuperer, resultatMensuelEstime)`
- `phraseRoi(...)` : renvoie une clé i18n et ses valeurs, pas du texte brut

---

## 5. Mois et report (compléments)

- Le **report de déficit** ne s'applique qu'à partir d'un mois **clôturé** ; il s'agit du **Résultat** (pas du « Reste après échéances »).
- Le **premier mois** d'un véhicule peut être **partiel** (section 1) ; le report est calculé normalement à partir de ses jours.
- À l'écran d'un mois, afficher l'**intervalle réel** de jours (« du 15/02 au 28/02 ») lorsqu'il est partiel.

---

## 6. Échéances déjà payées avant le suivi (véhicules à crédit)

### Champ
- Colonne **`vehicule.echeances_deja_payees`** : `INTEGER NOT NULL DEFAULT 0`.
- Libellé à l'ajout : « **Combien d'échéances as-tu déjà payées ?** » (affiché **uniquement** pour un véhicule à crédit).
- Doit être **inférieur ou égal** à `nb_echeances` (valider).

### Règles
1. Le calendrier d'échéances est construit **à rebours** depuis `echeance_prochaine` selon la fréquence.
2. Les `echeances_deja_payees` échéances les plus anciennes sont créées au statut **`payee`** avec **`date_paiement = NULL`** (date réelle inconnue).
3. Le calendrier **démarre à l'échéance suivante** : aucune alerte ni rappel pour les échéances déjà payées.
4. Le **coût total** inclut **toutes** les échéances prévues (déjà payées comprises) :
   `cout_total = apport_initial + nb_echeances x echeance_montant`
5. Les échéances à `date_paiement = NULL` **ne comptent pas** dans « Reste après échéances » (voir section 3).
6. Si `echeances_deja_payees = nb_echeances` : le véhicule est considéré comme **entièrement remboursé** ; ne plus afficher d'alerte de facilité.

### Fonctions de domaine (avec tests)
- `construireCalendrierEcheances(echeanceProchaine, frequenceMois, nbEcheances, dejaPayees)`
- `echeancesRestantes(calendrier)`

---

## 7. Migrations (additives uniquement)

Ajouter une **nouvelle version de migration** (`PRAGMA user_version`) avec ces changements, **sans supprimer ni recréer de table** :

```sql
ALTER TABLE jour ADD COLUMN confirme INTEGER NOT NULL DEFAULT 0 CHECK (confirme IN (0,1));
ALTER TABLE vehicule ADD COLUMN echeances_deja_payees INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mois_cloture ADD COLUMN partiel INTEGER NOT NULL DEFAULT 0;
```
- Pour les **données déjà présentes** (si la base existe déjà), mettre `jour.confirme = 1` : on ne présume pas qu'un jour ancien est estimé.
- Ajouter un **test de migration** depuis la version précédente.
- Mettre à jour les types TypeScript, les dépôts et `docs/i-tantana-fiche-technique-stack.md` (section 5).

---

## 8. Textes à ajouter en i18n (fr, avec traduction mg provisoire)

| Clé | Texte fr |
|---|---|
| `vehicule.depuis_quand` | Depuis quand suis-tu ce véhicule dans l'app ? |
| `vehicule.echeances_deja_payees` | Combien d'échéances as-tu déjà payées ? |
| `jour.a_confirmer` | À confirmer |
| `jour.tout_normal` | Tout s'est passé normalement |
| `jour.confirmer_n` | Confirmer {{n}} jours ? |
| `dashboard.dont_a_confirmer` | dont {{n}} jours à confirmer |
| `resultat.titre` | Résultat |
| `resultat.aide` | Ce que le véhicule a rapporté, moins ses dépenses. |
| `reste.titre` | Reste après échéances |
| `reste.aide` | Ce qu'il te reste après avoir payé les échéances. |
| `mois.partiel` | du {{debut}} au {{fin}} |
| `date.tres_ancienne` | Cela va créer {{n}} jours estimés. Continuer ? |
| `roi.pas_assez_donnees` | Pas encore assez de données (il faut au moins 14 jours). |
| `roi.pas_rentable` | Pas encore rentable : ce véhicule ne rapporte pas assez pour récupérer son prix. |
| `roi.rembourse` | Ce véhicule a remboursé son prix. Il t'a rapporté {{montant}} Ar de bénéfice depuis le début du suivi. |
| `roi.plus_de_10_ans` | Plus de 10 ans au rythme actuel. |
| `roi.mois_restants` | Au rythme actuel, ce véhicule sera rentabilisé dans environ {{n}} mois. |
| `roi.vente_sans_perte` | Si tu le vends maintenant, il faut au moins {{montant}} Ar pour ne pas perdre d'argent. |
| `roi.vente_libre` | Tu peux vendre à n'importe quel prix sans perdre d'argent. |

Rappel : toute nouvelle clé est ajoutée en **fr et mg** ; les traductions malgaches provisoires sont listées dans `docs/a-traduire.md`.

---

## 9. Tests à écrire

- [ ] Date de début dans le passé (< 12 mois) : jours générés depuis cette date, tous estimés.
- [ ] Date de début à plus de 12 mois : confirmation demandée avec le bon nombre de jours.
- [ ] Date de début dans le futur (≤ 30 jours) : aucun jour généré avant cette date ; > 30 jours refusée.
- [ ] Premier mois partiel : cumul uniquement depuis `date_service`, intervalle correct, `partiel = 1`.
- [ ] Modification de date plus récente : refusée s'il y a des dépenses avant la nouvelle date.
- [ ] Une dépense ajoutée ne confirme pas le jour ; la correction de l'entrée le confirme.
- [ ] Le jour en cours n'est pas confirmable ; « Tout s'est passé normalement » ne confirme que les jours passés.
- [ ] `nbJoursEstimes` correct dans le dashboard.
- [ ] « Résultat » = entrées − dépenses ; « Reste après échéances » = Résultat − échéances payées dans la période (crédit seulement).
- [ ] Les échéances à `date_paiement` nulle ne sont pas comptées dans « Reste après échéances ».
- [ ] ROI : moins de 14 jours -> « pas assez de données » ; résultat mensuel ≤ 0 -> « pas rentable » ; reste ≤ 0 -> « remboursé » avec bénéfice ; arrondi supérieur ; plus de 120 mois -> « plus de 10 ans ».
- [ ] Les jours sans versement comptent à 0 dans la moyenne.
- [ ] Calendrier à crédit : `echeances_deja_payees` créées en `payee`, la suivante correcte, coût total inchangé.
- [ ] Migration depuis la version précédente sans perte de données.

---

## 10. Impact sur les étapes de `docs/i-tantana-fiche-realisation.md`

| Étape | Ajouts |
|---|---|
| 2 (SQLite) | Migration de la section 7 ; champs `confirme`, `echeances_deja_payees`, `partiel` |
| 3 (calculs) | `resultatPeriode`, `resteApresEcheances`, fonctions de dates de la section 1 |
| 4 (écrans véhicules) | Champ « Depuis quand… », validation de la date, « échéances déjà payées » pour le crédit |
| 5 (jours et dépenses) | Colonne `confirme`, badge « à confirmer », bouton « Tout s'est passé normalement » |
| 6 (mois) | Premier mois partiel, affichage de l'intervalle, `partiel` dans l'archive |
| 7 (facilités) | Calendrier à rebours, échéances déjà payées, « Reste après échéances » |
| 9 (ROI et dashboard) | Règles de la section 4, deux chiffres, « dont N jours à confirmer » |
| 10 (i18n) | Clés de la section 8 |

---

## 11. Prompts prêts à l'emploi

### 11.1 Lire les nouvelles règles
```
Lis AGENTS.md puis agents-2.md (qui prévaut en cas de conflit). Fais-moi un résumé en 10 lignes des règles
qui changent par rapport à AGENTS.md, puis liste les fichiers de code qui seront touchés.
Ne modifie rien pour l'instant.
```

### 11.2 Migration
```
Applique la section 7 de agents-2.md : migration additive (colonnes confirme, echeances_deja_payees, partiel),
mise à jour des types TypeScript et des dépôts, et un test de migration depuis la version précédente.
Ne supprime ni ne recrée aucune table.
```

### 11.3 Date de début de suivi
```
Applique la section 1 de agents-2.md. Écris d'abord les tests Jest de validerDateDebut, joursAGenerer,
periodeDuMois et estMoisPartiel, puis les fonctions, puis le champ dans l'écran d'ajout et de modification
d'un véhicule (libellé "Depuis quand suis-tu ce véhicule dans l'app ?", défaut aujourd'hui, JJ/MM/AAAA).
Explique-moi chaque règle de validation en français simple.
```

### 11.4 Jours à confirmer
```
Applique la section 2 de agents-2.md : colonne confirme, badge "À confirmer", bouton "Tout s'est passé normalement"
avec confirmation, et la mention "dont N jours à confirmer" sur le dashboard et la fiche véhicule.
Écris d'abord les tests (une dépense ne confirme pas le jour ; le jour en cours n'est pas confirmable).
```

### 11.5 Deux chiffres
```
Applique la section 3 de agents-2.md. Remplace le mot "net" à l'écran par "Résultat" et, pour les véhicules
à crédit uniquement, ajoute "Reste après échéances". Écris les tests de resultatPeriode et resteApresEcheances
(dont le cas des échéances à date_paiement nulle) avant les écrans. Textes via i18n fr et mg.
```

### 11.6 ROI
```
Applique la section 4 de agents-2.md : fenêtre de 90 jours jusqu'à hier, moyenne par jour x 30,
seuil de 14 jours, arrondi supérieur, cas "pas rentable", "remboursé" et "plus de 10 ans".
Écris d'abord les tests pour tous les cas particuliers. Les phrases sont des clés i18n avec valeurs.
Montre-moi un exemple chiffré à la main pour vérifier (prix 12 000 000 Ar, résultat cumulé 8 200 000 Ar).
```

### 11.7 Échéances déjà payées
```
Applique la section 6 de agents-2.md : champ "Combien d'échéances as-tu déjà payées ?" pour les véhicules
à crédit, calendrier construit à rebours, échéances déjà payées créées au statut payee avec date_paiement NULL,
coût total inchangé. Écris d'abord les tests de construireCalendrierEcheances.
```

### 11.8 Revue finale
```
Relis mes changements (git diff) en vérifiant AGENTS.md et agents-2.md : le mot "net" n'apparaît plus à l'écran,
aucun calcul dans un écran, dates sans toISOString pour le local, textes en i18n fr et mg,
migrations additives, aucun secret. Liste les problèmes par gravité sans rien modifier.
```
