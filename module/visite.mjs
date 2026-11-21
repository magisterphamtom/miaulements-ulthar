/**
 * Visites guidées du système (v0.20.0), sur le modèle des visites de Foundry (foundry.nue.Tour).
 * - « Découvrir les Miaulements » (joueurs) : wiki, fiche de Chat, jets, réglages, fenêtre Les Chats.
 * - « Les outils du Gardien » (Gardien) : wiki du Gardien, tableau, rencontres, Gazette, paquet Folie, voile, suivi, compendiums.
 * Lancée toute seule à la première connexion de chaque utilisateur, relançable depuis « Visites guidées »
 * (réglages de Foundry), la macro du compendium ou game.miaulementsUlthar.visite().
 * Habillage « parchemin à sceau » (choix de Stéphane) : bulle de parchemin bordée de rouge, sceau de cire à la patte,
 * progression en petits points.
 */
import { SYSTEM_ID } from "./config.mjs";

const Tour = foundry.nue.Tour;
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/** Attend qu'un élément apparaisse (fenêtre en cours d'ouverture), 2,5 s au plus. */
async function attendreElement(selecteur) {
  for (let i = 0; i < 25; i++) {
    if (document.querySelector(selecteur)) return true;
    await attendre(100);
  }
  return false;
}

const monChat = () => game.user.character?.type === "chat" ? game.user.character
  : game.actors.find((a) => a.type === "chat" && a.isOwner && (!game.user.isGM || a.hasPlayerOwner)) ?? game.actors.find((a) => a.type === "chat" && a.isOwner);

const ficheId = () => monChat()?.sheet?.id;
const journalOuvert = () => [...foundry.applications.instances.values()].find((a) => a.document?.documentName === "JournalEntry" && a.rendered);

/** Préparations nommées : ouvrent ce qu'il faut avant l'étape. */
const PREPARER = {
  wiki: async (quel) => { await game.miaulementsUlthar.wiki(quel); await attendre(600); const j = journalOuvert(); return j ? `#${j.id}` : null; },
  fiche: async (sous) => {
    const a = monChat(); if (!a) return null;
    if (!a.sheet.rendered) { await a.sheet.render(true); await attendre(700); }
    a.sheet.bringToFront?.();
    if (sous === ".mu-onglet-actif") return `#${a.sheet.id} nav.mu-onglets`;
    return `#${a.sheet.id} ${sous}`;
  },
  fermerFiche: async () => { const a = monChat(); if (a?.sheet.rendered) await a.sheet.close(); return null; },
  outil: async (outil) => { if (ui.controls?.control?.name !== "tokens") await ui.controls?.activate?.({ control: "tokens" }); await attendre(200); return `[data-tool="${outil}"]`; },
  barre: async (onglet) => `button[data-action="tab"][data-tab="${onglet}"]`,
  tableau: async (sous) => { if (!foundry.applications.instances.get("mu-tableau-gardien")?.rendered) { game.miaulementsUlthar.tableau(); await attendre(700); } return `#mu-tableau-gardien ${sous}`; },
  fermerTableau: async () => { const t = foundry.applications.instances.get("mu-tableau-gardien"); if (t?.rendered) await t.close(); return null; }
};

export class VisiteMiaulements extends Tour {
  /** Avant chaque étape : ouvrir la bonne fenêtre et viser le bon élément ; à défaut, étape au centre de l'écran. */
  async _preStep() {
    await super._preStep();
    const step = this.currentStep;
    if (!step) return;
    step._selecteur ??= step.selector ?? "";
    let sel = step._selecteur;
    for (const [nom, arg] of step.preparer ?? []) {
      const r = await PREPARER[nom]?.(arg);
      if (r) sel = r;
    }
    step.selector = sel && (await attendreElement(sel)) ? sel : "";
  }

  async _renderStep() {
    await super._renderStep();
    const bulle = this.currentStep?.selector ? game.tooltip.tooltip : this.targetElement;
    if (!bulle) return;
    bulle.classList.add("mu-visite");
    const progres = bulle.querySelector(".progress");
    if (progres) {
      const i = this.stepIndex, n = this.steps.length;
      progres.innerHTML = `<span class="mu-visite-points">${Array.from({ length: n }, (_, k) => `<i class="${k <= i ? "fait" : ""}"></i>`).join("")}</span><span class="mu-visite-num">${i + 1} / ${n}</span>`;
    }
    if (!bulle.querySelector(".mu-visite-sceau")) {
      const sceau = document.createElement("span");
      sceau.className = "mu-visite-sceau";
      sceau.innerHTML = `<i class="fa-solid fa-paw"></i>`;
      bulle.append(sceau);
    }
  }

