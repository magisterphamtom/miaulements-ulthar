import { SYSTEM_ID, MODES } from "./config.mjs";
import { ChatData, PnjData, PouvoirData } from "./datamodels.mjs";
import { FeuilleChat, FichePnj, enregistrerParametresThemes } from "./sheet.mjs";
import { FichePouvoir } from "./item-sheet.mjs";
import { brancherCartes, ecouterSocket } from "./combat.mjs";
import { api } from "./outils.mjs";
import { SuiviGroupe, brancherAmbiance, ajouterBoutons } from "./ambiance.mjs";
import { enregistrerParametresWiki, enregistrerHooksWiki, ouvrirWiki } from "./wiki.mjs";
import { enregistrerParametresAccueil, enregistrerHooksAccueil } from "./accueil.mjs";
import { enregistrerHooksJournal } from "./journal.mjs";

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | initialisation`);

  game.miaulementsUlthar = { ...api, suiviGroupe: () => SuiviGroupe.basculer(), wiki: ouvrirWiki };
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

  enregistrerParametresWiki();
  enregistrerParametresAccueil();
  enregistrerParametresThemes();

  game.settings.register(SYSTEM_ID, "visionFeline", { scope: "client", config: false, type: Boolean, default: false });

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

enregistrerHooksWiki();
enregistrerHooksAccueil();
enregistrerHooksJournal();

Hooks.once("ready", async () => {
  ecouterSocket();
  brancherAmbiance();
});
