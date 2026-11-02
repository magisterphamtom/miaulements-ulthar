// Compile src/packs/<pack>/*.json en packs LevelDB (packs/<pack>/). Lancer après construire-contenu.py.
import { compilePack, extractPack } from "@foundryvtt/foundryvtt-cli";
import { readdirSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(racine, "src", "packs");
const dest = path.join(racine, "packs");
if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

for (const pack of readdirSync(src)) {
  await compilePack(path.join(src, pack), path.join(dest, pack), { log: false, recursive: true });
  console.log("compilé :", pack);
}

// Vérification : on relit chaque pack et on compte les documents.
if (process.argv.includes("--verifier")) {
  for (const pack of readdirSync(dest)) {
    const out = path.join("/tmp", "verif-packs", pack);
    rmSync(out, { recursive: true, force: true });
    await extractPack(path.join(dest, pack), out, { log: false });
    console.log("relu :", pack, readdirSync(out).length, "documents");
  }
}
