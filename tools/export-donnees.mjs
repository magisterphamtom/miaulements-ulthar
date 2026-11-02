// Exporte les données des modules JS (pouvoirs, config) en JSON pour les scripts de construction.
import { writeFileSync, mkdirSync } from "node:fs";
import { POUVOIRS_INNES, POUVOIRS_RACE, POUVOIRS_TEMPORAIRES } from "../module/pouvoirs.mjs";
import { ATTRIBUTS, RACES, ACTIONS_FOLIE, TABLE_PV, DIFFICULTES, MODES } from "../module/config.mjs";
mkdirSync(new URL("../src/", import.meta.url), { recursive: true });
const pv = TABLE_PV.map((l) => ({ max: l.max === Infinity ? 9999 : l.max, pv: l.pv }));
writeFileSync(new URL("../src/donnees.json", import.meta.url), JSON.stringify({ POUVOIRS_INNES, POUVOIRS_RACE, POUVOIRS_TEMPORAIRES, ATTRIBUTS, RACES, ACTIONS_FOLIE, TABLE_PV: pv, DIFFICULTES, MODES }, null, 1));
console.log("src/donnees.json écrit");
