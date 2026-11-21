/**
 * Journal du Chat (v0.18.0) : un carnet par Chat, rempli tout seul avec les moments marquants
 * (critiques, vie perdue ou regagnée, chute à 0 PV, pouvoir appris, attribut qui progresse, carte Folie gardée ou jouée,
 * XP gagnée, fin de scénario). Le joueur peut ajouter ses propres lignes et en effacer.
 * Rangé dans un drapeau de l'acteur ; chaque ligne note l'épisode en cours (dernier épisode du suivi de campagne).
 * Écrit par le client qui fait le changement (le propriétaire du Chat ou le Gardien) : pas de doublon, pas de droit manquant.
 */
import { SYSTEM_ID, ATTRIBUTS } from "./config.mjs";
import { lireJet } from "./cartes.mjs";

const MAX = 300;

export const TYPES = {
  "crit-reussite": { icone: "fa-solid fa-star", label: "Réussite critique" },
  "crit-echec": { icone: "fa-solid fa-skull-crossbones", label: "Échec critique" },
  vie: { icone: "fa-solid fa-heart-crack", label: "Vie de Chat" },
  sante: { icone: "fa-solid fa-heart-pulse", label: "Santé" },
  pouvoir: { icone: "fa-solid fa-wand-magic-sparkles", label: "Pouvoir" },
  progres: { icone: "fa-solid fa-arrow-trend-up", label: "Progrès" },
  folie: { icone: "fa-solid fa-brain", label: "Folie" },
  xp: { icone: "fa-solid fa-medal", label: "Expérience" },
  note: { icone: "fa-solid fa-feather", label: "Note" }
};

function episode() {
  try {
    const eps = game.settings.get(SYSTEM_ID, "suiviCampagne")?.episodes ?? [];
    const dernier = [...eps].reverse().find((e) => (e.titre ?? "").trim());
    return dernier?.titre.trim() ?? "";
  } catch (err) { return ""; }
}

export const lignes = (actor) => foundry.utils.deepClone(actor.getFlag(SYSTEM_ID, "journal") ?? []);
const entree = (type, texte) => ({ t: Date.now(), type, texte, ep: episode() });

/** Ajoute une ligne (le propriétaire du Chat ou le Gardien). */
const FILES = new Map(); // une file par Chat : plusieurs lignes d'affilée ne s'écrasent pas
export function ajouterEntree(actor, type, texte) {
  if (!actor?.isOwner || actor.type !== "chat") return Promise.resolve();
  const suite = (FILES.get(actor.uuid) ?? Promise.resolve()).then(async () => {
    const l = lignes(actor);
    l.push(entree(type, texte));
    await actor.setFlag(SYSTEM_ID, "journal", l.slice(-MAX));
  }).catch((err) => console.warn(`${SYSTEM_ID} | journal du Chat`, err));
  FILES.set(actor.uuid, suite);
  return suite;
}

export async function supprimerEntree(actor, t) {
  await actor.setFlag(SYSTEM_ID, "journal", lignes(actor).filter((e) => e.t !== t));
}

/** Lignes à ajouter d'après une mise à jour (avant qu'elle ne soit appliquée). */
function detecter(actor, changes) {
  const s = actor.system; const c = changes.system ?? {};
  const val = (chemin) => foundry.utils.getProperty(changes, chemin);
  const out = [];
  const finScenario = Array.isArray(c.cartesFolie) && !c.cartesFolie.length && val("system.xp") !== undefined && val("system.xp") > s.xp;
  const vies = val("system.vies.value");
  if (!finScenario && vies !== undefined && vies !== s.vies.value) {
    out.push(entree("vie", vies < s.vies.value ? `Perd une vie de Chat (il en reste ${vies}).` : `Regagne une vie de Chat (${vies}).`));
  }
  const pv = val("system.pv.value");
  if (!finScenario && pv !== undefined && pv <= 0 && s.pv.value > 0) out.push(entree("sante", "Tombe à 0 point de vie."));
  for (const [cle, attr] of Object.entries(c.attributs ?? {})) {
    if (attr?.progres !== undefined && attr.progres > s.attributs[cle].progres) {
      const gain = attr.progres - s.attributs[cle].progres;
      out.push(entree("progres", `${ATTRIBUTS[cle]?.label ?? cle} progresse : +${gain} (${s.attributs[cle].value + gain} %).`));
    }
  }
  const xp = val("system.xp");
  if (finScenario) {
    out.push(entree("xp", `Fin de scénario : +${xp - s.xp} XP${s.cartesFolie.length ? `, ${s.cartesFolie.length} carte(s) Folie non jouée(s)` : ""}.`));
  } else {
    if (xp !== undefined && xp > s.xp) out.push(entree("xp", `Gagne ${xp - s.xp} XP.`));
    if (Array.isArray(c.cartesFolie)) {
      const avant = [...s.cartesFolie];
      for (const t of c.cartesFolie) { const i = avant.indexOf(t); if (i >= 0) avant.splice(i, 1); else out.push(entree("folie", `Garde une carte Folie : « ${t} »`)); }
      for (const t of avant) out.push(entree("folie", `Joue une carte Folie : « ${t} »`));
    }
  }
  return out;
}

export function brancherJournalChat() {
  // Mises à jour du Chat : les lignes sont glissées dans la même mise à jour (aucune requête de plus).
  Hooks.on("preUpdateActor", (actor, changes) => {
    if (actor.type !== "chat" || foundry.utils.hasProperty(changes, `flags.${SYSTEM_ID}.journal`)) return;
    const nouvelles = detecter(actor, changes);
    if (nouvelles.length) foundry.utils.setProperty(changes, `flags.${SYSTEM_ID}.journal`, [...lignes(actor), ...nouvelles].slice(-MAX));
  });
  // Critiques : écrits par l'auteur du jet.
  Hooks.on("createChatMessage", async (message) => {
    if (!message.isAuthor) return;
    const j = lireJet(message);
    if (!j?.critique || !j.actorUuid) return;
    const actor = fromUuidSync(j.actorUuid);
    if (actor?.type !== "chat") return;
    await ajouterEntree(actor, j.critReussite ? "crit-reussite" : "crit-echec", `${j.critReussite ? "Réussite" : "Échec"} critique en ${j.quoi} (dé ${j.brut}).`);
  });
  // Pouvoirs appris (pas les copies faites pendant la création du personnage, regroupées en une ligne).
  Hooks.on("createItem", async (item, options, userId) => {
    if (userId !== game.user.id || item.type !== "pouvoir" || item.parent?.type !== "chat") return;
    const temp = item.system.categorie === "temporaire";
    await ajouterEntree(item.parent, "pouvoir", temp ? `Reçoit le pouvoir temporaire « ${item.name} ».` : `Apprend le pouvoir « ${item.name} ».`);
  });
}

/** Lignes prêtes pour la fiche (les plus récentes d'abord). */
export function lignesPourFiche(actor) {
  return lignes(actor).reverse().map((e) => ({
    ...e, ...(TYPES[e.type] ?? TYPES.note),
    date: new Date(e.t).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })
  }));
}
