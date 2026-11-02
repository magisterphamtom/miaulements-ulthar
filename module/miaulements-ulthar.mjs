import { SYSTEM_ID, MODES } from "./config.mjs";
import { ChatData, PnjData, PouvoirData } from "./datamodels.mjs";
import { FeuilleChat, FichePnj } from "./sheet.mjs";
import { FichePouvoir } from "./item-sheet.mjs";
import { brancherCartes, ecouterSocket } from "./combat.mjs";
import { api } from "./outils.mjs";
import { SuiviGroupe, brancherAmbiance, ajouterBoutons } from "./ambiance.mjs";

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | initialisation`);

  game.miaulementsUlthar = { ...api, suiviGroupe: () => SuiviGroupe.basculer() };
  CONFIG.Actor.dataModels.chat = ChatData;
  CONFIG.Actor.dataModels.pnj = PnjData;
  CONFIG.Item.dataModels.pouvoir = PouvoirData;
  CONFIG.Actor.trackableAttributes = {
    chat: { bar: ["pv", "pm", "pf", "vies"], value: [] },
    pnj: { bar: ["pv"], value: [] }
  };

  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, FeuilleChat, {
    types: ["chat"],
    makeDefault: true,
    label: "Fiche de Chat"
  });

  DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, FichePnj, {
    types: ["pnj"],
    makeDefault: true,
    label: "Fiche d'adversaire"
  });
  DocumentSheetConfig.registerSheet(Item, SYSTEM_ID, FichePouvoir, {
    types: ["pouvoir"],
    makeDefault: true,
    label: "Fiche de pouvoir"
  });

  game.settings.register(SYSTEM_ID, "modeJeu", {
    name: "Mode de jeu",
    hint: "Pulp : critiques à 10 %. Serious Cat et co-investigation : critiques à 5 %.",
    scope: "world",
    config: true,
    type: String,
    choices: Object.fromEntries(Object.entries(MODES).map(([k, m]) => [k, m.label])),
    default: "pulp"
  });

  game.settings.register(SYSTEM_ID, "perteAlteration", {
    name: "Perte de PM à chaque altération onirique",
    hint: "Le livre dit à la fois que seule la connexion mentale coûte des PM (p.55) et que chaque altération en coûte (p.59). Désactivé : seule la connexion coûte.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(SYSTEM_ID, "ouvertureWiki", {
    name: "Ouverture automatique du wiki",
    hint: "Le joueur ouvre le wiki des joueurs, le Gardien ouvre le wiki du Gardien.",
    scope: "client",
    config: true,
    type: String,
    choices: { premiere: "À la première connexion dans ce monde", toujours: "À chaque connexion", jamais: "Jamais" },
    default: "premiere"
  });

  game.settings.register(SYSTEM_ID, "cocherAuto", {
    name: "Cocher automatiquement les échecs",
    hint: "Chaque échec d'un jet d'attribut coche une case sur la fiche.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

Hooks.on("renderChatMessageHTML", (message, html) => brancherCartes(message, html));

Hooks.on("getSceneControlButtons", (controls) => ajouterBoutons(controls));

Hooks.once("ready", async () => {
  ecouterSocket();
  brancherAmbiance();
  const mode = game.settings.get(SYSTEM_ID, "ouvertureWiki");
  if (mode === "jamais") return;
  const cle = `${SYSTEM_ID}.wikiOuvert.${game.world.id}.${game.user.id}`;
  if (mode === "premiere" && localStorage.getItem(cle)) return;
  // Joueur : wiki des joueurs. Gardien : wiki du Gardien (qui renvoie vers celui des joueurs).
  const pack = game.packs.get(`${SYSTEM_ID}.${game.user.isGM ? "wiki-mj" : "wiki-joueur"}`);
  const entree = pack?.index.find((e) => e.name.startsWith("Accueil"));
  if (!entree) return;
  const doc = await pack.getDocument(entree._id);
  doc?.sheet.render(true);
  localStorage.setItem(cle, "1");
});
