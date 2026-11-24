# Fiche technique et de réalisation
## i-Tantana : app de gestion Tuk-tuk & Cyclos pousse

Version : 1.0 (cahier des charges) | Auteur : Ronan | Contexte : Moramanga, Tamatave, Brickaville...

---

## 1. Résumé

Application mobile **offline**, **légère** et **très simple** qui permet à un propriétaire de tuk-tuk ou de cyclos pousse de connaître son **résultat net**, son **ROI** et de ne jamais rater une **échéance** ou un **entretien**.

Idée centrale : le versement journalier est quasi fixe, donc l'entrée d'argent est **générée automatiquement**. Le propriétaire ne note que les **exceptions** (dépenses, jours sans versement).

**Utilisateurs cibles** : propriétaires de 1 à ~20 véhicules, peu habitués aux outils numériques, téléphone Android d'entrée de gamme, réseau irrégulier.

---

## 2. Principes de conception

| Principe | Application |
|---|---|
| Offline-first | Tout fonctionne sans internet. Aucune connexion requise, jamais. |
| Léger | Cible : moins de 500 Ko de JS+CSS compressé, aucune librairie lourde. |
| Simple | 2-3 boutons par action, gros textes, pas de tableaux complexes (phrases). |
| Langues | Français et malgache (fichiers de traduction JSON). |
| Monnaie | Ariary en **entiers** (pas de décimales). |
| Dates | ISO `YYYY-MM-DD`, fuseau Indian/Antananarivo (UTC+3, pas d'heure d'été). |
| Matériel visé | Android 8+, écran 360 px de large, 2 Go de RAM. |

---

## 3. Choix techniques recommandés

- **Front** : web app en HTML/CSS/JS avec un framework très léger (Preact ou Svelte) ou JS natif.
- **Stockage local** : IndexedDB via Dexie (~20 Ko). Les montants sont stockés en entiers.
- **Offline** : Service Worker qui met en cache tous les fichiers de l'app.
- **Installation** : PWA installable depuis le navigateur, ou **APK** emballé avec Capacitor (recommandé pour la distribution et les notifications).
- **Notifications** : un site web ne peut pas programmer de rappels fiables hors ligne. Avec Capacitor, utiliser les **notifications locales**. Dans tous les cas, afficher aussi les alertes **à l'ouverture de l'app** (bandeau rouge/orange).
- **Aucun serveur** : pas de base de données distante, pas de compte utilisateur.

### Génération des entrées sans serveur
Pas de tâche planifiée possible. À **chaque ouverture**, l'app génère les jours manquants entre la dernière ouverture et aujourd'hui avec le versement standard. Le propriétaire peut ensuite corriger un jour passé (panne, absence...).

---

## 4. Modèle de données

### `vehicule`
| Champ | Description |
|---|---|
| id, type | `tuktuk` ou `cyclo` |
| nom | ex. « Tuk-tuk 1 » |
| prix_achat | entier, Ar |
| mode_achat | `paye` ou `credit` |
| apport_initial | si crédit |
| echeance_montant | si crédit |
| echeance_frequence | 1, 2, 3, 6 ou 12 mois |
| echeance_prochaine | date |
| nb_echeances | total prévu |
| versement_semaine | Ar (lundi-samedi) |
| versement_dimanche | Ar |
| date_service | début du suivi |
| actif | booléen |

### `jour`
`vehicule_id`, `date`, `entree` (Ar), `motif_entree` (`normal`, `panne`, `chauffeur_absent`, `fourriere`, `autre`), `note`.

### `depense`
`id`, `vehicule_id`, `date`, `montant`, `motif`, `note`.

### `echeance`
`id`, `vehicule_id`, `date_prevue`, `montant`, `statut` (`a_payer` / `payee`), `date_paiement`.

### `entretien`
`id`, `vehicule_id`, `libelle` (vidange, graisse, pneus...), `frequence_jours`, `derniere_date`, `prochaine_date`, `rappel_jours_avant` (défaut 3).

### `mois_cloture`
`vehicule_id`, `mois` (`YYYY-MM`), `total_entrees`, `total_depenses`, `net`, `report_sortant`.

### `parametres`
`langue`, `code_installation`, `date_installation`, `derniere_ouverture`, `cle_activation`, `id_appareil`.

---

## 5. Règles de calcul

### Net du jour
```
entree_du_jour = versement_semaine (lun-sam) ou versement_dimanche
                 (ou 0 / montant partiel si motif d'exception)
net_du_jour    = entree_du_jour - somme(depenses du jour)
```
Le net du jour **peut être négatif** : il se déduit du cumul du mois.

### Cumul du mois et report du déficit
```
cumul_mois = report_entrant + somme(net_du_jour du mois)
report_sortant = cumul_mois si cumul_mois < 0, sinon 0
```
Le déficit signifie que le propriétaire a sorti de l'argent de sa poche : il est **reporté** sur le mois suivant (ligne « Report du mois précédent »). L'excédent, lui, ne se reporte pas.

