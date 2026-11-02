import { ATTRIBUTS, RACES, CASES_ECHEC, ACHATS_XP, CATEGORIES_POUVOIR, FICHE, SYSTEM_ID } from "./config.mjs";
import { jetAttribut, jetFolie, monterAttribut } from "./rolls.mjs";
import { assistantCreation, tirerPouvoirsTemporaires } from "./creation.mjs";
import { attaquerChat, attaquerPnj, lancerPouvoir } from "./combat.mjs";
import { finDeScenario } from "./outils.mjs";

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class FeuilleChat extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["miaulements-ulthar", "sheet", "actor", "chat"],
    position: { width: 760, height: 900 },
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
    const L = FICHE.largeur;
    const H = FICHE.hauteur;
    const pctX = (x) => `${((x / L) * 100).toFixed(3)}%`;
    const pctY = (y) => `${((y / H) * 100).toFixed(3)}%`;
    const boite = ([x1, y1, x2, y2]) => `left:${pctX(x1)};top:${pctY(y1)};width:${pctX(x2 - x1)};height:${pctY(y2 - y1)};`;
    const rond = ([x, y], d = 96) => `left:${pctX(x - d / 2)};top:${pctY(y - d / 2)};width:${pctX(d)};height:${((d / H) * 100).toFixed(3)}%;`;
    ctx.fiche = {
      image: FICHE.image,
      surnom: boite(FICHE.champs.surnom),
      race: boite(FICHE.champs.race),
      description: boite(FICHE.champs.description),
      innes: boite(FICHE.champs.innes),
      temporaires: boite(FICHE.champs.temporaires),
      pv: rond(FICHE.champs.pv),
      vies: rond(FICHE.champs.vies),
      pm: rond(FICHE.champs.pm),
      pf: rond(FICHE.champs.pf),
      xp: rond(FICHE.champs.xp)
    };
    ctx.attributs = Object.entries(ATTRIBUTS).map(([cle, def]) => {
      const a = sys.attributs[cle];
      const cercle = FICHE.cercles[cle];
      return {
        position: `left:${pctX(cercle.x - 70)};top:${pctY(cercle.y - 66)};width:${pctX(140)};height:${((132 / H) * 100).toFixed(3)}%;`,
        casesPos: cercle.cases.map(([x, y], i) => ({
          index: i,
          cochee: i < a.echecs,
          style: `left:${pctX(x - 15)};top:${pctY(y - 15)};width:${pctX(30)};height:${((30 / H) * 100).toFixed(3)}%;`
        })),
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
    return ctx;
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
