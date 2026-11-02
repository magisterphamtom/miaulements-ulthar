import { ATTRIBUTS, SYSTEM_ID } from "./config.mjs";
import { jetAttribut, demanderJet, modeCourant, esc } from "./rolls.mjs";

const { DialogV2 } = foundry.applications.api;

const DEGATS_COURANTS = {
  "1d4": "Coup de griffe (1D4)",
  "1d6": "Objet tranchant, choc de véhicule (1D6)",
  "1d6+1": "Coup de pistolet (1D6+1)",
  "2d6": "Coup de fusil, feu (2D6)",
  "4d6": "Explosion (4D6)"
};

// ------------------------------------------------------------------ dégâts, soins, mort

/** Applique des dégâts ou des soins. Un joueur passe par le Gardien connecté (socket). */
export async function appliquerDegats(uuid, montant, { soin = false } = {}) {
  if (!game.user.isGM) {
    if (!game.users.activeGM) return ui.notifications.warn("Aucun Gardien connecté : les dégâts ne peuvent pas être appliqués.");
    game.socket.emit(`system.${SYSTEM_ID}`, { action: "degats", uuid, montant, soin });
    return;
  }
  const doc = await fromUuid(uuid);
  const actor = doc?.actor ?? doc;
  if (!actor?.system?.pv) return;
  const avant = actor.system.pv.value;
  const max = actor.system.pv.max;
  const apres = soin ? Math.min(max, avant + montant) : Math.max(0, avant - montant);
  await actor.update({ "system.pv.value": apres });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="mu-carte ${soin ? "reussite" : "echec"}"><header>${esc(actor.name)}</header>
      <p class="mu-verdict">${soin ? "+" : "−"}${montant} PV</p><p class="mu-detail">${avant} → ${apres} / ${max}</p></div>`
  });
  if (!soin && apres === 0 && avant > 0) await mort(actor);
}

/** À 0 PV : un Chat meurt puis ressuscite grâce à Bast en perdant une vie ; sans vie restante, la mort est définitive. */
async function mort(actor) {
  const mode = modeCourant();
  const vies = actor.system.vies?.value ?? 0;
  if (actor.type === "chat" && mode.viesChat && vies > 0) {
    await actor.update({ "system.vies.value": vies - 1 });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="mu-carte echec"><header>${esc(actor.name)} meurt…</header>
        <p class="mu-verdict">La déesse Bast intervient</p>
        <p class="mu-detail">Le Chat ressuscite à la fin du round et perd une vie de Chat (${vies - 1} restante${vies - 1 > 1 ? "s" : ""}).</p>
        <div class="mu-boutons"><button type="button" data-mu="ressusciter" data-actor="${actor.uuid}">Ressusciter (PV au maximum)</button></div></div>`
    });
    return;
  }
  await declarerMort(actor);
}

