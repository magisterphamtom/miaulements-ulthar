import { ATTRIBUTS, RACES, CASES_ECHEC, ACHATS_XP, CATEGORIES_POUVOIR, FICHE, SYSTEM_ID } from "./config.mjs";
import { jetAttribut, jetFolie, monterAttribut } from "./rolls.mjs";
import { assistantCreation, tirerPouvoirsTemporaires } from "./creation.mjs";
import { attaquerChat, attaquerPnj, lancerPouvoir, attributPourPouvoir, estOnirique } from "./combat.mjs";
import { finDeScenario } from "./outils.mjs";

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/** Positions (en % de l'image de la fiche papier) : calculées une fois au chargement. */
const POSITIONS = (() => {
  const L = FICHE.largeur;
  const H = FICHE.hauteur;
  const pctX = (x) => `${((x / L) * 100).toFixed(3)}%`;
  const pctY = (y) => `${((y / H) * 100).toFixed(3)}%`;
  const boite = ([x1, y1, x2, y2]) => `left:${pctX(x1)};top:${pctY(y1)};width:${pctX(x2 - x1)};height:${pctY(y2 - y1)};`;
  const rond = ([x, y], d = 96) => `left:${pctX(x - d / 2)};top:${pctY(y - d / 2)};width:${pctX(d)};height:${pctY(d)};`;
  const c = FICHE.champs;
  const attributs = {};
  for (const [cle, cercle] of Object.entries(FICHE.cercles)) {
    attributs[cle] = {
      position: `left:${pctX(cercle.x - 70)};top:${pctY(cercle.y - 66)};width:${pctX(140)};height:${pctY(132)};`,
      cases: cercle.cases.map(([x, y]) => `left:${pctX(x - 15)};top:${pctY(y - 15)};width:${pctX(30)};height:${pctY(30)};`)
    };
  }
  return {
    attributs,
    fiche: {
      image: FICHE.image,
      surnom: boite(c.surnom), race: boite(c.race), description: boite(c.description),
      innes: boite(c.innes), temporaires: boite(c.temporaires),
      pv: rond(c.pv), vies: rond(c.vies), pm: rond(c.pm), pf: rond(c.pf), xp: rond(c.xp)
    }
  };
})();

/** Thèmes du contenu de la fiche (repris des maquettes du wiki). */
export const THEMES_FICHE = {
  nuit: "Nuit d'Arkham",
  grimoire: "Grimoire d'Ulthar",
  reve: "Contrée du Rêve",
  journal: "Journal d'Arkham, 1921"
};

/** Réglages : thème par défaut (choisi par le Gardien) et choix de chaque joueur (enregistré pour lui seul). */
export function enregistrerParametresThemes() {
  const rafraichir = () => FeuilleChat.appliquerThemePartout();
  game.settings.register(SYSTEM_ID, "themeFicheDefaut", {
    name: "Thème des fiches par défaut",
    hint: "Thème du contenu des onglets de la fiche de Chat pour les joueurs qui n'en ont pas choisi un dans le menu au-dessus de la fiche.",
    scope: "world", config: true, type: String, choices: THEMES_FICHE, default: "nuit", onChange: rafraichir
  });
  game.settings.register(SYSTEM_ID, "styleOnglets", {
    name: "Style des onglets de la fiche",
    hint: "Apparence des onglets sur le côté droit de la fiche de Chat (pour vous seul).",
    scope: "user", config: true, type: String, choices: STYLES_ONGLETS, default: "oreilles",
    onChange: () => { for (const app of foundry.applications.instances.values()) if (app instanceof FeuilleChat) app.render(); }
  });
  game.settings.register(SYSTEM_ID, "themeFiche", {
    scope: "user", config: false, type: String, default: "", onChange: rafraichir
  });
}

/** Style des onglets sur le côté (à choisir parmi les propositions). */
export const STYLES_ONGLETS = { oreilles: "Marque-pages oreilles de chat", arbre: "Arbre à chat", griffoir: "Griffoir", gamelles: "Gamelles" };
function styleOnglets() {
  let s = "";
  try { s = game.settings.get(SYSTEM_ID, "styleOnglets"); } catch (err) { /* réglage absent */ }
  return STYLES_ONGLETS[s] ? s : "oreilles";
}

function themeChoisi() {
  let t = "";
  try { t = game.settings.get(SYSTEM_ID, "themeFiche"); } catch (err) { /* réglage absent */ }
  if (THEMES_FICHE[t]) return t;
  try { t = game.settings.get(SYSTEM_ID, "themeFicheDefaut"); } catch (err) { /* réglage absent */ }
  return THEMES_FICHE[t] ? t : "nuit";
}

