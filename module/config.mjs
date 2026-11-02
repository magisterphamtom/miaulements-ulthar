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

// Nombre de cases d'échec à cocher avant de monter un attribut : 6 petites cases autour de chaque
// cercle d'attribut sur la fiche papier officielle (comptées sur l'image).
export const CASES_ECHEC = 6;

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

// Coordonnées (en pixels de l'image officielle de la fiche, 1716 × 2492) pour poser les champs sur la fiche papier.
export const FICHE = {
  "largeur": 1716,
  "hauteur": 2492,
  "image": "systems/miaulements-ulthar/assets/fiche-chat.png",
  "cercles": {
    "chn": {
      "x": 559,
      "y": 828,
      "cases": [
        [
          495,
          755
        ],
        [
          470,
          773
        ],
        [
          452,
          796
        ],
        [
          447,
          826
        ],
        [
          452,
          856
        ],
        [
          468,
          879
        ]
      ]
    },
    "phy": {
      "x": 1185,
      "y": 828,
      "cases": [
        [
          1249,
          755
        ],
        [
          1274,
          773
        ],
        [
          1292,
          796
        ],
        [
          1297,
          826
        ],
        [
          1292,
          856
        ],
        [
          1276,
          879
        ]
      ]
    },
    "cha": {
      "x": 532,
      "y": 993,
      "cases": [
        [
          450,
          932
        ],
        [
          432,
          954
        ],
        [
          420,
          986
        ],
        [
          422,
          1016
        ],
        [
          434,
          1044
        ],
        [
          455,
          1064
        ]
      ]
    },
    "agi": {
      "x": 1212,
      "y": 993,
      "cases": [
        [
          1294,
          932
        ],
        [
          1312,
          954
        ],
        [
          1324,
          986
        ],
        [
          1322,
          1016
        ],
        [
          1310,
          1044
        ],
        [
          1289,
          1064
        ]
      ]
    },
    "int": {
      "x": 595,
      "y": 1152,
      "cases": [
        [
          503,
          1108
        ],
        [
          490,
          1134
        ],
        [
          484,
          1168
        ],
        [
          494,
          1198
        ],
        [
          510,
          1222
        ],
        [
          534,
          1238
        ]
      ]
    },
    "dis": {
      "x": 1149,
      "y": 1152,
      "cases": [
        [
          1241,
          1108
        ],
        [
          1254,
          1134
        ],
        [
          1260,
          1168
        ],
        [
          1250,
          1198
        ],
        [
          1234,
          1222
        ],
        [
          1210,
          1238
        ]
      ]
    },
    "per": {
      "x": 742,
      "y": 1263,
      "cases": [
        [
          639,
          1272
        ],
        [
          641,
          1303
        ],
        [
          655,
          1335
        ],
        [
          678,
          1355
        ],
        [
          704,
          1368
        ],
        [
          732,
          1368
        ]
      ]
    },
    "pre": {
      "x": 1002,
      "y": 1263,
      "cases": [
        [
          1105,
          1272
        ],
        [
          1103,
          1303
        ],
        [
          1089,
          1335
        ],
        [
          1066,
          1355
        ],
        [
          1040,
          1368
        ],
        [
          1012,
          1368
        ]
      ]
    }
  },
  "champs": {
    "surnom": [
      250,
      505,
      545,
      555
    ],
    "race": [
      200,
      615,
      545,
      665
    ],
    "description": [
      1200,
      562,
      1632,
      668
    ],
    "pv": [
      286,
      1548
    ],
    "vies": [
      426,
      1548
    ],
    "pm": [
      870,
      1552
    ],
    "pf": [
      1206,
      1552
    ],
    "xp": [
      1540,
      1552
    ],
    "innes": [
      100,
      1768,
      750,
      2215
    ],
    "temporaires": [
      975,
      1768,
      1630,
      2215
    ]
  }
};
