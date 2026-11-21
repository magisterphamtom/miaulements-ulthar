/**
 * Voile de rêve (v0.19.0) : « cadre de lune » pendant une bulle onirique.
 * Le centre de la scène reste net ; les bords s'assombrissent en nuit bleu-violet, avec une lune et une ligne de vagues.
 * Un simple calque fixe (aucune animation en boucle, aucun filtre) : posé à l'entrée dans la bulle, retiré à sa fin,
 * chez tous les joueurs (socket). Le Gardien peut aussi l'allumer ou l'éteindre à la main (bouton lune dans la barre des jetons).
 */
import { SYSTEM_ID } from "./config.mjs";

const LUNE = `systems/${SYSTEM_ID}/assets/jetons/voile-lune.svg`;
let actif = false;

export function afficherVoile(oui) {
  actif = Boolean(oui);
  let el = document.getElementById("mu-voile-reve");
  if (actif && !el) {
    el = document.createElement("div");
    el.id = "mu-voile-reve";
    el.innerHTML = `<img class="mu-voile-lune" src="${LUNE}" alt=""><svg class="mu-voile-vagues" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 24 Q50 8 100 24 T200 24 T300 24 T400 24 T500 24 T600 24 T700 24 T800 24 T900 24 T1000 24 T1100 24 T1200 24"/></svg>`;
    document.body.append(el);
    requestAnimationFrame(() => el.classList.add("on"));
  } else if (!actif && el) {
    el.classList.remove("on");
    setTimeout(() => { if (!actif) el.remove(); }, 900);
  }
  ui.controls?.render?.();
}

/** Allume ou éteint le voile chez tout le monde. */
export function voileDeReve(oui = !actif) {
  afficherVoile(oui);
  game.socket.emit(`system.${SYSTEM_ID}`, { type: "voile", actif: Boolean(oui) });
}

export const voileActif = () => actif;

export function brancherVoile() {
  game.socket.on(`system.${SYSTEM_ID}`, (data) => { if (data?.type === "voile") afficherVoile(data.actif); });
}
