#!/usr/bin/env python3
"""Fabrique les sources des compendiums (src/packs/<pack>/*.json, format Foundry) à partir de
- src/donnees.json (pouvoirs, races, tables : voir tools/export-donnees.mjs),
- /tmp/ulthar-txt/*.json (texte des PDF : voir tools/extraire.py),
- tables transcrites de l'écran du MJ et fiches prétirées (lues sur les images).
Puis `node tools/compiler-packs.mjs` écrit les packs LevelDB dans packs/."""
import json, hashlib, os, re, html, shutil, sys
sys.path.insert(0, os.path.dirname(__file__))
from donnees_jeu import parse_bestiaire, creature_complete, charger
from jetons import slug as slug_img

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = os.path.join(RACINE, "src", "packs")
SYS = "miaulements-ulthar"
D = json.load(open(os.path.join(RACINE, "src", "donnees.json")))
ICONE = "icons/svg/mystery-man.svg"
STATS = {"createdTime": 1762100000000, "modifiedTime": 1762100000000, "systemId": SYS, "systemVersion": "0.3.0", "coreVersion": "14.368"}

NOMS_RACES = {"CHAT DE GOUTTIERE": "Chat de gouttière", "CHAT DE GOUTTIÈRE": "Chat de gouttière", "CORNISH REX": "Cornish Rex", "MAINE COON": "Maine Coon", "NORVEGIEN": "Norvégien", "SCOTTISH FOLD": "Scottish Fold"}
B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

def ident(*parts):
    n = int(hashlib.sha256("|".join(parts).encode()).hexdigest(), 16)
    s = ""
    for _ in range(16):
        n, r = divmod(n, 62); s += B62[r]
    return s

def esc(t): return html.escape(str(t), quote=False)

def ecrire(pack, doc, nom_fichier=None):
    dossier = os.path.join(SORTIE, pack)
    os.makedirs(dossier, exist_ok=True)
    slug = re.sub(r"[^a-z0-9]+", "-", (nom_fichier or doc["name"]).lower().replace("é", "e").replace("è", "e").replace("ê", "e").replace("à", "a").replace("ô", "o").replace("î", "i").replace("ï", "i").replace("ç", "c"))[:60].strip("-")
    json.dump(doc, open(os.path.join(dossier, f"{slug}_{doc['_id']}.json"), "w"), ensure_ascii=False, indent=1)

def dossier_doc(pack, type_, nom, tri=0):
    d = {"_id": ident(pack, "dossier", nom), "name": nom, "type": type_, "folder": None, "sorting": "a", "sort": tri,
         "color": None, "flags": {}, "description": "", "_stats": STATS, "_key": None}
    d["_key"] = f"!folders!{d['_id']}"
    ecrire(pack, d, "dossier-" + nom)
    return d["_id"]

def lien(pack, type_, nom_doc, texte, page=None):
    base = f"Compendium.{SYS}.{pack}.{type_}.{ident(pack, type_, nom_doc)}"
    if page: base += f".JournalEntryPage.{ident(pack, 'page', nom_doc, page)}"
    return f"@UUID[{base}]{{{texte}}}"

# ---------------------------------------------------------------- texte des PDF -> HTML
PUCE = re.compile(r"^\s*([-•∙▪]|\d+[.)])\s+")
FIN = re.compile(r"[.!?»…:;)\]]\s*$")

def rep(t):  # lettrines « L e » -> « Le »
    return re.sub(r"\b([A-ZÀ-Ý]) ([a-zà-ÿ])", r"\1\2", t)

def lignes_vers_html(lignes):
    """lignes = [{'t', 'h'}] -> HTML. Les intertitres consécutifs de même niveau sont fusionnés."""
    sortie, para, titre_en_cours = [], [], None

    def vider_para():
        nonlocal para
        if not para: return
        items, avant = [], []
        for l in para:
            if PUCE.match(l): items.append(PUCE.sub("", l))
            elif items: items[-1] += " " + l
            else: avant.append(l)
        if avant: sortie.append("<p>" + esc(rep(" ".join(avant))) + "</p>")
        if items: sortie.append("<ul>" + "".join(f"<li>{esc(rep(i))}</li>" for i in items) + "</ul>")
        para = []

    def vider_titre():
        nonlocal titre_en_cours
        if titre_en_cours:
            niv, txt = titre_en_cours
            if len(re.sub(r"[^A-Za-zÀ-ÿ]", "", txt)) >= 4:
                tag = "h2" if niv == 2 else "h3"
                if re.match(r"^Exemple", txt): tag = "h4"
                sortie.append(f"<{tag}>{esc(rep(txt))}</{tag}>")
            titre_en_cours = None

    for l in lignes:
        t = l["t"].strip()
        if l["h"]:
            vider_para()
            if titre_en_cours and titre_en_cours[0] == l["h"]:
                titre_en_cours = (l["h"], titre_en_cours[1] + " " + t)
            else:
                vider_titre(); titre_en_cours = (l["h"], t)
            continue
        vider_titre()
        if t == "":
            vider_para()
        else:
            # un paragraphe qui se termine sans ponctuation et reprend en minuscule : même paragraphe
            para.append(t)
    vider_para(); vider_titre()
    # recolle les paragraphes coupés par les colonnes
    res = []
    for x in sortie:
        if res and x.startswith("<p>") and res[-1].startswith("<p>"):
            fin = html.unescape(res[-1][3:-4]); deb = html.unescape(x[3:-4])
            if not FIN.search(fin) and deb[:1].islower():
                res[-1] = "<p>" + esc(fin + " " + deb) + "</p>"; continue
        res.append(x)
    return "\n".join(res)

