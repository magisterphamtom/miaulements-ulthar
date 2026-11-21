/**
 * Tableau de bord du Gardien (v0.18.0) : tout ce qu'il faut surveiller pendant la partie, dans une seule fenêtre.
 * - Les Chats des joueurs (Santé, Magie, Folie, vies, cartes Folie) avec un jet de Folie en un clic ;
 * - les adversaires posés sur la scène (PV −/+, attaque, fiche) ;
 * - les derniers jets du chat ;
 * - les outils du Gardien (rencontre, Gazette, paquet Folie, fin de scénario…).
 * Rafraîchi une fois par salve de changements (300 ms) et seulement quand la fenêtre est ouverte.
 */
import { SYSTEM_ID } from "./config.mjs";
import { lireJet } from "./cartes.mjs";
import { appliquerDegats, attaquerPnj } from "./combat.mjs";
import { jetFolie } from "./rolls.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const THEMES = ["nuit", "grimoire", "reve", "journal"];
const NB_JETS = 8;

function theme() {
  let t = "";
  try { t = game.settings.get(SYSTEM_ID, "themeFiche"); } catch (err) { /* réglage absent */ }
  return THEMES.includes(t) ? t : "nuit";
}

const pct = (v, m) => (m > 0 ? Math.max(0, Math.min(100, Math.round((v / m) * 100))) : 0);

/** Outils du Gardien : libellé, icône, fonction de l'API (absente = bouton masqué). */
const OUTILS = [
  { cle: "rencontre", label: "Rencontre", icone: "fa-solid fa-dice-d20", api: "rencontre" },
  { cle: "gazette", label: "Gazette", icone: "fa-solid fa-newspaper", api: "gazette" },
  { cle: "paquet", label: "Paquet Folie", icone: "fa-solid fa-layer-group", api: "paquetFolie" },
  { cle: "folieGroupe", label: "Folie du groupe", icone: "fa-solid fa-brain", api: "folieDuGroupe" },
  { cle: "debut", label: "Début d'aventure", icone: "fa-solid fa-hourglass-start", api: "debutAventure" },
  { cle: "fin", label: "Fin de scénario", icone: "fa-solid fa-flag-checkered", api: "finDeScenarioGroupe" },
  { cle: "campagne", label: "Suivi de campagne", icone: "fa-solid fa-book-open", api: "suiviCampagne" },
  { cle: "wiki", label: "Wiki du Gardien", icone: "fa-solid fa-book", api: "wiki" }
];

