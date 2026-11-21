/**
 * Paquet de cartes Folie natif (v0.18.0).
 * Les 20 actions de Folie deviennent un vrai paquet Foundry (« Paquet Folie ») avec sa défausse :
 * un jet de Folie raté pioche dans le paquet (plus de doublon tant qu'il n'est pas vide), la carte va à la défausse,
 * et le paquet est remélangé tout seul quand il est épuisé. Le Chat qui « garde la carte » l'a dans sa main (fiche).
 * Fenêtre du Gardien : cartes restantes, défausse, main de chaque Chat, remélanger.
 */
import { SYSTEM_ID, ACTIONS_FOLIE } from "./config.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const THEMES = ["nuit", "grimoire", "reve", "journal"];
const FACE = `systems/${SYSTEM_ID}/assets/cartes-folie/face.svg`;
const DOS = `systems/${SYSTEM_ID}/assets/cartes-folie/dos.svg`;

const trouver = (role) => game.cards.find((c) => c.getFlag(SYSTEM_ID, "folie") === role);
export const paquet = () => trouver("paquet");
export const defausse = () => trouver("defausse");

function theme() {
  let t = "";
  try { t = game.settings.get(SYSTEM_ID, "themeFiche"); } catch (err) { /* réglage absent */ }
  return THEMES.includes(t) ? t : "nuit";
}

/** Crée le paquet et la défausse s'ils n'existent pas (Gardien actif seulement). Les joueurs peuvent y piocher. */
export async function assurerPaquet() {
  if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
  if (!game.settings.get(SYSTEM_ID, "paquetFolie")) return;
  const proprio = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER };
  if (!paquet()) {
    const cards = ACTIONS_FOLIE.map((texte, i) => ({
      name: `Folie ${String(i + 1).padStart(2, "0")}`, type: "base", value: i + 1, description: `<p>${texte}</p>`,
      faces: [{ name: "Carte Folie", img: FACE, text: `<p>${texte}</p>` }], face: null, back: { name: "Folie", img: DOS }, sort: i
    }));
    const d = await Cards.create({ name: "Paquet Folie", type: "deck", img: DOS, ownership: proprio, flags: { [SYSTEM_ID]: { folie: "paquet" } }, cards,
      description: "<p>Les cartes Folie des Miaulements d'Ulthar. Un jet de Folie raté pioche ici ; le paquet se remélange tout seul quand il est vide.</p>" });
    await d.shuffle({ chatNotification: false });
  }
  if (!defausse()) {
    await Cards.create({ name: "Défausse Folie", type: "pile", img: DOS, ownership: proprio, flags: { [SYSTEM_ID]: { folie: "defausse" } } });
  }
}

const texteCarte = (carte) => {
  const html = carte?.faces?.[0]?.text || carte?.description || "";
  return new DOMParser().parseFromString(html, "text/html").body.textContent.trim();
};

/**
 * Pioche une carte Folie : du paquet vers la défausse. Renvoie son texte, ou null si le paquet n'existe pas
 * (le jet de Folie tire alors au hasard comme avant).
 */
export async function piocherFolie() {
  const d = paquet(); const p = defausse();
  if (!d || !p || !game.settings.get(SYSTEM_ID, "paquetFolie")) return null;
  try {
    let remelange = false;
    if (!d.availableCards.length) {
      await d.recall({ chatNotification: false });
      await d.shuffle({ chatNotification: false });
      remelange = true;
    }
    const [carte] = await p.draw(d, 1, { how: CONST.CARD_DRAW_MODES.TOP, chatNotification: false });
    if (!carte) return null;
    return { texte: texteCarte(carte), remelange, restantes: d.availableCards.length };
  } catch (err) {
    console.warn(`${SYSTEM_ID} | pioche Folie impossible`, err);
    return null;
  }
}

/** Ramène toutes les cartes dans le paquet et le mélange. */
export async function remelanger() {
  const d = paquet();
  if (!d) return;
  await d.recall({ chatNotification: false });
  await d.shuffle({ chatNotification: false });
}

export function enregistrerParametresPaquet() {
  game.settings.register(SYSTEM_ID, "paquetFolie", {
    name: "Paquet de cartes Folie",
    hint: "Les jets de Folie ratés piochent dans un vrai paquet Foundry (sans doublon jusqu'au remélange). Désactivé : carte tirée au hasard.",
    scope: "world", config: true, type: Boolean, default: true,
    onChange: (v) => { if (v) assurerPaquet(); }
  });
}

export class FenetrePaquet extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "mu-paquet-folie",
    classes: ["miaulements-ulthar", "mu-dialogue", "mu-paquet"],
    window: { title: "Paquet Folie", icon: "fa-solid fa-layer-group", resizable: true },
    position: { width: 520, height: 560 },
    actions: { remelanger: FenetrePaquet.#remelanger, voirPaquet: FenetrePaquet.#voirPaquet, voirDefausse: FenetrePaquet.#voirDefausse, ouvrir: FenetrePaquet.#ouvrir }
  };

  static PARTS = { corps: { template: `systems/${SYSTEM_ID}/templates/paquet-folie.hbs`, scrollable: [".mu-paquet-mains"] } };

  static instance = null;
  static async ouvrir() {
    if (!game.user.isGM) return ui.notifications.warn("Le paquet Folie se gère côté Gardien.");
    await assurerPaquet();
    const app = (FenetrePaquet.instance ??= new FenetrePaquet());
    app.render({ force: true });
    return app;
  }

  async _prepareContext() {
    const d = paquet(); const p = defausse();
    const derniere = p?.cards.contents.sort((a, b) => (b.sort ?? 0) - (a.sort ?? 0))[0];
    return {
      actif: game.settings.get(SYSTEM_ID, "paquetFolie"),
      restantes: d?.availableCards.length ?? 0, total: d?.cards.size ?? 0,
      defausse: p?.cards.size ?? 0, derniere: derniere ? texteCarte(derniere) : "", dos: DOS, face: FACE,
      mains: game.actors.filter((a) => a.type === "chat" && a.hasPlayerOwner).map((a) => ({ uuid: a.uuid, nom: a.name, img: a.img, cartes: a.system.cartesFolie }))
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    for (const t of THEMES) this.element.classList.toggle(`mu-theme-${t}`, t === theme());
  }

  static async #remelanger() {
    await remelanger();
    ui.notifications.info("Toutes les cartes Folie sont revenues dans le paquet, mélangé.");
    this.render();
  }
  static #voirPaquet() { paquet()?.sheet.render(true); }
  static #voirDefausse() { defausse()?.sheet.render(true); }
  static #ouvrir(event, target) { fromUuidSync(target.closest("[data-uuid]")?.dataset.uuid)?.sheet.render(true); }
}

/** Rafraîchit la fenêtre quand le paquet, la défausse ou une main change. */
export function brancherPaquet() {
  const rafraichir = foundry.utils.debounce(() => { if (FenetrePaquet.instance?.rendered) FenetrePaquet.instance.render(); }, 250);
  for (const h of ["createCard", "deleteCard", "updateCard", "updateCards"]) Hooks.on(h, () => rafraichir());
  Hooks.on("updateActor", (a, ch) => { if (ch.system && "cartesFolie" in ch.system) rafraichir(); });
}
