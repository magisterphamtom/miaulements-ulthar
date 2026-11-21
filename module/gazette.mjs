/**
 * La Gazette (v0.19.0) : une une de journal à montrer aux joueurs, pour ouvrir ou clore un scénario.
 * Deux styles selon le lieu (le Gardien choisit, le système propose d'après la scène) :
 * - Arkham : journal des années 20 (manchette gothique, colonnes, photo sépia) ;
 * - Ulthar : feuille du crieur sur parchemin, avec sceau de cire.
 * Le Gardien remplit la une (ou en tire une au hasard), puis la publie : carte dans le chat et fenêtre ouverte chez tous.
 */
import { SYSTEM_ID } from "./config.mjs";
import { saisir } from "./dialogues.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const esc = (t) => foundry.utils.escapeHTML(String(t ?? ""));
const hasard = (l) => l[Math.floor(Math.random() * l.length)];

export const STYLES = {
  arkham: {
    label: "Arkham, années 20", journal: "The Arkham Advertiser", date: "Arkham, Massachusetts — 1921", prix: "Deux cents",
    unes: [
      ["Des chats envahissent le cimetière de Christchurch", "Les gardiens jurent les avoir vus monter la garde autour d'une tombe", "Les riverains du cimetière se plaignent depuis trois nuits de miaulements incessants. Le gardien, M. Hobbs, affirme qu'une trentaine de chats se tiennent immobiles autour du caveau de la famille Corey, « comme une sentinelle ». La police n'a relevé aucune effraction, mais la dalle aurait bougé."],
      ["Disparitions inexpliquées sur les quais", "Trois dockers manquent à l'appel depuis la tempête", "Le port d'Arkham est en émoi : trois hommes de l'équipe de nuit n'ont pas reparu depuis jeudi. Leurs collègues évoquent des silhouettes trempées aperçues près des entrepôts, et une odeur de marée qui ne quitte plus le quartier."],
      ["Étrange lumière au-dessus de Meadow Hill", "Des fermiers décrivent une lueur sans couleur", "Plusieurs habitants de la colline ont vu, mardi soir, une lueur pâle descendre lentement sur les bois. Au matin, les vaches refusaient de sortir et les chiens n'ont cessé de hurler. L'université Miskatonic a dépêché deux professeurs."],
      ["Vol au musée de l'université Miskatonic", "Un livre ancien et une statuette d'onyx dérobés", "La vitrine a été forcée sans bruit pendant la nuit. Le veilleur assure n'avoir rien entendu, sinon « des griffes sur le parquet ». Le conservateur supplie le voleur de ne pas ouvrir le livre."],
      ["La fourrière municipale débordée", "Une rafle contre les chats errants tourne court", "Les agents de la fourrière ont dû battre en retraite devant une colonie de chats « parfaitement organisée ». Le chef de service parle d'animaux qui « semblaient comprendre chaque mot »."],
      ["Un professeur retrouvé endormi dans la rue", "Il prétend revenir d'une cité de basalte", "Le Pr Whitlock a été découvert à l'aube, assis sur le trottoir de French Hill, un chat noir sur les genoux. Il affirme avoir passé la nuit dans une ville au-delà du sommeil et refuse d'en dire davantage."]
    ]
  },
  ulthar: {
    label: "Ulthar, Contrée du Rêve", journal: "Le Miaulement d'Ulthar", date: "Ulthar, au-delà du Skai — nuit de pleine lune", prix: "Une sardine",
    unes: [
      ["Les zoogs rôdent au bois enchanté", "Les anciens recommandent de ne pas s'aventurer sous les grands chênes", "Depuis la dernière lune, les zoogs se montrent jusqu'aux portes de la ville. Des voyageurs racontent avoir entendu leurs chuchotements suivre la route, et deux chats du quartier du temple ne sont pas rentrés."],
      ["Un marchand aux turbans noirs vend des cages vides", "Les citoyens se demandent ce qu'il compte y mettre", "Arrivé par la route de Dylath-Leen, un marchand silencieux a dressé son étal sur la place. Il ne vend que des cages, de toutes les tailles, et refuse toute pièce d'or. Les chats d'Ulthar l'observent sans relâche."],
      ["La cloche du temple sonne à minuit", "Le grand prêtre Atal assure que personne n'a touché la corde", "La vieille cloche des Anciens Dieux a sonné treize coups la nuit dernière. Atal ne commente pas, mais il a demandé qu'on laisse du lait sur chaque seuil jusqu'à la prochaine lune."],
      ["Le Skai charrie des fleurs inconnues", "Pétales violets et parfum de nuit le long des berges", "Les pêcheurs remontent depuis trois jours des fleurs qu'aucun herboriste ne sait nommer. Celles et ceux qui en respirent le parfum rêvent tous du même escalier de nuages."],
      ["Rappel de la loi d'Ulthar", "Nul ne peut tuer un chat dans les murs de la cité", "Le conseil rappelle la plus ancienne loi de la ville, après l'arrivée d'étrangers qui ignoraient la coutume. Les contrevenants s'exposent à la colère du peuple félin, et l'on sait ce qu'il advint du vieux couple de la maison sombre."],
      ["Une caravane disparaît dans les collines", "Seuls ses chameaux sont revenus, la bride rongée", "La caravane de Nir devait arriver avant la fête de la lune. Ses bêtes sont rentrées seules, effrayées, portant encore leurs ballots intacts. Les éclaireurs parlent de traces d'ailes immenses dans la poussière."]
    ]
  }
};