def sections(pages, p1, p2, titre_chapitre, coupures=()):
    """Découpe les pages p1..p2 en sections (une par intertitre de niveau 2), regroupe les trop courtes."""
    lignes = [l for p in pages if p1 <= p["page"] <= p2 for l in p["lignes"]]
    # on retire le titre du chapitre répété en haut de la première page
    secs, courant = [], {"titre": titre_chapitre, "lignes": []}
    i = 0
    while i < len(lignes):
        l = lignes[i]
        if l["t"].strip().upper() in coupures and not l["h"]:
            if courant["lignes"] or secs: secs.append(courant)
            courant = {"titre": NOMS_RACES.get(l["t"].strip().upper(), l["t"].strip().capitalize()), "lignes": []}
            i += 1; continue
        if l["h"] == 2:
            titre = l["t"].strip(); j = i + 1
            while j < len(lignes) and lignes[j]["h"] == 2:
                titre += " " + lignes[j]["t"].strip(); j += 1
            if len(re.sub(r"[^A-Za-zÀ-ÿ]", "", titre)) >= 4 and not re.match(r"^Exemple", titre):
                if courant["lignes"] or secs: secs.append(courant)
                courant = {"titre": rep(titre).strip(), "lignes": []}
                i = j; continue
        courant["lignes"].append(l); i += 1
    secs.append(courant)
    # fusion des sections trop courtes dans la précédente
    res = []
    for s in secs:
        corps = " ".join(x["t"] for x in s["lignes"])
        if res and len(corps) < 280:
            res[-1]["lignes"] += [{"t": s["titre"], "h": 3}] + s["lignes"]
        else:
            res.append(s)
    if len(res) > 1 and len(" ".join(x["t"] for x in res[0]["lignes"])) < 280:
        res[1]["lignes"] = [{"t": res[0]["titre"], "h": 3}] + res[0]["lignes"] + res[1]["lignes"]
        res = res[1:]
    return res

def journal(pack, nom, pages, tri=0, ownership=None, dossier=None):
    eid = ident(pack, "JournalEntry", nom)
    docs = []
    prec = None
    for k, (titre, contenu) in enumerate(pages):
        if titre == prec: titre = titre + " (suite)"
        prec = titre.replace(" (suite)", "")
        pid = ident(pack, "page", nom, titre, str(k))
        docs.append({"_id": pid, "name": titre, "type": "text", "title": {"show": True, "level": 1}, "image": {}, "text": {"format": 1, "content": contenu},
                     "video": {"controls": True, "volume": 0.5}, "src": None, "system": {}, "sort": (k + 1) * 100000,
                     "ownership": {"default": -1}, "flags": {}, "_stats": STATS, "_key": f"!journal.pages!{eid}.{pid}"})
    doc = {"_id": eid, "name": nom, "pages": docs, "folder": dossier, "sort": tri, "ownership": ownership or {"default": 0}, "flags": {}, "_stats": STATS, "_key": f"!journal!{eid}"}
    ecrire(pack, doc)
    return eid

def table_html(entetes, lignes):
    h = "<table><thead><tr>" + "".join(f"<th>{esc(e)}</th>" for e in entetes) + "</tr></thead><tbody>"
    for l in lignes: h += "<tr>" + "".join(f"<td>{c}</td>" for c in l) + "</tr>"
    return h + "</tbody></table>"

# ---------------------------------------------------------------- pouvoirs (Items)
def item_pouvoir(pack, nom, categorie, desc, degats="", gratuit=False, dossier=None, parent=None):
    iid = ident(pack, "pouvoir", categorie, nom)
    doc = {"_id": iid, "name": nom, "type": "pouvoir", "img": "icons/svg/aura.svg",
           "system": {"categorie": categorie, "attribut": "", "description": f"<p>{esc(desc)}</p>", "degats": degats, "gratuit": gratuit},
           "effects": [], "folder": dossier, "sort": 0, "ownership": {"default": 0}, "flags": {}, "_stats": STATS}
    if parent:
        doc["_key"] = f"!actors.items!{parent}.{iid}"
    else:
        doc["_key"] = f"!items!{iid}"
    return doc

