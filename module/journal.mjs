/**
 * Thème « Journal d'Arkham, 1921 » : ajoute la classe .mu-journal aux fenêtres des journaux du système
 * (wikis, scénarios), qu'ils soient ouverts depuis le compendium ou importés dans le monde (drapeau du système).
 * Un simple ajout de classe au rendu : aucun coût en dehors de l'ouverture d'un journal.
 */
import { SYSTEM_ID } from "./config.mjs";

function estJournalDuSysteme(doc) {
  if (!doc) return false;
  const entree = doc.documentName === "JournalEntryPage" ? doc.parent : doc;
  const pack = entree?.pack ?? "";
  return pack.startsWith(`${SYSTEM_ID}.`) || Boolean(entree?.getFlag?.(SYSTEM_ID, "journal"));
}

function marquer(app) {
  const doc = app.document ?? app.object;
  if (estJournalDuSysteme(doc)) app.element?.classList?.add("mu-journal");
}

export function enregistrerHooksJournal() {
  Hooks.on("renderJournalEntrySheet", marquer);
  Hooks.on("renderJournalEntryPageSheet", marquer);
  Hooks.on("renderJournalSheet", marquer); // anciennes fiches (v1), au cas où un module les remet
}
