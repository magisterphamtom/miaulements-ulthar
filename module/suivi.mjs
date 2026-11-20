/**
 * Suivi de campagne (v0.17.0) — reprend les deux fiches de suivi du livre des scénarios, utilisables en jeu.
 * Réservé au Gardien. Les données sont enregistrées dans le monde (réglage caché « suiviCampagne »).
 * Onglet Personnages : joueur, surnom du Chat, notes (bouton pour ajouter les Chats du monde).
 * Onglet Épisodes : épisode, notes.
 */
import { SYSTEM_ID } from "./config.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const THEMES = ["nuit", "grimoire", "reve", "journal"];

export function enregistrerParametresSuivi() {
  game.settings.register(SYSTEM_ID, "suiviCampagne", {
    scope: "world", config: false, type: Object, default: { chats: [], episodes: [] }
  });
}

function donnees() {
  const d = foundry.utils.deepClone(game.settings.get(SYSTEM_ID, "suiviCampagne") ?? {});
  return { chats: Array.isArray(d.chats) ? d.chats : [], episodes: Array.isArray(d.episodes) ? d.episodes : [] };
}

function theme() {
  let t = "";
  try { t = game.settings.get(SYSTEM_ID, "themeFiche"); } catch (err) { /* réglage absent */ }
  if (!THEMES.includes(t)) { try { t = game.settings.get(SYSTEM_ID, "themeFicheDefaut"); } catch (err) { /* idem */ } }
  return THEMES.includes(t) ? t : "nuit";
}

export class SuiviCampagne extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "mu-suivi-campagne",
    classes: ["miaulements-ulthar", "mu-dialogue", "mu-suivi-campagne"],
    window: { title: "Suivi de campagne", icon: "fa-solid fa-book-open", resizable: true },
    position: { width: 620, height: 640 },
    actions: {
      onglet: SuiviCampagne.#onglet,
      ajouterChat: SuiviCampagne.#ajouterChat,
      ajouterChatsMonde: SuiviCampagne.#ajouterChatsMonde,
      ajouterEpisode: SuiviCampagne.#ajouterEpisode,
      supprimer: SuiviCampagne.#supprimer
    }
  };

  static PARTS = { corps: { template: `systems/${SYSTEM_ID}/templates/suivi-campagne.hbs`, scrollable: [".mu-suivi-liste"] } };

  static #instance;
  static ouvrir() {
    if (!game.user.isGM) return ui.notifications.warn("Le suivi de campagne est réservé au Gardien.");
    this.#instance ??= new SuiviCampagne();
    this.#instance.render({ force: true });
    return this.#instance;
  }

  onglet = "chats";

  async _prepareContext() {
    const d = donnees();
    return {
      onglet: this.onglet,
      chats: d.chats.map((c, index) => ({ ...c, index })),
      episodes: d.episodes.map((e, index) => ({ ...e, index, numero: index + 1 }))
    };
  }

  _onRender(context, options) {
    for (const t of THEMES) this.element.classList.toggle(`mu-theme-${t}`, t === theme());
    // Enregistrement à la saisie (regroupé, sans redessiner la fenêtre)
    if (!this._muLie) {
      this._muLie = true;
      this._muEnregistrer = foundry.utils.debounce(() => this.#enregistrerDepuisFormulaire(), 400);
      this.element.addEventListener("input", (event) => {
        if (event.target.closest("[data-liste]")) this._muEnregistrer();
      });
    }
  }

  /** Relit tous les champs et enregistre. */
  async #enregistrerDepuisFormulaire() {
    const d = donnees();
    for (const champ of this.element.querySelectorAll("[data-liste][data-index][data-champ]")) {
      const liste = d[champ.dataset.liste];
      const ligne = liste?.[Number(champ.dataset.index)];
      if (ligne) ligne[champ.dataset.champ] = champ.value;
    }
    await game.settings.set(SYSTEM_ID, "suiviCampagne", d);
  }

  async #modifier(fn) {
    await this.#enregistrerDepuisFormulaire();
    const d = donnees();
    fn(d);
    await game.settings.set(SYSTEM_ID, "suiviCampagne", d);
    this.render();
  }

  static #onglet(event, target) {
    this.onglet = target.dataset.onglet;
    this.render();
  }

  static async #ajouterChat() {
    await this.#modifier((d) => d.chats.push({ joueur: "", surnom: "", notes: "" }));
  }

  /** Ajoute une ligne pour chaque Chat d'un joueur qui n'est pas encore dans la liste. */
  static async #ajouterChatsMonde() {
    await this.#modifier((d) => {
      const deja = new Set(d.chats.map((c) => (c.surnom ?? "").trim().toLowerCase()));
      for (const a of game.actors.filter((x) => x.type === "chat" && x.hasPlayerOwner)) {
        if (deja.has(a.name.trim().toLowerCase())) continue;
        const joueur = game.users.find((u) => !u.isGM && a.testUserPermission(u, "OWNER"))?.name ?? "";
        d.chats.push({ joueur, surnom: a.name, notes: "" });
      }
    });
  }

  static async #ajouterEpisode() {
    await this.#modifier((d) => d.episodes.push({ titre: "", notes: "" }));
  }

  static async #supprimer(event, target) {
    const { liste, index } = target.dataset;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Supprimer cette ligne ?" }, classes: ["miaulements-ulthar", "mu-dialogue", `mu-theme-${theme()}`],
      content: "<p>Les notes de cette ligne seront effacées.</p>", rejectClose: false
    });
    if (ok) await this.#modifier((d) => d[liste]?.splice(Number(index), 1));
  }
}