def construire_pouvoirs():
    pack = "pouvoirs"
    f_inne = dossier_doc(pack, "Item", "Pouvoirs innés", 100000)
    f_race = dossier_doc(pack, "Item", "Pouvoirs de race", 200000)
    f_temp = dossier_doc(pack, "Item", "Pouvoirs temporaires", 300000)
    n = 0
    for k, p in D["POUVOIRS_INNES"].items():
        d = item_pouvoir(pack, p["nom"], "inne", p["desc"], gratuit=bool(p.get("gratuit")), dossier=f_inne); ecrire(pack, d); n += 1
    for race, lst in D["POUVOIRS_RACE"].items():
        for p in lst:
            d = item_pouvoir(pack, p["nom"], "race", f"({D['RACES'][race]['label']}) " + p["desc"], degats=p.get("degats", ""), dossier=f_race); ecrire(pack, d); n += 1
    for p in D["POUVOIRS_TEMPORAIRES"]:
        d = item_pouvoir(pack, p["nom"], "temporaire", p["desc"], degats=p.get("degats", ""), dossier=f_temp); ecrire(pack, d); n += 1
    print("pouvoirs :", n)

# ---------------------------------------------------------------- tables
def table_doc(nom, formule, resultats, description=""):
    tid = ident("tables", "table", nom)
    res = []
    for i, (a, b, texte) in enumerate(resultats):
        rid = ident("tables", "resultat", nom, str(i))
        res.append({"_id": rid, "type": "text", "text": texte, "img": None, "description": "", "range": [a, b], "weight": b - a + 1, "drawn": False,
                    "flags": {}, "_stats": STATS, "_key": f"!tables.results!{tid}.{rid}"})
    doc = {"_id": tid, "name": nom, "img": "icons/svg/d20-grey.svg", "description": f"<p>{esc(description)}</p>", "results": res, "formula": formule,
           "replacement": True, "displayRoll": True, "folder": None, "sort": 0, "ownership": {"default": 0}, "flags": {}, "_stats": STATS, "_key": f"!tables!{tid}"}
    ecrire("tables", doc)

def construire_tables():
    table_doc("Cartes Folie", "1d20", [(i + 1, i + 1, t) for i, t in enumerate(D["ACTIONS_FOLIE"])], "Carte tirée à chaque échec d'un jet de Folie (p.52).")
    table_doc("Pouvoirs temporaires", "1d100", [(p["de"], p["a"], p["nom"] + " — " + p["desc"]) for p in D["POUVOIRS_TEMPORAIRES"]], "Deux tirages au début de l'aventure ; doublon = relance (p.60-64).")
    surnoms = ["Bella", "Luna", "Oliver", "Charlie", "Max", "Rosie", "Cléo", "Milo", "Ruby", "Daisy", "Mimolette", "Simba", "Felix", "Misty", "Teddy", "Jasper", "Nala", "Whiskers", "Leo", "Olive", "Willow"]
    table_doc("Surnoms", "1d21", [(i + 1, i + 1, s) for i, s in enumerate(surnoms)], "Surnoms de Chats proposés par l'écran du MJ.")
    table_doc("Événements en ville", "1d10", [(i + 1, i + 1, t) for i, t in enumerate(["Circulation automobile dense", "Animaux errants agressifs", "Déchets dangereux", "Chasseurs de chats", "Pièges à rongeurs empoisonnés", "Bouche d'aération qui expulse de la vapeur", "Personnes hostiles", "Pollution sonore", "Fourrière", "Mauvaises conditions météorologiques"])], "Écran du MJ.")
    table_doc("Réactions humaines", "1d10", [(1, 2, "Ignore le chat"), (3, 3, "Caresse le chat"), (4, 4, "Joue avec le chat"), (5, 5, "Alimente le chat"), (6, 6, "Prend le chat dans les bras"), (7, 7, "Tente de chasser le chat"), (8, 8, "Intimide le chat"), (9, 9, "Lance des objets au chat"), (10, 10, "Maltraite le chat")], "Écran du MJ.")
    ra = [("Chat", "Chat", "Ignore"), ("Chat", "Chien", "Curieux"), ("Chien", "Rongeur", "Amitié"), ("Chien", "Oiseau", "Dominant"), ("Rongeur", "Loup / Renard", "Fuite"),
          ("Rongeur", "Chèvre / Mouton", "Hostile"), ("Oiseau", "Cochon", "Soumission"), ("Oiseau", "Vache / Cheval", "Jeu"), ("Insecte", "Insecte", "Se cache"), ("Insecte", "Sanglier", "Ignore")]
    table_doc("Réactions des animaux", "1d10", [(i + 1, i + 1, f"Ville : {v} · Campagne : {c} → {r}") for i, (v, c, r) in enumerate(ra)], "Écran du MJ : animal rencontré en ville ou à la campagne, et sa réaction.")
    print("tables : 7")

