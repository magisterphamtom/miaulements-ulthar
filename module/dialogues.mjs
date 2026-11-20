/**
 * Boîtes de dialogue de la fiche (v0.13.0) : style « cartes à piocher », habillées du thème choisi par le joueur
 * pour sa fiche, avec un chat en ombre chinoise en filigrane (assets/dialogues/<image>.webp).
 */
import { ATTRIBUTS, DIFFICULTES, SYSTEM_ID } from "./config.mjs";

const { DialogV2 } = foundry.applications.api;
const esc = (t) => foundry.utils.escapeHTML(String(t ?? ""));

const THEMES = ["nuit", "grimoire", "reve", "journal"];
/** Images disponibles (les autres fenêtres n'ont pas de filigrane tant que l'image n'existe pas). */
export const IMAGES = new Set(["agi", "phy", "dis", "pre", "per", "int", "cha", "chn", "attaque", "folie", "bulle", "creation"]);
const MANQUANTES = new Set(); // toutes les images sont présentes depuis la 0.15.1

function theme() {
  let t = "";
  try { t = game.settings.get(SYSTEM_ID, "themeFiche"); } catch (err) { /* réglage absent */ }
  if (!THEMES.includes(t)) { try { t = game.settings.get(SYSTEM_ID, "themeFicheDefaut"); } catch (err) { /* idem */ } }
  return THEMES.includes(t) ? t : "nuit";
}

/** Classes et style d'une fenêtre : thème du joueur + image en filigrane. */
export function habillage(image) {
  const classes = ["miaulements-ulthar", "mu-dialogue", `mu-theme-${theme()}`];
  if (image && IMAGES.has(image) && !MANQUANTES.has(image)) classes.push("mu-avec-image", `mu-img-${image}`);
  return classes;
}

const PATTES = { "-40": 5, "-20": 4, "0": 3, "20": 2, "40": 1 };

function cartesDifficulte(choisie = "0") {
  const ordre = ["-40", "-20", "0", "20", "40"].filter((v) => v in DIFFICULTES);
  return `<div class="mu-cartes-diff">${ordre.map((v) => [v, DIFFICULTES[v]]).map(([v, l]) => {
    const nom = l.replace(/\s*\(.*\)$/, "");
    const signe = Number(v) > 0 ? `+${v}` : v === "0" ? "0" : `−${Math.abs(v)}`;
    return `<label class="mu-carte-diff ${v === choisie ? "on" : ""}"><input type="radio" name="difficulte" value="${v}" ${v === choisie ? "checked" : ""}>
      <span class="mu-coin">${signe}</span><span class="mu-pattes-carte">${'<i class="fa-solid fa-paw"></i>'.repeat(PATTES[v] ?? 3)}</span>
      <b>${signe}</b><span class="mu-nom-carte">${nom}</span></label>`;
  }).join("")}</div>`;
}

/** Recalcule le grand rond et l'état des cartes à chaque changement. */
function brancherCalcul(dialog, valeurs) {
  const el = dialog.element;
  const maj = () => {
    const f = el.querySelector("form") ?? el;
    const diff = Number(f.querySelector("[name=difficulte]:checked")?.value ?? 0);
    const pouvoir = Boolean(f.querySelector("[name=pouvoir]")?.checked);
    const attr = f.querySelector("[name=attribut]")?.value;
    const base = attr && valeurs[attr] !== undefined ? valeurs[attr] : valeurs._base;
    const cible = Math.max(0, Math.min(100, base - diff + (pouvoir ? 20 : 0)));
    const rond = el.querySelector(".mu-rond-cible b");
    if (rond) rond.textContent = cible;
    const etiquette = el.querySelector(".mu-rond-cible .mu-attr-rond");
    if (etiquette && attr) etiquette.textContent = `${ATTRIBUTS[attr]?.label ?? ""} ${base} %`;
    el.querySelectorAll(".mu-carte-diff").forEach((c) => c.classList.toggle("on", c.querySelector("input").checked));
    el.querySelector(".mu-interrupteur")?.classList.toggle("on", pouvoir);
    if (attr) for (const k of [...el.classList]) if (k.startsWith("mu-img-")) el.classList.remove(k);
    if (attr && !MANQUANTES.has(attr)) el.classList.add("mu-avec-image", `mu-img-${attr}`);
  };
  el.addEventListener("change", maj);
  maj();
}

/**
 * Fenêtre de jet : difficulté en cartes, pouvoir en interrupteur, score à faire en direct.
 * opts : { valeur, image, pouvoirPossible, pm, attributs: [cles], valeurs: {cle: %}, degats: {formule: libellé}, titreRond }
 */