### Les échéances ne sont PAS des dépenses
Pour éviter un double comptage, les échéances de facilité ne sont pas déduites du net. Elles servent au calcul du coût total et du ROI.

### Coût total engagé
```
si paye   : cout_total = prix_achat
si credit : cout_total = apport_initial + (nb_echeances x echeance_montant)
```

### ROI et amortissement (affichés en phrases)
```
net_cumule      = somme(net_du_jour depuis date_service)
reste_a_recuperer = cout_total - net_cumule
net_mensuel_moyen = moyenne des 3 derniers mois (ou depuis le debut si moins)
mois_restants   = reste_a_recuperer / net_mensuel_moyen
seuil_vente_sans_perte = reste_a_recuperer (si > 0)
```
Si `net_mensuel_moyen <= 0` : afficher « Pas encore rentable ».

Phrases types :
- « Tu as récupéré 8 200 000 Ar sur 12 000 000 Ar. »
- « Au rythme actuel, ce tuk-tuk sera rentabilisé dans environ 9 mois. »
- « Si tu le vends maintenant, il faut au moins 3 800 000 Ar pour ne pas perdre d'argent. »
- « La facilité sera entièrement remboursée le 15/04/2028. »

### Alerte « budget à découvert » (crédit seulement)
```
fonds_disponibles = somme(net depuis la derniere echeance payee) + report
prevision = fonds_disponibles + net_moyen_par_jour x jours_restants_avant_echeance
si prevision < echeance_montant -> alerte "A decouvert"
```

---

## 6. Écrans

1. **Accueil / Dashboard** : net du jour, du mois, de l'année, total flotte, classement des véhicules, alertes en haut.
2. **Choix de l'espace** : Tuk-tuk / Cyclos pousse (séparés).
3. **Liste des véhicules** de l'espace.
4. **Fiche véhicule** : infos, net du mois, phrases ROI, entretiens, échéances.
5. **Ajout / modification d'un véhicule** : question « payé ou à crédit ? » puis champs adaptés.
6. **Saisie du jour** : bouton « Ajouter une dépense » (montant + motif), bouton « Pas de versement » (motifs prêts : panne, chauffeur absent, fourrière, autre).
7. **Mois en cours** : liste jour par jour, cumul, report.
8. **Historique** : mois archivés, consultables en tableau (date, entrée, dépense, motif, net) avec export.
9. **Entretiens** : liste, bouton « Fait » (crée la dépense et reprogramme).
10. **Échéances** : liste, bouton « Payée ».
11. **Paramètres** : langue, sauvegarde/restauration, activation.
12. **Activation** : voir section 8.

---

## 7. Alertes

| Alerte | Quand | Véhicules |
|---|---|---|
| Échéance proche | J-3 et jour J | Crédit seulement |
| Budget à découvert | Prévision < échéance | Crédit seulement |
| Entretien à faire | Rappel avant `prochaine_date` | Tous |
| Dépense > versement | Net du jour négatif (affichage rouge) | Tous |
| Fin d'essai | J-3 avant la fin | Tous |

---

## 8. Activation et sécurité

### Principe
- **Essai gratuit de 15 jours**, pour créer l'habitude.
- À la fin : **verrouillage total** de l'app, avec un écran affichant un **code d'installation à 7 chiffres** et un champ pour entrer la **clé d'activation**.
- Le client t'appelle, te donne son code, paie **20 000 Ar par MVola**, puis tu calcules la clé et tu l'envoies par message.

### Règles de base
- Le code d'installation est généré **une seule fois** (au premier lancement), puis **stocké** de façon persistante. Il ne change pas à chaque ouverture.
- La clé est **enregistrée** et **revérifiée à chaque lancement**, pas seulement un booléen « activé = vrai » qu'on pourrait modifier.

### Trois niveaux de sécurité

| Niveau | Clé | Résistance |
|---|---|---|
| 1 (ton idée) | `code + 75981` | Faible : avec **une seule paire** (code, clé), une soustraction donne ton nombre secret. |
| 2 (recommandé au départ) | `HMAC-SHA256(secret, code)` tronqué à 10 chiffres | Bonne : voir une paire ne révèle pas le secret. Le secret est caché dans le code de l'app (obfusqué). |
| 3 (si l'app se diffuse) | Signature **Ed25519** du code | Très bonne : l'app ne contient que la clé **publique** ; impossible de fabriquer une clé sans ta clé privée, même en lisant le code de l'app. Clé longue, mais elle se colle depuis le message. Librairie : tweetnacl (~7 Ko). |

### Ton scénario Xender
Si quelqu'un envoie l'app à un ami par Xender :
- L'ami installe une **copie vierge** : elle génère **son propre code** (1 chance sur 10 millions d'être identique).
- La clé de l'ami A ne fonctionne donc **pas** chez l'ami B, car la clé est liée au code d'installation.
- L'ami B doit t'appeler pour obtenir sa propre clé : tu le sais, et tu peux lui faire payer.
- Seule la version niveau 1 est fragile : si A et B comparent leurs paires, ils déduisent le secret. D'où le niveau 2 ou 3.