# ---------------------------------------------------------------- bestiaire (Actors pnj)
def chemin_image(sous_dossier, nom, ext_candidates=("png", "webp")):
    """Chemin système d'une image de jeton ou de portrait, ou l'icône par défaut si elle n'existe pas."""
    for ext in ext_candidates:
        if os.path.exists(os.path.join(RACINE, "assets", sous_dossier, f"{slug_img(nom)}.{ext}")):
            return f"systems/{SYS}/assets/{sous_dossier}/{slug_img(nom)}.{ext}"
    return ICONE

def construire_bestiaire():
    pack = "bestiaire"
    out = []
    for nom, corps in parse_bestiaire():
        c = creature_complete(nom, corps)
        aid = ident(pack, "Actor", c["nom"])
        desc = f"<p>{esc(c['description'])}</p>"
        if c["capacite"]: desc += f"<p><strong>Capacité :</strong> {esc(c['capacite'])}</p>"
        if c["extrait"]: desc += f"<blockquote><p>{esc(c['extrait'])}</p><p><em>Extrait du Journal d'Arkham, Scotty, 1921</em></p></blockquote>"
        img = chemin_image("jetons", c["nom"])
        doc = {"_id": aid, "name": c["nom"], "type": "pnj", "img": img,
               "system": {"attaques": [{"nom": a["nom"], "pct": a["pct"], "degats": a["degats"]} for a in c["attaques"]],
                          "pouvoir": c["pouvoir"], "capacite": c["capacite"],
                          "pv": {"value": c["pv"], "max": c["pv"]}, "description": desc},
               "prototypeToken": {"name": c["nom"], "actorLink": False, "disposition": -1, "displayBars": 40, "bar1": {"attribute": "pv"}, "texture": {"src": img}},
               "items": [], "effects": [], "folder": None, "sort": 0, "ownership": {"default": 0}, "flags": {}, "_stats": STATS, "_key": f"!actors!{aid}"}
        ecrire(pack, doc)
        out.append(c)
    print("bestiaire :", len(out))
    return out

# ---------------------------------------------------------------- prétirés (fiches lues sur le PDF des prétirés)
# valeurs imprimées traitées comme valeurs finales (race comprise) : base = imprimé − modificateur de race
PRETIRES = [
    {"nom": "Orichat", "race": "bengal", "desc": "Orichat excelle dans les mouvements acrobatiques et sa discrétion.",
     "a": dict(chn=45, phy=30, cha=50, agi=70, int=50, dis=60, per=55, pre=40), "pv": 4, "vies": 3, "pm": 50, "pf": 53,  # imprimé : 55 (écart de la fiche)
     "pouvoirs": ["Guérison réconfortante", "Grimpeur habile", "Ordre prononcé"]},
    {"nom": "Maya", "race": "persan", "desc": "Maya, dotée d'un charisme envoûtant, sait charmer et influencer ceux qui croisent son chemin.",
     "a": dict(chn=50, phy=30, cha=70, agi=45, int=60, dis=50, per=55, pre=40), "pv": 3, "vies": 3, "pm": 60, "pf": 63,
     "pouvoirs": ["Charme délicat", "Perception accrue", "Manipulation d'un souvenir"]},
    {"nom": "Isis", "race": "sphynx", "desc": "Isis, d'une intelligence vive et subtile, perçoit les subtilités de chaque situation.",
     "a": dict(chn=50, phy=30, cha=55, agi=40, int=70, dis=50, per=60, pre=45), "pv": 3, "vies": 3, "pm": 70, "pf": 58,
     "pouvoirs": ["Vision des conséquences", "Vision des fluides magiques", "Réponse immédiate"]},
    {"nom": "Chiffon", "race": "gouttiere", "desc": "Chiffon est astucieux, avec une indépendance farouche et une curiosité insatiable.",
     "a": dict(chn=50, phy=50, cha=50, agi=50, int=50, dis=50, per=50, pre=50), "pv": 4, "vies": 3, "pm": 50, "pf": 50,
     "pouvoirs": ["Aubaine incroyable", "Griffes précises", "Parler humain"]},
    {"nom": "Ator", "race": "mainecoon", "desc": "Ator, avec une prestance physique imposante, incarne la force brute.",
     "a": dict(chn=50, phy=70, cha=50, agi=40, int=30, dis=45, per=55, pre=60), "pv": 5, "vies": 9, "pm": 30, "pf": 53,
     "pouvoirs": ["Force légendaire", "Neuf vies", "Cauchemar mental"]},
    {"nom": "Filou", "race": "gouttiere", "desc": "Filou est un chat discret et voleur dans l'âme.",
     "a": dict(chn=40, phy=55, cha=30, agi=50, int=50, dis=70, per=45, pre=60), "pv": 4, "vies": 3, "pm": 50, "pf": 38,
     "pouvoirs": ["Sixième sens", "Griffes précises", "Langage animal"]},
    {"nom": "Léonard", "race": "gouttiere", "desc": "Léonard est un chat qui aime savoir et comprendre. Cela le met parfois dans quelques ennuis.",
     "a": dict(chn=45, phy=30, cha=50, agi=40, int=70, dis=50, per=60, pre=55), "pv": 3, "vies": 3, "pm": 70, "pf": 55,
     "pouvoirs": ["Aubaine incroyable", "Langage animal", "Réponse immédiate"]},
]

