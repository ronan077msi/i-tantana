# i-Tantana : sécurité et activation par paliers

Version 1.0 | Niveau de sécurité : **niveau 2** (HMAC) | Évolution prévue : niveau 3 (Ed25519)

---

## 1. Objectif

Protéger la vente d'i-Tantana **sans connexion internet** :

1. empêcher qu'une copie de l'app (Xender, WhatsApp...) fonctionne sans paiement ;
2. faire respecter le **palier payé** (nombre de véhicules), même si le client ment au téléphone ;
3. garder le processus simple pour toi (un appel, un paiement MVola, un message) et pour le client.

---

## 2. Principe général

1. L'app s'utilise **15 jours** gratuitement.
2. Ensuite elle est **verrouillée totalement**.
3. L'écran de verrouillage affiche un **code d'installation** (7 chiffres) et un champ « clé d'activation ».
4. Le client te donne son code, paie par **MVola**, tu calcules une **clé** et tu l'envoies par message.
5. La clé contient le **palier acheté** (limites de véhicules). L'app lit ces limites et les **fait respecter**.

> Même si le client annonce un faux nombre de véhicules, il ne débloque que ce qu'il a payé.

---

## 3. Grille de prix

### Paliers
| Palier | Nombre de véhicules |
|---|---|
| 1 | 1 à 3 |
| 2 | 4 à 7 |
| 3 | 8 à 10 |
| Au-delà | Sur devis (voir section 9) |

### Prix en Ariary (paiement unique)
| Palier | Tuk-tuk | Cyclos pousse | Les deux (tarif combiné) |
|---|---|---|---|
| 1 (1 à 3) | 20 000 | 10 000 | 25 000 |
| 2 (4 à 7) | 40 000 | 20 000 | 45 000 |
| 3 (8 à 10) | 60 000 | 30 000 | 70 000 |