/** Style proposé d'après la scène affichée (Rêve, Ulthar, Contrée… → Ulthar ; sinon Arkham). */
export function styleSelonLieu() {
  const nom = `${canvas?.scene?.name ?? ""} ${canvas?.scene?.navName ?? ""}`;
  return /ulthar|r[êe]ve|contr[ée]e|dylath|kadath|céléphaïs|celephais|skai/i.test(nom) ? "ulthar" : "arkham";
}

function carteChat(g) {
  return `<div class="mu-carte mu-carte-gazette mu-gazette-${g.style}">
    <div class="mu-gz-mini-titre">${esc(g.journal)}</div>
    <div class="mu-gz-mini-une">${esc(g.manchette)}</div>
    <div class="mu-boutons"><button type="button" data-mu="gazette-lire"><i class="fa-solid fa-newspaper"></i> Lire la Gazette</button></div></div>`;
}

export class FenetreGazette extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["miaulements-ulthar", "mu-gazette-fenetre"],
    window: { title: "La Gazette", icon: "fa-solid fa-newspaper", resizable: true },
    position: { width: 640, height: "auto" }
  };
  static PARTS = { corps: { template: `systems/${SYSTEM_ID}/templates/gazette.hbs`, scrollable: [".mu-gz"] } };

  constructor(gazette, options = {}) {
    super({ id: `mu-gazette-${gazette.id ?? foundry.utils.randomID()}`, ...options });
    this.gazette = gazette;
  }
  get title() { return this.gazette.journal; }

  async _prepareContext() {
    const g = this.gazette;
    const paragraphes = String(g.article ?? "").split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
    return { ...g, paragraphes, prix: STYLES[g.style]?.prix ?? "" };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this.element.classList.add(`mu-gazette-${this.gazette.style}`);
  }

  static montrer(gazette) {
    const id = `mu-gazette-${gazette.id}`;
    const existante = foundry.applications.instances.get(id);
    if (existante) return existante.render({ force: true });
    return new FenetreGazette(gazette).render({ force: true });
  }
}