def construire_pretires():
    pack = "pretires"
    tous = {}
    for k, p in D["POUVOIRS_INNES"].items(): tous[p["nom"]] = ("inne", p)
    for race, lst in D["POUVOIRS_RACE"].items():
        for p in lst: tous[p["nom"]] = ("race", p)
    for pr in PRETIRES:
        aid = ident(pack, "Actor", pr["nom"])
        r = D["RACES"][pr["race"]]
        attrs = {}
        for cle in D["ATTRIBUTS"]:
            final = pr["a"][cle]
            mod = 0
            if r.get("plus") == cle: mod = 10
            if r.get("moins") == cle: mod = -10
            attrs[cle] = {"base": final - mod, "race": mod, "handicap": 0, "progres": 0, "echecs": 0}
        items = [item_pouvoir(pack, D["POUVOIRS_INNES"]["comprendre_humain"]["nom"], "inne", D["POUVOIRS_INNES"]["comprendre_humain"]["desc"], gratuit=True, parent=aid)]
        for nom in pr["pouvoirs"]:
            cat, p = tous[nom]
            items.append(item_pouvoir(pack, p["nom"], cat, p["desc"], degats=p.get("degats", ""), gratuit=bool(p.get("gratuit")), parent=aid))
        img = chemin_image("portraits", pr["nom"])
        doc = {"_id": aid, "name": pr["nom"], "type": "chat", "img": img,
               "system": {"race": pr["race"], "description": f"<p>{esc(pr['desc'])}</p>", "handicap": "", "attributs": attrs,
                          "pv": {"value": pr["pv"]}, "pm": {"value": pr["pm"]}, "pf": {"value": pr["pf"]}, "vies": {"value": pr["vies"]}, "xp": 0,
                          "achats": {"pm": 0, "pv": 0, "vies": 0}, "cartesFolie": [], "notes": ""},
               "prototypeToken": {"name": pr["nom"], "actorLink": True, "disposition": 1, "displayBars": 40, "bar1": {"attribute": "pv"}, "texture": {"src": img}},
               "items": items, "effects": [], "folder": None, "sort": 0, "ownership": {"default": 0}, "flags": {}, "_stats": STATS, "_key": f"!actors!{aid}"}
        ecrire(pack, doc)
    print("prétirés :", len(PRETIRES))

# ---------------------------------------------------------------- wikis
PJ = "wiki-joueur"
MJ = "wiki-mj"
OBS = {"default": 2}
NONE = {"default": 0}

def page_chapitre(pages_json, p1, p2, titre_chap, coupures=()):
    return [(s["titre"], lignes_vers_html(s["lignes"])) for s in sections(pages_json, p1, p2, titre_chap, coupures)]

RACES_MAJ = ("BENGAL", "CHAT DE GOUTTIERE", "CHAT DE GOUTTIÈRE", "CORNISH REX", "MAINE COON", "NORVÉGIEN", "NORVEGIEN", "PERSAN", "SAVANNAH", "SCOTTISH FOLD", "SIAMOIS", "SPHYNX")

def tableau_races():
    lignes = []
    for cle, r in D["RACES"].items():
        plus = D["ATTRIBUTS"][r["plus"]]["label"] if r.get("plus") else "+5 au choix"
        moins = D["ATTRIBUTS"][r["moins"]]["label"] if r.get("moins") else "−5 au choix"
        lignes.append([r["label"], plus + (" +10 %" if r.get("plus") else ""), moins + (" −10 %" if r.get("moins") else ""), " / ".join(p["nom"] for p in D["POUVOIRS_RACE"][cle])])
    return "<p>Chaque race donne un bonus et un malus à deux attributs, et un pouvoir de race à choisir parmi deux.</p>" + table_html(["Race", "Bonus", "Malus", "Pouvoir de race (un au choix)"], lignes)

def tableau_temporaires():
    lignes = [[f"{p['de']:02d}–{p['a'] % 100:02d}" if p["a"] != 100 else f"{p['de']:02d}–00", f"<strong>{esc(p['nom'])}</strong>", esc(p["desc"])] for p in D["POUVOIRS_TEMPORAIRES"]]
    return "<p>Au début de l'aventure, chaque Chat lape l'eau enchantée d'une fontaine et tire <strong>deux</strong> pouvoirs au D100 (doublon : on relance). À l'usage : +20 à l'attribut concerné, et la perte de PM est égale au chiffre des unités du dé.</p>" + table_html(["D100", "Pouvoir", "Effet"], lignes)

