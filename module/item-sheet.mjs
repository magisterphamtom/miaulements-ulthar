import { CATEGORIES_POUVOIR, ATTRIBUTS, SYSTEM_ID } from "./config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class FichePouvoir extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["miaulements-ulthar", "sheet", "item", "pouvoir"],
    position: { width: 480, height: 460 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  static PARTS = {
    corps: { template: `systems/${SYSTEM_ID}/templates/item-pouvoir.hbs` }
  };

  get title() {
    return `${this.item.name} — Pouvoir`;
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.item = this.item;
    ctx.system = this.item.system;
    ctx.editable = this.isEditable;
    ctx.categories = Object.entries(CATEGORIES_POUVOIR).map(([cle, label]) => ({ cle, label, selected: this.item.system.categorie === cle }));
    ctx.attributs = [{ cle: "", label: "— aucun —", selected: !this.item.system.attribut }].concat(
      Object.entries(ATTRIBUTS).map(([cle, a]) => ({ cle, label: a.label, selected: this.item.system.attribut === cle }))
    );
    return ctx;
  }
}
