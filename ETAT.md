# État du système « Les Miaulements d'Ulthar »

Publié avec l'autorisation de l'auteur, Xavier Laporte (Xaviiiier). Les PDF ne sont jamais dans le dépôt ; les textes du livre repris dans les wikis et compendiums le sont avec son accord.

## Cartes de résultat dans la messagerie (v0.14.0, branche `fonction/cartes-chat`)
- Les cartes de jet (attribut, pouvoir, attaque d'un Chat ou d'un adversaire, Folie) ont une nouvelle structure : portrait, nom, attribut et cible, phrase selon le résultat (« Orichat retombe sur ses pattes ! »), dé, verdict, détail.
- Chaque joueur les voit dans l'habillage du thème de SA fiche (classe `mu-chat-<thème>` sur la page, posée au lancement et à chaque changement de thème) : **Nuit** = médaillon à oreilles, dé dans le coussinet d'une patte ; **Grimoire** = parchemin déroulé entre deux bâtons de bois, dé à l'encre rouge (barré sur l'échec ; depuis la 0.14.1, branche `fonction/carte-parchemin`) ; **Rêve** = grand chiffre et empreinte en filigrane, griffures sur l'échec ; **Journal** = la Gazette d'Ulthar (manchette, photo en noir et blanc).
- Les autres cartes (dégâts, mort, pouvoir montré…) prennent les couleurs et polices du thème. Code : `module/cartes.mjs`, `css/cartes-chat.css`.

