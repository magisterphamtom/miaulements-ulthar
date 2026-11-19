/**
 * Cartes de résultat dans la messagerie (v0.14.0).
 * Un seul HTML est envoyé à tous ; chaque joueur l'habille selon le thème de SA fiche (classe mu-chat-<thème> sur <body>) :
 * Nuit = médaillon à oreilles, Grimoire = collier et médaille, Rêve = grande empreinte, Journal = Gazette d'Ulthar.
 */
import { SYSTEM_ID } from "./config.mjs";

const esc = (t) => foundry.utils.escapeHTML(String(t ?? ""));
const THEMES = ["nuit", "grimoire", "reve", "journal"];

/** Pose sur <body> la classe du thème de ce joueur (cartes du chat). */
export function appliquerThemeCorps() {
  let t = "";
  try { t = game.settings.get(SYSTEM_ID, "themeFiche"); } catch (err) { /* réglage absent */ }
  if (!THEMES.includes(t)) { try { t = game.settings.get(SYSTEM_ID, "themeFicheDefaut"); } catch (err) { /* idem */ } }
  if (!THEMES.includes(t)) t = "nuit";
  for (const x of THEMES) document.body.classList.toggle(`mu-chat-${x}`, x === t);
}

/** Phrases (Nuit) et manchettes (Gazette) selon ce qui est tenté. */
const PHRASES = {
  agi: ["retombe sur ses pattes", "manque son saut"],
  phy: ["déploie une force étonnante", "s'épuise en vain"],
  dis: ["se fond dans l'ombre", "se fait repérer"],
  pre: ["réussit un geste d'orfèvre", "a la patte malhabile"],
  per: ["flaire quelque chose", "ne remarque rien"],
  int: ["a une idée lumineuse", "reste perplexe"],
  cha: ["charme son auditoire", "laisse tout le monde de marbre"],
  chn: ["a une chance de chat", "joue de malchance"],
  folie: ["garde son sang-froid", "perd la tête"],
  attaque: ["frappe juste", "frappe dans le vide"],
  pouvoir: ["libère sa magie", "voit sa magie s'éteindre"]
};

/**
 * HTML d'une carte de jet.
 * o : { actor, nom, quoi (libellé), cle (clé de PHRASES), cible, brut, reussite, critReussite, critEchec, verdict, detail, notes, extra }
 */
export function carteJet(o) {
  const nom = o.nom ?? o.actor?.name ?? "";
  const img = o.actor?.img ?? "icons/svg/mystery-man.svg";
  const [bien, mal] = PHRASES[o.cle] ?? ["réussit", "échoue"];
  const crit = o.critReussite ? " de façon spectaculaire" : o.critEchec ? " lamentablement" : "";
  const phrase = `${nom} ${o.reussite ? bien : mal}${crit}${o.reussite ? " !" : "…"}`;
  const classes = ["mu-carte", "mu-carte-jet", o.reussite ? "reussite" : "echec", o.critReussite ? "critique" : "", o.critEchec ? "critique" : "", o.classe ?? ""].filter(Boolean).join(" ");
  return `<div class="${classes}">
    <div class="mu-c-oreilles"></div>
    <header><img class="mu-c-portrait" src="${esc(img)}" alt=""><span class="mu-c-ident"><span class="mu-c-nom">${esc(nom)}</span><span class="mu-c-attr">${esc(o.quoi)} · ${o.cible} %</span></span></header>
    <p class="mu-c-phrase">${esc(phrase)}</p>
    <div class="mu-c-de"><b>${o.brut}</b><small>sur ${o.cible}</small></div>
    <p class="mu-verdict">${esc(o.verdict)}</p>
    <p class="mu-detail">${o.detail ?? ""}</p>${o.notes ?? ""}${o.extra ?? ""}</div>`;
}
