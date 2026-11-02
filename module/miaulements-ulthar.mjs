import { SYSTEM_ID, MODES } from "./config.mjs";
import { ChatData, PnjData, PouvoirData } from "./datamodels.mjs";
import { FeuilleChat } from "./sheet.mjs";
import { brancherCartes } from "./rolls.mjs";

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | initialisation`);

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

  game.settings.register(SYSTEM_ID, "modeJeu", {
    name: "Mode de jeu",
    hint: "Pulp : critiques à 10 %. Serious Cat et co-investigation : critiques à 5 %.",
    scope: "world",
    config: true,
    type: String,
    choices: Object.fromEntries(Object.entries(MODES).map(([k, m]) => [k, m.label])),
    default: "pulp"
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