async function declarerMort(actor) {
  for (const t of actor.getActiveTokens?.() ?? []) await t.actor.toggleStatusEffect("dead", { overlay: true, active: true });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="mu-carte echec"><header>${esc(actor.name)}</header><p class="mu-verdict">${actor.type === "chat" ? "Mort définitive" : "Hors de combat"}</p>
      ${actor.type === "chat" ? `<p class="mu-detail">Plus aucune vie de Chat : Bast ne peut plus intervenir.</p>` : ""}</div>`
  });
}

async function ressusciter(uuid) {
  const actor = await fromUuid(uuid);
  if (!actor) return;
  await actor.update({ "system.pv.value": actor.system.pv.max });
  for (const t of actor.getActiveTokens?.() ?? []) await t.actor.toggleStatusEffect("dead", { overlay: true, active: false });
}

function cartesDegats(total, formule, { soin = false } = {}) {
  const boutons = soin
    ? `<button type="button" data-mu="soin" data-montant="${total}">Soigner les cibles</button>`
    : `<button type="button" data-mu="degats" data-montant="${total}">Infliger aux cibles</button>`;
  return `<div class="mu-carte ${soin ? "reussite" : "echec"}"><header>${soin ? "Soin" : "Dégâts"}</header>
    <p class="mu-verdict">${total}</p><p class="mu-detail">${esc(formule)}</p>
    <div class="mu-boutons">${boutons}</div></div>`;
}

async function lancerDegats(actor, formule, { soin = false, double = false } = {}) {
  const roll = await new Roll(double ? `(${formule}) * 2` : formule).evaluate();
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    content: cartesDegats(roll.total, double ? `${formule} × 2` : formule, { soin })
  });
}

// ------------------------------------------------------------------ attaques

/** Attaque d'un Chat : jet d'attribut puis dégâts en cas de réussite. */
export async function attaquerChat(actor) {
  const attributs = ["phy", "pre", "agi"].map((k) => `<option value="${k}">${ATTRIBUTS[k].label}</option>`).join("");
  const degats = Object.entries(DEGATS_COURANTS).map(([f, l]) => `<option value="${f}">${l}</option>`).join("");
  const options = `<div class="form-group"><label>Attribut</label><select name="attribut">${attributs}</select></div>
    <div class="form-group"><label>Dégâts</label><select name="degats">${degats}</select></div>`;
  const choix = await demanderJet(`${actor.name} — Attaque`, { pouvoirPossible: false, options });
  if (!choix) return;
  const res = await jetAttribut(actor, choix.attribut, { difficulte: choix.difficulte, titre: "Attaque" });
  if (res?.reussite) await lancerDegats(actor, choix.degats);
}

/** Attaque d'un adversaire : D100 <= % de l'attaque, puis dégâts. */
export async function attaquerPnj(actor, index) {
  const att = actor.system.attaques[index];
  if (!att) return;
  const choix = await demanderJet(`${actor.name} — ${att.nom}`, { pouvoirPossible: false });
  if (!choix) return;
  const mode = modeCourant();
  const roll = await new Roll("1d100").evaluate();
  const brut = roll.total;
  const modifie = brut + choix.difficulte;
  const critReussite = brut <= mode.critReussite;
  const critEchec = brut >= mode.critEchec;
  const reussite = critReussite || (!critEchec && modifie <= att.pct);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    content: `<div class="mu-carte ${reussite ? "reussite" : "echec"}"><header>${esc(att.nom)} <span class="mu-pourcent">${att.pct} %</span></header>
      <p class="mu-verdict">${critReussite ? "Réussite critique !" : critEchec ? "Échec critique !" : reussite ? "Touché" : "Raté"}</p>
      <p class="mu-detail">Dé <strong>${brut}</strong>${choix.difficulte ? ` · difficulté ${choix.difficulte > 0 ? "+" : ""}${choix.difficulte}` : ""} = <strong>${modifie}</strong> contre ${att.pct} %</p></div>`
  });
  if (reussite && att.degats) await lancerDegats(actor, att.degats);
}

// ------------------------------------------------------------------ pouvoirs

const ONIRIQUES = /cauchemar mental|distorsion onirique|manipulation d.un souvenir|recherche d.un souvenir/i;
const SOINS = /gu[ée]rison|r[ée]g[ée]n[ée]ration|curative/i;

const ATTRIBUT_PAR_MOT = [
  [/charme|hypnose|ordre|r[ée]ponse|cauchemar|distorsion|illusion|manipulation de la m[ée]moire|rugissement|aura|lien/i, "cha"],
  [/discr|ombre|camouflage|marche|silencieu|t[ée]l[ée]port|d[ée]placement/i, "dis"],
  [/force|peau|griffes? pr[ée]cise|ma[iî]trise des griffes|fl[èe]che|bond|colossal/i, "phy"],
  [/grimp|agilit|flexib|l[ée]vit|acrobat|acc[ée]l[ée]ration/i, "agi"],
  [/vision|[ée]coute|perception|sens|pr[ée]monition|aubaine|sixi[eè]me|instinct|thermique|magn[ée]tique/i, "per"]
];

function attributPourPouvoir(item) {
  if (item.system.attribut) return item.system.attribut;
  return ATTRIBUT_PAR_MOT.find(([re]) => re.test(item.name))?.[1] ?? "int";
}

/** Lance un pouvoir depuis la fiche : jet de l'attribut lié (+20), coût en PM, puis dégâts ou soins éventuels. */
export async function lancerPouvoir(actor, item) {
  if (ONIRIQUES.test(item.name)) return bulleOnirique(actor, item);
  const cle = attributPourPouvoir(item);
  const attributs = Object.entries(ATTRIBUTS)
    .map(([k, a]) => `<option value="${k}" ${k === cle ? "selected" : ""}>${a.label}</option>`).join("");
  const options = `<div class="form-group"><label>Attribut du jet (+20 avec le pouvoir)</label><select name="attribut">${attributs}</select></div>`;
  const choix = await demanderJet(`${actor.name} — ${item.name}`, { pouvoirPossible: false, options });
  if (!choix) return;
  const gratuit = item.system.gratuit;
  const note = `<p class="mu-note">${item.system.description.replace(/<\/?p>/g, "")}</p>`;
  const res = await jetAttribut(actor, choix.attribut, { difficulte: choix.difficulte, pouvoir: true, gratuit, titre: item.name, note });
  if (res?.reussite && item.system.degats) await lancerDegats(actor, item.system.degats, { soin: SOINS.test(item.name) });
}

/**
 * Pouvoirs oniriques (p.54-59) : connexion mentale (jet de Charisme +20, seule étape qui coûte des PM),
 * objectif, scène initiale, altérations (deux réussites ou deux échecs), état final.
 */
async function bulleOnirique(actor, item) {
  const journal = [];
  const fin = async (verdict, classe) => {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="mu-carte ${classe}"><header>${esc(item.name)} — bulle onirique</header><p class="mu-verdict">${verdict}</p>
        <ol class="mu-detail">${journal.map((j) => `<li>${j}</li>`).join("")}</ol>
        <p class="mu-note">Le MJ décide comment la cible réagit. Sur une réussite ou un échec critique, les modifications se répercutent dans la Contrée du Rêve.</p></div>`
    });
  };

  // 1. Connexion mentale
  const choix = await demanderJet(`${item.name} — connexion mentale`, { pouvoirPossible: false });
  if (!choix) return;
  const connexion = await jetAttribut(actor, "cha", { difficulte: choix.difficulte, pouvoir: true, titre: `${item.name} — connexion mentale` });
  if (!connexion?.reussite) {
    journal.push("Connexion mentale : échec, le pouvoir ne se déclenche pas.");
    return fin("La connexion échoue", "echec");
  }
  journal.push("Connexion mentale établie.");

  // 2 et 3. Objectif et scène initiale
  const cadre = await DialogV2.prompt({
    window: { title: `${item.name} — objectif et scène` },
    content: `<div class="form-group"><label>Objectif du pouvoir (à accorder avec le MJ)</label><input type="text" name="objectif"></div>
      <div class="form-group"><label>Scène initiale dans l'esprit de la cible</label><textarea name="scene" rows="3"></textarea></div>`,
    ok: { label: "Entrer dans la bulle", callback: (e, b) => ({ objectif: b.form.querySelector("[name=objectif]").value, scene: b.form.querySelector("[name=scene]").value }) },
    rejectClose: false
  });
  if (!cadre) return fin("Le lanceur renonce", "echec");
  journal.push(`Objectif : ${esc(cadre.objectif || "—")}. Scène : ${esc(cadre.scene || "—")}`);

  // 4. Altérations : deux réussites ou deux échecs
  let reussites = 0;
  let echecs = 0;
  const perte = game.settings.get(SYSTEM_ID, "perteAlteration");
  while (reussites < 2 && echecs < 2) {
    const alt = await DialogV2.prompt({
      window: { title: `${item.name} — altération ${reussites + echecs + 1}` },
      content: `<p>Réussites : ${reussites}/2 · Échecs : ${echecs}/2. Le joueur décrit ce qui change dans la scène sans dicter les actes de la cible.</p>
        <div class="form-group"><label>Altération</label><textarea name="texte" rows="3"></textarea></div>
        <div class="form-group"><label>Difficulté</label><select name="difficulte"><option value="-20">Facile (−20)</option><option value="0" selected>Normal (0)</option><option value="20">Difficile (+20)</option><option value="40">Très difficile (+40)</option></select></div>`,
      ok: { label: "Tenter l'altération", callback: (e, b) => ({ texte: b.form.querySelector("[name=texte]").value, difficulte: Number(b.form.querySelector("[name=difficulte]").value) }) },
      rejectClose: false
    });
    if (!alt) break;
    const r = await jetAttribut(actor, "cha", { difficulte: alt.difficulte, pouvoir: perte, titre: `${item.name} — altération`, note: `<p class="mu-note">${esc(alt.texte)}</p>` });
    if (r?.reussite) reussites++; else echecs++;
    journal.push(`Altération « ${esc(alt.texte || "—")} » : ${r?.reussite ? "réussite" : "échec"}${r?.critReussite || r?.critEchec ? " (critique : répercussion dans la Contrée du Rêve)" : ""}`);
  }
  if (reussites >= 2) return fin("L'objectif est atteint", "reussite");
  if (echecs >= 2) return fin("La bulle onirique éclate", "echec");
  return fin("La bulle est abandonnée", "echec");
}

