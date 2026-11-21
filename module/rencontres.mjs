/**
 * Générateur de rencontres (v0.18.0), réservé au Gardien.
 * Le Gardien choisit un lieu et un niveau de danger ; le système tire un ou plusieurs adversaires du bestiaire,
 * une situation propre au lieu et une complication. Le résultat arrive dans le chat, visible du seul Gardien,
 * avec « Poser sur la scène » (jetons cachés, à révéler) et « Relancer ».
 */
import { SYSTEM_ID } from "./config.mjs";
import { saisir } from "./dialogues.mjs";

const esc = (t) => foundry.utils.escapeHTML(String(t ?? ""));
const hasard = (liste) => liste[Math.floor(Math.random() * liste.length)];
const PACK = `${SYSTEM_ID}.bestiaire`;

/** Lieux : créatures possibles (noms du bestiaire) et situations. */
export const LIEUX = {
  ville: {
    label: "Ville éveillée (Arkham, rues, port)",
    creatures: ["Rat", "Chien", "Corbeau", "Chat", "Fourrière", "Mafieu", "Sorcière", "Goule", "Profond", "Byahkee", "Migo", "Yith"],
    situations: [
      "Au détour d'une ruelle mouillée, quelque chose fouille les poubelles d'un restaurant fermé.",
      "Sur les quais, une caisse éventrée laisse échapper une odeur de marée et de sel.",
      "Un réverbère grésille et s'éteint ; dans le noir, des pas se rapprochent.",
      "Une fenêtre d'entresol est restée entrouverte : des voix murmurent à l'intérieur.",
      "Le marché du matin se vide d'un coup, comme si les humains avaient senti un danger.",
      "Sur les toits, une silhouette suit les Chats de cheminée en cheminée.",
      "Un camion stationne devant l'hôpital, moteur allumé, portes arrière grandes ouvertes.",
      "Au fond d'une impasse, une flaque reflète un ciel qui n'est pas celui d'Arkham."
    ]
  },
  campagne: {
    label: "Campagne (bois, fermes, marais)",
    creatures: ["Corbeau", "Serpent", "Chien", "Loup", "Sorcière", "Loup-Garou", "Profond", "Wendigo", "Migo"],
    situations: [
      "Une grange abandonnée grince au vent ; la paille y est fraîche et tassée.",
      "Le chemin creux s'enfonce sous les arbres et les oiseaux se taisent tous en même temps.",
      "Au bord du marais, des traces palmées mènent droit à l'eau noire.",
      "Un épouvantail a été retourné face à la forêt, les bras liés de corde neuve.",
      "Un feu de camp fume encore ; autour, des os rongés et un carnet détrempé.",
      "La brume monte des champs et étouffe les bruits de la ferme voisine.",
      "Un cercle de pierres dressées domine la colline, couvert de mousse sauf au centre.",
      "Le vent apporte un hurlement lointain, puis un second, beaucoup plus proche."
    ]
  },
  souterrains: {
    label: "Souterrains (cimetière, égouts, catacombes)",
    creatures: ["Rat", "Goule", "Serpent", "Chien Dimensionnel", "Tsathoggua", "Rhan-Tegoth", "Ghatanothoa", "Abhoth", "Ubbosathla"],
    situations: [
      "Une dalle du caveau a été déplacée de l'intérieur ; des griffures marquent la pierre.",
      "L'égout s'élargit en salle voûtée où l'eau clapote sans qu'aucun courant ne passe.",
      "Des ossements sont rangés par taille le long d'une galerie, avec un soin inquiétant.",
      "Un escalier taillé dans la roche descend bien plus bas que les fondations de la ville.",
      "La lanterne d'un fossoyeur est posée, allumée, au bord d'une tombe fraîchement ouverte.",
      "Un grondement sourd fait vibrer les murs, puis le silence revient d'un coup.",
      "Une odeur de terre mouillée et de chair ancienne remonte d'une bouche d'aération.",
      "Des inscriptions inconnues brillent faiblement sur les parois quand les Chats approchent."
    ]
  },
  ulthar: {
    label: "Ulthar et ses environs",
    creatures: ["Chat", "Rat", "Corbeau", "Chien", "Zoog", "Chat Saturne", "Sorcière", "Serpent"],
    situations: [
      "Sur la place aux pavés ronds, un marchand inconnu vend des cages vides.",
      "Le temple des Anciens Dieux sonne une cloche à une heure où personne ne prie.",
      "Au bord du Skai, des pêcheurs se disputent une prise qui se débat encore.",
      "Une maison penchée a ses volets clos depuis trois jours ; les chats du quartier l'évitent.",
      "Dans le bois voisin, des petits yeux brillent entre les racines des chênes.",
      "Un vieil homme raconte aux enfants une histoire de chats disparus — puis s'arrête net.",
      "La fête de la lune bat son plein quand une lanterne prend une couleur étrange.",
      "Un pont de pierre est barré par une ficelle tendue où pendent des grelots."
    ]
  },
  reve: {
    label: "Contrée du Rêve sauvage",
    creatures: ["Zoog", "Serpent", "Loup", "Chat Saturne", "Maigre Bête", "Byahkee", "Roi Jaune", "Bokrug", "Gnoph-Keh", "Être antique"],
    situations: [
      "La forêt enchantée change de forme à chaque pas ; le chemin du retour a disparu.",
      "Une lune trop grande se lève et sa lumière dessine des ombres qui ne suivent personne.",
      "Des escaliers flottent au-dessus d'un gouffre de nuages, menant vers une porte entrouverte.",
      "Un lac immobile reflète les Chats… avec un temps de retard.",
      "Le vent porte une musique lointaine, belle et fausse, qui donne envie de la suivre.",
      "Les ruines d'une ville de basalte sont couvertes de symboles qui changent quand on les regarde.",
      "Le sol se met à respirer doucement, comme le flanc d'une bête endormie.",
      "Une caravane de marchands aux turbans noirs propose un échange à un prix inquiétant."
    ]
  }
};