def aide_memoire_joueur():
    h = "<h2>Un jet</h2><p>D100 : réussite si le résultat est inférieur ou égal à l'attribut. Réussite critique : 5 ou moins (10 en mode Pulp). Échec critique : 96 ou plus (91 en mode Pulp).</p>"
    h += "<h2>Difficulté (ajoutée au dé)</h2>" + table_html(["Difficulté", "Modificateur"], [["Très facile", "−40"], ["Facile", "−20"], ["Normal", "0"], ["Difficile", "+20"], ["Très difficile", "+40"]])
    h += "<h2>Valeurs calculées</h2><ul><li><strong>Santé</strong> : selon Physique + Agilité (voir tableau).</li><li><strong>Folie</strong> : (Perception + Charisme) / 2, arrondi à l'entier supérieur.</li><li><strong>Magie</strong> : Intelligence.</li><li><strong>Vies de Chat</strong> : 3.</li></ul>"
    h += table_html(["Physique + Agilité", "Points de Santé"], [["0 à 39", "1"], ["40 à 59", "2"], ["60 à 89", "3"], ["90 à 109", "4"], ["110 à 119", "5"], ["120 à 139", "6"], ["140 à 200", "7"]])
    h += "<h2>Dégâts courants</h2>" + table_html(["Source", "Dégâts"], [["Coup de griffe", "1D4"], ["Chute", "1D4 par étage (max 6D4)"], ["Objet tranchant", "1D6"], ["Pistolet", "1D6+1"], ["Fusil", "2D6"], ["Explosion", "4D6"], ["Feu", "2D6 par tour"], ["Choc par véhicule", "1D6"]])
    h += "<h2>Progression</h2><p>Chaque échec à un jet d'attribut coche une case (6 par attribut). Toutes les cases cochées : +1D10 à l'attribut. En fin de scénario : 2 XP (2 XP = +10 PM ou +1 Santé ; 4 XP = pouvoir temporaire permanent ou +1 vie de Chat).</p>"
    return h