export class FeuilleChat extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["miaulements-ulthar", "sheet", "actor", "chat"],
    position: { width: 820, height: 920 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      jetAttribut: FeuilleChat.#jetAttribut,
      cocher: FeuilleChat.#cocher,
      attaquer: FeuilleChat.#attaquer,
      lancerPouvoir: FeuilleChat.#lancerPouvoir,
      jetFolie: FeuilleChat.#jetFolie,
      monterAttribut: FeuilleChat.#monterAttribut,
      ouvrirItem: FeuilleChat.#ouvrirItem,
      supprimerItem: FeuilleChat.#supprimerItem,
      jouerCarte: FeuilleChat.#jouerCarte,
      finScenario: FeuilleChat.#finScenario,
      creation: FeuilleChat.#creation,
      tirerTemporaires: FeuilleChat.#tirerTemporaires,
      afficherPouvoir: FeuilleChat.#afficherPouvoir,
      acheter: FeuilleChat.#acheter,
      tab: FeuilleChat.#onglet,
      pretires: FeuilleChat.#pretires
    }
  };

  static PARTS = {
    entete: { template: `systems/${SYSTEM_ID}/templates/chat/entete.hbs` },
    onglets: { template: `systems/${SYSTEM_ID}/templates/chat/onglets.hbs` },
    fiche: { template: `systems/${SYSTEM_ID}/templates/chat/fiche.hbs`, scrollable: [""] },
    creation: { template: `systems/${SYSTEM_ID}/templates/chat/creation.hbs`, scrollable: [""] },
    pouvoirs: { template: `systems/${SYSTEM_ID}/templates/chat/pouvoirs.hbs`, scrollable: [""] },
    suivi: { template: `systems/${SYSTEM_ID}/templates/chat/suivi.hbs`, scrollable: [""] },
    notes: { template: `systems/${SYSTEM_ID}/templates/chat/notes.hbs` },
    pied: { template: `systems/${SYSTEM_ID}/templates/chat/pied.hbs` }
  };

  static ONGLETS = [
    { id: "fiche", label: "Fiche", icone: "panier" },
    { id: "creation", label: "Création", icone: "arbre" },
    { id: "pouvoirs", label: "Pouvoirs", icone: "pelote" },
    { id: "suivi", label: "Folie et progression", icone: "griffoir" },
    { id: "notes", label: "Notes", icone: "litiere" }
  ];

  tabGroups = { primary: "fiche" };

  get title() {
    return `${this.actor.name} — Chat d'Ulthar`;
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const sys = this.actor.system;
    ctx.actor = this.actor;
    ctx.system = sys;
    ctx.editable = this.isEditable;
    ctx.races = Object.entries(RACES).map(([cle, r]) => ({ cle, label: r.label, selected: sys.race === cle }));
    ctx.fiche = POSITIONS.fiche;
    ctx.attributs = Object.entries(ATTRIBUTS).map(([cle, def]) => {
      const a = sys.attributs[cle];
      const pos = POSITIONS.attributs[cle];
      return {
        position: pos.position,
        casesPos: pos.cases.map((style, index) => ({ index, style, cochee: index < a.echecs })),
        cle,
        label: def.label,
        abbr: def.abbr,
        value: a.value,
        base: a.base,
        race: a.race,
        handicap: a.handicap,
        progres: a.progres,
        echecs: a.echecs,
        peutMonter: a.echecs >= CASES_ECHEC
      };
    });
    const pouvoirs = this.actor.items.filter((i) => i.type === "pouvoir");
    const groupe = (cat) =>
      pouvoirs.filter((p) => p.system.categorie === cat).map((p) => ({ id: p.id, name: p.name, img: p.img, gratuit: p.system.gratuit }));
    ctx.pouvoirsInnes = [...groupe("inne"), ...groupe("race")];
    ctx.pouvoirsTemporaires = groupe("temporaire");
    ctx.categories = CATEGORIES_POUVOIR;
    ctx.achats = Object.entries(ACHATS_XP).map(([cle, a]) => ({ cle, ...a, possible: sys.xp >= a.cout }));
    ctx.cartes = sys.cartesFolie.map((texte, index) => ({ texte, index }));

    // Onglets
    const actif = this.tabGroups.primary ?? "fiche";
    ctx.tabs = Object.fromEntries(FeuilleChat.ONGLETS.map((t) => [t.id, { ...t, cssClass: t.id === actif ? "active" : "" }]));

    // Onglet « Pouvoirs » : cartes détaillées
    const TE = foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
    const carte = async (p) => ({
      id: p.id, name: p.name, img: p.img,
      description: await TE.enrichHTML(p.system.description ?? "", { relativeTo: p }),
      cout: p.system.gratuit ? "0 PM" : "PM : unités du dé",
      attribut: ATTRIBUTS[attributPourPouvoir(p)]?.label ?? "",
      degats: p.system.degats,
      onirique: estOnirique(p)
    });
    const parCat = (cat) => pouvoirs.filter((p) => p.system.categorie === cat);
    ctx.groupesPouvoirs = [
      { titre: "Pouvoirs innés", pouvoirs: await Promise.all(parCat("inne").map(carte)) },
      { titre: "Pouvoir de race", pouvoirs: await Promise.all(parCat("race").map(carte)) },
      { titre: "Pouvoirs temporaires", pouvoirs: await Promise.all(parCat("temporaire").map(carte)) }
    ];

    // Onglet « Folie et progression »
    // En-tête et onglet Création
    const race = RACES[sys.race];
    ctx.raceLabel = race?.label ?? "";
    if (race) {
      const nom = (k) => ATTRIBUTS[k]?.label ?? k;
      const mods = [race.plus ? `+10 % ${nom(race.plus)}` : "", race.moins ? `−10 % ${nom(race.moins)}` : "", race.libre ? `+${race.libre} % au choix` : ""].filter(Boolean).join(", ");
      ctx.raceInfo = [mods, race.pouvoirs?.length ? `Pouvoir de race au choix : ${race.pouvoirs.join(" ou ")}` : ""].filter(Boolean).join(" · ");
    }
    ctx.styleOnglets = styleOnglets();

    ctx.foliePct = sys.pf.max > 0 ? Math.max(0, Math.min(100, Math.round((sys.pf.value / sys.pf.max) * 100))) : 0;
    ctx.folieBasse = sys.pf.value < 20;
    ctx.pattes = Array.from({ length: Math.max(sys.vies.max, sys.vies.value) }, (_, i) => ({ vive: i < sys.vies.value }));
    return ctx;
  }

  /** Pose la classe du thème sur la fenêtre (sans nouveau rendu). */
  appliquerTheme(theme = themeChoisi()) {
    const el = this.element;
    if (!el) return;
    for (const cle of Object.keys(THEMES_FICHE)) el.classList.toggle(`mu-theme-${cle}`, cle === theme);
    const select = el.querySelector(".mu-choix-theme select");
    if (select && select.value !== theme) select.value = theme;
  }

  static appliquerThemePartout() {
    const theme = themeChoisi();
    for (const app of foundry.applications.instances.values()) if (app instanceof FeuilleChat) app.appliquerTheme(theme);
  }

  /** Menu des thèmes dans la barre de titre de la fenêtre, à côté du bouton « ⋮ ». */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    const entete = this.window?.header ?? frame.querySelector(".window-header");
    if (entete && !entete.querySelector(".mu-choix-theme")) {
      const theme = themeChoisi();
      const label = document.createElement("label");
      label.className = "mu-choix-theme";
      label.title = "Thème de la fiche (votre choix, pour toutes vos fiches)";
      label.innerHTML = `<i class="fa-solid fa-palette"></i><select>${Object.entries(THEMES_FICHE)
        .map(([cle, nom]) => `<option value="${cle}" ${cle === theme ? "selected" : ""}>${nom}</option>`).join("")}</select>`;
      const select = label.querySelector("select");
      for (const ev of ["pointerdown", "mousedown", "click", "dblclick"]) label.addEventListener(ev, (e) => e.stopPropagation()); // pas de déplacement ni de réduction de la fenêtre
      select.addEventListener("change", (event) => {
        event.stopPropagation();
        const choix = event.currentTarget.value;
        game.settings.set(SYSTEM_ID, "themeFiche", choix);
        for (const app of foundry.applications.instances.values()) if (app instanceof FeuilleChat) app.appliquerTheme(choix);
      });
      const bouton = this.window?.controls ?? entete.querySelector('[data-action="toggleControls"]');
      if (bouton) bouton.before(label); else entete.querySelector(".window-title")?.after(label) ?? entete.append(label);
    }
    return frame;
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this.appliquerTheme();
    // Champs repris dans un second onglet (XP, apparence) : hors du formulaire pour éviter deux valeurs sous le même nom.
    for (const champ of this.element.querySelectorAll("[data-champ]")) {
      if (champ.dataset.lie) continue;
      champ.dataset.lie = "1";
      champ.addEventListener("change", (event) => {
        event.stopPropagation();
        const el = event.currentTarget;
        const valeur = el.type === "number" ? Number(el.value) || 0 : el.value;
        if (this.isEditable) this.actor.update({ [el.dataset.champ]: valeur });
      });
    }
  }

  /** Changement d'onglet : on garde l'onglet choisi d'un rendu à l'autre. */
  changeTab(tab, group, options) {
    try { super.changeTab?.(tab, group, options); } catch (err) { /* bascule faite à la main ci-dessous */ }
    this.tabGroups[group] = tab;
    this.element?.querySelectorAll(`[data-group="${group}"][data-tab]`).forEach((el) => el.classList.toggle("active", el.dataset.tab === tab));
  }

  static #pretires() {
    const pack = game.packs.get(`${SYSTEM_ID}.pretires`);
    if (pack) pack.render(true);
    else ui.notifications.warn("Compendium des prétirés introuvable.");
  }

  static #onglet(event, target) {
    this.changeTab(target.dataset.tab, target.dataset.group ?? "primary");
  }

  static async #jetAttribut(event, target) {
    return jetAttribut(this.actor, target.dataset.attribut, { rapide: event.shiftKey });
  }

  /** Clic sur une petite case d'échec : on coche jusqu'à elle (re-clic sur la dernière cochée = on la décoche). */
  static async #cocher(event, target) {
    const cle = target.dataset.attribut;
    const i = Number(target.dataset.index);
    const actuel = this.actor.system.attributs[cle].echecs;
    const nouveau = actuel === i + 1 ? i : i + 1;
    await this.actor.update({ [`system.attributs.${cle}.echecs`]: Math.max(0, Math.min(CASES_ECHEC, nouveau)) });
  }

  static async #attaquer() {
    return attaquerChat(this.actor);
  }

  static async #lancerPouvoir(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (item) return lancerPouvoir(this.actor, item);
  }

  static async #creation() {
    return assistantCreation(this.actor);
  }

  static async #tirerTemporaires() {
    return tirerPouvoirsTemporaires(this.actor);
  }

  /** Clic sur un pouvoir : sa description est montrée à la table. */
  static async #afficherPouvoir(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const s = item.system;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="mu-carte reussite"><header>${foundry.utils.escapeHTML(item.name)}
        <span class="mu-pourcent">${CATEGORIES_POUVOIR[s.categorie] ?? ""}</span></header>
        <div class="mu-detail">${s.description}</div>
        <p class="mu-note">${s.gratuit ? "0 PM" : "À l'usage : +20 à l'attribut concerné ; perte de PM = unités du dé."}${s.degats ? ` · ${foundry.utils.escapeHTML(s.degats)}` : ""}</p></div>`
    });
  }

  static async #jetFolie() {
    return jetFolie(this.actor);
  }

  static async #monterAttribut(event, target) {
    return monterAttribut(this.actor, target.dataset.attribut);
  }

  static async #ouvrirItem(event, target) {
    this.actor.items.get(target.dataset.itemId)?.sheet.render(true);
  }

  static async #supprimerItem(event, target) {
    await this.actor.items.get(target.dataset.itemId)?.delete();
  }

  static async #jouerCarte(event, target) {
    const index = Number(target.dataset.index);
    const cartes = [...this.actor.system.cartesFolie];
    const [texte] = cartes.splice(index, 1);
    await this.actor.update({ "system.cartesFolie": cartes });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="mu-carte echec folie"><header>Folie jouée</header><p class="mu-carte-folie">🃏 ${foundry.utils.escapeHTML(texte)}</p></div>`
    });
  }

  /** Fin de scénario : +2 XP, PV/PM/vies au maximum, −10 PF par carte Folie non jouée. */
  static async #finScenario() {
    return finDeScenario(this.actor);
  }

  static async #acheter(event, target) {
    const cle = target.dataset.achat;
    const def = ACHATS_XP[cle];
    const sys = this.actor.system;
    if (!def || sys.xp < def.cout) return;
    await this.actor.update({
      "system.xp": sys.xp - def.cout,
      [`system.achats.${cle}`]: sys.achats[cle] + def.gain
    });
  }
}


