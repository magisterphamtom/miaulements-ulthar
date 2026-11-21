/**
 * Vies de Chat sur le jeton (v0.18.0) : une couronne de petites pattes autour du jeton d'un Chat,
 * une par vie possible ; les vies perdues s'effacent. Réglage par joueur (« Vies de Chat sur les jetons »).
 * Redessiné seulement quand le jeton est rafraîchi et que le nombre de vies ou la taille a changé : aucun coût par image.
 */
import { SYSTEM_ID } from "./config.mjs";

const PATTE = `systems/${SYSTEM_ID}/assets/jetons/patte.svg`;
let texture = null;

export function enregistrerParametresJetons() {
  game.settings.register(SYSTEM_ID, "viesJetons", {
    name: "Vies de Chat sur les jetons",
    hint: "Une couronne de petites pattes autour du jeton de chaque Chat ; les vies perdues s'effacent.",
    scope: "client", config: true, type: Boolean, default: true,
    onChange: () => canvas?.tokens?.placeables.forEach((t) => dessiner(t, true))
  });
}

function dessiner(token, forcer = false) {
  const actor = token.actor;
  const actif = game.settings.get(SYSTEM_ID, "viesJetons") && actor?.type === "chat" && texture;
  if (!actif) {
    if (token.muVies) { token.muVies.destroy({ children: true }); token.muVies = null; }
    return;
  }
  const max = Math.max(actor.system.vies.max, actor.system.vies.value, 0);
  const vies = actor.system.vies.value;
  const cle = `${max}/${vies}/${Math.round(token.w)}/${Math.round(token.h)}`;
  if (!forcer && token.muVies?.muCle === cle) return;
  token.muVies?.destroy({ children: true });
  const c = new PIXI.Container();
  c.muCle = cle;
  c.eventMode = "none";
  const rayon = Math.max(token.w, token.h) / 2;
  const taille = Math.max(12, Math.min(26, rayon * 0.32));
  for (let i = 0; i < max; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / max; // départ en haut, sens des aiguilles d'une montre
    const s = new PIXI.Sprite(texture);
    s.anchor.set(0.5);
    s.width = s.height = taille;
    s.position.set(token.w / 2 + Math.cos(angle) * (rayon + taille * 0.15), token.h / 2 + Math.sin(angle) * (rayon + taille * 0.15));
    s.rotation = angle + Math.PI / 2;
    s.alpha = i < vies ? 1 : 0.22;
    c.addChild(s);
  }
  token.muVies = c;
  token.addChild(c);
}

export function brancherJetons() {
  Hooks.on("canvasReady", async () => {
    texture ??= await foundry.canvas.loadTexture(PATTE).catch(() => null);
    canvas.tokens.placeables.forEach((t) => dessiner(t, true));
  });
  Hooks.on("refreshToken", (token) => dessiner(token));
  Hooks.on("updateActor", (actor, changes) => {
    if (actor.type !== "chat" || !changes.system?.vies) return;
    for (const t of actor.getActiveTokens()) dessiner(t, true);
  });
  Hooks.on("destroyToken", (token) => { token.muVies = null; });
}