  async _postStep() {
    game.tooltip.tooltip?.classList.remove("mu-visite");
    game.tooltip.tooltip?.querySelector(".mu-visite-sceau")?.remove();
    return super._postStep();
  }
}

const JOUEUR = {
  title: "Découvrir les Miaulements d'Ulthar",
  description: "Le wiki, la fiche de Chat, les jets et tes réglages, pas à pas.",
  canBeResumed: true, display: true,
  steps: [
    { id: "bienvenue", title: "Bienvenue à Ulthar !", content: "Tu vas incarner un <b>Chat d'Ulthar</b>, gardien secret contre l'horreur qui rôde.\nCette petite visite te montre où tout se trouve. Tu peux la quitter à tout moment avec la croix, et la relancer plus tard." },
    { id: "wiki", title: "Le wiki des joueurs", content: "Il s'ouvre tout seul à chaque connexion : l'univers, la création d'un Chat, les règles, les pouvoirs et les races.\nLes liens soulignés mènent d'une page à l'autre.", preparer: [["wiki", "joueur"]], tooltipDirection: "RIGHT" },
    { id: "fiche", title: "Ta fiche de Chat", content: "Elle reprend la fiche officielle du jeu. Les valeurs se calculent toutes seules : Santé, Magie, Folie, vies et XP.", preparer: [["fiche", ".mu-entete-chat"]], tooltipDirection: "DOWN" },
    { id: "theme", title: "Choisis ton thème", content: "Ce menu change l'habillage de ta fiche, de tes fenêtres et de tes cartes de jet : Nuit d'Arkham, Grimoire d'Ulthar, Contrée du Rêve ou Journal d'Arkham.\nTon choix vaut pour toutes tes fiches.", preparer: [["fiche", ".mu-choix-theme"]], tooltipDirection: "DOWN" },
    { id: "onglets", title: "Les oreilles de chat", content: "Ces marque-pages ouvrent les parties de ta fiche : Fiche, Création, Pouvoirs, Folie et progression, Notes (où s'écrit tout seul le <b>journal de ton Chat</b>).", preparer: [["fiche", ".mu-onglet-actif"]], tooltipDirection: "LEFT" },
    { id: "attributs", title: "Lancer un jet", content: "Clique sur un attribut pour lancer un jet. Une fenêtre s'ouvre : tu choisis la difficulté en piochant une carte, et tu peux utiliser un pouvoir.\nLe résultat arrive dans la messagerie.", preparer: [["fiche", ".mu-attr-jet"]], tooltipDirection: "RIGHT" },
    { id: "pastilles", title: "Les pastilles", content: "Un clic retire un point, un clic droit en rend un : Santé, Magie, Folie, vies de Chat et XP.", preparer: [["fiche", ".mu-entete-jauges"]], tooltipDirection: "DOWN" },
    { id: "menu", title: "Le menu ⋮", content: "Il contient l'<b>assistant de création</b>, pour créer ton Chat pas à pas, et le tirage des <b>pouvoirs temporaires</b> en début d'aventure.", preparer: [["fiche", '[data-action="toggleControls"]']], tooltipDirection: "LEFT" },
    { id: "chats", title: "Les Chats du groupe", content: "Ce bouton ouvre la fenêtre <b>Les Chats</b> : la Santé, la Magie, la Folie et les vies de tes compagnons connectés.", preparer: [["fermerFiche"], ["outil", "mu-suivi"]], tooltipDirection: "RIGHT" },
    { id: "reglages", title: "Tes réglages", content: "Dans <b>Paramètres › Configurer les paramètres › Les Miaulements d'Ulthar</b>, tu peux couper pour toi les vies sur les jetons, les effets de critique ou la secousse de l'écran.", preparer: [["barre", "settings"]], tooltipDirection: "LEFT" },
    { id: "fin", title: "À toi de jouer !", content: "Que Bast veille sur tes neuf vies.\nPour revoir cette visite : <b>Paramètres › Visites guidées</b>." }
  ]
};

