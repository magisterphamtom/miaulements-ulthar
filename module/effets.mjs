/**
 * Effets de critique (v0.19.0) : « coup de patte ».
 * Réussite critique : une grande patte dorée tamponne l'écran. Échec critique : trois griffures rouges le lacèrent.
 * Une courte animation CSS (transform et opacity seulement) de 1,8 s, supprimée ensuite ; une seule à la fois.
 * Vue par tous ceux qui voient le jet. Réglage par joueur « Effets de critique ».
 */
import { SYSTEM_ID } from "./config.mjs";
import { lireJet } from "./cartes.mjs";

const esc = (t) => foundry.utils.escapeHTML(String(t ?? ""));
let enCours = false;

const PATTE = `<svg viewBox="0 0 64 64" aria-hidden="true"><g><ellipse cx="32" cy="42" rx="15" ry="13"/><ellipse cx="13" cy="26" rx="6" ry="8"/><ellipse cx="24" cy="15" rx="6" ry="8"/><ellipse cx="40" cy="15" rx="6" ry="8"/><ellipse cx="51" cy="26" rx="6" ry="8"/></g></svg>`;
const GRIFFES = `<svg viewBox="0 0 400 400" aria-hidden="true" preserveAspectRatio="none">
  <path d="M60 40 Q170 190 300 370" /><path d="M120 20 Q230 170 350 340" /><path d="M180 10 Q280 150 390 300" /></svg>`;

export function enregistrerParametresEffets() {
  game.settings.register(SYSTEM_ID, "effetsCritiques", {
    name: "Effets de critique",
    hint: "Un coup de patte doré sur une réussite critique, trois griffures rouges sur un échec critique.",
    scope: "client", config: true, type: Boolean, default: true
  });
}

/** Joue l'effet (aussi appelable à la main : game.miaulementsUlthar.effetCritique(true, "Mimolette")). */
export function effetCritique(reussite, nom = "") {
  if (enCours || !game.settings.get(SYSTEM_ID, "effetsCritiques")) return;
  enCours = true;
  const el = document.createElement("div");
  el.className = `mu-effet-critique ${reussite ? "mu-effet-reussite" : "mu-effet-echec"}`;
  el.innerHTML = `<div class="mu-effet-dessin">${reussite ? PATTE : GRIFFES}</div>
    <div class="mu-effet-texte"><b>${reussite ? "Réussite critique !" : "Échec critique…"}</b>${nom ? `<span>${esc(nom)}</span>` : ""}</div>`;
  document.body.append(el);
  setTimeout(() => { el.remove(); enCours = false; }, 1900);
}

export function brancherEffets() {
  Hooks.on("createChatMessage", (message) => {
    if (!message.visible) return;
    const j = lireJet(message);
    if (j?.critique) effetCritique(j.critReussite, j.nom);
  });
}
