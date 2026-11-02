// Données fermes du système (une seule source de vérité : fiches, jets, wiki, compendiums).
export const SYSTEM_ID = "miaulements-ulthar";

// Ordre d'affichage = ordre de la fiche papier (cercle de gauche à droite).
export const ATTRIBUTS = {
  chn: { label: "Chance", abbr: "CHN" },
  phy: { label: "Physique", abbr: "PHY" },
  cha: { label: "Charisme", abbr: "CHA" },
  agi: { label: "Agilité", abbr: "AGI" },
  int: { label: "Intelligence", abbr: "INT" },
  dis: { label: "Discrétion", abbr: "DIS" },
  per: { label: "Perception", abbr: "PER" },
  pre: { label: "Précision", abbr: "PRE" }
};

// Nombre de cases d'échec à cocher avant de monter un attribut.
// À VÉRIFIER sur la fiche papier / le livre (p.65) : valeur provisoire.
export const CASES_ECHEC = 5;

// Modificateur de difficulté ajouté au jet de dé.
export const DIFFICULTES = {
  "-40": "Très facile (−40)",
  "-20": "Facile (−20)",
  "0": "Normal (0)",
  "20": "Difficile (+20)",
  "40": "Très difficile (+40)"
};

// Mode de jeu : seuils de critique (sur le jet brut) et options.
// Pulp : 0-9 / 91-00 ; Serious Cat et co-investigation : ≤5 / ≥96.
export const MODES = {
  pulp: { label: "Pulp (débutants, action)", critReussite: 10, critEchec: 91, retenter: true, combo: true, viesChat: true },
  serious: { label: "Serious Cat (sombre)", critReussite: 5, critEchec: 96, retenter: false, combo: false, viesChat: true },
  coinvestigation: { label: "Co-investigation", critReussite: 5, critEchec: 96, retenter: false, combo: false, viesChat: false }
};

// Table PV : somme PHY + AGI -> PV.
export const TABLE_PV = [
  { max: 39, pv: 1 },
  { max: 59, pv: 2 },
  { max: 89, pv: 3 },
  { max: 109, pv: 4 },
  { max: 119, pv: 5 },
  { max: 139, pv: 6 },
  { max: Infinity, pv: 7 }
];

// Races : bonus/malus de 10 sur deux attributs, deux pouvoirs de race (un seul à choisir).
export const RACES = {
  bengal: { label: "Bengal", plus: "agi", moins: "dis", pouvoirs: ["Ombre envoûtante", "Téléportation courte"] },
  gouttiere: { label: "Chat de gouttière", plus: null, moins: null, libre: 5, pouvoirs: ["Aubaine incroyable", "Sixième sens"] },
  cornish: { label: "Cornish Rex", plus: "dis", moins: "pre", pouvoirs: ["Illusion féerique", "Ombre enveloppante"] },
  mainecoon: { label: "Maine Coon", plus: "phy", moins: "per", pouvoirs: ["Force légendaire", "Guérison accélérée"] },
  norvegien: { label: "Norvégien", plus: "phy", moins: "int", pouvoirs: ["Peau de cuir", "Bond extraordinaire"] },
  persan: { label: "Persan", plus: "cha", moins: "phy", pouvoirs: ["Charme délicat", "Lien émotionnel"] },
  savannah: { label: "Savannah", plus: "pre", moins: "cha", pouvoirs: ["Camouflage naturel", "Flèche lumineuse"] },
  scottish: { label: "Scottish Fold", plus: "int", moins: "agi", pouvoirs: ["Guérison réconfortante", "Marche de velours"] },
  // À VÉRIFIER : p.17 donne DIS −10, la page de race (p.41) dit « défaut : Charisme ».
  siamois: { label: "Siamois", plus: "per", moins: "dis", pouvoirs: ["Écoute perçante", "Vision à travers"] },
  sphynx: { label: "Sphynx", plus: "int", moins: "phy", pouvoirs: ["Analyse situationnelle", "Vision des conséquences"] }
};

export const CATEGORIES_POUVOIR = {
  inne: "Pouvoir inné",
  race: "Pouvoir de race",
  temporaire: "Pouvoir temporaire"
};

// 20 actions de folie (table p.52).
export const ACTIONS_FOLIE = [
  "Chasser une ombre inexistante.",
  "Fixer intensément un mur blanc comme s'il y avait quelque chose.",
  "Courir frénétiquement d'une pièce à l'autre sans raison apparente.",
  "Sursauter brusquement en réaction à un son imperceptible pour les autres.",
  "Se cacher dans des endroits insolites comme des boîtes trop petites.",
  "Miauler de manière excessive sans aucune provocation.",
  "Avaler des objets non comestibles, comme des élastiques ou des bouts de plastique.",
  "Essayer de grimper sur un mur lisse frénétiquement.",
  "Gratter frénétiquement un objet.",
  "Se toiletter de manière excessive.",
  "Se mettre en position de chasse et feindre une attaque contre des objets.",
  "Fixer longuement son propre reflet dans un miroir.",
  "Se coucher sur le dos et se comporter comme s'il était mort.",
  "Agir agressivement envers d'autres chats.",
  "Courir en rond en poursuivant sa propre queue.",
  "Attraper et jouer avec des proies imaginaires.",
  "Refuser catégoriquement de marcher sur certaines surfaces comme les tapis, le carrelage…",
  "Chercher frénétiquement quelque chose de perdu qui n'existe pas.",
  "Passer de la joie à la terreur sans raison apparente.",
  "Communiquer avec des entités invisibles."
];

// Coûts XP de fin de scénario.
export const ACHATS_XP = {
  pm: { cout: 2, gain: 10, label: "+10 Points de Magie" },
  pv: { cout: 2, gain: 1, label: "+1 Point de Santé" },
  vies: { cout: 4, gain: 1, label: "+1 Vie de chat" }
};
