/**
 * Les Miaulements d'Ulthar — les deux wikis (compendiums « wiki-joueur » et « wiki-mj »).
 * Même principe que Brindlewood Bay, Tindalos et Night Prowler :
 * - ouverture automatique au lancement du monde : le Gardien ouvre le wiki du Gardien, chaque joueur ouvre
 *   le wiki des joueurs quand il arrive dans le jeu (réglage client : à chaque lancement, première fois, jamais) ;
 * - boutons « 📖 » dans les onglets Acteurs et Journaux (le joueur ne voit que le sien) ;
 * - ouverture un court instant après « ready », quand l'interface est prête.
 */
import { SYSTEM_ID } from "./config.mjs";

const WIKIS = {
  joueur: { pack: `${SYSTEM_ID}.wiki-joueur`, libelle: "Wiki des joueurs" },
  gardien: { pack: `${SYSTEM_ID}.wiki-mj`, libelle: "Wiki du Gardien" }
};

export function enregistrerParametresWiki() {
  game.settings.register(SYSTEM_ID, "ouvertureWiki", {
    name: "Ouverture automatique du wiki",
    hint: "Au lancement du jeu, le Gardien voit s'ouvrir le wiki du Gardien et chaque joueur le wiki des joueurs. Les boutons « 📖 » des onglets Acteurs et Journaux restent toujours disponibles.",
    scope: "client",
    config: true,
    type: String,
    choices: {
      toujours: "À chaque lancement du jeu",
      premiere: "À la première connexion seulement",
      jamais: "Jamais"
    },
    default: "toujours"
  });
}

/** Ouvre l'accueil d'un wiki (« joueur » ou « gardien »). Un joueur ne peut pas ouvrir celui du Gardien. */
export async function ouvrirWiki(quel = game.user.isGM ? "gardien" : "joueur") {
  if (quel === "gardien" && !game.user.isGM) quel = "joueur";
  const pack = game.packs.get(WIKIS[quel].pack);
  if (!pack) {
    ui.notifications.warn(`Le compendium « ${WIKIS[quel].libelle} » est introuvable.`);
    return null;
  }
  const index = await pack.getIndex();
  const ligne = index.find((e) => e.name.startsWith("Accueil")) ?? index.contents?.[0] ?? [...index][0];
  if (!ligne) return null;
  const entree = await pack.getDocument(ligne._id);
  return entree?.sheet.render({ force: true });
}

async function ouvrirAuLancement() {
  let mode = "toujours";
  try { mode = game.settings.get(SYSTEM_ID, "ouvertureWiki"); } catch { /* réglage absent */ }
  if (mode === "jamais") return;
  if (mode === "premiere" && game.user.getFlag(SYSTEM_ID, "wikiVu")) return;
  // Petit délai : la fenêtre s'ouvre une fois l'interface (barre latérale, scène) en place.
  setTimeout(async () => {
    try {
      await ouvrirWiki();
      if (!game.user.getFlag(SYSTEM_ID, "wikiVu")) await game.user.setFlag(SYSTEM_ID, "wikiVu", true);
    } catch (err) {
      console.error(`${SYSTEM_ID} | ouverture du wiki impossible`, err);
    }
  }, 600);
}

function creerBouton(quel) {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "mu-bouton-wiki";
  bouton.innerHTML = `<span aria-hidden="true">📖</span> ${WIKIS[quel].libelle}`;
  bouton.dataset.tooltip = `Ouvrir le ${WIKIS[quel].libelle.toLowerCase()}`;
  bouton.addEventListener("click", (ev) => {
    ev.preventDefault();
    ouvrirWiki(quel);
  });
  return bouton;
}

/** Boutons « 📖 » en haut des onglets Acteurs et Journaux, avec garde anti-doublon. */
function ajouterBoutons(app, html) {
  const racine = html instanceof HTMLElement ? html : (html?.[0] ?? app?.element);
  if (!racine || racine.querySelector(".mu-boutons-wiki")) return;
  const zone = racine.querySelector(".header-actions") ?? racine.querySelector(".directory-header");
  if (!zone) return;
  const conteneur = document.createElement("div");
  conteneur.className = "mu-boutons-wiki";
  if (game.user.isGM) conteneur.append(creerBouton("gardien"));
  conteneur.append(creerBouton("joueur"));
  zone.append(conteneur);
}

export function enregistrerHooksWiki() {
  Hooks.on("renderActorDirectory", ajouterBoutons);
  Hooks.on("renderJournalDirectory", ajouterBoutons);
  Hooks.once("ready", ouvrirAuLancement);
}
