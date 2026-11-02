// Pouvoirs du livre des règles (chapitres création p.17-19, races p.23-43, pouvoirs temporaires p.60-64).
// Une seule source de vérité : assistant de création, tirage des pouvoirs temporaires, futurs compendiums et wiki.

// Pouvoirs innés. `gratuit` = 0 PM. `onirique` = règles de la bulle onirique. `campagne` = campagnes uniquement.
export const POUVOIRS_INNES = {
  cauchemar_mental: { nom: "Cauchemar mental", onirique: true, desc: "Le Chat peut créer le souvenir d'un cauchemar et provoquer une angoisse ou une peur immédiate." },
  charme_felin: { nom: "Charme félin", desc: "Charme naturel qui permet d'influencer les autres personnages, humains ou non, en les séduisant ou en les apaisant." },
  comprendre_humain: { nom: "Comprendre et lire l'humain", gratuit: true, offert: true, desc: "Tous les Chats lisent et comprennent les êtres humains, quelle que soit leur langue (0 PM). Les langues anciennes demandent un jet d'Intelligence avec un malus selon le degré d'oubli de la langue. Ce pouvoir ne permet pas de parler aux humains." },
  discretion_incroyable: { nom: "Discrétion incroyable", desc: "Grâce à sa nature silencieuse et à sa capacité à se fondre dans son environnement, le Chat se déplace discrètement et passe inaperçu quand il le souhaite." },
  distorsion_onirique: { nom: "Distorsion onirique", onirique: true, desc: "Le Chat projette dans l'esprit d'un être une vision altérée de la réalité." },
  griffes_precises: { nom: "Griffes précises", desc: "Les griffes sont utilisées avec une grande précision et ont la fonctionnalité des doigts. Le Chat peut détecter les fluides magiques qui l'entourent ou qui émanent d'un objet." },
  grimpeur_habile: { nom: "Grimpeur habile", desc: "Le Chat gravit les surfaces verticales et se déplace avec aisance dans les hauteurs, ce qui lui ouvre des zones inaccessibles aux autres." },
  langage_animal: { nom: "Langage animal", desc: "Le Chat comprend et parle le langage des autres animaux." },
  lire_pensees: { nom: "Lire les pensées", desc: "Connexion télépathique pour entendre ce que pense un humain ou un animal. Pour échanger mentalement, il faut aussi « Langage animal » ou « Parler humain »." },
  manipulation_souvenir: { nom: "Manipulation d'un souvenir", onirique: true, desc: "Le Chat manipule et modifie les souvenirs passés d'un être." },
  neuf_vies: { nom: "Neuf vies", campagne: true, desc: "Certains Chats ont neuf vies. Règle : le nombre de vies passe à neuf quel que soit le scénario. Uniquement pour les campagnes." },
  ordre_prononce: { nom: "Ordre prononcé", desc: "Le Chat donne un ordre mental simple (trois mots au maximum) à une créature. L'injonction dure un tour. Exemples : « Arrête-toi immédiatement », « Fuis », « Protège-moi »." },
  parler_humain: { nom: "Parler humain", desc: "Le Chat communique vocalement avec les humains." },
  perception_accrue: { nom: "Perception accrue", desc: "Un sens développé, comme l'ouïe fine et la vision nocturne, détecte le moindre bruit et mouvement." },
  recherche_souvenir: { nom: "Recherche d'un souvenir", onirique: true, desc: "Le Chat recherche un souvenir passé d'un être." },
  reponse_immediate: { nom: "Réponse immédiate", desc: "Le Chat obtient une réponse instantanée d'un humain en lui posant une question mentale de trois mots maximum. L'humain répond oralement sans en connaître la source. Exemples : « Donne la sortie ? », « Es-tu honnête ? », « Donne le code »." },
  vision_fluides: { nom: "Vision des fluides magiques", desc: "Le Chat détecte les fluides magiques qui l'entourent ou qui émanent d'un objet ou d'un être." }
};

