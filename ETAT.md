# État du système « Les Miaulements d'Ulthar »

⚠ Jeu commercial (Xaviiiier) : dépôt privé, pas de manifeste public ni de publication sans accord de l'auteur. Les PDF ne vont jamais dans le dépôt. L'illustration de la fiche officielle est à faire valider avant tout passage en public.

## Fait (lot 2, v0.2.0)
- Assistant de création de Chat (une fenêtre, calcul en direct) : surnom, 6 modificateurs d'attributs (+20, +10, +5, −5, −10, −20, bornes 30-70 %), race (bonus/malus, choix du pouvoir de race, chat de gouttière +5/−5 libre), handicap (−20 %, un pouvoir inné de plus), 2 pouvoirs innés (3 avec handicap), « Comprendre et lire l'humain » offert. Testé en simulation sur l'exemple du livre (Mimolette).
- Pouvoirs : 17 innés, 20 de race (2 par race), 50 temporaires (table D100) dans `module/pouvoirs.mjs`. Tirage de 2 pouvoirs temporaires (doublon = relance) avec carte de chat.
- Fiche de pouvoir (objet) ; clic sur un pouvoir de la fiche = description montrée à la table.

## Fait (lot 1, v0.1.0)
- Manifeste Foundry v13/v14, types Acteur `chat` / `pnj`, Objet `pouvoir` (DataModels, pas de template.json).
- Chat : 8 attributs (base + race + handicap + progrès), PV (table PHY+AGI), PF = (PER+CHA)/2, PM = INT, vies de chat, XP, achats d'XP.
- Jets D100 avec difficulté, pouvoir (−20 au dé, perte de PM = unités du dé), critiques selon le mode de jeu, case d'échec cochée automatiquement.
- Montée d'attribut (+1D10) quand les cases sont pleines.
- Jet de Folie, tirage parmi les 20 actions, carte gardée ou jouée, fin de scénario (+2 XP, remise à niveau, −10 PF par carte).
- Mode de jeu en réglage de monde (Pulp / Serious Cat / Co-investigation).
- Fiche de Chat ApplicationV2 fonctionnelle (mise en page provisoire).

## Points incertains
- Nombre de cases d'échec par attribut : fixé à 5 (config.mjs), à vérifier sur la fiche papier / livre p.65.
- Siamois : malus Discrétion (tableau p.17) ou Charisme (page de race p.41).
- Seuils exacts de critique : Pulp « 0-9 / 91-00 » codé ≤10 / ≥91 ; à confirmer.
- Règles détaillées des modes Serious Cat et co-investigation (p.117-129) : seuls les critiques sont codés.
- Exemple « Mimolette » du livre : le Persan +10 en Charisme devrait donner 50 et non 40 (PF 55 et non 50) : l'exemple du livre semble ne pas appliquer le bonus de race en Charisme. Le code suit les règles.
- Rien n'a été testé dans Foundry (l'assistant est testé en simulation seulement).

## À faire
- Lot 2 : fenêtre de jet plus riche (pouvoirs depuis la fiche), carte de pouvoir, jets de combat (attaque / dégâts / esquive).
- Lot 3 : fiche fidèle à la fiche papier (cercle des attributs, tentacules, chat « U »).
- Lot 4 : compendiums (pouvoirs innés, de race, 50 temporaires, bestiaire, prétirés, scénarios).
- Lot 5 : deux wikis (joueur / MJ) avec ouverture automatique selon le rôle.
- Ensuite : idées de modules d'amélioration.
