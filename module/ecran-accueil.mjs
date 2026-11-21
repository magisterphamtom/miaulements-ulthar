/**
 * Écran d'accueil « tableau d'enquête » (v0.20.0, style B choisi par Stéphane).
 * À chaque session, un panneau de liège couvre l'écran : des coupures de l'Arkham Advertiser, punaisées et reliées
 * par un fil rouge, servent de boutons. Chaque coupure ouvre une page de journal où l'on agit directement :
 * - Mon Chat : créer son Chat (race, modificateurs, pouvoirs, portrait, surnom) ou voir le sien et ouvrir sa fiche ;
 * - Le wiki : lire le wiki des joueurs (et du Gardien) dans l'écran ;
 * - La mode d'Arkham : choisir son thème, appliqué en direct ;
 * - Gardien : préparer la partie (importer les compendiums choisis) et ouvrir son tableau ;
 * - Entrer à Ulthar : l'écran s'efface. Il se rouvre par le bouton journal de la barre des jetons.
 * Un simple calque HTML (pas de fenêtre Foundry), sans animation en boucle.
 */
import { SYSTEM_ID, ATTRIBUTS, RACES } from "./config.mjs";
import { POUVOIRS_INNES, POUVOIRS_RACE } from "./pouvoirs.mjs";
import { appliquerCreation } from "./creation.mjs";
import { pvDepuisTable } from "./datamodels.mjs";
import { appliquerThemeCorps } from "./cartes.mjs";

const esc = (t) => foundry.utils.escapeHTML(String(t ?? ""));
const sg = (n) => (n > 0 ? `+${n}` : `${n}`);
const MODS = [20, 10, 5, -5, -10, -20];
const PORTRAITS = ["ator", "chiffon", "filou", "isis", "leonard", "maya", "orichat"].map((n) => `systems/${SYSTEM_ID}/assets/portraits/${n}.webp`);
const THEMES = [
  ["nuit", "Nuit d'Arkham", "#1d1a24", "#d9b34a"], ["grimoire", "Grimoire d'Ulthar", "#e9dcbc", "#7a1f2b"],
  ["reve", "Contrée du Rêve", "#eee8fb", "#6b4fa0"], ["journal", "Journal d'Arkham, 1921", "#ece6d8", "#1c1a17"]
];
const PACKS = [
  ["pretires", "Prétirés", "Chats prêts à jouer"], ["bestiaire", "Bestiaire", "adversaires"], ["scenes", "Scènes", "accueil et cartes"],
  ["scenarios", "Scénarios", "scénarios, campagne, aides de jeu"], ["tables", "Tables", "Folie, rencontres, surnoms…"],
  ["pouvoirs", "Pouvoirs", "pouvoirs innés, de race, temporaires"], ["macros", "Macros", "outils du Gardien"]
];

const monChat = () => (game.user.character?.type === "chat" ? game.user.character : null)
  ?? game.actors.find((a) => a.type === "chat" && a.isOwner && (game.user.isGM ? a.getFlag(SYSTEM_ID, "chatDuGardien") : true));

function themeActuel() {
  try { return game.settings.get(SYSTEM_ID, "themeFiche") || "nuit"; } catch (err) { return "nuit"; }
}

/** Silhouette de chat aux couleurs d'une race (portrait par défaut du créateur). */
const COULEURS = { bengal: "#c8823a", gouttiere: "#8a8170", cornish: "#b7a99a", mainecoon: "#7a5a3a", norvegien: "#a8a8a8", persan: "#efe6da", savannah: "#d6b25a", scottish: "#9aa3ad", siamois: "#e9dcc6", sphynx: "#e8b9a8" };
const silhouette = (c) => `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 56c0-15 6-25 18-25s18 10 18 25z" fill="${c}"/><circle cx="32" cy="27" r="13" fill="${c}"/><path d="M21 20l-3-12 10 7zM43 20l3-12-10 7z" fill="${c}"/><circle cx="27" cy="26" r="2.2" fill="#2a2433"/><circle cx="37" cy="26" r="2.2" fill="#2a2433"/><path d="M31 31h2l-1 1.5z" fill="#2a2433"/></svg>`;