def construire_wikis(bestiaire):
    R = charger("regles")
    # --- wiki joueur
    pj = {}
    pj["Bien débuter un jeu de rôle"] = page_chapitre(R, 8, 11, "Bien débuter un jeu de rôle")
    crea = page_chapitre(R, 12, 22, "Création des personnages")
    crea.append(("Les races en un coup d'œil", tableau_races()))
    pj["Création des personnages"] = crea
    pj["Races des Chats"] = page_chapitre(R, 23, 43, "Races des Chats", RACES_MAJ)
    sysj = page_chapitre(R, 44, 66, "Système de jeu")
    sysj.append(("Les pouvoirs temporaires (table D100)", tableau_temporaires()))
    pj["Système de jeu"] = sysj
    pj["Les Chats d'Ulthar"] = page_chapitre(R, 93, 103, "Les Chats d'Ulthar")
    pj["Jouer un Chat"] = page_chapitre(R, 104, 113, "Jouer un Chat")
    nouv = charger("nouvelle")
    pj["Lecture : la nouvelle des Chats d'Ulthar"] = page_chapitre(nouv, 1, 2, "Les Chats d'Ulthar")
    pj["Aide-mémoire du joueur"] = [("Aide-mémoire", aide_memoire_joueur())]
    ordre = ["Bien débuter un jeu de rôle", "Création des personnages", "Races des Chats", "Système de jeu", "Les Chats d'Ulthar", "Jouer un Chat", "Lecture : la nouvelle des Chats d'Ulthar", "Aide-mémoire du joueur"]
    pj_acc = "<p>Bienvenue dans <strong>Les Miaulements d'Ulthar</strong>, un jeu de rôle de Xaviiiier où vous incarnez des Chats d'Ulthar, dotés de pouvoirs mystiques par la déesse Bast, face à l'horreur lovecraftienne.</p><p>Ce wiki est celui des joueurs. Il suit le livre des règles ; le Gardien (meneur de jeu) a son propre wiki.</p><ul>" + "".join(f"<li>{lien(PJ, 'JournalEntry', n, n)}</li>" for n in ordre) + "</ul><h2>Sur la fiche de Chat</h2><ul><li>Bouton « Création du Chat » : l'assistant vous guide pas à pas.</li><li>Clic sur un attribut : jet (Maj = jet rapide). Clic sur une petite case : coche un échec.</li><li>Clic sur le nom d'un pouvoir : il est montré à la table.</li></ul>"
    journal(PJ, "Accueil du wiki des joueurs", [("Accueil", pj_acc)], tri=0, ownership=OBS)
    for k, nom in enumerate(ordre):
        journal(PJ, nom, pj[nom], tri=(k + 1) * 100000, ownership=OBS)

    # --- wiki MJ (Gardien)
    mj = {}
    mj["Guide du maître de jeu"] = page_chapitre(R, 114, 129, "Guide du maître de jeu")
    mj["L'univers de Lovecraft"] = page_chapitre(R, 67, 92, "L'univers de Lovecraft")
    mj["Scénario d'initiation : les chiens dimensionnels"] = page_chapitre(R, 130, 148, "Les chiens dimensionnels")
    ecran = "<h2>Création d'un Chat</h2><p>1. Surnom · 2. Attributs (50 % + ajustements) · 3. Race (bonus/malus, pouvoir de race) · 4. Deux pouvoirs innés · 5. Calculs · 6. Vies de Chat : 3.</p>"
    ecran += "<h2>Difficulté</h2>" + table_html(["Difficulté", "Modificateur"], [["Très difficile", "+40"], ["Difficile", "+20"], ["Normal", "0"], ["Facile", "−20"], ["Très facile", "−40"]])
    ecran += "<h2>Dégâts</h2>" + table_html(["Source", "Dégâts"], [["Coup de griffe", "1D4"], ["Chute", "1D4 par étage"], ["Objet tranchant", "1D6"], ["Pistolet", "1D6+1"], ["Fusil", "2D6"], ["Explosion", "4D6"], ["Feu", "2D6 par tour"], ["Choc par véhicule", "1D6"]])
    ecran += "<h2>Étapes oniriques</h2><ol><li>Connexion mentale avec le sujet.</li><li>Définition de l'objectif par le lanceur.</li><li>Établissement de la scène onirique initiale dans l'esprit du sujet.</li><li>Phases d'altération (deux réussites ou deux échecs terminent la bulle).</li><li>État final de la cible.</li></ol>"
    ecran += "<h2>Comportements</h2><ul><li>Langage corporel : queue, oreilles, yeux, pattes.</li><li>Vocalisations : miaulements, ronronnements, gémissements.</li><li>Comportement : chasseur, joueur, territoire, indifférent, peur.</li><li>Expressions d'affection : frottements, câlins, ronronnements, clignements des yeux, offrandes, léchouilles.</li></ul>"
    ecran += f"<h2>Tables</h2><p>Les tables de l'écran (événements en ville, réactions humaines, réactions des animaux, surnoms, cartes Folie, pouvoirs temporaires) sont dans le compendium « Tables » : clic droit › Lancer.</p>"
    mj["Écran du MJ"] = [("Écran du Maître de Jeu", ecran)]
    bestiaire_pages = []
    for c in sorted(bestiaire, key=lambda x: x["nom"]):
        att = "".join(f"<li>{esc(a['nom'])} : {a['pct']} % / {esc(a['degats'])}</li>" if a["degats"] else f"<li>{esc(a['nom'])} : {a['pct']} %</li>" for a in c["attaques"])
        h = f"<p><strong>PV : {c['pv']}</strong> · @UUID[Compendium.{SYS}.bestiaire.Actor.{ident('bestiaire', 'Actor', c['nom'])}]{{Fiche de {esc(c['nom'])} (Acteur)}}</p><ul>{att}</ul>"
        if c["pouvoir"]: h += f"<p><strong>Pouvoir :</strong> {esc(c['pouvoir'])}</p>"
        if c["capacite"]: h += f"<p><strong>Capacité :</strong> {esc(c['capacite'])}</p>"
        h += f"<p>{esc(c['description'])}</p>"
        if c["extrait"]: h += f"<blockquote><p>{esc(c['extrait'])}</p><p><em>Extrait du Journal d'Arkham, Scotty, 1921</em></p></blockquote>"
        bestiaire_pages.append((c["nom"], h))
    mj["Bestiaire"] = bestiaire_pages
    ordre_mj = ["Guide du maître de jeu", "L'univers de Lovecraft", "Scénario d'initiation : les chiens dimensionnels", "Écran du MJ", "Bestiaire"]
    mj_acc = "<p>Wiki du <strong>Gardien</strong> (meneur de jeu). Il n'est visible que par le MJ.</p><ul>" + "".join(f"<li>{lien(MJ, 'JournalEntry', n, n)}</li>" for n in ordre_mj) + f"</ul><h2>Autres compendiums</h2><ul><li>« Scénarios » : le livre des scénarios (enquêtes émergentes guidées, campagne « Les Clefs Interdites », aides de jeu) et le scénario Sommilius.</li><li>« Bestiaire » : {len(bestiaire)} adversaires prêts à jouer (glisser sur la scène).</li><li>« Prétirés » : 7 Chats prêts à jouer.</li><li>« Tables » : cartes Folie, pouvoirs temporaires, événements, réactions.</li></ul><h2>Wiki des joueurs</h2><p>{lien(PJ, 'JournalEntry', 'Accueil du wiki des joueurs', 'Ouvrir le wiki des joueurs')}</p>"
    journal(MJ, "Accueil du wiki du Gardien", [("Accueil", mj_acc)], tri=0, ownership=NONE)
    for k, nom in enumerate(ordre_mj):
        journal(MJ, nom, mj[nom], tri=(k + 1) * 100000, ownership=NONE)
    print("wiki joueur :", len(ordre) + 1, "entrées ; wiki MJ :", len(ordre_mj) + 1, "entrées")