export async function demanderJet(titre, opts = {}) {
  const { valeur = 50, image, pouvoirPossible = true, pm, attributs, valeurs = {}, degats, titreRond } = opts;
  const choixAttr = attributs?.length
    ? `<div class="mu-ligne-choix"><label>Attribut</label><select name="attribut">${attributs.map((k) => `<option value="${k}">${ATTRIBUTS[k].label} (${valeurs[k] ?? "?"} %)</option>`).join("")}</select></div>` : "";
  const choixDeg = degats
    ? `<div class="mu-ligne-choix"><label>Dégâts</label><select name="degats">${Object.entries(degats).map(([f, l]) => `<option value="${f}">${esc(l)}</option>`).join("")}</select></div>` : "";
  const pouvoir = pouvoirPossible
    ? `<label class="mu-interrupteur"><input type="checkbox" name="pouvoir"><span class="mu-bascule"></span><span><i class="fa-solid fa-wand-sparkles"></i> Utiliser un pouvoir : +20 <small>(coûte les unités du dé${pm !== undefined ? ` · ${pm} PM` : ""})</small></span></label>` : "";
  const content = `<div class="mu-dlg-jet">
    <div class="mu-rond-cible"><span class="mu-attr-rond">${esc(titreRond ?? "")}</span><b>${valeur}</b><small>à faire au D100</small></div>
    ${choixAttr}${choixDeg}
    <h4 class="mu-dlg-titre">Choisis la difficulté</h4>
    ${cartesDifficulte("0")}
    ${pouvoir}</div>`;
  return DialogV2.prompt({
    window: { title: titre, icon: "fa-solid fa-dice-d20" },
    classes: habillage(image),
    position: { width: 430 },
    content,
    render: (event, dialog) => brancherCalcul(dialog, { ...valeurs, _base: valeur }),
    ok: {
      label: "Lancer",
      icon: "fa-solid fa-dice-d20",
      callback: (event, button) => {
        const f = button.form;
        const val = (n) => f.querySelector(`[name="${n}"]`);
        return {
          difficulte: Number(f.querySelector("[name=difficulte]:checked")?.value ?? 0),
          pouvoir: Boolean(val("pouvoir")?.checked),
          attribut: val("attribut")?.value,
          degats: val("degats")?.value
        };
      }
    },
    rejectClose: false
  });
}

/** Jet de Folie : la raison se choisit en cartes (elle apparaît sur la carte de chat). */
export async function demanderFolie(actor) {
  const raisons = [["Peur", "fa-ghost"], ["Instinct de chasseur", "fa-paw"], ["Curiosité", "fa-eye"], ["Horreur indicible", "fa-skull"]];
  const content = `<div class="mu-dlg-jet">
    <div class="mu-rond-cible"><span class="mu-attr-rond">Folie</span><b>${actor.system.pf.value}</b><small>à faire au D100</small></div>
    <h4 class="mu-dlg-titre">Qu'est-ce qui trouble le Chat ?</h4>
    <div class="mu-cartes-diff">${raisons.map(([r, ic], i) => `<label class="mu-carte-diff ${i === 0 ? "on" : ""}"><input type="radio" name="difficulte" value="${esc(r)}" ${i === 0 ? "checked" : ""}>
      <span class="mu-pattes-carte"><i class="fa-solid ${ic}"></i></span><span class="mu-nom-carte">${r}</span></label>`).join("")}</div></div>`;
  return DialogV2.prompt({
    window: { title: `${actor.name} — Jet de Folie`, icon: "fa-solid fa-brain" },
    classes: habillage("folie"),
    position: { width: 430 },
    content,
    render: (event, dialog) => {
      const el = dialog.element;
      el.addEventListener("change", () => el.querySelectorAll(".mu-carte-diff").forEach((c) => c.classList.toggle("on", c.querySelector("input").checked)));
    },
    ok: { label: "Lancer", icon: "fa-solid fa-dice-d20", callback: (e, b) => b.form.querySelector("[name=difficulte]:checked")?.value ?? "" },
    rejectClose: false
  });
}

/** Confirmation habillée. */
export async function confirmer({ titre, html, image = "creation", oui = "Confirmer", icone = "fa-solid fa-check" }) {
  return DialogV2.confirm({
    window: { title: titre, icon: "fa-solid fa-paw" },
    classes: habillage(image),
    position: { width: 420 },
    content: `<div class="mu-dlg-confirmer">${html}</div>`,
    yes: { label: oui, icon: icone },
    no: { label: "Annuler", icon: "fa-solid fa-xmark" },
    rejectClose: false
  });
}

/** Fenêtre de saisie habillée (bulle onirique). */
export async function saisir({ titre, html, image = "bulle", ok = "Valider", callback }) {
  return DialogV2.prompt({
    window: { title: titre, icon: "fa-solid fa-moon" },
    classes: habillage(image),
    position: { width: 460 },
    content: `<div class="mu-dlg-saisie">${html}</div>`,
    render: (event, dialog) => {
      const el = dialog.element;
      el.addEventListener("change", () => el.querySelectorAll(".mu-carte-diff").forEach((c) => c.classList.toggle("on", c.querySelector("input").checked)));
    },
    ok: { label: ok, icon: "fa-solid fa-moon", callback },
    rejectClose: false
  });
}

export { cartesDifficulte };