export class TableauGardien extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "mu-tableau-gardien",
    classes: ["miaulements-ulthar", "mu-dialogue", "mu-tableau"],
    window: { title: "Tableau du Gardien", icon: "fa-solid fa-cat", resizable: true },
    position: { width: 720, height: 680 },
    actions: {
      ouvrir: TableauGardien.#ouvrir,
      folie: TableauGardien.#folie,
      pv: TableauGardien.#pv,
      attaque: TableauGardien.#attaque,
      cibler: TableauGardien.#cibler,
      outil: TableauGardien.#outil
    }
  };

  static PARTS = { corps: { template: `systems/${SYSTEM_ID}/templates/tableau-gardien.hbs`, scrollable: [".mu-tab-defile"] } };

  static instance = null;
  static basculer() {
    if (!game.user.isGM) return ui.notifications.warn("Le tableau de bord est réservé au Gardien.");
    const app = (TableauGardien.instance ??= new TableauGardien());
    if (app.rendered) app.close();
    else app.render({ force: true });
    return app;
  }

  async _prepareContext() {
    const chats = game.actors
      .filter((a) => a.type === "chat" && a.hasPlayerOwner)
      .map((a) => {
        const s = a.system;
        return {
          uuid: a.uuid, nom: a.name, img: a.img,
          joueur: game.users.find((u) => !u.isGM && a.testUserPermission(u, "OWNER"))?.name ?? "",
          pv: s.pv.value, pvMax: s.pv.max, pvPct: pct(s.pv.value, s.pv.max), pvBas: s.pv.value <= Math.ceil(s.pv.max / 3),
          pm: s.pm.value, pmMax: s.pm.max, pmPct: pct(s.pm.value, s.pm.max),
          pf: s.pf.value, pfMax: s.pf.max, pfPct: pct(s.pf.value, s.pf.max), pfBas: s.pf.value < 20,
          vies: s.vies.value, viesMax: s.vies.max, cartes: s.cartesFolie.length
        };
      });

    const jetons = canvas?.scene?.tokens?.contents ?? [];
    const adversaires = jetons
      .filter((t) => t.actor?.type === "pnj")
      .map((t) => {
        const s = t.actor.system;
        return {
          uuid: t.actor.uuid, tokenId: t.id, nom: t.name, img: t.texture?.src || t.actor.img,
          pv: s.pv.value, pvMax: s.pv.max, pvPct: pct(s.pv.value, s.pv.max), hors: s.pv.value <= 0,
          attaques: s.attaques.map((a, index) => ({ index, nom: a.nom, pct: a.pct, degats: a.degats })),
          cache: t.hidden
        };
      });

    const jets = [];
    for (const m of game.messages.contents.slice(-60).reverse()) {
      const j = lireJet(m);
      if (!j) continue;
      jets.push({
        ...j,
        heure: new Date(j.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        etat: j.critReussite ? "crit-reussite" : j.critEchec ? "crit-echec" : j.reussite ? "reussite" : "echec"
      });
      if (jets.length >= NB_JETS) break;
    }

    const outils = OUTILS.filter((o) => typeof game.miaulementsUlthar?.[o.api] === "function");
    return { chats, adversaires, jets, outils, scene: canvas?.scene?.name ?? "aucune scène" };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    for (const t of THEMES) this.element.classList.toggle(`mu-theme-${t}`, t === theme());
  }

  static #acteur(target) {
    return fromUuidSync(target.closest("[data-uuid]")?.dataset.uuid);
  }

  static #ouvrir(event, target) {
    TableauGardien.#acteur(target)?.sheet.render(true);
  }

  static async #folie(event, target) {
    const a = TableauGardien.#acteur(target);
    if (a) await jetFolie(a);
  }

  static async #pv(event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    const delta = Number(target.dataset.delta);
    if (uuid) await appliquerDegats(uuid, Math.abs(delta), { soin: delta > 0 });
  }

  static async #attaque(event, target) {
    const a = TableauGardien.#acteur(target);
    if (a) await attaquerPnj(a, Number(target.dataset.index));
  }

  /** Centre la vue sur le jeton et le sélectionne. */
  static #cibler(event, target) {
    const jeton = canvas?.tokens?.get(target.closest("[data-token]")?.dataset.token);
    if (!jeton) return;
    jeton.control({ releaseOthers: true });
    canvas.animatePan({ x: jeton.center.x, y: jeton.center.y, duration: 250 });
  }

  static async #outil(event, target) {
    const o = OUTILS.find((x) => x.cle === target.dataset.outil);
    const fn = game.miaulementsUlthar?.[o?.api];
    if (typeof fn !== "function") return;
    await (o.cle === "wiki" ? fn("gardien") : fn());
  }
}

/** Rafraîchissement groupé, seulement quand le tableau est ouvert. */
export function brancherTableau() {
  const rafraichir = foundry.utils.debounce(() => {
    if (TableauGardien.instance?.rendered) TableauGardien.instance.render();
  }, 300);
  const ouvert = () => game.user.isGM && TableauGardien.instance?.rendered;
  Hooks.on("updateActor", (actor) => { if (ouvert() && (actor.type === "chat" || actor.type === "pnj")) rafraichir(); });
  for (const hook of ["createToken", "deleteToken", "createActor", "deleteActor"]) Hooks.on(hook, () => { if (ouvert()) rafraichir(); });
  Hooks.on("updateToken", (doc, changes) => { if (ouvert() && ("hidden" in changes || "name" in changes || "delta" in changes || "actorData" in changes)) rafraichir(); });
  Hooks.on("createChatMessage", (m) => { if (ouvert() && (m.content ?? "").includes("mu-carte-jet")) rafraichir(); });
  Hooks.on("canvasReady", () => { if (ouvert()) rafraichir(); });
}