## Boîtes de dialogue « cartes à piocher » (v0.13.0, branche `fonction/dialogues`)
- Toutes les fenêtres ouvertes depuis la fiche (jet d'attribut, attaque, pouvoir, connexion mentale et altérations de la bulle onirique, jet de Folie, assistant de création, confirmations) suivent le thème choisi par le joueur pour sa fiche.
- Jet : grand rond avec le score à faire au D100, recalculé en direct ; difficulté en cinq cartes (les pattes indiquent la facilité) ; pouvoir en interrupteur avec les PM restants ; attribut et dégâts en listes pour l'attaque.
- Jet de Folie : la raison se choisit en cartes (Peur, Instinct de chasseur, Curiosité, Horreur indicible) ; Maj + clic pour lancer directement.
- Bulle onirique : compteur de réussites et d'échecs en pattes, difficulté en cartes.
- Suppression d'un pouvoir : confirmation ajoutée (Maj + clic pour supprimer directement).
- Chat en ombre chinoise en filigrane (masque coloré par le thème, `assets/dialogues/`) : Agilité, Physique, Discrétion, Précision, Perception, Intelligence. **À générer** (quota d'images épuisé le 19/11) : Charisme, Chance, Attaque, Folie, Bulle onirique, Création — retirer leur clé de `MANQUANTES` dans `module/dialogues.mjs` une fois l'image ajoutée.
- Code : `module/dialogues.mjs`, styles `css/dialogues.css`.

## Déplacer la fiche zoomée (v0.12.1, branche `fonction/fiche-deplacement`)
- Quand la page papier est zoomée, le curseur devient une main : clic gauche maintenu sur une zone vide (ou clic molette n'importe où) pour faire glisser la fiche. Les champs, boutons et pouvoirs restent cliquables normalement.

## Confort de la fiche (v0.12.0, branche `fonction/fiche-confort`)
- **Pastilles de l'en-tête cliquables** : clic −1, clic droit +1 sur Santé, Magie, Folie et vies de Chat (la Santé passe par les dégâts : carte dans le chat, mort et Bast à 0 PV).
- **Infobulles** (Foundry `data-tooltip`) : attributs (définition du livre), cases d'échec, ronds de la page papier, pastilles, noms des pouvoirs (début de la description).
- **Écriture manuscrite** sur la page papier (police Caveat, encre bleu-noir), réglage « Écriture manuscrite sur la fiche » propre à chaque joueur.
- **Menu « ⋮ » de la fenêtre** : Assistant de création et Tirer les pouvoirs temporaires (comme Zombiology).
- **Échec marqué d'une petite patte** au lieu du rond rouge (patte rouge sang, choix A validé).
- **Race** : texte plus petit et sans flèche, les noms longs (Chat de gouttière, Scottish Fold) tiennent ; liste déroulante à taille normale.
- **Zoom de la page papier** : Ctrl + molette (60 % à 250 %), Ctrl + clic molette pour revenir à 100 %.

## Wiki des joueurs remis en forme (v0.11.0, branche `correction/wiki-joueur`)
- **Création des personnages** réécrite à la main d'après le livre (p. 13-22) : la colonne d'exemple (Mimolette) n'est plus mélangée aux règles ; une page par étape, surnoms et attributs en tableaux, exemple suivi en encadrés, Mimolette terminée en fin de chapitre (PF corrigés : 55, le livre se trompe de Charisme).
- **Système de jeu** : « Test de compétence » et « Bonus et malus » réécrits (exemple remis à sa place, page en double supprimée, tableau des difficultés) ; exemple de création égaré retiré de « Gestion de la folie » ; liste des 20 cartes Folie ajoutée sous « Gestion de la peur » ; fin d'exemple recollée dans « Utilisation des pouvoirs mystiques » ; dégâts courants en tableau ; liste incomplète des pouvoirs temporaires remplacée par la table D100 complète ; débris de fiche retirés.
- **Jouer un Chat** : page en double supprimée, note sur l'agilité remise à sa place. **Bien débuter** : liste du matériel en puces.
- Partout : listes à puces, notes encadrées, définitions en liste (« Libellé : … »), plus d'espace entre paragraphes, titres et encadrés. Outils : `tools/wiki_joueur_retouches.py`, `tools/wiki-joueur/*.html`.

## Onglets à l'extérieur de la fiche (v0.10.0, branche `fonction/onglets-exterieurs`)
- Les onglets ne prennent plus de place dans la fiche : ils dépassent du bord droit de la fenêtre, comme de vrais marque-pages (style oreilles de chat par défaut), et suivent la fenêtre quand on la déplace ; ils disparaissent quand la fenêtre est réduite.
- Le contenu récupère toute la largeur ; largeur de la fenêtre ramenée à 760 px.
- Idée reprise de Zombiology (étiquettes collées au bord droit), en version sortie de la fenêtre.

## Correction des champs en double (v0.9.2, branche `correction/champs-doubles`)
- L'XP (page papier et onglet Folie et progression) et l'apparence (page papier et onglet Notes) avaient deux champs du même nom : Foundry refusait l'enregistrement (« xp: must be a number »). Les champs des onglets s'enregistrent désormais eux-mêmes.

## Fiche réorganisée, onglets sur le côté (v0.9.0, branche `fonction/fiche-cote`)
- En-tête plus haut : grand portrait (clic pour le changer), nom, race et handicap, pastilles Santé, Magie, Folie (rouge sous 20), vies de Chat et XP.
- Onglets à la verticale sur le côté droit, avec des icônes dessinées sur le thème des chats : **Fiche** (panier), **Création** (arbre à chat), **Pouvoirs** (pelote de laine), **Folie et progression** (griffoir), **Notes** (litière).
- Nouvel onglet **Création** : explication des étapes, boutons « Lancer l'assistant de création », « Tirer les pouvoirs temporaires », « Voir les Chats prétirés », récapitulatif de la race (bonus, malus, pouvoir de race) et des attributs.
- **Attaquer** et **Jet de Folie** passent dans une barre en bas de la fiche.
- Le menu des thèmes est dans la barre de titre de la fenêtre, à côté du bouton « ⋮ ».
- Quatre styles d'onglets proposés (réglage « Style des onglets de la fiche », propre à chaque joueur) : Marque-pages oreilles de chat (défaut depuis la 0.9.1, branche `fonction/onglets-oreilles`), Arbre à chat, Griffoir, Gamelles.

## Thèmes de la fiche (v0.8.0, branche `fonction/themes-fiche`)
- Menu déroulant 🎨 dans la barre du haut de la fiche de Chat : quatre thèmes repris des maquettes du wiki pour le contenu des onglets — **Nuit d'Arkham** (nuit violette et or, défaut), **Grimoire d'Ulthar** (parchemin, encre brune, rouge), **Contrée du Rêve** (lavande et violet), **Journal d'Arkham, 1921** (papier journal, encre noire, comme le wiki).
- Le choix est propre à chaque joueur (réglage « utilisateur ») et s'applique à toutes ses fiches ouvertes, sans redessiner la fiche. Le Gardien fixe le thème par défaut dans les réglages du système.
- La page papier de l'onglet Fiche garde son image. Polices libres (OFL) embarquées : Cinzel Decorative, IM Fell English, Mystery Quest, Spectral, Henny Penny, Cormorant Garamond ; le navigateur ne charge que celles du thème affiché. Styles dans `css/themes-fiche.css`.

## Fiche de Chat à onglets (v0.7.0, branche `fonction/fiche-onglets`)
- Barre fixe en haut (portrait, nom, Création, Attaquer, Folie) et quatre onglets : **Fiche** (la fiche papier), **Pouvoirs** (une carte par pouvoir : description, coût en PM, attribut lié, dégâts, bulle onirique, boutons Lancer / Montrer / Modifier / Supprimer, tirage des pouvoirs temporaires), **Folie et progression** (jauge de Folie, cartes en main, vies de Chat, XP et achats, fin de scénario, tableau des attributs avec base, race, handicap, progrès, échecs et montée), **Notes** (apparence et notes).
- L'onglet choisi est conservé quand la fiche se redessine. Gabarits dans `templates/chat/`.

## Écran du Maître de Jeu (v0.6.2, branche `fonction/ecran-gardien`)
- L'entrée « Écran du MJ » du wiki du Gardien est refaite en trois pages de panneaux, comme l'écran papier : « Jets et règles » (jet, difficulté, critiques par mode, pouvoirs, Folie, dégâts, mort et vies, création, Santé, progression), « Tables de l'écran » (événements en ville, réactions humaines et animales, surnoms, pouvoirs temporaires, 20 cartes Folie, chaque table avec un lien pour la lancer), « Adversaires et comportements » (16 adversaires de l'écran reliés aux fiches du bestiaire, bulle onirique, comportements, conseils de table).

## Textes des wikis corrigés (v0.6.1, branche `correction/textes-wikis`, partie de la branche du thème)
- Nouvelle extraction des PDF par blocs de mise en page (`tools/extraire_blocs.py`, pdfminer) : colonnes lues dans l'ordre, notes grises des marges isolées en encadrés « Note », titres en biais et mini-fiches dessinées retirés, gras du livre conservé, cases ☐ des indices en listes, lignes « Tags » mises à part, coupure de journal « Mort mystérieuse » reconstituée, notes d'imprimeur et 4e de couverture retirées, mots coupés en fin de ligne recollés, nouvelle remise dans l'ordre (livret imposé).
- `tools/verifier-textes.py` repère les défauts restants ; il ne reste que des cas normaux.

## Thème « Journal d'Arkham, 1921 » des wikis (v0.6.0, branche `fonction/wiki-journal-arkham`)
- Wikis et scénarios habillés en coupure de presse : papier journal, titres en Grenze Gotisch, petites capitales en Playfair Display SC, texte en Old Standard TT (polices libres SIL OFL embarquées dans `assets/fonts`, fonctionne sans internet).
- Intertitres à patte, trace de pattes sous les grands titres, lettrine en début de section, listes à pattes, tableaux et citations du Journal d'Arkham mis en forme, sommaire assorti.
- 20 encadrés « Exemple » (repris des marges du livre), badges qualité / défaut sur les 10 pages de race, « une » de journal sur les accueils.
- `module/journal.mjs` ajoute la classe `.mu-journal` aux journaux du système (compendium ou copie importée grâce au drapeau `journal`) ; `css/journal-arkham.css`.

## Accueil et pause (v0.5.0)
- Image d'accueil `assets/images/accueil_foundry.webp` : fond de la tuile du système sur l'écran de configuration de Foundry (`media` type setup), fond par défaut des mondes créés avec le système (`background`), et scène « Accueil » (compendium Scènes) importée et activée une fois par monde par le Gardien (si aucune scène n'est déjà active).
- Pause : patte de chat au lieu de l'horloge, au choix dans les réglages (patte noire à l'œil par défaut, patte violette, médaillon doré, cercle d'empreintes, ou horloge d'origine), légende « Le Chat fait la sieste… ». Les mondes déjà créés gardent leur fond : il se change dans « Modifier le monde ».

## Wikis (v0.4.2)
- Ouverture automatique **à chaque lancement du jeu** par défaut (réglage client : à chaque lancement / première connexion / jamais) : le Gardien voit s'ouvrir le wiki du Gardien, chaque joueur le wiki des joueurs quand il arrive dans le jeu. Même principe que Brindlewood Bay, Tindalos et Night Prowler (`module/wiki.mjs`) : ouverture 0,6 s après `ready`, drapeau d'utilisateur `wikiVu` pour le mode « première connexion ».
- Boutons « 📖 Wiki du Gardien » (Gardien seulement) et « 📖 Wiki des joueurs » en haut des onglets Acteurs et Journaux. Macro ou console : `game.miaulementsUlthar.wiki("joueur")`.

## Corrigé (v0.4.1, relecture complète du code)
- Les gabarits des fiches n'ont plus de balise `<form>` (la fenêtre d'une fiche en est déjà une) : avec un formulaire imbriqué, les champs n'étaient pas enregistrés.
- Le réglage « vision féline » est enregistré dès `init` (il était lu par la barre d'outils avant d'exister).
- « Neuf vies » donne bien 9 vies au maximum ; le +20 du pouvoir s'applique aussi aux altérations oniriques.
- Image de la fiche, des adversaires et des pouvoirs modifiable d'un clic ; descriptions affichées mises en forme.
- Charge processeur : vision féline en voile fixe (plus de filtre CSS sur le canevas), suivi des Chats rafraîchi une fois par salve de changements et seulement s'il est ouvert, animation limitée à trois battements, positions de la fiche calculées une fois, images en WebP (zip de 9,6 Mo à 2 Mo environ). Aucune minuterie, aucun traitement par image.

## Fait (v0.4.0)
- **Images** : portraits des Chats prétirés (Orichat, Maya, Isis, Chiffon illustrés par IA ; Ator, Filou, Léonard en jetons dessinés) et 29 jetons d'adversaires (anneau violet et glyphes), dans assets/portraits et assets/jetons ; ils servent d'image et de jeton aux acteurs des compendiums. À remplacer par des illustrations quand le quota du générateur d'images sera revenu.
- **Suivi des Chats** : fenêtre qui montre Santé, Magie, Folie, vies de Chat et cartes Folie de tous les Chats des joueurs (bouton patte dans la barre des jetons, ou macro).
- **Vision féline** : bouton œil dans la barre des jetons, teinte dorée et contraste de la scène, réglage propre à chaque joueur.

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
- Illustrations générées par IA pour les 3 Chats et les 29 adversaires aux jetons dessinés.
- Idées de modules séparés ou d'ajouts : ambiance sonore « Vision de Chat », cartes Folie illustrées, illustrations des adversaires.

## Reconstruire les compendiums
`python3 tools/extraire.py <dossier des PDF>`, puis `node tools/export-donnees.mjs`, `python3 tools/construire-contenu.py`, `cd tools && npm install && node compiler-packs.mjs --verifier`.