/** Fiche d'adversaire : PV, attaques cliquables, pouvoir et capacité, description. */
export class FichePnj extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["miaulements-ulthar", "sheet", "actor", "pnj"],
    position: { width: 480, height: 560 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      attaquerPnj: FichePnj.#attaquer,
      ajouterAttaque: FichePnj.#ajouter,
      supprimerAttaque: FichePnj.#supprimer
    }
  };

  static PARTS = { corps: { template: `systems/${SYSTEM_ID}/templates/actor-pnj.hbs` } };

  get title() {
    return `${this.actor.name} — Adversaire`;
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.actor = this.actor;
    ctx.system = this.actor.system;
    ctx.attaques = this.actor.system.attaques.map((a, index) => ({ ...a, index }));
    return ctx;
  }

  static async #attaquer(event, target) {
    return attaquerPnj(this.actor, Number(target.dataset.index));
  }

  static async #ajouter() {
    const att = foundry.utils.deepClone(this.actor.system.toObject().attaques);
    att.push({ nom: "Attaque", pct: 50, degats: "1d4" });
    await this.actor.update({ "system.attaques": att });
  }

  static async #supprimer(event, target) {
    const att = foundry.utils.deepClone(this.actor.system.toObject().attaques);
    att.splice(Number(target.dataset.index), 1);
    await this.actor.update({ "system.attaques": att });
  }
}