export class EcranAccueil {
  static el = null;
  static vue = "tableau";
  static wiki = { quel: "joueur", entree: null, page: null };
  static creation = null;

  static nouvelleCreation() {
    return { race: "gouttiere", pouvoirRace: 0, pose: {}, arme: null, gPlus: "", gMoins: "", innes: [], surnom: "", img: "" };
  }

  static ouvrir(vue = "tableau") {
    EcranAccueil.creation ??= EcranAccueil.nouvelleCreation();
    if (!EcranAccueil.el) {
      const el = document.createElement("div");
      el.id = "mu-ecran-accueil";
      el.addEventListener("click", (ev) => EcranAccueil.#clic(ev));
      el.addEventListener("input", (ev) => { if (ev.target.name === "surnom") EcranAccueil.creation.surnom = ev.target.value; });
      el.addEventListener("change", (ev) => { const f = ev.target.dataset.eaChamp; if (f) { EcranAccueil.creation[f] = ev.target.value; EcranAccueil.afficher(); } });
      el.tabIndex = -1;
      el.addEventListener("keydown", (ev) => { if (ev.key === "Escape") EcranAccueil.fermer(); });
      document.body.append(el);
      EcranAccueil.el = el;
      el.focus();
    }
    EcranAccueil.afficher(vue);
  }

  static fermer() {
    EcranAccueil.el?.remove();
    EcranAccueil.el = null;
    ui.controls?.render?.();
  }

  static basculer() { return EcranAccueil.el ? EcranAccueil.fermer() : EcranAccueil.ouvrir(); }

  static async afficher(vue = EcranAccueil.vue) {
    EcranAccueil.vue = vue;
    const el = EcranAccueil.el;
    if (!el) return;
    el.innerHTML = EcranAccueil.#tableau() + (vue === "tableau" ? "" : `<div class="mu-ea-voile" data-ea="tableau"></div><article class="mu-ea-page">${await EcranAccueil.#page(vue)}</article>`);
    el.querySelector(".mu-ea-page")?.scrollTo?.(0, 0);
  }

  /* ---------------- Le tableau de liège ---------------- */

  static #tableau() {
    const chat = monChat();
    const gm = game.user.isGM;
    const coupure = (vue, titre, texte, style, extra = "") =>
      `<button type="button" class="mu-ea-coupure ${extra}" data-ea="${vue}" style="${style}"><i class="mu-ea-punaise"></i><b>${titre}</b><span>${texte}</span></button>`;
    const fils = gm
      ? "M18 30 L48 40 L80 26 M48 40 L30 74 L62 70 M62 70 L84 66"
      : "M20 32 L50 44 L80 30 M50 44 L52 76";
    return `<div class="mu-ea-liege">
      <svg class="mu-ea-fils" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${fils}"/></svg>
      <header class="mu-ea-tete"><i class="mu-ea-punaise"></i><span class="mu-ea-filet"><span>Arkham, Massachusetts</span><span>Édition du soir</span></span>
        <h1>The Arkham Advertiser</h1><span class="mu-ea-filet double"><span>Bienvenue, ${esc(chat?.name ?? game.user.name)}</span><span>Les Miaulements d'Ulthar</span></span></header>
      ${coupure("chat", chat ? `${esc(chat.name)} veille sur Ulthar` : "Un nouveau Chat arrive à Ulthar !", chat ? "Voir mon Chat, ouvrir sa fiche" : "Créer mon Chat : race, attributs, pouvoirs", gm ? "left:6%;top:24%;--r:-3deg" : "left:8%;top:26%;--r:-3deg")}
      ${coupure("wiki", "Tout savoir sur la ville des chats", gm ? "Le wiki des joueurs et celui du Gardien" : "Le wiki des joueurs : univers, règles, races", gm ? "left:36%;top:34%;--r:2deg" : "left:38%;top:38%;--r:2deg")}
      ${coupure("theme", "La mode d'Arkham", "Choisir le thème de ma fiche et de mes fenêtres", gm ? "left:68%;top:20%;--r:-1.5deg" : "left:68%;top:24%;--r:-1.5deg")}
      ${gm ? coupure("prepa", "Le Gardien prépare la nuit", "Importer prétirés, bestiaire, scènes…", "left:18%;top:64%;--r:1.5deg") : ""}
      ${gm ? coupure("gardien-tableau", "Le tableau du Gardien", "Chats, adversaires, jets, rencontres, Gazette", "left:72%;top:58%;--r:2.5deg", "note") : ""}
      <figure class="mu-ea-deco carte" style="left:3.5%;top:${gm ? 79 : 62}%;--r:-4deg"><i class="mu-ea-punaise"></i><img src="systems/${SYSTEM_ID}/assets/cartes/arkham.webp" alt=""><figcaption>Arkham, relevé du cadastre</figcaption></figure>
      ${chat ? `<figure class="mu-ea-deco photo" style="left:${gm ? 4 : 6}%;top:${gm ? 46 : 46}%;--r:5deg"><i class="mu-ea-punaise"></i><img src="${esc(chat.img)}" alt=""><figcaption>${esc(chat.name)}</figcaption></figure>` : ""}
      ${coupure("entrer", "Entrer à Ulthar ›", "La partie commence", gm ? "left:46%;top:66%;--r:-2deg" : "left:42%;top:68%;--r:-2deg", "sombre")}
      <p class="mu-ea-aide">Cet écran revient à chaque session · bouton journal de la barre des jetons pour le rouvrir · Échap pour entrer</p>
    </div>`;
  }

