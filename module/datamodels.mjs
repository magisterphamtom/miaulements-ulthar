import { ATTRIBUTS, TABLE_PV } from "./config.mjs";

const { fields } = foundry.data;

const nombre = (initial = 0, extra = {}) => new fields.NumberField({ integer: true, initial, ...extra });

function schemaAttribut() {
  return new fields.SchemaField({
    base: nombre(50, { min: 0 }), // valeur choisie à la création (50 % + ajustements)
    race: nombre(0), // modificateur de race (±10, ±5)
    handicap: nombre(0), // −20 si handicap
    progres: nombre(0), // gains par montée d'attribut (+1D10)
    echecs: nombre(0, { min: 0 }) // cases d'échec cochées
  });
}

function schemaAttributs() {
  const attributs = {};
  for (const cle of Object.keys(ATTRIBUTS)) attributs[cle] = schemaAttribut();
  return new fields.SchemaField(attributs);
}

export function pvDepuisTable(somme) {
  return TABLE_PV.find((l) => somme <= l.max).pv;
}

export class ChatData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      race: new fields.StringField({ initial: "" }),
      description: new fields.HTMLField({ initial: "" }),
      handicap: new fields.StringField({ initial: "" }),
      attributs: schemaAttributs(),
      pv: new fields.SchemaField({ value: nombre(3, { min: 0 }) }),
      pm: new fields.SchemaField({ value: nombre(50, { min: 0 }) }),
      pf: new fields.SchemaField({ value: nombre(50, { min: 0 }) }),
      vies: new fields.SchemaField({ value: nombre(3, { min: 0 }) }),
      xp: nombre(0, { min: 0 }),
      // Achats d'XP, ajoutés aux valeurs calculées.
      achats: new fields.SchemaField({
        pm: nombre(0, { min: 0 }),
        pv: nombre(0, { min: 0 }),
        vies: nombre(0, { min: 0 })
      }),
      // Cartes Folie gardées en main (texte de l'action).
      cartesFolie: new fields.ArrayField(new fields.StringField()),
      notes: new fields.HTMLField({ initial: "" })
    };
  }

  prepareDerivedData() {
    for (const a of Object.values(this.attributs)) {
      a.value = Math.max(0, a.base + a.race + a.handicap + a.progres);
    }
    const a = this.attributs;
    this.pv.max = pvDepuisTable(a.phy.value + a.agi.value) + this.achats.pv;
    this.pf.max = Math.floor((a.per.value + a.cha.value) / 2);
    this.pm.max = a.int.value + this.achats.pm;
    this.vies.max = 3 + this.achats.vies;
  }
}

// PNJ / adversaires : format de l'écran du MJ (Attaque % / dégâts / PV).
export class PnjData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      attaque: nombre(50, { min: 0 }),
      degats: new fields.StringField({ initial: "1d4" }),
      pv: new fields.SchemaField({ value: nombre(5, { min: 0 }), max: nombre(5, { min: 0 }) }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
}

export class PouvoirData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      categorie: new fields.StringField({ initial: "inne", choices: ["inne", "race", "temporaire"] }),
      attribut: new fields.StringField({ initial: "", blank: true }), // attribut lié (+20 à l'usage)
      description: new fields.HTMLField({ initial: "" }),
      degats: new fields.StringField({ initial: "", blank: true }),
      gratuit: new fields.BooleanField({ initial: false }) // 0 PM (ex. Comprendre et lire l'humain)
    };
  }
}