// Pouvoirs de race : 2 par race, un seul est choisi.
export const POUVOIRS_RACE = {
  bengal: [
    { nom: "Ombre envoûtante", desc: "Le Bengal modifie les ombres et s'y fond pour devenir pratiquement invisible." },
    { nom: "Téléportation courte", desc: "Le Chat se déplace instantanément d'un endroit visible à un autre en passant par une ombre." }
  ],
  gouttiere: [
    { nom: "Aubaine incroyable", desc: "Intuition innée pour trouver des opportunités inattendues dans les endroits les plus improbables." },
    { nom: "Sixième sens", desc: "Capacité surnaturelle à anticiper les dangers avant qu'ils ne se produisent et à sentir les menaces imminentes." }
  ],
  cornish: [
    { nom: "Illusion féerique", desc: "Le Chat crée des illusions subtiles et envoûtantes qui troublent les sens et trompent les esprits." },
    { nom: "Ombre enveloppante", desc: "Le Chat enveloppe une cible dans une aura d'ombre protectrice : les dégâts infligés à la cible sont divisés par deux." }
  ],
  mainecoon: [
    { nom: "Force légendaire", desc: "Puissance physique qui inflige des blessures profondes : grâce à ses griffes et à sa force, le Chat inflige le double de dégâts." },
    { nom: "Guérison accélérée", desc: "Métabolisme surpuissant : le Chat récupère vite de ses blessures et de la fatigue. Il régénère 1D6 par heure." }
  ],
  norvegien: [
    { nom: "Peau de cuir", desc: "Endurance extraordinaire : la peau cicatrise vite. Sur un jet de Physique réussi, le Chat divise ses dégâts par deux (il encaisse toujours au moins 1 point)." },
    { nom: "Bond extraordinaire", desc: "Des pattes arrière puissantes permettent de bondir à des hauteurs et des distances extraordinaires." }
  ],
  persan: [
    { nom: "Charme délicat", desc: "Le Persan amadoue et charme ses interlocuteurs, et influence subtilement son entourage." },
    { nom: "Lien émotionnel", desc: "Le Chat crée un lien empathique avec ceux qu'il choisit : il ressent et comprend profondément les émotions de son interlocuteur." }
  ],
  savannah: [
    { nom: "Camouflage naturel", desc: "Le Chat se fond dans son environnement naturel et dissimule sa présence : il devient quasiment invisible, quel que soit l'environnement." },
    { nom: "Flèche lumineuse", desc: "Le Chat canalise la lumière pour créer des projectiles.", degats: "1d6" }
  ],
  scottish: [
    { nom: "Guérison réconfortante", desc: "Le Chat canalise l'énergie curative de la nature, détecte la souffrance et apaise les maux physiques et émotionnels. Sa présence calme les esprits agités. Il soigne 1D6 points de santé à un individu autre que lui.", degats: "1d6" },
    { nom: "Marche de velours", desc: "Le Chat se déplace sans laisser la moindre trace : ses pas ne font aucun bruit et ne laissent aucune empreinte." }
  ],
  siamois: [
    { nom: "Écoute perçante", desc: "Le Siamois entend les sons non perceptibles par la plupart des êtres vivants." },
    { nom: "Vision à travers", desc: "Le Chat voit à travers les objets solides et perçoit ce qui se cache derrière les murs, les portes et autres obstacles." }
  ],
  sphynx: [
    { nom: "Analyse situationnelle", desc: "Le Chat analyse instantanément tous les aspects d'une situation complexe : faits objectifs, parties prenantes, enjeux, causes, contraintes." },
    { nom: "Vision des conséquences", desc: "Le Chat simule mentalement les scénarios possibles d'un choix ou d'une action et anticipe les résultats à long terme. Le MJ répond à la question du joueur du type « Si je fais… que va-t-il se passer ? »." }
  ]
};