/** Fenêtre du Gardien : rédiger (ou tirer) puis publier. */
export async function gazette() {
  if (!game.user.isGM) return ui.notifications.warn("La Gazette se rédige côté Gardien.");
  const style = styleSelonLieu();
  const choixStyle = Object.entries(STYLES).map(([k, s]) =>
    `<label class="mu-r-pastille"><input type="radio" name="style" value="${k}" ${k === style ? "checked" : ""}>${esc(s.label)}</label>`).join("");
  const html = `<p class="mu-dlg-titre">Quel journal ?</p><div class="mu-r-choix">${choixStyle}</div>
    <div class="mu-gz-form">
      <label>Nom du journal<input type="text" name="journal" value="${esc(STYLES[style].journal)}"></label>
      <label>Date et lieu<input type="text" name="date" value="${esc(STYLES[style].date)}"></label>
      <label>Manchette<input type="text" name="manchette" placeholder="Des chats envahissent le cimetière"></label>
      <label>Sous-titre<input type="text" name="sousTitre" placeholder="Les gardiens jurent les avoir vus monter la garde"></label>
      <label>Article<textarea name="article" rows="6" placeholder="Un paragraphe par ligne."></textarea></label>
      <label>Image (facultative)<span class="mu-gz-image"><input type="text" name="image" placeholder="chemin d'une image"><button type="button" data-gz="parcourir" aria-label="Choisir une image"><i class="fa-solid fa-folder-open"></i></button></span></label>
      <label>Légende de l'image<input type="text" name="legende" placeholder="Le caveau Corey, au petit matin"></label>
      <label class="mu-gz-case"><input type="checkbox" name="secret"> Garder pour moi (ne pas montrer aux joueurs)</label>
      <button type="button" class="mu-gz-hasard" data-gz="hasard"><i class="fa-solid fa-dice"></i> Une au hasard</button>
    </div>`;
  const g = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Rédiger la Gazette", icon: "fa-solid fa-newspaper" },
    classes: ["miaulements-ulthar", "mu-dialogue", `mu-theme-${(() => { try { return game.settings.get(SYSTEM_ID, "themeFiche") || "nuit"; } catch (e) { return "nuit"; } })()}`],
    position: { width: 520 },
    content: `<div class="mu-dlg-saisie">${html}</div>`,
    render: (event, dialog) => {
      const el = dialog.element; const f = el.querySelector("form") ?? el;
      const champ = (n) => el.querySelector(`[name="${n}"]`);
      el.querySelectorAll('[name="style"]').forEach((r) => r.addEventListener("change", () => {
        const s = STYLES[r.value]; champ("journal").value = s.journal; champ("date").value = s.date;
      }));
      el.querySelector('[data-gz="hasard"]').addEventListener("click", () => {
        const s = STYLES[el.querySelector('[name="style"]:checked').value];
        const [m, st, a] = hasard(s.unes); champ("manchette").value = m; champ("sousTitre").value = st; champ("article").value = a;
      });
      el.querySelector('[data-gz="parcourir"]').addEventListener("click", () => {
        const FP = foundry.applications.apps.FilePicker.implementation ?? foundry.applications.apps.FilePicker;
        new FP({ type: "image", current: champ("image").value, callback: (chemin) => { champ("image").value = chemin; } }).browse();
      });
      void f;
    },
    ok: {
      label: "Publier", icon: "fa-solid fa-newspaper",
      callback: (event, button) => {
        const e = button.form.elements;
        return { style: e.style.value, journal: e.journal.value.trim(), date: e.date.value.trim(), manchette: e.manchette.value.trim(), sousTitre: e.sousTitre.value.trim(),
          article: e.article.value.trim(), image: e.image.value.trim(), legende: e.legende.value.trim(), secret: e.secret.checked };
      }
    },
    rejectClose: false
  });
  if (!g) return null;
  if (!g.manchette) { const [m, st, a] = hasard(STYLES[g.style].unes); Object.assign(g, { manchette: m, sousTitre: g.sousTitre || st, article: g.article || a }); }
  return publierGazette(g);
}

/** Publie : carte dans le chat (au Gardien seul si secret) et fenêtre ouverte chez tous ceux qui la voient. */
export async function publierGazette(g) {
  g.id = foundry.utils.randomID();
  const { secret, ...donnees } = g;
  const message = await ChatMessage.create({
    content: carteChat(donnees), speaker: { alias: donnees.journal },
    whisper: secret ? game.users.filter((u) => u.isGM).map((u) => u.id) : [],
    flags: { [SYSTEM_ID]: { gazette: donnees } }
  });
  FenetreGazette.montrer(donnees);
  if (!secret) game.socket.emit(`system.${SYSTEM_ID}`, { type: "gazette", gazette: donnees });
  return message;
}

export function brancherGazette() {
  game.socket.on(`system.${SYSTEM_ID}`, (data) => { if (data?.type === "gazette" && data.gazette) FenetreGazette.montrer(data.gazette); });
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const g = message.getFlag(SYSTEM_ID, "gazette");
    if (g) html.querySelector("[data-mu='gazette-lire']")?.addEventListener("click", () => FenetreGazette.montrer(g));
  });
}