  /* ---------------- Les pages de journal ---------------- */

  static async #page(vue) {
    const fermer = `<button type="button" class="mu-ea-retour" data-ea="tableau"><i class="fa-solid fa-arrow-left"></i> Retour au tableau</button>`;
    const tete = (titre, sous) => `<header class="mu-ea-p-tete">${fermer}<span class="mu-ea-filet"><span>The Arkham Advertiser</span><span>Édition du soir</span></span>
      <h2>${titre}</h2>${sous ? `<p class="mu-ea-sous">${sous}</p>` : ""}</header>`;
    if (vue === "chat") return monChat() ? tete(esc(monChat().name), "Le Chat qui veille sur toi") + EcranAccueil.#monChat() : tete("Un nouveau Chat arrive à Ulthar", "Race, attributs et pouvoirs : compose ton Chat") + EcranAccueil.#createur();
    if (vue === "wiki") return tete("Tout savoir sur la ville des chats", "Le wiki, page après page") + await EcranAccueil.#wiki();
    if (vue === "theme") return tete("La mode d'Arkham", "Ton thème habille ta fiche, tes fenêtres et tes cartes de jet") + EcranAccueil.#themes();
    if (vue === "prepa") return tete("Le Gardien prépare la nuit", "Coche ce que tu veux importer dans ce monde") + await EcranAccueil.#prepa();
    return "";
  }

  static #monChat() {
    const a = monChat(); const s = a.system;
    const race = RACES[s.race]?.label ?? "race à choisir";
    const attrs = Object.entries(ATTRIBUTS).map(([k, at]) => `<div class="mu-ea-at"><span>${s.attributs[k].value}</span>${at.label}</div>`).join("");
    const pouvoirs = a.items.filter((i) => i.type === "pouvoir").map((i) => `<li>${esc(i.name)}</li>`).join("") || "<li>aucun pour l'instant</li>";
    return `<div class="mu-ea-colonnes">
      <figure class="mu-ea-portrait"><img src="${esc(a.img)}" alt=""><figcaption>${esc(race)}</figcaption></figure>
      <div><div class="mu-ea-res"><span>Santé <b>${s.pv.value}/${s.pv.max}</b></span><span>Magie <b>${s.pm.value}/${s.pm.max}</b></span><span>Folie <b>${s.pf.value}/${s.pf.max}</b></span><span>Vies <b>${s.vies.value}/${s.vies.max}</b></span></div>
      <div class="mu-ea-attrs">${attrs}</div>
      <h3>Pouvoirs</h3><ul class="mu-ea-liste">${pouvoirs}</ul></div></div>
      <h3>Changer de portrait</h3><div class="mu-ea-galerie">${EcranAccueil.#galerie(a.img, "portrait-chat")}</div>
      <div class="mu-ea-actions"><button type="button" class="mu-ea-bouton" data-ea="ouvrir-fiche"><i class="fa-solid fa-paw"></i> Ouvrir ma fiche</button></div>`;
  }

  static #galerie(actuel, action) {
    const perso = game.user.can("FILES_BROWSE") ? `<button type="button" class="mu-ea-vignette perso" data-ea="${action}-perso" data-tooltip="Image de ton choix"><i class="fa-solid fa-folder-open"></i></button>` : "";
    return PORTRAITS.map((src) => `<button type="button" class="mu-ea-vignette ${src === actuel ? "on" : ""}" data-ea="${action}" data-src="${src}"><img src="${src}" alt=""></button>`).join("") + perso;
  }

  static #valeurs() {
    const c = EcranAccueil.creation; const r = RACES[c.race];
    const v = {};
    for (const k of Object.keys(ATTRIBUTS)) {
      let base = 50; for (const [m, cle] of Object.entries(c.pose)) if (cle === k) base += Number(m);
      let race = 0;
      if (r.plus === k) race += 10; if (r.moins === k) race -= 10;
      if (c.race === "gouttiere") { if (c.gPlus === k) race += 5; if (c.gMoins === k) race -= 5; }
      v[k] = { base, race, handicap: 0, total: base + race };
    }
    return v;
  }

  static #createur() {
    const c = EcranAccueil.creation; const r = RACES[c.race]; const v = EcranAccueil.#valeurs();
    const cles = Object.keys(RACES); const i = cles.indexOf(c.race);
    const pv = pvDepuisTable(v.phy.total + v.agi.total);
    const optionsAttr = (sel) => `<option value="">—</option>` + Object.entries(ATTRIBUTS).map(([k, a]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${a.label}</option>`).join("");
    const innes = Object.entries(POUVOIRS_INNES).filter(([, p]) => !p.offert).map(([k, p]) =>
      `<button type="button" class="mu-ea-puce ${c.innes.includes(k) ? "on" : ""}" data-ea="inne" data-cle="${k}" data-tooltip="${esc(p.desc)}">${esc(p.nom)}</button>`).join("");
    return `<section class="mu-ea-etape"><h3><span>1</span> La race</h3>
      <div class="mu-ea-race"><button type="button" class="mu-ea-fleche" data-ea="race" data-pas="-1" aria-label="Race précédente">‹</button>
        <div class="mu-ea-portrait rond">${c.img ? `<img src="${esc(c.img)}" alt="">` : silhouette(COULEURS[c.race])}</div>
        <div class="mu-ea-race-texte"><b>${esc(r.label)}</b> <small>${i + 1} / ${cles.length}</small>
          <p>${r.plus ? `+10 % ${ATTRIBUTS[r.plus].label} · −10 % ${ATTRIBUTS[r.moins].label}` : "+5 % et −5 % au choix :"}</p>
          ${c.race === "gouttiere" ? `<p class="mu-ea-goutt"><label>+5 % <select data-ea-champ="gPlus">${optionsAttr(c.gPlus)}</select></label> <label>−5 % <select data-ea-champ="gMoins">${optionsAttr(c.gMoins)}</select></label></p>` : ""}
          <div class="mu-ea-puces">${POUVOIRS_RACE[c.race].map((p, k) => `<button type="button" class="mu-ea-puce ${c.pouvoirRace === k ? "on" : ""}" data-ea="pouvoir-race" data-k="${k}" data-tooltip="${esc(p.desc)}">${esc(p.nom)}</button>`).join("")}</div></div>
        <button type="button" class="mu-ea-fleche" data-ea="race" data-pas="1" aria-label="Race suivante">›</button></div></section>
    <section class="mu-ea-etape"><h3><span>2</span> Les attributs</h3><p class="mu-ea-consigne">Choisis un modificateur, puis clique l'attribut qui le reçoit (clic sur un attribut pour reprendre son modificateur). Chaque attribut reste entre 30 et 70 %.</p>
      <div class="mu-ea-puces">${MODS.map((m) => `<button type="button" class="mu-ea-puce mod ${String(c.arme) === String(m) ? "on" : ""} ${m in c.pose ? "pris" : ""}" data-ea="mod" data-m="${m}">${sg(m)} %</button>`).join("")}</div>
      <div class="mu-ea-attrs choix">${Object.entries(ATTRIBUTS).map(([k, a]) => { const t = v[k].total; const mods = Object.entries(c.pose).filter(([, cle]) => cle === k).map(([m]) => sg(Number(m)));
        return `<button type="button" class="mu-ea-at ${t < 30 || t > 70 ? "hors" : ""}" data-ea="attr" data-cle="${k}"><span>${t}</span>${a.label}<small>${mods.join(" ")}${v[k].race ? ` ${v[k].race > 0 ? "↑" : "↓"}race` : ""}</small></button>`; }).join("")}</div>
      <div class="mu-ea-res"><span>Santé <b>${pv}</b></span><span>Folie <b>${Math.round((v.per.total + v.cha.total) / 2)}</b></span><span>Magie <b>${v.int.total}</b></span><span>Vies <b>3</b></span></div></section>
    <section class="mu-ea-etape"><h3><span>3</span> Deux pouvoirs innés</h3><div class="mu-ea-puces">${innes}</div><p class="mu-ea-consigne">« Comprendre et lire l'humain » est offert à tous les Chats. Le handicap (un pouvoir de plus) se règle ensuite dans l'assistant de la fiche.</p></section>
    <section class="mu-ea-etape"><h3><span>4</span> Le portrait</h3><div class="mu-ea-galerie">${EcranAccueil.#galerie(c.img, "portrait-creation")}</div></section>
    <section class="mu-ea-etape"><h3><span>5</span> Le surnom</h3><input type="text" name="surnom" value="${esc(c.surnom)}" placeholder="Mimolette" maxlength="40">
      <div class="mu-ea-actions"><button type="button" class="mu-ea-bouton" data-ea="creer"><i class="fa-solid fa-paw"></i> Ce Chat est prêt !</button></div><p class="mu-ea-erreur"></p></section>`;
  }

  static async #wiki() {
    const gm = game.user.isGM; const w = EcranAccueil.wiki;
    if (!gm) w.quel = "joueur";
    const pack = game.packs.get(`${SYSTEM_ID}.wiki-${w.quel === "gardien" ? "mj" : "joueur"}`);
    if (!pack) return "<p>Wiki introuvable.</p>";
    const docs = (await pack.getDocuments()).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));
    let entree = docs.find((d) => d.id === w.entree) ?? docs.find((d) => /^Accueil/.test(d.name)) ?? docs[0];
    w.entree = entree?.id;
    const pages = entree ? entree.pages.contents.sort((a, b) => a.sort - b.sort) : [];
    const page = pages.find((p) => p.id === w.page) ?? pages[0];
    w.page = page?.id;
    let contenu = "";
    if (page?.type === "image") contenu = `<figure><img src="${esc(page.src)}" alt=""><figcaption>${esc(page.image?.caption ?? page.name)}</figcaption></figure>`;
    else if (page) contenu = await foundry.applications.ux.TextEditor.implementation.enrichHTML(page.text?.content ?? "", { relativeTo: page });
    const onglets = gm ? `<div class="mu-ea-onglets"><button type="button" data-ea="wiki-quel" data-quel="joueur" class="${w.quel === "joueur" ? "on" : ""}">Wiki des joueurs</button><button type="button" data-ea="wiki-quel" data-quel="gardien" class="${w.quel === "gardien" ? "on" : ""}">Wiki du Gardien</button></div>` : "";
    return `${onglets}<div class="mu-ea-wiki"><nav>${docs.map((d) => `<button type="button" data-ea="wiki-entree" data-id="${d.id}" class="${d.id === entree?.id ? "on" : ""}">${esc(d.name)}</button>`).join("")}</nav>
      <div class="mu-ea-wiki-texte">${pages.length > 1 ? `<div class="mu-ea-puces">${pages.map((p) => `<button type="button" class="mu-ea-puce ${p.id === page?.id ? "on" : ""}" data-ea="wiki-page" data-id="${p.id}">${esc(p.name)}</button>`).join("")}</div>` : ""}
      <div class="mu-ea-article mu-journal"><div class="journal-entry-page text"><div class="journal-page-content">${contenu}</div></div></div>
      <div class="mu-ea-actions"><button type="button" class="mu-ea-bouton clair" data-ea="wiki-grand"><i class="fa-solid fa-up-right-from-square"></i> Ouvrir le wiki en grand</button></div></div></div>`;
  }

  static #themes() {
    const t = themeActuel();
    return `<div class="mu-ea-themes">${THEMES.map(([k, nom, fond, encre]) =>
      `<button type="button" class="mu-ea-theme ${k === t ? "on" : ""}" data-ea="choisir-theme" data-cle="${k}" style="background:${fond};color:${encre};border-color:${encre}"><b>${nom}</b><span>${k === t ? "Thème actuel" : "Choisir"}</span></button>`).join("")}</div>
      <p class="mu-ea-consigne">Le choix s'applique tout de suite à ta fiche, à tes fenêtres et à tes cartes de jet, et il est gardé pour les prochaines sessions.</p>`;
  }

  static async #prepa() {
    const lignes = [];
    for (const [cle, nom, texte] of PACKS) {
      const pack = game.packs.get(`${SYSTEM_ID}.${cle}`);
      if (!pack) continue;
      const n = (await pack.getIndex()).size;
      const type = pack.documentName;
      const dossier = game.folders.find((f) => f.type === type && f.name === nom);
      const deja = dossier && (dossier.contents?.length ?? 0) > 0;
      lignes.push(`<label class="mu-ea-pack"><input type="checkbox" data-pack="${cle}" ${deja ? "" : "checked"}><b>${nom}</b><span>${n} ${texte}</span>${deja ? `<em>déjà dans le monde</em>` : ""}</label>`);
    }
    return `${lignes.join("")}<div class="mu-ea-actions"><button type="button" class="mu-ea-bouton" data-ea="importer"><i class="fa-solid fa-file-import"></i> Importer la sélection</button></div><p class="mu-ea-erreur ok"></p>
      <p class="mu-ea-consigne">Chaque compendium arrive dans un dossier à son nom. Les wikis n'ont pas besoin d'être importés : ils s'ouvrent depuis cet écran.</p>`;
  }

  /* ---------------- Actions ---------------- */

  static async #clic(ev) {
    const t = ev.target.closest("[data-ea]");
    if (!t) return;
    const a = t.dataset.ea; const c = EcranAccueil.creation;
    switch (a) {
      case "tableau": case "chat": case "wiki": case "theme": case "prepa": return EcranAccueil.afficher(a);
      case "entrer": return EcranAccueil.fermer();
      case "gardien-tableau": EcranAccueil.fermer(); return game.miaulementsUlthar?.tableau?.();
      case "ouvrir-fiche": { const ch = monChat(); EcranAccueil.fermer(); return ch?.sheet.render(true); }
      case "race": { const cles = Object.keys(RACES); c.race = cles[(cles.indexOf(c.race) + Number(t.dataset.pas) + cles.length) % cles.length]; c.pouvoirRace = 0; break; }
      case "pouvoir-race": c.pouvoirRace = Number(t.dataset.k); break;
      case "mod": { const m = t.dataset.m; if (m in c.pose) delete c.pose[m]; else c.arme = String(c.arme) === m ? null : m; break; }
      case "attr": {
        if (c.arme !== null) { c.pose[c.arme] = t.dataset.cle; c.arme = null; }
        else { const m = Object.keys(c.pose).find((x) => c.pose[x] === t.dataset.cle); if (m) delete c.pose[m]; }
        break;
      }
      case "inne": { const k = t.dataset.cle; c.innes = c.innes.includes(k) ? c.innes.filter((x) => x !== k) : (c.innes.length < 2 ? [...c.innes, k] : c.innes); break; }
      case "portrait-creation": c.img = t.dataset.src; break;
      case "portrait-creation-perso": case "portrait-chat-perso": return EcranAccueil.#choisirImage(a === "portrait-chat-perso");
      case "portrait-chat": { const ch = monChat(); if (ch) await ch.update({ img: t.dataset.src, "prototypeToken.texture.src": t.dataset.src }); break; }
      case "creer": return EcranAccueil.#creer();
      case "wiki-quel": EcranAccueil.wiki = { quel: t.dataset.quel, entree: null, page: null }; break;
      case "wiki-entree": EcranAccueil.wiki.entree = t.dataset.id; EcranAccueil.wiki.page = null; break;
      case "wiki-page": EcranAccueil.wiki.page = t.dataset.id; break;
      case "wiki-grand": EcranAccueil.fermer(); return game.miaulementsUlthar?.wiki?.(EcranAccueil.wiki.quel);
      case "choisir-theme": return EcranAccueil.#theme(t.dataset.cle);
      case "importer": return EcranAccueil.#importer();
      default: return;
    }
    EcranAccueil.afficher();
  }

  static #choisirImage(pourChat) {
    const FP = foundry.applications.apps.FilePicker.implementation ?? foundry.applications.apps.FilePicker;
    new FP({ type: "image", callback: async (src) => {
      if (pourChat) { const ch = monChat(); if (ch) await ch.update({ img: src, "prototypeToken.texture.src": src }); }
      else EcranAccueil.creation.img = src;
      EcranAccueil.afficher();
    } }).browse();
  }

  static async #theme(cle) {
    await game.settings.set(SYSTEM_ID, "themeFiche", cle);
    appliquerThemeCorps();
    for (const app of foundry.applications.instances.values()) app.appliquerTheme?.(cle);
    EcranAccueil.afficher();
  }

  static #erreurs() {
    const c = EcranAccueil.creation; const v = EcranAccueil.#valeurs(); const e = [];
    if (Object.keys(c.pose).length < MODS.length) e.push("place les six modificateurs");
    if (Object.values(v).some((x) => x.total < 30 || x.total > 70)) e.push("garde chaque attribut entre 30 et 70 %");
    if (c.race === "gouttiere" && (!c.gPlus || !c.gMoins || c.gPlus === c.gMoins)) e.push("choisis le +5 % et le −5 % du chat de gouttière (deux attributs différents)");
    if (c.innes.length !== 2) e.push("choisis deux pouvoirs innés");
    if (!c.surnom.trim()) e.push("donne un surnom à ton Chat");
    return e;
  }

  static async #creer() {
    const champ = EcranAccueil.el.querySelector('[name="surnom"]');
    if (champ) EcranAccueil.creation.surnom = champ.value;
    const e = EcranAccueil.#erreurs();
    const zone = EcranAccueil.el.querySelector(".mu-ea-erreur");
    if (e.length) { if (zone) zone.textContent = `Encore : ${e.join(", ")}.`; return; }
    const c = EcranAccueil.creation;
    const choix = { surnom: c.surnom.trim(), race: c.race, pouvoirRace: c.pouvoirRace, attrs: EcranAccueil.#valeurs(), innes: c.innes, img: c.img || PORTRAITS[0] };
    if (zone) zone.textContent = "Création en cours…";
    if (game.user.can("ACTOR_CREATE")) await creerChatPour(game.user, choix);
    else if (game.users.activeGM) game.socket.emit(`system.${SYSTEM_ID}`, { type: "creerChat", userId: game.user.id, choix });
    else { if (zone) zone.textContent = "Le Gardien doit être connecté pour créer ton Chat (ou te donner le droit de créer des acteurs)."; return; }
    EcranAccueil.creation = EcranAccueil.nouvelleCreation();
  }

  static async #importer() {
    const zone = EcranAccueil.el.querySelector(".mu-ea-erreur.ok");
    const choisis = [...EcranAccueil.el.querySelectorAll("[data-pack]:checked")].map((i) => i.dataset.pack);
    if (!choisis.length) { if (zone) zone.textContent = "Coche au moins un compendium."; return; }
    let total = 0;
    for (const cle of choisis) {
      const [, nom] = PACKS.find((p) => p[0] === cle);
      if (zone) zone.textContent = `Import : ${nom}…`;
      const pack = game.packs.get(`${SYSTEM_ID}.${cle}`);
      const docs = await pack.importAll({ folderName: nom, keepId: false });
      total += docs?.length ?? 0;
    }
    ui.notifications.info(`${total} documents importés dans le monde.`);
    await EcranAccueil.afficher("prepa");
    const z = EcranAccueil.el?.querySelector(".mu-ea-erreur.ok");
    if (z) z.textContent = `${total} documents importés, rangés dans des dossiers à leur nom.`;
  }
}