// Pouvoirs temporaires : table D100 (00 = 100). Tirage de 2 en début d'aventure, doublon = relance.
// Lors de l'usage : +20 à l'attribut concerné, perte de PM égale aux unités du dé.
export const POUVOIRS_TEMPORAIRES = [
  { de: 1, a: 2, nom: "Accélération physique", desc: "Le Chat augmente temporairement sa vitesse et sa réactivité : il effectue son action en premier." },
  { de: 3, a: 4, nom: "Agilité féline", desc: "Le Chat est incroyablement agile : sauts et mouvements acrobatiques spectaculaires." },
  { de: 5, a: 6, nom: "Appel des insectes", desc: "Le Chat invoque un essaim d'insectes pour distraire ou attaquer des adversaires. Jet réussi : 2 dégâts pendant 1D6 tours." },
  { de: 7, a: 8, nom: "Aura apaisante", desc: "Une aura de calme et de sérénité apaise les esprits agités et réduit l'agressivité des adversaires." },
  { de: 9, a: 10, nom: "Aura curative", desc: "Une aura de guérison soigne les blessures d'une autre personne." },
  { de: 11, a: 12, nom: "Aura protectrice", desc: "Une aura de protection réduit les dégâts subis par le Chat ou ses alliés." },
  { de: 13, a: 14, nom: "Bouclier psychique", desc: "Un bouclier psychique protège des attaques mentales ou empêche les autres de lire les pensées du Chat." },
  { de: 15, a: 16, nom: "Bouclier thermique", desc: "Un bouclier thermique protège des températures extrêmes." },
  { de: 17, a: 18, nom: "Bouclier végétal", desc: "Le Chat crée autour de lui un bouclier protecteur de plantes et de feuilles." },
  { de: 19, a: 20, nom: "Camouflage chromatique", desc: "Le Chat change la couleur de son pelage pour se fondre dans son environnement, presque invisible." },
  { de: 21, a: 22, nom: "Capacité de lévitation", desc: "Le Chat flotte dans les airs sur de courtes distances. Il ne peut pas porter plus de 10 kg." },
  { de: 23, a: 24, nom: "Charme animal", desc: "Le Chat influence le comportement des animaux autour de lui en les ralliant à sa cause ou en les apaisant." },
  { de: 25, a: 26, nom: "Charme humain", desc: "Un charme irrésistible permet de manipuler les émotions." },
  { de: 27, a: 28, nom: "Communication animale", desc: "Le Chat communique avec les animaux et les comprend : ils coopèrent et s'entraident." },
  { de: 29, a: 30, nom: "Contrôle climatique", desc: "Le Chat influence les conditions climatiques : pluie, nuages ou brouillard." },
  { de: 31, a: 32, nom: "Contrôle de la nature", desc: "Le Chat obtient l'aide des éléments de la nature." },
  { de: 33, a: 34, nom: "Contrôle de la température", desc: "Le Chat modifie la température ambiante : zones de chaleur suffocante ou de froid glacial. Jet réussi : jusqu'à 1D6 dégâts.", degats: "1d6" },
  { de: 35, a: 36, nom: "Contrôle élémentaire", desc: "Le Chat manipule l'eau, le feu, la terre ou l'air (au choix)." },
  { de: 37, a: 38, nom: "Cri assourdissant", desc: "Des ondes sonores puissantes désorientent les ennemis ou brisent des obstacles. Jet réussi : jusqu'à 1D6 dégâts.", degats: "1d6" },
  { de: 39, a: 40, nom: "Déplacement instantané", desc: "Le Chat se téléporte sur de courtes distances pour échapper aux attaques ou attaquer par surprise." },
  { de: 41, a: 42, nom: "Flexibilité extrême", desc: "Le Chat se tord et se plie dans des positions impossibles pour se faufiler dans les endroits les plus étroits." },
  { de: 43, a: 44, nom: "Force colossale", desc: "Force extraordinaire : le Chat pousse des objets massifs, jusqu'à une tonne." },
  { de: 45, a: 46, nom: "Génération de flammes", desc: "Le Chat génère et contrôle les flammes : boules de feu ou murs de flammes. Jet réussi : jusqu'à 1D6 dégâts.", degats: "1d6" },
  { de: 47, a: 48, nom: "Hypnose vocale", desc: "Le Chat hypnotise un animal ou un humain avec sa voix et influence ses actions." },
  { de: 49, a: 50, nom: "Illusion mentale", desc: "Le Chat projette des illusions directement dans l'esprit des autres, qui vivent des expériences sensorielles trompeuses." },
  { de: 51, a: 52, nom: "Instinct de chasseur", desc: "Un instinct de chasseur infaillible permet de repérer les proies." },
  { de: 53, a: 54, nom: "Intangibilité corporelle", desc: "Le corps du Chat devient intangible : il traverse les objets solides." },
  { de: 55, a: 56, nom: "Manipulation de l'électricité", desc: "Le Chat contrôle l'énergie électrique : éclairs et décharges. Jet réussi : jusqu'à 1D6 dégâts.", degats: "1d6" },
  { de: 57, a: 58, nom: "Manipulation de la mémoire", desc: "Le Chat altère les souvenirs des autres : il efface des événements ou implante de fausses informations." },
  { de: 59, a: 60, nom: "Manipulation des ombres", desc: "Le Chat se fond et se déplace à travers les ombres pour se cacher ou se déplacer furtivement." },
  { de: 61, a: 62, nom: "Manipulation du temps", desc: "Le Chat ralentit ou accélère le temps dans une zone restreinte. Jet réussi : il agit 2 fois." },
  { de: 63, a: 64, nom: "Marche silencieuse", desc: "Le Chat se déplace sans faire aucun bruit, pratiquement inaudible pour ses ennemis." },
  { de: 65, a: 66, nom: "Maîtrise des griffes", desc: "Les griffes sont utilisées avec une précision mortelle. Jet réussi : jusqu'à 1D6 dégâts.", degats: "1d6" },
  { de: 67, a: 68, nom: "Métamorphose animale", desc: "Le Chat se transforme en différentes créatures animales, avec leurs caractéristiques et capacités. Jet réussi : transformation pendant 1D6 minutes." },
  { de: 69, a: 70, nom: "Perception des émotions", desc: "Le Chat ressent les émotions des autres : il détecte les mensonges et reconnaît les intentions." },
  { de: 71, a: 72, nom: "Perception du passé", desc: "Le Chat voit les souvenirs et les événements passés en touchant des objets ou en se tenant dans des lieux chargés d'histoire." },
  { de: 73, a: 74, nom: "Perception magnétique", desc: "Le Chat détecte les champs magnétiques et s'oriente à travers eux." },
  { de: 75, a: 76, nom: "Perception surnaturelle", desc: "Une perception au-delà des capacités normales détecte indices et présences invisibles." },
  { de: 77, a: 78, nom: "Perception thermique", desc: "Le Chat détecte les sources de chaleur à distance : proies, objets cachés." },
  { de: 79, a: 80, nom: "Prémonition féline", desc: "Une intuition puissante permet de prévoir les événements futurs qui risquent de se produire." },
  { de: 81, a: 82, nom: "Régénération accélérée", desc: "Le Chat guérit rapidement blessures et maladies. Jet réussi : il se soigne de 1D6 PV.", degats: "1d6" },
  { de: 83, a: 84, nom: "Résistance aux poisons", desc: "Le Chat est naturellement immunisé contre la plupart des poisons, qu'il neutralise vite." },
  { de: 85, a: 86, nom: "Rugissement intimidant", desc: "Un rugissement puissant terrifie les ennemis et peut les paralyser de peur. Jet réussi : un adversaire est terrorisé 1D6 rounds." },
  { de: 87, a: 88, nom: "Sens aiguisés", desc: "Ouïe et vision exceptionnelles : les sons et mouvements les plus subtils sont détectés." },
  { de: 89, a: 90, nom: "Sensibilité émotionnelle", desc: "Le Chat ressent les émotions des autres à un niveau profond et lit leurs intentions et motivations." },
  { de: 91, a: 92, nom: "Souffle de noir", desc: "Le Chat projette une étrange brume noire des abysses qui plonge un adversaire dans une terreur incontrôlable. Jet réussi : l'adversaire est apeuré 1D6 tour(s)." },
  { de: 93, a: 94, nom: "Télépathie", desc: "Le Chat communique par la pensée et établit un lien mental pour partager des informations ou coordonner des actions." },
  { de: 95, a: 96, nom: "Vision infrarouge", desc: "Le Chat voit dans l'obscurité totale en détectant les émissions de chaleur." },
  { de: 97, a: 98, nom: "Visée parfaite", desc: "Une précision exceptionnelle permet de viser les points faibles. Jet réussi : les dégâts sont doublés." },
  { de: 99, a: 100, nom: "Volonté de fer", desc: "Une volonté inébranlable résiste aux tentatives de manipulation mentale ou de contrôle." }
];

export function pouvoirTemporaireParDe(d100) {
  return POUVOIRS_TEMPORAIRES.find((p) => d100 >= p.de && d100 <= p.a);
}
