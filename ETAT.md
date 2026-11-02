# État du système « Les Miaulements d'Ulthar »

Publié avec l'autorisation de l'auteur, Xavier Laporte (Xaviiiier). Les PDF ne sont jamais dans le dépôt ; les textes du livre repris dans les wikis et compendiums le sont avec son accord.

## Fait (v0.3.0)
- **Fiche de Chat fidèle à la fiche papier officielle** : l'image de la fiche (assets/fiche-chat.png) sert de fond, les champs sont posés dessus (surnom, race, description, 8 cercles d'attributs cliquables, 6 petites cases d'échec par attribut, Santé / vies de Chat / Magie / Folie / XP, listes de pouvoirs innés et temporaires).
- **Assistant de création** (une fenêtre, calcul en direct), tirage des 2 pouvoirs temporaires, pouvoirs lançables depuis la fiche (✦), fin de scénario, achats d'XP.
- **Combat automatisé** : attaque d'un Chat (attribut + dégâts), attaque d'un adversaire (fiche PNJ avec attaques cliquables), carte de dégâts « Infliger aux cibles » (les joueurs passent par le Gardien connecté), mort à 0 PV : vie de Chat perdue et résurrection par Bast, mort définitive sans vie restante (pas de vies de Chat en mode co-investigation).
- **Pouvoirs oniriques** (Cauchemar mental, Distorsion onirique, Manipulation et Recherche d'un souvenir) : bulle onirique guidée (connexion mentale, objectif, scène, altérations jusqu'à 2 réussites ou 2 échecs).
- **Modes de jeu** (Pulp, Serious Cat, Co-investigation) : seuils de critique, rappels de règles sur les cartes.
- **Compendiums** : Pouvoirs (87), Tables (6 : cartes Folie, pouvoirs temporaires, événements en ville, réactions humaines et des animaux, surnoms), Bestiaire (29 adversaires), Prétirés (7 Chats), Scénarios (livre des scénarios en 11 entrées + Sommilius + index), Macros du Gardien (5).
- **Deux wikis** : Wiki des joueurs (règles, races, système de jeu, Chats d'Ulthar, jouer un Chat, nouvelle, aide-mémoire) et Wiki du Gardien (guide du MJ, univers, scénario d'initiation, écran du MJ, bestiaire). Le joueur ouvre le wiki des joueurs, le Gardien ouvre le wiki du Gardien, automatiquement (réglage : première connexion / toujours / jamais). Le wiki du Gardien n'est visible que par le Gardien.
- Macros du Gardien : début d'aventure (pouvoirs temporaires pour tous les Chats), fin de scénario de groupe, jet de Folie du groupe, tirages d'événements.

## Points incertains
- Fiches prétirées : leurs valeurs imprimées sont reprises comme valeurs finales (modificateurs de race inclus dans les attributs affichés) ; leurs pouvoirs ne suivent pas toujours la liste des pouvoirs de race du livre (ex. Orichat, un Bengal, a « Guérison réconfortante »). La Folie imprimée d'Orichat (55) ne correspond pas à la formule (53) : on garde 53.
- Exemple « Mimolette » du livre : le Persan +10 en Charisme devrait donner 50 (Folie 55) et non 40 (Folie 50). Le code suit les règles.
- Siamois : malus Discrétion (tableau p.17) ou Charisme (page de race p.41) : on garde Discrétion.
- Folie arrondie à l'entier supérieur (52,5 devient 53), d'après les prétirés.
- Perte de PM des altérations oniriques : le livre se contredit (p.55 : seule la connexion ; p.59 : chaque altération). Réglage de monde, par défaut seule la connexion coûte.
- Initiative : le livre ne donne pas de règle ; l'initiative par défaut de Foundry (1d20) est utilisée.
- Les dégâts d'une réussite critique ne sont pas doublés : le livre ne le dit pas.
- Modes Serious Cat et co-investigation : seuls les seuils de critique, les vies de Chat et les rappels sont codés ; les règles propres aux investigateurs humains (PV multipliés, création du personnage humain) ne sont pas dans le système.
- Les textes des wikis et scénarios viennent d'une extraction automatique des PDF : les encadrés et tableaux en colonnes peuvent perdre un peu de leur mise en page.
- Rien n'a été testé dans Foundry : le banc d'essai vérifie seulement le chargement du système, les calculs de création et les prétirés.

## À faire
- Test en jeu complet, puis corrections.
- Illustrations : images de jetons et de portraits pour le bestiaire et les prétirés.
- Idées de modules séparés : « Vision de Chat » (ambiance sonore et filtre de scène), suivi de partie (vies et Folie du groupe en un coup d'œil), cartes Folie illustrées.

## Reconstruire les compendiums
`python3 tools/extraire.py <dossier des PDF>`, puis `node tools/export-donnees.mjs`, `python3 tools/construire-contenu.py`, `cd tools && npm install && node compiler-packs.mjs --verifier`.