/** Crée le Chat d'un utilisateur (lui-même s'il en a le droit, sinon le Gardien actif via la socket). */
async function creerChatPour(user, choix) {
  const actor = await Actor.create({ name: choix.surnom, type: "chat", img: choix.img, prototypeToken: { texture: { src: choix.img }, actorLink: true, disposition: 1 },
    ownership: { default: 0, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } });
  await appliquerCreation(actor, choix);
  if (!user.isGM) await user.update({ character: actor.id });
  else await actor.setFlag(SYSTEM_ID, "chatDuGardien", true);
  return actor;
}

export function enregistrerParametresEcran() {
  game.settings.register(SYSTEM_ID, "ecranAccueil", {
    name: "Écran d'accueil à chaque session",
    hint: "Le tableau d'enquête (créer son Chat, wiki, thème, préparation du Gardien) s'affiche à l'arrivée de chaque joueur. Désactivé : le wiki s'ouvre comme avant.",
    scope: "world", config: true, type: Boolean, default: true
  });
}

export function brancherEcran() {
  game.socket.on(`system.${SYSTEM_ID}`, async (data) => {
    if (data?.type !== "creerChat" || game.users.activeGM?.id !== game.user.id) return;
    const user = game.users.get(data.userId);
    if (user) await creerChatPour(user, data.choix);
  });
  // Le Chat créé (ou attribué) arrive : la page « Mon Chat » se met à jour.
  Hooks.on("updateUser", (user, changes) => { if (user.id === game.user.id && "character" in changes && EcranAccueil.el) EcranAccueil.afficher("chat"); });
  Hooks.on("createActor", (actor) => { if (EcranAccueil.el && actor.isOwner && actor.type === "chat" && EcranAccueil.vue === "chat") EcranAccueil.afficher("chat"); });
  Hooks.on("updateActor", (actor) => { if (EcranAccueil.el && actor === monChat()) EcranAccueil.afficher(); });
}

/** À chaque session : l'écran s'ouvre une fois l'interface en place. */
export function ouvrirEcranAuLancement() {
  if (!game.settings.get(SYSTEM_ID, "ecranAccueil")) return false;
  setTimeout(() => EcranAccueil.ouvrir(), 500);
  return true;
}
