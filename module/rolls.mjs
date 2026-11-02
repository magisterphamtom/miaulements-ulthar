import { ATTRIBUTS, DIFFICULTES, MODES, ACTIONS_FOLIE, CASES_ECHEC, SYSTEM_ID } from "./config.mjs";

const { DialogV2 } = foundry.applications.api;

export function modeCourant() {
  const cle = game.settings.get(SYSTEM_ID, "modeJeu");
  return MODES[cle] ?? MODES.pulp;
}

export const esc = (texte) => foundry.utils.escapeHTML(String(texte ?? ""));

/** Fenêtre de jet : difficulté, et pouvoir si le jet en autorise un. */
export async function demanderJet(titre, { pouvoirPossible = true, options = "" } = {}) {
  const diff = Object.entries(DIFFICULTES)
    .map(([v, l]) => `<option value="${v}" ${v === "0" ? "selected" : ""}>${l}</option>`)
    .join("");
  const pouvoir = pouvoirPossible
    ? `<div class="form-group"><label>Utiliser un pouvoir (+20, coûte les unités du dé en PM)</label><input type="checkbox" name="pouvoir"></div>`
    : "";
  return DialogV2.prompt({
    window: { title: titre },
    content: `${options}<div class="form-group"><label>Difficulté</label><select name="difficulte">${diff}</select></div>${pouvoir}`,
    ok: {
      label: "Lancer",
      icon: "fa-solid fa-dice-d20",
      callback: (event, button) => {
        const f = button.form;
        const val = (n) => f.querySelector(`[name="${n}"]`);
        return {
          difficulte: Number(val("difficulte")?.value ?? 0),
          pouvoir: Boolean(val("pouvoir")?.checked),
          attribut: val("attribut")?.value,
          degats: val("degats")?.value
        };
      }
    },
    rejectClose: false
  });
}

/**
 * Jet d'attribut : D100 <= valeur, difficulté ajoutée au dé, pouvoir −20 au dé et perte de PM.
 * options : { rapide, difficulte, pouvoir, gratuit, titre, note } ; renvoie le résultat (ou null si annulé).
 */
export async function jetAttribut(actor, cle, options = {}) {
  const attr = actor.system.attributs[cle];
  if (!attr) return null;
  let choix = { difficulte: options.difficulte ?? 0, pouvoir: options.pouvoir ?? false };
  if (!options.rapide && options.difficulte === undefined) {
    choix = await demanderJet(`${actor.name} — ${ATTRIBUTS[cle].label}`);
    if (!choix) return null;
  }
  const mode = modeCourant();
  const roll = await new Roll("1d100").evaluate();
  const brut = roll.total;
  const modifie = brut + choix.difficulte - (choix.pouvoir ? 20 : 0);
  const critReussite = brut <= mode.critReussite;
  const critEchec = brut >= mode.critEchec;
  const reussite = critReussite || (!critEchec && modifie <= attr.value);

  // Pouvoir : les unités du dé = PM perdus (0 = aucune perte), que le jet réussisse ou non.
  let perte = 0;
  if (choix.pouvoir && !options.gratuit) {
    perte = brut % 10;
    await actor.update({ "system.pm.value": Math.max(0, actor.system.pm.value - perte) });
  }

  // Échec : une case cochée sur l'attribut.
  let coche = false;
  if (!reussite && game.settings.get(SYSTEM_ID, "cocherAuto") && actor.type === "chat") {
    await actor.update({ [`system.attributs.${cle}.echecs`]: Math.min(CASES_ECHEC, attr.echecs + 1) });
    coche = true;
  }

  const verdict = critReussite ? "Réussite critique !" : critEchec ? "Échec critique !" : reussite ? "Réussite" : "Échec";
  const detail = [
    `Dé <strong>${brut}</strong>`,
    choix.difficulte ? `difficulté ${choix.difficulte > 0 ? "+" : ""}${choix.difficulte}` : "",
    choix.pouvoir ? "pouvoir −20" : "",
    `= <strong>${modifie}</strong> contre ${attr.value} %`
  ].filter(Boolean).join(" · ");
  const notes = [
    choix.pouvoir ? `<p class="mu-note">${options.gratuit ? "Pouvoir gratuit (0 PM)" : `Pouvoir : −${perte} PM`}</p>` : "",
    coche ? `<p class="mu-note">Case d'échec cochée (${Math.min(attr.echecs + 1, CASES_ECHEC)}/${CASES_ECHEC})</p>` : "",
    critEchec && mode === MODES.pulp ? `<p class="mu-note">Pulp : un autre joueur peut tenter de rattraper cet échec critique.</p>` : "",
    !reussite && !critEchec && mode === MODES.pulp ? `<p class="mu-note">Pulp : le joueur peut retenter, mais cette fois l'échec sera flagrant.</p>` : "",
    options.note ?? ""
  ].join("");

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    content: `<div class="mu-carte ${reussite ? "reussite" : "echec"}">
      <header>${esc(options.titre ?? ATTRIBUTS[cle].label)} <span class="mu-pourcent">${attr.value} %</span></header>
      <p class="mu-verdict">${verdict}</p>
      <p class="mu-detail">${detail}</p>${notes}</div>`
  });
  return { reussite, critReussite, critEchec, brut, modifie, perte, pouvoir: choix.pouvoir };
}

/** Jet de Folie : D100 <= PF. Échec : une carte Folie est tirée. */
export async function jetFolie(actor, { raison = "" } = {}) {
  const roll = await new Roll("1d100").evaluate();
  const pf = actor.system.pf.value;
  const reussite = roll.total <= pf;
  let carte = "";
  let boutons = "";
  if (!reussite) {
    carte = ACTIONS_FOLIE[Math.floor(Math.random() * ACTIONS_FOLIE.length)];
    boutons = `<div class="mu-boutons">
      <button type="button" data-mu="garder-folie" data-actor="${actor.uuid}" data-carte="${esc(carte)}">Garder la carte</button>
    </div>`;
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    content: `<div class="mu-carte ${reussite ? "reussite" : "echec folie"}">
      <header>Jet de Folie <span class="mu-pourcent">${pf} %</span></header>
      ${raison ? `<p class="mu-detail">${esc(raison)}</p>` : ""}
      <p class="mu-verdict">${reussite ? "Le Chat garde son calme" : "La Folie s'empare du Chat"}</p>
      <p class="mu-detail">Dé <strong>${roll.total}</strong> contre ${pf} %</p>
      ${carte ? `<p class="mu-carte-folie">🃏 ${esc(carte)}</p>${boutons}` : ""}</div>`
  });
}

/** Montée d'attribut : toutes les cases cochées -> +1D10. */
export async function monterAttribut(actor, cle) {
  const attr = actor.system.attributs[cle];
  if (!attr || attr.echecs < CASES_ECHEC) return;
  const roll = await new Roll("1d10").evaluate();
  await actor.update({
    [`system.attributs.${cle}.progres`]: attr.progres + roll.total,
    [`system.attributs.${cle}.echecs`]: 0
  });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    content: `<div class="mu-carte reussite"><header>${esc(ATTRIBUTS[cle].label)} progresse</header>
      <p class="mu-verdict">+${roll.total} (${attr.value} → ${attr.value + roll.total} %)</p>
      <p class="mu-note">Les PV, PF et PM maximum sont recalculés.</p></div>`
  });
}
