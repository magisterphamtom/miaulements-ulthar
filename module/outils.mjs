import { SYSTEM_ID } from "./config.mjs";
import { jetFolie, esc } from "./rolls.mjs";
import { tirerPouvoirsTemporaires } from "./creation.mjs";

const { DialogV2 } = foundry.applications.api;

/** Chats des joueurs (acteurs de type chat qui ont un propriétaire joueur). */
function chatsDesJoueurs() {
  return game.actors.filter((a) => a.type === "chat" && a.hasPlayerOwner);
}

/** Fin de scénario d'un Chat : +2 XP, PV/PM/vies au maximum, −10 PF par carte Folie non jouée. */
export async function finDeScenario(actor, { confirmer = true } = {}) {
  const sys = actor.system;
  const perte = sys.cartesFolie.length * 10;
  if (confirmer) {
    const ok = await DialogV2.confirm({
      window: { title: "Fin de scénario" },
      content: `<p>${esc(actor.name)} : +2 XP, PV, PM et vies de Chat remis au maximum. ${perte ? `Cartes Folie non jouées : −${perte} PF.` : ""}</p>`
    });
    if (!ok) return false;
  }
  await actor.update({
    "system.xp": sys.xp + 2,
    "system.pv.value": sys.pv.max,
    "system.pm.value": sys.pm.max,
    "system.vies.value": sys.vies.max,
    "system.pf.value": Math.max(0, sys.pf.value - perte),
    "system.cartesFolie": []
  });
  if (sys.pf.value - perte < 20) ui.notifications.warn(`${actor.name} : Folie sous 20, le Chat devient injouable.`);
  return true;
}

async function reserveGardien() {
  if (!game.user.isGM) {
    ui.notifications.warn("Réservé au Gardien.");
    return false;
  }
  return true;
}

export async function debutAventure() {
  if (!(await reserveGardien())) return;
  const chats = chatsDesJoueurs();
  if (!chats.length) return ui.notifications.warn("Aucun Chat de joueur trouvé.");
  for (const c of chats) await tirerPouvoirsTemporaires(c, { confirmer: false });
}

export async function finDeScenarioGroupe() {
  if (!(await reserveGardien())) return;
  const chats = chatsDesJoueurs();
  const ok = await DialogV2.confirm({
    window: { title: "Fin de scénario" },
    content: `<p>Fin de scénario pour ${chats.length} Chat${chats.length > 1 ? "s" : ""} : ${chats.map((c) => esc(c.name)).join(", ")}.</p>`
  });
  if (!ok) return;
  for (const c of chats) await finDeScenario(c, { confirmer: false });
}

export async function folieDuGroupe(raison = "") {
  if (!(await reserveGardien())) return;
  for (const c of chatsDesJoueurs()) await jetFolie(c, { raison });
}

export const api = { debutAventure, finDeScenarioGroupe, folieDuGroupe, finDeScenario };