export const DANGERS = {
  faible: { label: "Faible", min: 0, max: 15 },
  moyen: { label: "Sérieux", min: 16, max: 45 },
  terrible: { label: "Terrible", min: 46, max: 999 },
  hasard: { label: "Au hasard", min: 0, max: 999 }
};

const COMPLICATIONS = [
  "Un humain arrive au pire moment et ne doit surtout rien voir.",
  "La sortie la plus proche se referme ou s'effondre.",
  "Un Chat est séparé du groupe pendant un instant.",
  "La créature n'est pas seule : un second adversaire attend en retrait.",
  "La créature cherche autre chose que les Chats et pourrait être évitée.",
  "Le temps presse : une horloge, une marée ou un rituel avance.",
  "Un objet précieux pour l'enquête est en jeu et risque d'être détruit.",
  "Le lieu provoque un jet de Folie dès qu'on y pénètre.",
  "Aucune complication : la rencontre est franche.",
  "L'adversaire peut être raisonné, menacé ou dupé plutôt que combattu."
];

/** Nombre d'adversaires : petits animaux en groupe, le reste seul. */
function nombre(pv) {
  if (pv <= 5) return 1 + Math.floor(Math.random() * 3);
  if (pv <= 12) return 1 + Math.floor(Math.random() * 2);
  return 1;
}

/** Tire une rencontre (sans l'afficher). */
export async function tirerRencontre(lieu = "ville", danger = "hasard") {
  const L = LIEUX[lieu] ?? LIEUX.ville;
  const D = DANGERS[danger] ?? DANGERS.hasard;
  const pack = game.packs.get(PACK);
  const docs = pack ? await pack.getDocuments() : [];
  const possibles = docs.filter((d) => L.creatures.includes(d.name));
  let choix = possibles.filter((d) => d.system.pv.max >= D.min && d.system.pv.max <= D.max);
  if (!choix.length) choix = possibles; // aucun adversaire de ce niveau ici : on prend ce que le lieu offre
  const creature = hasard(choix);
  return {
    lieu, danger, lieuLabel: L.label, dangerLabel: D.label,
    situation: hasard(L.situations),
    complication: hasard(COMPLICATIONS),
    creature: creature ? { uuid: creature.uuid, nom: creature.name, img: creature.img, pv: creature.system.pv.max, attaques: creature.system.attaques, pouvoir: creature.system.pouvoir } : null,
    nombre: creature ? nombre(creature.system.pv.max) : 0
  };
}

function carteRencontre(r) {
  const c = r.creature;
  const att = c ? c.attaques.map((a) => `${esc(a.nom)} ${a.pct} % (${esc(a.degats)})`).join(" · ") : "";
  return `<div class="mu-carte mu-carte-rencontre" data-lieu="${r.lieu}" data-danger="${r.danger}">
    <header><i class="fa-solid fa-dice-d20"></i> Rencontre — ${esc(r.lieuLabel)}</header>
    <p class="mu-r-danger">Danger : ${esc(r.dangerLabel)}</p>
    <p class="mu-r-situation">${esc(r.situation)}</p>
    ${c ? `<div class="mu-r-creature"><img src="${esc(c.img)}" alt=""><div><strong>${r.nombre > 1 ? `${r.nombre} × ` : ""}${esc(c.nom)}</strong>
      <small>${c.pv} PV · ${att}</small>${c.pouvoir ? `<small>Pouvoir : ${esc(c.pouvoir)}</small>` : ""}</div></div>` : "<p>Aucun adversaire trouvé dans le bestiaire.</p>"}
    <p class="mu-r-complication"><b>Complication :</b> ${esc(r.complication)}</p>
    <div class="mu-boutons">
      ${c ? `<button type="button" data-mu="rencontre-poser" data-uuid="${esc(c.uuid)}" data-nombre="${r.nombre}"><i class="fa-solid fa-chess-pawn"></i> Poser sur la scène</button>` : ""}
      <button type="button" data-mu="rencontre-relancer"><i class="fa-solid fa-rotate"></i> Relancer</button>
    </div></div>`;
}

