import { ATTRIBUTS, RACES } from "./config.mjs";
import { POUVOIRS_INNES, POUVOIRS_RACE, pouvoirTemporaireParDe } from "./pouvoirs.mjs";
import { pvDepuisTable } from "./datamodels.mjs";

const { DialogV2 } = foundry.applications.api;
const esc = (t) => foundry.utils.escapeHTML(String(t));

// Les six modificateurs du livre (p.15) : chacun sert une fois, sur l'attribut de son choix,
// ou pas du tout. Ils peuvent s'annuler entre eux. Les attributs restent entre 30 % et 70 %.
const MODIFICATEURS = [20, 10, 5, -5, -10, -20];
const MIN = 30;
const MAX = 70;

function optionsAttributs(vide = "—") {
  return `<option value="">${vide}</option>` + Object.entries(ATTRIBUTS).map(([k, a]) => `<option value="${k}">${a.label}</option>`).join("");
}

function signe(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

export function formulaire(actor) {
  const mods = MODIFICATEURS.map(
    (m) => `<label class="mu-ligne"><span class="mu-mod">${signe(m)} %</span>
      <select name="mod${m}">${optionsAttributs("pas utilisé")}</select></label>`
  ).join("");
  const races = Object.entries(RACES).map(([k, r]) => `<option value="${k}">${r.label}</option>`).join("");
  const innes = Object.entries(POUVOIRS_INNES)
    .filter(([, p]) => !p.offert)
    .map(([k, p]) => `<label class="mu-pouvoir" title="${esc(p.desc)}"><input type="checkbox" name="inne" value="${k}"> ${esc(p.nom)}${p.campagne ? " <em>(campagne)</em>" : ""}</label>`)
    .join("");
  return `<div class="mu-assistant">
    <p class="mu-intro">Création d'un Chat, étape par étape. Survole un pouvoir pour lire sa description.</p>

    <fieldset><legend>1. Surnom</legend>
      <input type="text" name="surnom" value="${esc(actor.name === "New Actor" || !actor.name ? "" : actor.name)}" placeholder="Mimolette">
    </fieldset>

    <fieldset><legend>2. Attributs <small>(50 % de départ, entre 30 et 70 %)</small></legend>
      <p class="mu-aide">Répartis les six modificateurs sur les attributs de ton choix. Un modificateur peut rester inutilisé.</p>
      ${mods}
    </fieldset>

    <fieldset><legend>3. Race</legend>
      <select name="race"><option value="">— choisir —</option>${races}</select>
      <div class="mu-race-info mu-aide"></div>
      <div class="mu-gouttiere" hidden>
        <label class="mu-ligne"><span>+5 % en</span><select name="gPlus">${optionsAttributs()}</select></label>
        <label class="mu-ligne"><span>−5 % en</span><select name="gMoins">${optionsAttributs()}</select></label>
      </div>
      <div class="mu-pouvoirs-race"></div>
    </fieldset>

    <fieldset><legend>4. Handicap <small>(optionnel : −20 % sur l'attribut associé, un pouvoir inné de plus)</small></legend>
      <label class="mu-ligne"><span>Handicap</span><input type="text" name="handicap" placeholder="ex. patte blessée"></label>
      <label class="mu-ligne"><span>Attribut touché</span><select name="handicapAttr">${optionsAttributs()}</select></label>
    </fieldset>

    <fieldset><legend>5. Pouvoirs innés <small class="mu-compteur"></small></legend>
      <p class="mu-aide">« Comprendre et lire l'humain » est offert à tous les Chats.</p>
      <div class="mu-liste-pouvoirs">${innes}</div>
    </fieldset>

    <fieldset class="mu-resume"><legend>Résultat</legend>
      <div class="mu-grille-resume"></div>
      <div class="mu-valeurs-resume"></div>
      <ul class="mu-erreurs"></ul>
    </fieldset>
  </div>`;
}

/** Lit le formulaire et calcule le Chat obtenu, avec la liste des problèmes à régler. */
export function calculer(form) {
  // Lecture directe du DOM : FormDataExtended traite les cases à cocher comme des booléens.
  const val = (nom) => form.querySelector(`[name="${nom}"]`)?.value ?? "";
  const data = {
    surnom: val("surnom"),
    race: val("race"),
    gPlus: val("gPlus"),
    gMoins: val("gMoins"),
    handicap: val("handicap"),
    handicapAttr: val("handicapAttr"),
    pouvoirRace: form.querySelector("input[name='pouvoirRace']:checked")?.value ?? "",
    inne: [...form.querySelectorAll("input[name='inne']:checked")].map((el) => el.value)
  };
  for (const m of MODIFICATEURS) data[`mod${m}`] = val(`mod${m}`);
  const attrs = Object.fromEntries(Object.keys(ATTRIBUTS).map((k) => [k, { base: 50, race: 0, handicap: 0 }]));
  const erreurs = [];

  for (const m of MODIFICATEURS) {
    const cible = data[`mod${m}`];
    if (cible) attrs[cible].base += m;
  }
  for (const [k, a] of Object.entries(attrs)) {
    if (a.base < MIN || a.base > MAX) erreurs.push(`${ATTRIBUTS[k].label} sort de l'intervalle ${MIN}-${MAX} % (${a.base} %).`);
  }

  const race = RACES[data.race];
  if (!race) {
    erreurs.push("Choisis une race.");
  } else if (data.race === "gouttiere") {
    if (!data.gPlus || !data.gMoins) erreurs.push("Chat de gouttière : choisis l'attribut en +5 % et celui en −5 %.");
    else if (data.gPlus === data.gMoins) erreurs.push("Chat de gouttière : le bonus et le malus doivent porter sur deux attributs différents.");
    else {
      attrs[data.gPlus].race += 5;
      attrs[data.gMoins].race -= 5;
    }
  } else {
    attrs[race.plus].race += 10;
    attrs[race.moins].race -= 10;
  }
  const pouvoirRace = data.pouvoirRace;
  if (race && pouvoirRace === "") erreurs.push("Choisis le pouvoir de ta race.");

  const handicap = (data.handicap ?? "").trim();
  if (handicap && !data.handicapAttr) erreurs.push("Handicap : choisis l'attribut touché.");
  if (handicap && data.handicapAttr) attrs[data.handicapAttr].handicap -= 20;

  const choisis = data.inne;
  const attendus = handicap ? 3 : 2;
  if (choisis.length !== attendus) erreurs.push(`Choisis ${attendus} pouvoirs innés (${choisis.length} choisi${choisis.length > 1 ? "s" : ""}).`);
  if (!(data.surnom ?? "").trim()) erreurs.push("Donne un surnom à ton Chat.");

  const final = (k) => Math.max(0, attrs[k].base + attrs[k].race + attrs[k].handicap);
  const resume = {
    pv: pvDepuisTable(final("phy") + final("agi")),
    pf: Math.floor((final("per") + final("cha")) / 2),
    pm: final("int")
  };
  return { data, attrs, final, erreurs, resume, handicap, choisis, attendus };
}

function majApercu(dialog) {
  const racine = dialog.element;
  const form = racine.querySelector(".mu-assistant");
  const r = calculer(form);
  const raceCle = r.data.race;

  // Race : informations, choix du pouvoir de race, bonus libre du chat de gouttière.
  const info = form.querySelector(".mu-race-info");
  const race = RACES[raceCle];
  form.querySelector(".mu-gouttiere").hidden = raceCle !== "gouttiere";
  if (race) {
    info.textContent = raceCle === "gouttiere" ? "Bonus de +5 % et malus de −5 % au choix." : `+10 % ${ATTRIBUTS[race.plus].label} · −10 % ${ATTRIBUTS[race.moins].label}`;
  } else {
    info.textContent = "";
  }
  const zone = form.querySelector(".mu-pouvoirs-race");
  if (zone.dataset.race !== (raceCle ?? "")) {
    zone.dataset.race = raceCle ?? "";
    zone.innerHTML = (POUVOIRS_RACE[raceCle] ?? [])
      .map((p, i) => `<label class="mu-pouvoir" title="${esc(p.desc)}"><input type="radio" name="pouvoirRace" value="${i}"> ${esc(p.nom)}</label>`)
      .join("");
    zone.querySelectorAll("input").forEach((el) => el.addEventListener("change", () => majApercu(dialog)));
  }

  form.querySelector(".mu-compteur").textContent = `(${r.choisis.length}/${r.attendus})`;
  // Interdit de dépasser le nombre de pouvoirs : on grise les cases restantes.
  form.querySelectorAll("input[name='inne']").forEach((el) => {
    el.disabled = !el.checked && r.choisis.length >= r.attendus;
  });

  form.querySelector(".mu-grille-resume").innerHTML = Object.entries(ATTRIBUTS)
    .map(([k, a]) => {
      const v = r.final(k);
      const detail = [r.attrs[k].base !== 50 ? signe(r.attrs[k].base - 50) : "", r.attrs[k].race ? `race ${signe(r.attrs[k].race)}` : "", r.attrs[k].handicap ? `handicap ${signe(r.attrs[k].handicap)}` : ""].filter(Boolean).join(" · ");
      return `<div class="mu-cell"><strong>${a.label}</strong> ${v} %<br><small>${detail || "50 %"}</small></div>`;
    })
    .join("");
  form.querySelector(".mu-valeurs-resume").innerHTML = `Santé <strong>${r.resume.pv}</strong> · Folie <strong>${r.resume.pf}</strong> · Magie <strong>${r.resume.pm}</strong> · Vies de Chat <strong>3</strong>`;
  form.querySelector(".mu-erreurs").innerHTML = r.erreurs.map((e) => `<li>${esc(e)}</li>`).join("");
  const ok = racine.querySelector("button[data-action='ok']");
  if (ok) ok.disabled = r.erreurs.length > 0;
}

function donneesPouvoir(def, categorie) {
  return {
    name: def.nom,
    type: "pouvoir",
    system: {
      categorie,
      description: `<p>${esc(def.desc)}</p>`,
      degats: def.degats ?? "",
      gratuit: Boolean(def.gratuit)
    }
  };
}

/** Assistant de création de Chat : une seule fenêtre, tout est calculé en direct. */
export async function assistantCreation(actor) {
  const dejaCree = actor.items.some((i) => i.type === "pouvoir" && ["inne", "race"].includes(i.system.categorie));
  if (dejaCree) {
    const ok = await DialogV2.confirm({
      window: { title: "Recommencer la création ?" },
      content: "<p>Ce Chat a déjà des pouvoirs innés. Recommencer remplace ses attributs, sa race et ses pouvoirs innés.</p>"
    });
    if (!ok) return;
  }

  const resultat = await DialogV2.prompt({
    window: { title: "Création d'un Chat", resizable: true },
    position: { width: 640 },
    classes: ["miaulements-ulthar", "mu-dialogue"],
    content: formulaire(actor),
    render: (event, dialog) => {
      const form = dialog.element.querySelector(".mu-assistant");
      form.addEventListener("change", () => majApercu(dialog));
      form.addEventListener("input", () => majApercu(dialog));
      majApercu(dialog);
    },
    ok: {
      label: "Créer le Chat",
      icon: "fa-solid fa-paw",
      callback: (event, button) => calculer(button.form)
    },
    rejectClose: false
  });
  if (!resultat || resultat.erreurs.length) return;

  const { data, attrs, handicap, choisis } = resultat;
  const maj = { name: data.surnom.trim(), "system.race": data.race, "system.handicap": handicap };
  for (const [k, a] of Object.entries(attrs)) {
    maj[`system.attributs.${k}.base`] = a.base;
    maj[`system.attributs.${k}.race`] = a.race;
    maj[`system.attributs.${k}.handicap`] = a.handicap;
    maj[`system.attributs.${k}.progres`] = 0;
    maj[`system.attributs.${k}.echecs`] = 0;
  }
  await actor.update(maj);

  // Pouvoirs : on remplace les anciens innés et de race ; les temporaires sont conservés.
  const anciens = actor.items.filter((i) => i.type === "pouvoir" && ["inne", "race"].includes(i.system.categorie)).map((i) => i.id);
  if (anciens.length) await actor.deleteEmbeddedDocuments("Item", anciens);
  const nouveaux = [
    donneesPouvoir(POUVOIRS_INNES.comprendre_humain, "inne"),
    ...choisis.map((k) => donneesPouvoir(POUVOIRS_INNES[k], "inne")),
    donneesPouvoir(POUVOIRS_RACE[data.race][Number(data.pouvoirRace)], "race")
  ];
  await actor.createEmbeddedDocuments("Item", nouveaux);

  // Les valeurs maximales sont maintenant connues : on remplit les jauges.
  const s = actor.system;
  await actor.update({
    "system.pv.value": s.pv.max,
    "system.pm.value": s.pm.max,
    "system.pf.value": s.pf.max,
    "system.vies.value": s.vies.max
  });
  ui.notifications.info(`${actor.name} est créé. Pense à tirer ses deux pouvoirs temporaires au début de l'aventure.`);
}

/** Début d'aventure : le Chat lape l'eau enchantée et reçoit deux pouvoirs temporaires au hasard. */
export async function tirerPouvoirsTemporaires(actor) {
  const anciens = actor.items.filter((i) => i.type === "pouvoir" && i.system.categorie === "temporaire");
  if (anciens.length) {
    const ok = await DialogV2.confirm({
      window: { title: "Nouveaux pouvoirs temporaires" },
      content: "<p>Les pouvoirs temporaires actuels seront remplacés par deux nouveaux tirages.</p>"
    });
    if (!ok) return;
    await actor.deleteEmbeddedDocuments("Item", anciens.map((i) => i.id));
  }
  const tires = [];
  const des = [];
  const jets = [];
  while (tires.length < 2) {
    const roll = await new Roll("1d100").evaluate();
    jets.push(roll);
    const p = pouvoirTemporaireParDe(roll.total);
    if (tires.includes(p)) continue; // doublon : on relance
    tires.push(p);
    des.push(roll.total);
  }
  await actor.createEmbeddedDocuments("Item", tires.map((p) => donneesPouvoir(p, "temporaire")));
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: jets,
    content: `<div class="mu-carte reussite"><header>L'eau enchantée de la fontaine</header>
      <p class="mu-detail">Des énergies mystiques s'entrelacent avec ${esc(actor.name)}…</p>
      ${tires.map((p, i) => `<p class="mu-carte-folie"><strong>${esc(p.nom)}</strong> <small>(${des[i]})</small><br>${esc(p.desc)}</p>`).join("")}
      <p class="mu-note">Pouvoirs temporaires pour toute l'aventure. À l'usage : +20 à l'attribut concerné.</p></div>`
  });
}

