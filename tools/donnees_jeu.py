"""Données du jeu extraites des PDF : bestiaire, prétirés (lus à l'œil sur les fiches), ecran."""
import json, re, html, unicodedata

def charger(nom):
    return json.load(open(f"/tmp/ulthar-txt/{nom}.json"))["pages"]

def tout_le_texte(pages):
    return "\n".join(l["t"] for p in pages for l in p["lignes"])

DE = r"(\d+\s*[dD]\s*\d+(?:\s*\+\s*\d+)?)"

def _collapse(t):
    return re.sub(r"\s+", " ", t).strip()

def parse_bestiaire():
    pages = charger("bestiaire")
    texte = tout_le_texte(pages)
    morceaux = re.split(r"Extrait Journal d.Arkham,?\s*Scotty\s*1921", texte)
    creatures = []
    for m in morceaux:
        if "PV" not in m:
            continue
        lignes = m.strip("\n").split("\n")
        i = 0
        maj, drop = [], ""
        while i < len(lignes):
            l = lignes[i].strip()
            if l == "":
                i += 1; continue
            if len(l) == 1 and l.isalpha():
                drop = drop or l; i += 1; continue
            if l == l.upper() and any(c.isalpha() for c in l):
                maj.append(l); i += 1; continue
            break
        n = next((k for k in range(1, len(maj) // 2 + 1) if maj[:k] == maj[k:2 * k]), None)
        nom = " ".join(maj[:n]) if n else " ".join(maj[:1])
        reste = lignes[i:]
        if reste and drop:
            reste[0] = drop + reste[0]
        corps = _collapse(" ".join(reste))
        creatures.append((nom.title().replace("Dimentionnel", "Dimensionnel"), corps))
    return creatures

def stats_creature(corps):
    desc, _, stats = corps.partition("PV")
    pv = re.match(r"\s*:?\s*(\d+)", stats)
    pv = int(pv.group(1)) if pv else 0
    stats = stats[pv and re.match(r"\s*:?\s*\d+", stats).end():] if pv else stats
    attaques = []
    for mm in re.finditer(r"([A-Za-zÀ-ÿ'’/ -]{0,48}?)\s*[:;]?\s*(\d{2,3})\s?%\s*/\s*(\d+\s*[dD]\s*\d+(?:\s*\+\s*\d+)?)", stats):
        nom = mm.group(1).strip(" :;/-")
        nom = re.sub(r"^(Pouvoir|Capac\w+)\s*", "", nom)
        attaques.append({"nom": nom or "Attaque", "pct": int(mm.group(2)), "degats": re.sub(r"\s+", "", mm.group(3)).lower()})
    pouvoir = re.search(r"Pouvoir\s*[:;]\s*(.*?)(?=Capac|$)", stats)
    capacite = re.search(r"Capaci?t?é\s*:\s*(.*)$", stats)
    return desc.strip(), pv, attaques, (pouvoir.group(1).strip(" .") if pouvoir else ""), (capacite.group(1).strip(" .") if capacite else ""), stats.strip()


NOMS = {"Fourriere": "Fourrière", "Etre Antique": "Être antique", "Gnoph-Keh": "Gnoph-Keh", "Rhantegot": "Rhan-Tegoth"}
DEBUT_JOURNAL = r"\s(?=(?:Des|Un|Une|Dans|Ce|Trois|Plusieurs|À|L|A|Lors|Drôle|Deux|Selon|Pendant|Après|Au|Les|Le|La|Quelques|Depuis|Lors|Un)\b)"

def separer_note(texte):
    """Sépare « Pouvoir/Capacité » de l'extrait de journal collé derrière (même colonne dans la maquette)."""
    texte = texte.strip()
    p = texte.find(". ")
    if p != -1 and p > 3:
        return texte[:p].strip(" ."), texte[p + 2:].strip()
    m = re.search(DEBUT_JOURNAL, texte[6:])
    if m:
        c = m.start() + 6
        return texte[:c].strip(" ."), texte[c:].strip()
    return texte.strip(" ."), ""

def creature_complete(nom, corps):
    desc, pv, attaques, pouvoir, capacite, stats = stats_creature(corps)
    nom = NOMS.get(nom, nom)
    # texte d'ambiance (extrait du journal) : ce qui suit le pouvoir ou la capacité
    extrait = ""
    if pouvoir:
        pouvoir, extrait = separer_note(pouvoir)
    if capacite:
        capacite, e2 = separer_note(capacite)
        extrait = extrait or e2
    if not (pouvoir or capacite):
        m = re.search(r"\d+\s*[dD]\s*\d+(?:\+\d+)?\s+", stats)
    if nom == "Etre antique" or nom == "Être antique":
        attaques = [{"nom": "2 attaques aux tentacules", "pct": 70, "degats": "10d6"}]
    if nom == "Fourrière":
        attaques = [{"nom": "Filet (jet de Dextérité, malus 20 %)", "pct": 65, "degats": ""},
                    {"nom": "Anesthésiant (jet de Constitution, malus 40 %)", "pct": 50, "degats": ""}]
    if nom == "Rhan-Tegoth":
        attaques = [{"nom": "Bras", "pct": 80, "degats": "2d10"}, {"nom": "Essaim (6 PV)", "pct": 60, "degats": "2d4"}]
        pouvoir = "Contrôle les essaims"
    if nom == "Serpent":
        capacite = "Venin paralysant"
    if nom == "Goule":
        capacite, extrait = "dégâts / 2", (capacite.split("2 ", 1)[-1] if "2 " in capacite else extrait)
        extrait = re.sub(r"^.*?(À Providence)", r"\1", corps[corps.find("dégâts / 2"):])
    if nom == "Tsathoggua":
        pouvoir, extrait = "appel d’autres amphibiens", "Des inscriptions" + pouvoir.split("Des inscriptions", 1)[-1] if "Des inscriptions" in pouvoir else extrait
    if nom == "Ubbosathla":
        pouvoir, extrait = "régénération 1d6 / round", ("Des randonneurs" + pouvoir.split("Des randonneurs", 1)[-1] if "Des randonneurs" in pouvoir else extrait)
    if nom == "Fourrière":
        extrait = stats.split("(malus 40%)")[-1].strip()
    rep = lambda t: re.sub(r"\b([A-ZÀ-Ý]) ([a-zà-ÿ])", r"\1\2", t)
    desc, extrait = rep(desc), rep(extrait)
    return {"nom": nom, "description": desc, "pv": pv, "attaques": attaques, "pouvoir": pouvoir, "capacite": capacite, "extrait": extrait}