/** Envoie une rencontre dans le chat, au Gardien seulement. */
export async function annoncerRencontre(lieu, danger) {
  const r = await tirerRencontre(lieu, danger);
  return ChatMessage.create({
    content: carteRencontre(r),
    whisper: game.users.filter((u) => u.isGM).map((u) => u.id),
    speaker: { alias: "Rencontre" },
    flags: { [SYSTEM_ID]: { rencontre: { lieu, danger } } }
  });
}

/** Fenêtre de choix (lieu et danger), puis tirage. */
export async function rencontre() {
  if (!game.user.isGM) return ui.notifications.warn("Le générateur de rencontres est réservé au Gardien.");
  const dernier = game.settings.get(SYSTEM_ID, "derniereRencontre") ?? {};
  const lieu = LIEUX[dernier.lieu] ? dernier.lieu : (game.settings.get(SYSTEM_ID, "lieuParDefaut") || "ville");
  const danger = DANGERS[dernier.danger] ? dernier.danger : "hasard";
  const pastilles = (nom, liste, actif) => `<div class="mu-r-choix">${Object.entries(liste).map(([k, v]) =>
    `<label class="mu-r-pastille ${k === actif ? "on" : ""}"><input type="radio" name="${nom}" value="${k}" ${k === actif ? "checked" : ""}>${esc(v.label)}</label>`).join("")}</div>`;
  const html = `<p class="mu-dlg-titre">Où se trouvent les Chats ?</p>${pastilles("lieu", LIEUX, lieu)}
    <p class="mu-dlg-titre">Quel danger ?</p>${pastilles("danger", DANGERS, danger)}`;
  const choix = await saisir({
    titre: "Générateur de rencontres", html, image: "attaque", ok: "Tirer la rencontre",
    callback: (event, button) => ({ lieu: button.form.elements.lieu.value, danger: button.form.elements.danger.value })
  });
  if (!choix) return null;
  await game.settings.set(SYSTEM_ID, "derniereRencontre", choix);
  return annoncerRencontre(choix.lieu, choix.danger);
}

/** Importe l'adversaire (une seule fois) et pose ses jetons, cachés, au centre de la vue. */
async function poser(uuid, nombre) {
  if (!canvas?.scene) return ui.notifications.warn("Aucune scène affichée.");
  const source = await fromUuid(uuid);
  if (!source) return;
  let acteur = game.actors.find((a) => a.getFlag(SYSTEM_ID, "source") === uuid);
  if (!acteur) {
    let dossier = game.folders.find((f) => f.type === "Actor" && f.name === "Rencontres");
    dossier ??= await Folder.create({ name: "Rencontres", type: "Actor", color: "#7a1f1a" });
    const data = game.actors.fromCompendium(source);
    data.folder = dossier.id;
    data.flags = foundry.utils.mergeObject(data.flags ?? {}, { [SYSTEM_ID]: { source: uuid } });
    data.prototypeToken = foundry.utils.mergeObject(data.prototypeToken ?? {}, { actorLink: false });
    acteur = await Actor.create(data);
  }
  const { x, y } = canvas.stage.pivot;
  const g = canvas.grid.size;
  const jetons = [];
  for (let i = 0; i < nombre; i++) {
    const td = await acteur.getTokenDocument({ x: Math.round(x - g / 2 + (i % 3) * g), y: Math.round(y - g / 2 + Math.floor(i / 3) * g), hidden: true });
    jetons.push(td.toObject());
  }
  await canvas.scene.createEmbeddedDocuments("Token", jetons);
  ui.notifications.info(`${nombre} × ${acteur.name} posé${nombre > 1 ? "s" : ""} sur la scène, caché${nombre > 1 ? "s" : ""} : à révéler au bon moment.`);
}

export function enregistrerParametresRencontres() {
  game.settings.register(SYSTEM_ID, "derniereRencontre", { scope: "world", config: false, type: Object, default: {} });
  game.settings.register(SYSTEM_ID, "lieuParDefaut", { scope: "world", config: false, type: String, default: "ville" });
}

/** Boutons des cartes de rencontre (Gardien seulement). */
export function brancherRencontres() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    if (!game.user.isGM) return;
    html.querySelector("[data-mu='rencontre-poser']")?.addEventListener("click", (ev) => poser(ev.currentTarget.dataset.uuid, Number(ev.currentTarget.dataset.nombre) || 1));
    html.querySelector("[data-mu='rencontre-relancer']")?.addEventListener("click", () => {
      const { lieu, danger } = message.getFlag(SYSTEM_ID, "rencontre") ?? {};
      annoncerRencontre(lieu, danger);
    });
  });
}