Le tarif combiné donne droit à **la même limite pour les deux types** (par exemple palier 2 = jusqu'à 7 tuk-tuk **et** 7 cyclos).

### Règle de calcul du prix (le client paie toujours le moins cher)
Soit `a` le palier des tuk-tuk (0 si aucun) et `b` le palier des cyclos (0 si aucun) :

```
somme   = prix_tuk[a] + prix_cyclo[b]
combine = prix_les_deux[max(a, b)]     (si a > 0 et b > 0)

prix = min(somme, combine)
```
- Si `combine` est le moins cher, les limites accordées sont `max(a, b)` pour les deux types.
- Sinon les limites sont `a` pour les tuk-tuk et `b` pour les cyclos.

**Exemples**
| Situation | Somme | Combiné | À payer |
|---|---|---|---|
| 2 tuk-tuk, 0 cyclo | 20 000 | | **20 000** |
| 2 tuk-tuk + 5 cyclos (palier 1 + palier 2) | 20 000 + 20 000 = 40 000 | 45 000 | **40 000** |
| 5 tuk-tuk + 2 cyclos (palier 2 + palier 1) | 40 000 + 10 000 = 50 000 | 45 000 | **45 000** (limites 7 + 7) |
| 9 tuk-tuk + 9 cyclos | 60 000 + 30 000 = 90 000 | 70 000 | **70 000** |

---

## 4. Code d'installation

- **7 chiffres aléatoires**, générés **une seule fois** au premier lancement.
- Stocké de façon persistante (IndexedDB + copie en localStorage).
- Il **ne change jamais**, même si l'app est fermée et rouverte.
- Chaque appareil génère son propre code (1 chance sur 10 millions de doublon) : c'est ce qui rend la clé **non transférable**.

---

## 5. Format de la clé

```
T{limite_tuktuk}C{limite_cyclos}-{MAC sur 10 chiffres}
```
Exemples :
- `T3C0-4829105736` : jusqu'à 3 tuk-tuk, aucun cyclo.
- `T3C7-9150264837` : jusqu'à 3 tuk-tuk et 7 cyclos.
- `T7C7-0384917265` : tarif combiné palier 2.

Les limites sont **écrites dans la clé** mais **protégées par le MAC** : si le client change `T3` en `T10`, le MAC ne correspond plus et la clé est refusée.

### Calcul du MAC
```
message = "v1|" + code_installation + "|T" + limite_tuk + "C" + limite_cyclo
mac     = HMAC-SHA256(SECRET, message)
chiffres = (5 premiers octets du mac lus comme un entier) modulo 10 000 000 000
```
Le « v1 » permet de changer de secret plus tard sans casser les anciennes clés.

### Exemple de code (JavaScript, Web Crypto)
```js
async function calculerMac(secret, code, tuk, cyclo) {
  const enc = new TextEncoder();
  const cle = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const message = `v1|${code}|T${tuk}C${cyclo}`;
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", cle, enc.encode(message)));
  let n = 0;
  for (let i = 0; i < 5; i++) n = n * 256 + sig[i];
  return String(n % 10_000_000_000).padStart(10, "0");
}

async function fabriquerCle(secret, code, tuk, cyclo) {
  return `T${tuk}C${cyclo}-` + await calculerMac(secret, code, tuk, cyclo);
}

async function verifierCle(secret, code, cleSaisie) {
  const m = /^T(\d+)C(\d+)-(\d{10})$/.exec(cleSaisie.trim().toUpperCase());
  if (!m) return null;
  const [, tuk, cyclo, mac] = m;
  const attendu = await calculerMac(secret, code, tuk, cyclo);
  return mac === attendu ? { tuk: +tuk, cyclo: +cyclo } : null;
}
```
(À adapter à l'environnement choisi. Si l'app est emballée avec Capacitor, la même fonction marche dans la WebView.)

---

## 6. Comportement de l'app

### Pendant l'essai (15 jours)
- Toutes les fonctions sont disponibles, avec un maximum de **10 véhicules par type**.
- Bandeau : « Il te reste X jours d'essai ». Rappel renforcé à J-3.

### Après l'essai sans clé
- **Verrouillage total** : un seul écran est visible.
- Il affiche :
  - le **code d'installation** (7 chiffres),
  - le **résumé réel** : « 4 tuk-tuk, 2 cyclos » (calculé par l'app),
  - le **prix conseillé** (calculé avec la règle de la section 3),
  - le champ « clé d'activation »,
  - le message : « Tes données sont conservées. Active i-Tantana pour continuer. »

### Après activation
- L'app **enregistre la clé** (pas seulement « activé = vrai ») et la **revérifie à chaque lancement**.
- **Ajout de véhicule** : refusé si la limite du type est atteinte ; message « Limite atteinte. Passe au palier supérieur ».
- **Véhicules en trop** (par exemple 6 tuk-tuk créés mais clé `T3`) : les véhicules au-delà de la limite (les plus récents d'abord) passent en **lecture seule verrouillée**. Pas de génération d'entrées, pas de calcul dans le dashboard, **aucune donnée supprimée**. Bandeau : « 3 véhicules sont verrouillés. Passe au palier supérieur pour les débloquer. »

### Mise à niveau
- Le client paie la **différence** (nouveau prix − ancien prix).
- Tu envoies une **nouvelle clé** pour le **même code** avec les nouvelles limites.
- L'app garde, pour chaque type, **la limite la plus haute** parmi les clés valides.

---

## 7. Protection contre les contournements

| Risque | Réponse |
|---|---|
| App copiée par Xender / WhatsApp | La copie génère son propre code : la clé de l'original est refusée. |
| Le client ment sur son nombre de véhicules | La clé ne débloque que le palier payé ; l'app bloque les véhicules au-delà. |
| Le client modifie la clé (`T3` → `T10`) | Le MAC ne correspond plus, la clé est refusée. |
| Deux clients comparent leurs paires code/clé | Impossible de retrouver le secret (HMAC, pas une addition). |
| Modifier la valeur « activé » dans le stockage | L'app stocke la clé et la revérifie à chaque lancement. |
| Reculer la date du téléphone pour prolonger l'essai | L'app mémorise la **date la plus récente jamais vue** ; si la date actuelle est plus ancienne, elle verrouille. |
| Désinstaller ou effacer les données pour refaire l'essai | Non évitable à 100 % hors ligne, mais il perd tout son historique : un client avec plusieurs semaines de données ne repart pas de zéro. |
| Restaurer une sauvegarde Android sur un autre téléphone | Désactiver `allowBackup`. Avec Capacitor, lier l'activation à l'identifiant de l'appareil (`Device.getId()`) et reverrouiller si différent. |
| Essais de clés au hasard dans l'app | Après 5 échecs, délai d'attente croissant (30 s, 1 min, 5 min...). La clé a 10 chiffres. |
| Lecture du code de l'app pour trouver le secret | Voir section 10 : secret obfusqué en niveau 2, signature en niveau 3. |

---

## 8. Procédure de vente (pour toi)

1. Le client t'appelle ou t'écrit depuis l'écran de verrouillage.
2. Tu lui demandes son **code à 7 chiffres** et le **résumé** affiché (nombre de tuk-tuk et de cyclos).
3. Tu calcules le **prix** (règle section 3) et lui donnes le montant.
4. Il paie par **MVola**. Tu vérifies la réception.
5. Tu génères la clé avec ton **outil générateur** (section 11) et tu l'envoies par message.
6. Il entre la clé : l'app est débloquée.
7. Tu notes la vente dans le **registre** (section 11).

### Changement de téléphone (à confirmer)
Proposition : **une réactivation gratuite** après vérification du paiement MVola initial ; au-delà, un petit frais symbolique. Le nouveau téléphone génère un nouveau code, donc une nouvelle clé.

---

## 9. Plus de 10 véhicules

Pas de palier fixe : le prix est **sur devis**. La clé s'écrit avec les limites choisies, par exemple `T25C0-xxxxxxxxxx`. Le format de clé et l'app n'ont rien à changer, car les limites sont lues directement dans la clé.

---

## 10. Limites honnêtes et évolution

- **Aucun système hors ligne n'est infaillible.** Quelqu'un de très compétent peut lire le code de l'app et retrouver le secret du niveau 2. Ce n'est pas le profil de la grande majorité des propriétaires visés.
- **Protéger le secret** : ne jamais l'écrire en clair, le découper en plusieurs morceaux dans le code, minifier/obfusquer le JavaScript, ne jamais le publier dans un dépôt public.
- **Si le secret fuit** : publier une version de l'app avec un nouveau secret et un nouveau préfixe (`v2|...`) ; l'app garde la vérification `v1` pour les clients existants.
- **Niveau 3 (si l'app se diffuse)** : remplacer le HMAC par une **signature Ed25519**. L'app ne contient alors que la clé **publique** ; seule ta clé privée, que tu gardes sur ton ordinateur, peut fabriquer des clés. Le format de clé change (plus long, à coller depuis le message) mais le principe des paliers reste identique.

---

## 11. Outil générateur de clés (côté administrateur)

Petite page HTML locale, hors ligne, protégée par un mot de passe, sur ton téléphone ou ton ordinateur.

**Entrées** : code d'installation (7 chiffres), nombre de tuk-tuk, nombre de cyclos.
**Sorties** :
- le palier et le prix selon la règle de la section 3,
- la clé prête à copier : `T3C7-xxxxxxxxxx`.

**Registre** (à conserver) :
| Date | Code | Client / téléphone | Tuk-tuk | Cyclos | Prix | Clé | Paiement MVola |
|---|---|---|---|---|---|---|---|

Le registre sert à :
- détecter un **code déjà vendu** (doublon suspect),
- retrouver une clé en cas de problème,
- gérer les mises à niveau et les réactivations.

---

## 12. Tests de validation

- [ ] Une copie de l'app sur un autre téléphone génère un code différent.
- [ ] La clé de l'appareil A est refusée sur l'appareil B.
- [ ] Une clé modifiée (`T3` → `T10`) est refusée.
- [ ] Après activation `T3C0`, impossible d'ajouter un 4e tuk-tuk ni un cyclo.
- [ ] Avec 6 tuk-tuk créés pendant l'essai et une clé `T3C0`, 3 sont verrouillés en lecture seule et aucune donnée n'est perdue.
- [ ] Après mise à niveau, les véhicules verrouillés se débloquent avec leurs données.
- [ ] Reculer la date du téléphone verrouille l'app.
- [ ] Fermer et rouvrir l'app garde le même code d'installation.
- [ ] Après 5 clés fausses, un délai d'attente s'applique.
- [ ] L'écran de verrouillage affiche bien le code, le résumé des véhicules et le prix calculé.
- [ ] Les exemples de prix de la section 3 sont retrouvés par la fonction de calcul.