### Autres contournements possibles et réponses

| Risque | Réponse |
|---|---|
| Copie des données d'une app déjà activée (sauvegarde Android restaurée sur un autre téléphone) | Désactiver `allowBackup`. Avec Capacitor, lier l'activation à l'identifiant de l'appareil et reverrouiller si différent. |
| Désinstaller / effacer les données pour refaire l'essai | Impossible à empêcher à 100 % hors ligne. Mais il perd tout son historique : après quelques semaines de vraies données, personne ne veut repartir de zéro. |
| Reculer la date du téléphone pour prolonger l'essai | Stocker la date la plus récente jamais vue ; si la date actuelle est plus ancienne, verrouiller. |
| Modifier la valeur « activé » dans le stockage | Stocker la clé et la revérifier à chaque lancement. |
| Lecture du code de l'app (reverse engineering) | Niveau 3 (signature) : même lu, le code ne permet pas de générer des clés. |

### Outil côté administrateur (toi)
Petit **générateur de clés** (page HTML locale ou app séparée, hors ligne) :
- tu entres le code à 7 chiffres du client, il sort la clé,
- il garde un **registre** (code, client, date, nombre de véhicules, tarif),
- il détecte les demandes en double.

### Décision
Après l'essai, l'app est **entièrement verrouillée** (pas de mode lecture ni d'export tant que la clé n'est pas entrée). Les données restent sur le téléphone et réapparaissent dès l'activation.

---

## 9. Sauvegarde et données

L'app étant 100 % locale, le risque principal est la **perte du téléphone**. Prévoir :
- **Export** JSON complet (sauvegarde) et **import** (restauration).
- **Export** du tableau mensuel en PDF ou Excel/CSV.
- Rappel mensuel : « Pense à sauvegarder tes données ».
- Partage du fichier via WhatsApp, Messenger ou Xender.

---

## 10. Plan de réalisation

Toutes les fonctions sont livrées dans la première version, mais construites dans cet ordre :

- [ ] **Étape 1 : Socle** : projet, PWA/Service Worker, IndexedDB, traductions FR/MG, navigation.
- [ ] **Étape 2 : Véhicules** : espaces séparés, ajout/modification, question payé/crédit.
- [ ] **Étape 3 : Quotidien** : génération automatique des entrées, dépenses avec motifs, jours sans versement, net du jour.
- [ ] **Étape 4 : Mois** : cumul, report du déficit, clôture, archives en tableau.
- [ ] **Étape 5 : Facilités** : échéances, alertes d'échéance et de budget à découvert.
- [ ] **Étape 6 : Entretien** : récurrences, rappels, bouton « Fait ».
- [ ] **Étape 7 : ROI** : phrases d'amortissement, seuil de vente, dashboard et classement.
- [ ] **Étape 8 : Activation** : essai, code, clé (niveau 2), outil générateur.
- [ ] **Étape 9 : Sauvegarde** : export/import, PDF/CSV.
- [ ] **Étape 10 : Test terrain** : utilisation réelle avec les 2 tuk-tuk et 5 cyclos de la famille pendant au moins 15 jours.
- [ ] **Étape 11 : Corrections et diffusion** : retours, ajustements, première distribution.

---

## 11. Critères de validation

- [ ] L'app s'ouvre et fonctionne **sans aucune connexion**.
- [ ] Saisir une dépense prend **moins de 10 secondes**.
- [ ] Les jours manquants sont générés correctement après plusieurs jours sans ouverture.
- [ ] Un net négatif est bien déduit du cumul, et le déficit est reporté au mois suivant.
- [ ] Un véhicule « payé » n'affiche **aucune** option ni alerte de facilité.
- [ ] Les phrases de ROI et le seuil de vente correspondent à un calcul fait à la main.
- [ ] Les alertes d'entretien et d'échéance apparaissent aux bonnes dates.
- [ ] Une clé d'activation ne fonctionne que sur l'appareil dont elle vient du code.
- [ ] L'export puis l'import restaurent exactement les mêmes données.
- [ ] L'app reste fluide sur un téléphone Android d'entrée de gamme.

---

## 12. Décisions validées

| Sujet | Décision |
|---|---|
| Nom de l'app | **i-Tantana** |
| Versements par défaut | Saisis par le propriétaire pour chaque véhicule (aucune valeur imposée) |
| Durée d'essai | **15 jours** |
| Après l'essai | **Verrouillage total** |
| Prix d'activation | **20 000 Ar** |
| Paiement | **MVola** |
| Sécurité d'activation (version 1) | **Niveau 2** : HMAC tronqué à 10 chiffres, avec évolution possible vers le niveau 3 (signature Ed25519) si l'app se diffuse |

### Reste à faire
- Identité visuelle (logo, couleurs) pour i-Tantana.
- Textes en malgache (traduction et relecture).
- Procédure d'encaissement : le client paie par MVola, tu vérifies le paiement, puis tu envoies la clé.
