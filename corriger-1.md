# i-Tantana : corrections et précisions métier

Ce document complète `AGENTS.md` et `agents-2.md`. Il tranche les ambiguïtés relevées dans ces documents. En cas de conflit sur les sujets ci-dessous, appliquer les règles de ce document.

## 1. Seuil du calcul de rentabilité

- La prévision de rentabilité est disponible à partir de **14 jours complets de suivi**.
- La fenêtre se termine hier. Le jour courant ne compte jamais parmi les jours complets.
- Avec **moins de 14 jours complets**, afficher `roi.pas_assez_donnees`.
- Dès que 14 jours complets sont disponibles, calculer la prévision normalement.
- Remplacer partout la formulation « 14 jours ou moins » par « moins de 14 jours ».

## 2. Changement de la date de début du suivi

- Les données déjà enregistrées ne sont jamais supprimées automatiquement à la suite d'une modification de `date_service`.
- Si la nouvelle date est antérieure à la date actuelle, l'accepter et générer les jours manquants comme estimés.
- Si la nouvelle date est postérieure à la date actuelle et qu'il existe **un jour ou une dépense avant cette date**, refuser la modification et expliquer que des données existent déjà avant la date choisie. L'utilisateur peut corriger les données concernées avant de réessayer.
- Si aucune donnée n'existe avant la nouvelle date, accepter la modification sans supprimer de ligne.
- Cette règle respecte l'interdiction de supprimer des données client dans `AGENTS.md`.

## 3. Report entre mois

- Un mois est clôturé explicitement par l'utilisateur. À la clôture, calculer et enregistrer le résultat du mois et son `report_sortant` dans une transaction.
- Le report entrant d'un mois est le `report_sortant` du mois précédent clôturé pour le même véhicule ; en l'absence de mois précédent clôturé, il vaut zéro.
- Un mois non clôturé ne crée pas de report entrant. Son cumul provisoire est son résultat courant, auquel s'ajoute le report entrant enregistré à son ouverture.
- Le premier mois partiel applique ces mêmes règles : seuls les jours à partir de `date_service` entrent dans son résultat.
- La clôture d'un mois ne ferme pas les mois suivants et ne modifie pas les jours ou dépenses archivés.

## 4. Calendrier des échéances

- `nb_echeances` représente le nombre total d'échéances du contrat, **déjà payées avant le suivi comprises**.
- `echeances_deja_payees` doit être compris entre zéro et `nb_echeances` inclus.
- `echeance_prochaine` est la date de la première échéance **non encore payée**. Les échéances payées avant le suivi sont reconstruites en reculant depuis cette date ; la prochaine échéance et les suivantes avancent depuis elle.
- Créer exactement `nb_echeances` lignes au total : `echeances_deja_payees` anciennes lignes au statut `payee`, puis les échéances restantes à partir de `echeance_prochaine`. Les lignes historiques ont `date_paiement = NULL`.
- Pour ajouter ou soustraire des mois, conserver le numéro du jour si celui-ci existe. Sinon, utiliser le dernier jour du mois cible. Exemple : une échéance du 31 janvier suivie d'une échéance mensuelle tombe le dernier jour de février.
- Si `echeances_deja_payees = nb_echeances`, il ne reste aucune échéance à programmer ni à signaler.

## 5. Décompte des périodes de dates

- Les durées sont calculées en **jours calendaires inclusifs**, dans le fuseau local de Madagascar, UTC+3.
- `date_service` est incluse dans le suivi. Aujourd'hui est exclu des calculs basés sur des jours complets.
- La limite de 12 mois est évaluée par comparaison de dates calendaires : une date est « au-delà de 12 mois » si elle est antérieure à la date obtenue en reculant exactement 12 mois calendaires depuis aujourd'hui. Si le jour correspondant n'existe pas, prendre le dernier jour du mois cible.
- Le nombre de jours estimés annoncé à l'utilisateur est le nombre exact de dates qui seront créées, de `date_service` à hier inclus. Aujourd'hui n'est pas inclus dans cette confirmation.
- Pour un `date_service` futur autorisé (au plus 30 jours après aujourd'hui), ne générer aucun jour avant cette date. La génération commence lorsque la date de début est atteinte.