// ------------------------------------------------------------------ boutons des cartes de chat et socket

/** Branche les boutons des cartes de chat (Folie, dégâts, soins, résurrection). */
export function brancherCartes(message, html) {
  html.querySelectorAll("[data-mu='garder-folie']").forEach((bouton) => {
    bouton.addEventListener("click", async () => {
      const actor = await fromUuid(bouton.dataset.actor);
      if (!actor?.isOwner) return ui.notifications.warn("Vous n'êtes pas propriétaire de ce Chat.");
      await actor.update({ "system.cartesFolie": [...actor.system.cartesFolie, bouton.dataset.carte] });
      bouton.disabled = true;
      bouton.textContent = "Carte gardée";
    });
  });
  for (const [attr, soin] of [["degats", false], ["soin", true]]) {
    html.querySelectorAll(`[data-mu='${attr}']`).forEach((bouton) => {
      bouton.addEventListener("click", async () => {
        const cibles = [...game.user.targets];
        if (!cibles.length) return ui.notifications.warn("Ciblez d'abord un ou plusieurs jetons (touche T).");
        for (const t of cibles) await appliquerDegats(t.actor.uuid, Number(bouton.dataset.montant), { soin });
      });
    });
  }
  html.querySelectorAll("[data-mu='ressusciter']").forEach((bouton) => {
    bouton.addEventListener("click", async () => {
      if (!game.user.isGM) return ui.notifications.warn("Seul le Gardien ressuscite un Chat.");
      await ressusciter(bouton.dataset.actor);
      bouton.disabled = true;
      bouton.textContent = "Ressuscité";
    });
  });
}

/** Les joueurs demandent, le Gardien connecté exécute. */
export function ecouterSocket() {
  game.socket.on(`system.${SYSTEM_ID}`, async (data) => {
    if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
    if (data.action === "degats") await appliquerDegats(data.uuid, data.montant, { soin: data.soin });
  });
}
