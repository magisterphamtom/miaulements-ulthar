import { ATTRIBUTS, RACES, CASES_ECHEC, ACHATS_XP, CATEGORIES_POUVOIR, SYSTEM_ID } from "./config.mjs";
import { jetAttribut, jetFolie, monterAttribut } from "./rolls.mjs";
import { assistantCreation, tirerPouvoirsTemporaires } from "./creation.mjs";

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class FeuilleChat extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["miaulements-ulthar", "sheet", "actor", "chat"],
    position: { width: 760, height: 860 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      jetAttribut: FeuilleChat.#jetAttribut,
      jetFolie: FeuilleChat.#jetFolie,
      monterAttribut: FeuilleChat.#monterAttribut,
      ouvrirItem: FeuilleChat.#ouvrirItem,
      supprimerItem: FeuilleChat.#supprimerItem,
      jouerCarte: FeuilleChat.#jouerCarte,
      finScenario: FeuilleChat.#finScenario,
      creation: FeuilleChat.#creation,
      tirerTemporaires: FeuilleChat.#tirerTemporaires,
      afficherPouvoir: FeuilleChat.#afficherPouvoir,
      acheter: FeuilleChat.#acheter
    }
  };

  static PARTS = {
    corps: { template: `systems/${SYSTEM_ID}/templates/actor-chat.hbs` }
  };

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
    ctx.attributs = Object.entries(ATTRIBUTS).map(([cle, def]) => {
      const a = sys.attributs[cle];
      return {
        cle,
        label: def.label,
        abbr: def.abbr,
        value: a.value,
        base: a.base,
        race: a.race,
        handicap: a.handicap,
        progres: a.progres,
        echecs: a.echecs,
        cases: Array.from({ length: CASES_ECHEC }, (_, i) => ({ cochee: i < a.echecs })),
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
    return ctx;
  }

  static async #jetAttribut(event, target) {
    return jetAttribut(this.actor, target.dataset.attribut, { rapide: event.shiftKey });
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

  /** Fin de scénario : +2 XP, PV/PM/vies remis au maximum, −10 PF par carte Folie non jouée. */
  static async #finScenario() {
    const sys = this.actor.system;
    const perte = sys.cartesFolie.length * 10;
    const ok = await DialogV2.confirm({
      window: { title: "Fin de scénario" },
      content: `<p>+2 XP, PV, PM et vies de chat remis au maximum. ${perte ? `Cartes Folie non jouées : −${perte} PF.` : ""}</p>`
    });
    if (!ok) return;
    await this.actor.update({
      "system.xp": sys.xp + 2,
      "system.pv.value": sys.pv.max,
      "system.pm.value": sys.pm.max,
      "system.vies.value": sys.vies.max,
      "system.pf.value": Math.max(0, sys.pf.value - perte),
      "system.cartesFolie": []
    });
    if (sys.pf.value - perte < 20) {
      ui.notifications.warn(`${this.actor.name} : Folie sous 20 — le Chat devient injouable.`);
    }
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
