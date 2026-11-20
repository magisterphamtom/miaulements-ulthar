/**
 * Accueil et pause aux couleurs des Chats d'Ulthar.
 * - Scène d'accueil (image assets/images/accueil_foundry.webp) importée et activée une seule fois par monde, par le Gardien.
 * - Pause : patte de chat au lieu de l'horloge (choix du dessin dans les réglages), légende « Le Chat fait la sieste… ».
 */
import { SYSTEM_ID } from "./config.mjs";

export const PATTES = {
  "patte-oeil": "Patte noire à l'œil (Mythe)",
  "patte-violette": "Patte violette lumineuse",
  "patte-doree": "Médaillon doré à griffes",
  "empreintes": "Cercle d'empreintes",
  "horloge": "Horloge de Foundry (par défaut)"
};

export function enregistrerParametresAccueil() {
  game.settings.register(SYSTEM_ID, "pattePause", {
    name: "Image de la pause",
    hint: "Remplace l'horloge de la pause par une patte de chat.",
    scope: "world",
    config: true,
    type: String,
    choices: PATTES,
    default: "patte-oeil",
    onChange: () => ui.pause?.render?.()
  });
  game.settings.register(SYSTEM_ID, "sceneAccueilImportee", { scope: "world", config: false, type: Boolean, default: false });
}

/** Une seule fois par monde : le Gardien importe la scène d'accueil et l'active. */
async function installerSceneAccueil() {
  if (game.users.activeGM?.id !== game.user.id) return;
  const pack = game.packs.get(`${SYSTEM_ID}.scenes`);
  const ligne = (await pack?.getIndex())?.find((e) => e.name.startsWith("Accueil"));
  if (!ligne) return;
  // Réparation (v0.17.2) : une scène d'accueil importée avant la 0.17.2 n'a pas de fond en v14 (fond porté par un niveau).
  const existante = game.scenes.find((s) => s.getFlag(SYSTEM_ID, "accueil"));
  if (existante && !existante.levels?.size) {
    const modele = (await pack.getDocument(ligne._id))?.toObject();
    if (modele?.levels?.length) await existante.update({ levels: modele.levels, initialLevel: modele.initialLevel });
  }
  if (game.settings.get(SYSTEM_ID, "sceneAccueilImportee")) return;
  let scene = game.scenes.find((s) => s.getFlag(SYSTEM_ID, "accueil"));
  if (!scene) scene = await game.scenes.importFromCompendium(pack, ligne._id, {}, { keepId: true });
  // Une scène déjà active (monde existant) n'est pas remplacée.
  if (scene && !game.scenes.active) await scene.activate();
  await game.settings.set(SYSTEM_ID, "sceneAccueilImportee", true);
}

/** Pause : patte de chat et légende. Hook appelé à chaque affichage de la pause (aucun coût en dehors). */
function habillerPause(app, html) {
  const choix = game.settings.get(SYSTEM_ID, "pattePause");
  if (choix === "horloge") return;
  const racine = html instanceof HTMLElement ? html : (html?.[0] ?? app?.element);
  if (!racine) return;
  racine.classList.add("mu-pause");
  const img = racine.querySelector("img");
  if (img) img.src = `systems/${SYSTEM_ID}/assets/pause/${choix}.svg`;
  const legende = racine.querySelector("figcaption, .caption, h3");
  if (legende) legende.textContent = "Le Chat fait la sieste…";
}

export function enregistrerHooksAccueil() {
  Hooks.on("renderGamePause", habillerPause);
  Hooks.on("renderPause", habillerPause);
  Hooks.once("ready", installerSceneAccueil);
}
