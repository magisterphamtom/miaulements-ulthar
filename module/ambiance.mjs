import { SYSTEM_ID } from "./config.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

/** Fenêtre « Les Chats » : PV, vies, Magie, Folie et cartes Folie de tous les Chats des joueurs, en un coup d'œil. */
export class SuiviGroupe extends HandlebarsApplicationMixin(ApplicationV2) {
  static instance = null;

  static DEFAULT_OPTIONS = {
    id: "mu-suivi-groupe",
    classes: ["miaulements-ulthar", "mu-suivi"],
    position: { width: 420, height: "auto" },
    window: { title: "Les Chats", icon: "fa-solid fa-paw", resizable: false }
  };

  static PARTS = { corps: { template: `systems/${SYSTEM_ID}/templates/suivi-groupe.hbs` } };

  static basculer() {
    const app = (SuiviGroupe.instance ??= new SuiviGroupe());
    if (app.rendered) app.close();
    else app.render(true);
  }

  async _prepareContext(options) {
    const pct = (v, m) => (m > 0 ? Math.max(0, Math.min(100, Math.round((v / m) * 100))) : 0);
    const chats = game.actors
      .filter((a) => a.type === "chat" && (a.hasPlayerOwner || game.user.isGM))
      .map((a) => {
        const s = a.system;
        return {
          id: a.id,
          nom: a.name,
          img: a.img,
          pv: s.pv.value, pvMax: s.pv.max, pvPct: pct(s.pv.value, s.pv.max),
          pm: s.pm.value, pmMax: s.pm.max, pmPct: pct(s.pm.value, s.pm.max),
          pf: s.pf.value, pfMax: s.pf.max, pfPct: pct(s.pf.value, s.pf.max), pfBas: s.pf.value < 20,
          vies: s.vies.value, viesMax: s.vies.max,
          pattes: Array.from({ length: Math.max(s.vies.max, s.vies.value) }, (_, i) => ({ vive: i < s.vies.value })),
          cartes: s.cartesFolie.length
        };
      });
    return { chats };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll("[data-ouvrir]").forEach((el) =>
      el.addEventListener("click", () => game.actors.get(el.dataset.ouvrir)?.sheet.render(true))
    );
  }
}

/** Vision féline : teinte dorée et contraste de la scène, réglage propre à chaque joueur. */
export function appliquerVision(active) {
  document.body.classList.toggle("mu-vision-feline", Boolean(active));
}

export function brancherAmbiance() {
  game.settings.register(SYSTEM_ID, "visionFeline", { scope: "client", config: false, type: Boolean, default: false });
  appliquerVision(game.settings.get(SYSTEM_ID, "visionFeline"));

  // Le suivi du groupe se met à jour quand un Chat change.
  Hooks.on("updateActor", (actor) => {
    if (actor.type === "chat" && SuiviGroupe.instance?.rendered) SuiviGroupe.instance.render();
  });
}

/** Deux boutons dans la barre d'outils des jetons : suivi des Chats et vision féline. */
export function ajouterBoutons(controls) {
  const outils = controls?.tokens?.tools;
  if (!outils) return;
  outils["mu-suivi"] = {
    name: "mu-suivi", title: "Suivi des Chats", icon: "fa-solid fa-paw", order: 90, button: true, visible: true,
    onChange: () => SuiviGroupe.basculer()
  };
  outils["mu-vision"] = {
    name: "mu-vision", title: "Vision féline", icon: "fa-solid fa-eye", order: 91, toggle: true, visible: true,
    active: game.settings.get(SYSTEM_ID, "visionFeline"),
    onChange: async (event, active) => {
      appliquerVision(active);
      await game.settings.set(SYSTEM_ID, "visionFeline", Boolean(active));
    }
  };
}
