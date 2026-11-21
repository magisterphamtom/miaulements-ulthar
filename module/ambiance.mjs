import { SYSTEM_ID } from "./config.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const THEMES = ["nuit", "grimoire", "reve", "journal"];
function themeJoueur() {
  let t = "";
  try { t = game.settings.get(SYSTEM_ID, "themeFiche"); } catch (err) { /* réglage absent */ }
  return THEMES.includes(t) ? t : "nuit";
}

/**
 * Fenêtre « Les Chats » (refaite en v0.19.2) : Santé, Magie, Folie, vies et cartes Folie des Chats
 * dont le joueur est connecté. Hauteur automatique : elle grandit à chaque joueur qui se connecte.
 */
export class SuiviGroupe extends HandlebarsApplicationMixin(ApplicationV2) {
  static instance = null;

  static DEFAULT_OPTIONS = {
    id: "mu-suivi-groupe",
    classes: ["miaulements-ulthar", "mu-dialogue", "mu-suivi-groupe"],
    position: { width: 400, height: "auto" },
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
    const joueurs = game.users.filter((u) => !u.isGM);
    const proprietaire = (a) => joueurs.find((u) => a.testUserPermission(u, "OWNER"));
    const tous = game.actors.filter((a) => a.type === "chat" && a.hasPlayerOwner);
    const presents = tous.filter((a) => proprietaire(a)?.active);
    const chats = presents.map((a) => {
      const s = a.system; const u = proprietaire(a);
      return {
        id: a.id, nom: a.name, img: a.img, joueur: u?.name ?? "", couleur: u?.color?.css ?? u?.color ?? "#d9b34a",
        pv: s.pv.value, pvMax: s.pv.max, pvPct: pct(s.pv.value, s.pv.max), pvBas: s.pv.value <= Math.ceil(s.pv.max / 3),
        pm: s.pm.value, pmMax: s.pm.max, pmPct: pct(s.pm.value, s.pm.max),
        pf: s.pf.value, pfMax: s.pf.max, pfPct: pct(s.pf.value, s.pf.max), pfBas: s.pf.value < 20,
        pattes: Array.from({ length: Math.max(s.vies.max, s.vies.value) }, (_, i) => ({ vive: i < s.vies.value })),
        cartes: s.cartesFolie.length
      };
    });
    return { chats, absents: tous.length - presents.length };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    for (const t of THEMES) this.element.classList.toggle(`mu-theme-${t}`, t === themeJoueur());
    this.element.querySelectorAll("[data-ouvrir]").forEach((el) =>
      el.addEventListener("click", () => game.actors.get(el.dataset.ouvrir)?.sheet.render(true))
    );
  }
}

/** Vision féline : teinte dorée et contraste de la scène, réglage propre à chaque joueur. */
export function appliquerVision(active) {
  let voile = document.getElementById("mu-vision-feline");
  if (active && !voile) {
    // Un simple voile fixe au-dessus de la scène : pas de filtre recalculé à chaque image.
    voile = document.createElement("div");
    voile.id = "mu-vision-feline";
    document.body.append(voile);
  } else if (!active && voile) {
    voile.remove();
  }
}

export function brancherAmbiance() {
  appliquerVision(game.settings.get(SYSTEM_ID, "visionFeline"));

  // Le suivi du groupe se met à jour quand une valeur affichée change : un seul rafraîchissement
  // groupé (200 ms), et rien du tout quand la fenêtre est fermée.
  const rafraichir = foundry.utils.debounce(() => {
    if (SuiviGroupe.instance?.rendered) SuiviGroupe.instance.render();
  }, 200);
  const AFFICHE = ["pv", "pm", "pf", "vies", "cartesFolie", "attributs", "achats"];
  Hooks.on("updateActor", (actor, changes) => {
    if (actor.type !== "chat" || !SuiviGroupe.instance?.rendered) return;
    if ("name" in changes || "img" in changes || AFFICHE.some((k) => changes.system && k in changes.system)) rafraichir();
  });
  // Un joueur se connecte ou part : la fenêtre s'agrandit ou se resserre.
  Hooks.on("userConnected", () => { if (SuiviGroupe.instance?.rendered) rafraichir(); });
  for (const hook of ["createItem", "deleteItem", "createActor", "deleteActor"]) {
    Hooks.on(hook, (doc) => {
      if (SuiviGroupe.instance?.rendered && (doc.type === "chat" || doc.parent?.type === "chat")) rafraichir();
    });
  }
}

/** Deux boutons dans la barre d'outils des jetons : suivi des Chats et vision féline. */
export function ajouterBoutons(controls) {
  const outils = controls?.tokens?.tools;
  if (!outils) return;
  outils["mu-suivi"] = {
    name: "mu-suivi", title: "Suivi des Chats", icon: "fa-solid fa-paw", order: 90, button: true, visible: true,
    onChange: () => SuiviGroupe.basculer()
  };
  outils["mu-campagne"] = {
    name: "mu-campagne", title: "Suivi de campagne (Gardien)", icon: "fa-solid fa-book-open", order: 92, button: true, visible: game.user.isGM,
    onChange: () => game.miaulementsUlthar?.suiviCampagne?.()
  };
  outils["mu-tableau"] = {
    name: "mu-tableau", title: "Tableau du Gardien", icon: "fa-solid fa-cat", order: 89, button: true, visible: game.user.isGM,
    onChange: () => game.miaulementsUlthar?.tableau?.()
  };
  outils["mu-voile"] = {
    name: "mu-voile", title: "Voile de rêve (bulle onirique, pour toute la table)", icon: "fa-solid fa-moon", order: 93, toggle: true, visible: game.user.isGM,
    active: game.miaulementsUlthar?.voileActif?.() ?? false,
    onChange: (event, active) => game.miaulementsUlthar?.voileDeReve?.(Boolean(active))
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