def construire_scenarios():
    S = charger("scenarios")
    plan = [("Enquête émergente guidée (EEG)", 6, 15), ("Les Profonds", 16, 25), ("Les peintures maudites", 26, 34), ("Étranges souvenirs", 35, 45),
            ("Les Clefs Interdites (campagne)", 46, 49), ("Le Sanctuaire aux Crabes (scénario 1)", 50, 57), ("À la recherche d'Ester (scénario 2)", 58, 63),
            ("La bibliothèque de Pnakotus (scénario 3)", 64, 73), ("L'Île aux Quatre Colonnes (scénario 4)", 74, 79), ("L'affrontement final (scénario 5)", 80, 88),
            ("Aides de jeu", 89, 103)]
    for k, (nom, a, b) in enumerate(plan):
        journal("scenarios", nom, page_chapitre(S, a, b, nom), tri=(k + 1) * 100000, ownership=NONE)
    som = charger("sommilius")
    journal("scenarios", "Sommilius (scénario)", page_chapitre(som, 1, 6, "Sommilius"), tri=(len(plan) + 1) * 100000, ownership=NONE)
    idx = "<p>Livre des scénarios des Miaulements d'Ulthar : cinq scénarios en « enquête émergente guidée », la campagne « Les Clefs Interdites » et les aides de jeu. Le texte est repris du PDF : les tableaux et encadrés en colonnes peuvent perdre un peu de leur mise en page.</p><ul>" + "".join(f"<li>{lien('scenarios', 'JournalEntry', n, n)}</li>" for n, _, _ in plan) + f"<li>{lien('scenarios', 'JournalEntry', 'Sommilius (scénario)', 'Sommilius (scénario)')}</li></ul>"
    journal("scenarios", "Index des scénarios", [("Index", idx)], tri=0, ownership=NONE)
    print("scénarios :", len(plan) + 2, "entrées")

def construire_macros():
    pack = "macros"
    macros = [
        ("Début d'aventure : pouvoirs temporaires", "icons/svg/water.svg",
         "game.miaulementsUlthar.debutAventure();", "Tire deux pouvoirs temporaires pour chaque Chat des joueurs (la fontaine enchantée)."),
        ("Fin de scénario : tous les Chats", "icons/svg/sleep.svg",
         "game.miaulementsUlthar.finDeScenarioGroupe();", "+2 XP, PV, PM et vies remis au maximum, −10 PF par carte Folie non jouée, pour chaque Chat des joueurs."),
        ("Jet de Folie du groupe", "icons/svg/terror.svg",
         "game.miaulementsUlthar.folieDuGroupe(\"Un événement troublant frappe le groupe\");", "Chaque Chat des joueurs fait un jet de Folie (peur, instinct de chasseur…)."),
        ("Suivi des Chats (ouvrir ou fermer)", "icons/svg/heal.svg",
         "game.miaulementsUlthar.suiviGroupe();", "Ouvre la fenêtre qui montre Santé, Magie, Folie et vies de tous les Chats."),
        ("Table : événement en ville", "icons/svg/city.svg",
         "game.packs.get('miaulements-ulthar.tables').getDocument(game.packs.get('miaulements-ulthar.tables').index.getName('Événements en ville')._id).then(t => t.draw());", "Tire un événement en ville (écran du MJ)."),
        ("Table : réaction humaine", "icons/svg/mystery-man.svg",
         "game.packs.get('miaulements-ulthar.tables').getDocument(game.packs.get('miaulements-ulthar.tables').index.getName('Réactions humaines')._id).then(t => t.draw());", "Tire la réaction d'un humain face à un Chat."),
    ]
    for k, (nom, img, cmd, desc) in enumerate(macros):
        mid = ident(pack, "Macro", nom)
        ecrire(pack, {"_id": mid, "name": nom, "type": "script", "author": None, "img": img, "scope": "global", "command": cmd, "folder": None, "sort": k * 100000,
                      "ownership": {"default": 0}, "flags": {}, "_stats": STATS, "_key": f"!macros!{mid}"})
    print("macros :", len(macros))

if __name__ == "__main__":
    if os.path.isdir(SORTIE): shutil.rmtree(SORTIE)
    construire_pouvoirs()
    construire_tables()
    best = construire_bestiaire()
    construire_pretires()
    construire_wikis(best)
    construire_scenarios()
    construire_macros()