const GARDIEN = {
  title: "Les outils du Gardien",
  description: "Le wiki du Gardien, le tableau de bord, les rencontres, la Gazette, le paquet Folie et le suivi de campagne.",
  canBeResumed: true, display: true, restricted: true,
  steps: [
    { id: "bienvenue", title: "Bienvenue, Gardien", content: "Cette visite te montre tes outils pour mener une partie des Miaulements d'Ulthar.\nTu peux la quitter à tout moment avec la croix." },
    { id: "wiki", title: "Le wiki du Gardien", content: "Guide du maître de jeu, univers de Lovecraft, scénario d'initiation, écran du MJ et bestiaire.\nIl s'ouvre tout seul pour toi à chaque lancement.", preparer: [["wiki", "gardien"]], tooltipDirection: "RIGHT" },
    { id: "bouton", title: "Le tableau du Gardien", content: "Ce bouton ouvre ton tableau de bord : tout ce qu'il faut surveiller pendant la partie, dans une seule fenêtre.", preparer: [["outil", "mu-tableau"]], tooltipDirection: "RIGHT" },
    { id: "outils", title: "Tes outils", content: "<b>Rencontre</b> : un adversaire, une situation et une complication selon le lieu. <b>Gazette</b> : une une de journal pour toute la table. <b>Paquet Folie</b> : les cartes et la main de chaque Chat.\nEt aussi la Folie du groupe, le début d'aventure et la fin de scénario.", preparer: [["tableau", ".mu-tab-outils"]], tooltipDirection: "DOWN" },
    { id: "suivi", title: "Chats, adversaires et jets", content: "Ici, l'état de chaque Chat de joueur, les adversaires posés sur la scène (PV, attaques) et les derniers jets de la table.", preparer: [["tableau", ".mu-tab-defile"]], tooltipDirection: "LEFT" },
    { id: "voile", title: "Le voile de rêve", content: "Il se pose tout seul pendant une bulle onirique ; ce bouton te permet aussi de l'allumer ou de l'éteindre pour toute la table.", preparer: [["fermerTableau"], ["outil", "mu-voile"]], tooltipDirection: "RIGHT" },
    { id: "campagne", title: "Le suivi de campagne", content: "Les fiches de suivi du livre des scénarios : les Chats et leur histoire, les épisodes joués.", preparer: [["outil", "mu-campagne"]], tooltipDirection: "RIGHT" },
    { id: "compendiums", title: "Les compendiums", content: "Pouvoirs, prétirés, bestiaire, scénarios, tables, scènes et macros : tout le contenu des livres, prêt à glisser sur la scène.", preparer: [["barre", "compendium"]], tooltipDirection: "LEFT" },
    { id: "fin", title: "Bonne partie !", content: "Pour revoir cette visite : <b>Paramètres › Visites guidées</b>.\nTes joueurs ont leur propre visite, lancée à leur première connexion." }
  ]
};

export function enregistrerParametresVisite() {
  game.settings.register(SYSTEM_ID, "visiteVue", { scope: "user", config: false, type: Boolean, default: false });
}

export async function enregistrerVisites() {
  game.tours.register(SYSTEM_ID, "decouverte", new VisiteMiaulements(foundry.utils.deepClone(JOUEUR), { id: "decouverte", namespace: SYSTEM_ID }));
  game.tours.register(SYSTEM_ID, "gardien", new VisiteMiaulements(foundry.utils.deepClone(GARDIEN), { id: "gardien", namespace: SYSTEM_ID }));
}

/** Lance la visite du joueur, ou celle du Gardien (quel = "joueur" | "gardien", par défaut selon l'utilisateur). */
export async function visite(quel) {
  const cle = (quel ?? (game.user.isGM ? "gardien" : "joueur")) === "gardien" ? "gardien" : "decouverte";
  const t = game.tours.get(`${SYSTEM_ID}.${cle}`);
  if (!t) return;
  t.reset?.();
  return t.start();
}

/** Première connexion : la visite démarre une fois le wiki ouvert. */
export function lancerPremiereVisite() {
  let vue = true;
  try { vue = game.settings.get(SYSTEM_ID, "visiteVue"); } catch (err) { /* réglage absent */ }
  if (vue) return;
  setTimeout(async () => {
    await game.settings.set(SYSTEM_ID, "visiteVue", true);
    visite();
  }, 3500);
}
