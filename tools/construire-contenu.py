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
STATS = {"createdTime": 1762100000000, "modifiedTime": 1762100000000, "systemId": SYS, "systemVersion": "0.18.0", "coreVersion": "14.368"}

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

def habiller(html_page):
    """Thème Journal d'Arkham : encadrés « Exemple » et badges des races."""
    # « Exemple » suivi de ses paragraphes jusqu'au prochain intertitre -> encadré
    def encadre(m):
        titre = re.sub(r"<[^>]+>", "", m.group(1)).strip()
        return f'<div class="mu-exemple"><div class="mu-exemple-titre">{titre}</div>{m.group(2)}</div>'
    html_page = re.sub(r"<h4>(Exemple[^<]*)</h4>\s*((?:<p>.*?</p>\s*|<ul>.*?</ul>\s*)+?)(?=<h[2-4]>|$)", encadre, html_page, flags=re.S)
    # « Attribut qualité : X Attribut défaut : Y » -> badges
    def badges(m):
        return f'<div class="mu-badges"><span class="mu-plus">Qualité : {m.group(1).strip()}</span><span class="mu-moins">Défaut : {m.group(2).strip()}</span></div>'
    html_page = re.sub(r"<p>Attribut qualité\s*:\s*(.+?)\s*Attribut défaut\s*:\s*(.+?)</p>", badges, html_page)
    html_page = re.sub(r"<p><strong>Attribut qualité\s*</strong>\s*:\s*(.+?)</p>\s*<p><strong>Attribut défaut\s*</strong>\s*:\s*(.+?)</p>", badges, html_page)
    return html_page

def une(sous_titre, gauche, droite):
    """Bandeau « une » de journal pour les pages d'accueil."""
    return (f'<div class="mu-une"><div class="mu-une-titre">Le Journal d\'Arkham</div><div>{esc(sous_titre)}</div>'
            f'<div class="mu-une-bandeau"><span>{esc(gauche)}</span><span>Les Miaulements d\'Ulthar</span><span>{esc(droite)}</span></div></div>')

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
        if isinstance(contenu, dict) and contenu.get("type") == "image":
            docs.append({"_id": pid, "name": titre, "type": "image", "title": {"show": True, "level": 1}, "image": {"caption": contenu.get("legende", "")}, "text": {"format": 1, "content": ""},
                         "video": {"controls": True, "volume": 0.5}, "src": contenu["src"], "system": {}, "sort": (k + 1) * 100000,
                         "ownership": {"default": -1}, "flags": {}, "_stats": STATS, "_key": f"!journal.pages!{eid}.{pid}"})
            continue
        docs.append({"_id": pid, "name": titre, "type": "text", "title": {"show": True, "level": 1}, "image": {}, "text": {"format": 1, "content": contenu},
                     "video": {"controls": True, "volume": 0.5}, "src": None, "system": {}, "sort": (k + 1) * 100000,
                     "ownership": {"default": -1}, "flags": {}, "_stats": STATS, "_key": f"!journal.pages!{eid}.{pid}"})
    doc = {"_id": eid, "name": nom, "pages": docs, "folder": dossier, "sort": tri, "ownership": ownership or {"default": 0}, "flags": {SYS: {"journal": True}}, "_stats": STATS, "_key": f"!journal!{eid}"}
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
def chemin_image(sous_dossier, nom, ext_candidates=("webp", "png")):
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
        for k in ("description", "extrait", "pouvoir", "capacite"): c[k] = nettoyer(c[k])
        c["description"] = c["description"][:1].upper() + c["description"][1:]
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
               "system": {"race": pr["race"], "description": pr["desc"], "handicap": "", "attributs": attrs,
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

GARDER_TIRET_APRES = {"là", "ci", "vous", "nous", "moi", "toi", "lui", "elle", "elles", "eux", "même", "mêmes", "il", "ils", "on", "t", "y", "en", "le", "la", "les"}
GARDER_TIRET_AVANT = {"semi", "demi", "mi", "anti", "sous", "arrière", "avant", "après", "contre", "non", "grand", "grande", "petit", "petite", "porte", "garde", "haut", "bas", "chef", "post", "pré", "ex", "vice", "néo", "auto", "extra", "ultra", "inter", "super", "sur", "outre", "quasi", "beaux", "belle", "Saint", "saint", "Sainte", "sainte", "rez", "c'est", "est", "peut", "faut", "dit", "vis"}

def nettoyer(t):
    """Retouches de typographie sur un texte extrait (HTML accepté)."""
    t = re.sub(r"\bÀ(?=[a-zé])", "À ", t)
    t = re.sub(r"\bYa-t-il\b", "Y a-t-il", t)
    t = re.sub(r",\s*,", ",", t)
    # mots coupés en fin de ligne : « s'ac- compagne » -> « s'accompagne », « nuit- là » -> « nuit-là »
    def tiret(m):
        avant, apres = m.group(1), m.group(2)
        mot_avant = re.split(r"[\s'’>(«\"]", avant)[-1]
        if mot_avant.startswith("#") or apres.lower() in GARDER_TIRET_APRES or mot_avant.lower() in GARDER_TIRET_AVANT or "-" in mot_avant:
            return f"{avant}-{apres}"
        return f"{avant}{apres}"
    t = re.sub(r"([#\w'’]*\w)- ([a-zà-ÿ]\w*)", tiret, t)
    t = re.sub(r"\s+,(?=\s)", ",", t)
    t = re.sub(r"^l est ", "Il est ", t)          # lettrine « I » imprimée en image
    return t

def charger_blocs(nom):
    return json.load(open(f"/tmp/ulthar-txt/{nom}-blocs.json"))

def recoller(blocs):
    """Une phrase coupée par une note de marge ou un encadré reprend en minuscule : on la recolle au paragraphe d'avant."""
    res = []
    for b in blocs:
        if re.search(r"ISBN|Dépôt légal|UNIQUEMENT POUR|upscal|polyrize|\bv20\d{6}\b", b["html"]):
            continue
        brut = html.unescape(re.sub(r"<[^>]+>", "", b["html"])).strip()
        if b["type"] == "p" and brut[:1].islower():
            for k in range(len(res) - 1, max(-1, len(res) - 5), -1):
                if res[k]["type"] in ("h2",): break
                if res[k]["type"] in ("p", "li", "exemple", "note"):
                    fin = html.unescape(re.sub(r"<[^>]+>", "", res[k]["html"])).strip()
                    if fin and not FIN.search(fin):
                        res[k] = dict(res[k], html=res[k]["html"].rstrip() + " " + b["html"].lstrip()); b = None
                        break
            if b is None: continue
        res.append(b)
    return res

def blocs_vers_html(blocs):
    """Blocs de mise en page (tools/extraire_blocs.py) -> HTML du wiki."""
    blocs = recoller([dict(b, html=nettoyer(b["html"])) for b in blocs])
    h, liste = [], []
    def fin_liste():
        if liste: h.append("<ul>" + "".join(f"<li>{x}</li>" for x in liste) + "</ul>"); liste.clear()
    for b in blocs:
        t, x = b["type"], b["html"]
        if t == "li": liste.append(x); continue
        fin_liste()
        if t == "h3": h.append(f"<h3>{x}</h3>")
        elif t == "h4": h.append(f"<h4>{x}</h4>")
        elif t == "p" and re.sub(r"<[^>]+>", "", x).strip() == "ou": h.append('<p class="mu-ou">— ou —</p>')
        elif t == "p": h.append(f"<p>{x}</p>")
        elif t == "tags": h.append(f'<p class="mu-tags"><strong>Tags :</strong> {x}</p>')
        elif t == "note": h.append(f'<div class="mu-note"><span class="mu-note-titre">Note</span> {x}</div>')
        elif t == "exemple": h.append(f'<div class="mu-exemple"><div class="mu-exemple-titre">{esc(b.get("titre", "Exemple"))}</div><p>{x}</p></div>')
        elif t == "journal": h.append(f'<blockquote class="mu-coupure"><p>{x}</p><p><em>Coupure de presse</em></p></blockquote>')
    fin_liste()
    # recolle les paragraphes coupés par un changement de page ou de colonne
    res = []
    for x in h:
        if res and x.startswith("<p>") and res[-1].startswith("<p>") and not res[-1].startswith('<p class'):
            fin = html.unescape(re.sub(r"<[^>]+>", "", res[-1])); deb = html.unescape(re.sub(r"<[^>]+>", "", x))
            if not FIN.search(fin) and deb[:1].islower():
                res[-1] = res[-1][:-4] + " " + x[3:]; continue
        res.append(x)
    # suite des tags : « <p>#xxx, …</p> » ou « <p><strong>#xxx.</strong> Description… » après une ligne Tags ou une ligne finie par une virgule
    res2 = []
    for x in res:
        prec = res2[-1] if res2 else ""
        suite = bool(prec.startswith("<p") and re.search(r"[,\-]\s*</p>$", prec))
        m = re.match(r"<p><strong>(#[^<]+)</strong>\s*(.*)</p>$", x, flags=re.S)
        if suite and m:
            res2[-1] = re.sub(r"\s*</p>$", " " + m.group(1).strip() + "</p>", prec)
            if m.group(2).strip(): res2.append("<p>" + m.group(2).strip() + "</p>")
            continue
        if suite and x.startswith("<p>#"):
            res2[-1] = re.sub(r"\s*</p>$", " " + x[3:], prec)
            continue
        res2.append(x)
    res = res2
    # une ligne de tags qui contient déjà la description : on coupe après la fin des tags
    res = [re.sub(r'^(<p class="mu-tags">.*?#[^<]*?\.)\s+(?!#)([^<]+)</p>$', r'\1</p>\n<p>\2</p>', x, flags=re.S) for x in res]
    # « … phrase. <strong>Étiquette : </strong>suite » : nouvelle ligne pour chaque étiquette en gras
    res = [re.sub(r'([.!?])\s+(<strong>[^<#]{2,40}:\s*</strong>)', r'\1</p>\n<p>\2', x) if x.startswith("<p>") else x for x in res]
    sortie = "\n".join(res)
    sortie = re.sub(r"#([\wÀ-ÿ'’]+)- +(?=[\wÀ-ÿ])", r"#\1-", sortie)       # tags coupés en fin de ligne
    sortie = re.sub(r"\s+([,.])(?=\s|<)", r"\1", sortie)                  # « mot , » -> « mot, »
    sortie = re.sub(r"(?<!\.)\.\.(?!\.)", ".", sortie)
    return sortie

def titre_propre(t):
    t = html.unescape(re.sub(r"<[^>]+>", "", t)).strip()
    if t.upper() in NOMS_RACES: return NOMS_RACES[t.upper()]
    return t[:1] + t[1:].lower() if t.isupper() else t

def page_blocs(nom_livre, p1, p2, titre_chap):
    """Pages p1..p2 d'un livre -> [(titre de page, html)], une page par intertitre de niveau 2 (sections courtes fusionnées)."""
    blocs = [b for p in charger_blocs(nom_livre) if p1 <= p["page"] <= p2 for b in p["blocs"]]
    secs, cour = [], {"titre": titre_chap, "blocs": []}
    prec_h2 = False
    for b in blocs:
        if b["type"] == "h2" and prec_h2 and not cour["blocs"] and re.search(r"\b(de|du|des|la|le|les|et|aux|à)$", cour["titre"]):
            cour["titre"] += " " + titre_propre(b["html"])        # titre de chapitre sur deux blocs (« Idées de » + « scénarios »)
            continue
        prec_h2 = b["type"] == "h2"
        if b["type"] == "h2":
            if cour["blocs"] or secs: secs.append(cour)
            cour = {"titre": titre_propre(b["html"]), "blocs": []}
        else:
            cour["blocs"].append(b)
    secs.append(cour)
    res = []
    for s in secs:
        longueur = sum(len(b["html"]) for b in s["blocs"])
        if res and longueur < 280:
            res[-1]["blocs"] += [{"type": "h3", "html": esc(s["titre"])}] + s["blocs"]
        else:
            res.append(s)
    if len(res) > 1 and sum(len(b["html"]) for b in res[0]["blocs"]) < 280:
        res[1]["blocs"] = [{"type": "h3", "html": esc(res[0]["titre"])}] + res[0]["blocs"] + res[1]["blocs"]; res = res[1:]
    return [(s["titre"], habiller(blocs_vers_html(s["blocs"]))) for s in res]

def page_chapitre(pages_json, p1, p2, titre_chap, coupures=()):
    return [(s["titre"], habiller(lignes_vers_html(s["lignes"]))) for s in sections(pages_json, p1, p2, titre_chap, coupures)]

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

def panneau(titre, contenu, large=False, note=""):
    return (f'<section class="mu-panneau{" mu-large" if large else ""}"><h4 class="mu-panneau-titre">{esc(titre)}</h4>'
            f'<div class="mu-panneau-corps">{contenu}</div>{f"<p class=mu-panneau-note>{note}</p>" if note else ""}</section>')

def lien_table(nom, texte="🎲 Ouvrir la table pour la lancer"):
    return f'<p class="mu-lancer">@UUID[Compendium.{SYS}.tables.RollTable.{ident("tables", "table", nom)}]{{{texte}}}</p>'

def mini_table(entetes, lignes, classe=""):
    h = f'<table class="mu-mini {classe}">' + ("<thead><tr>" + "".join(f"<th>{esc(e)}</th>" for e in entetes) + "</tr></thead>" if entetes else "") + "<tbody>"
    for l in lignes: h += "<tr>" + "".join(f"<td>{c}</td>" for c in l) + "</tr>"
    return h + "</tbody></table>"

def ecran_du_mj(bestiaire):
    """Écran du Maître de Jeu (écran papier v20250825) : trois pages de panneaux."""
    noms_best = {c["nom"].lower(): c["nom"] for c in bestiaire}
    def fiche(nom, alias=None):
        cle = (alias or nom).lower()
        if cle in noms_best:
            return f'@UUID[Compendium.{SYS}.bestiaire.Actor.{ident("bestiaire", "Actor", noms_best[cle])}]{{{esc(nom)}}}'
        return esc(nom)
    # ---- page 1 : jets et règles
    p1 = '<div class="mu-ecran">'
    p1 += panneau("Le jet", "<p><strong>D100 ≤ attribut</strong> : réussite. La difficulté s'ajoute au dé ; un pouvoir retire 20 au dé.</p>" +
                  mini_table(["Difficulté", "Au dé"], [["Très facile", "−40"], ["Facile", "−20"], ["Normal", "0"], ["Difficile", "+20"], ["Très difficile", "+40"]]))
    p1 += panneau("Critiques (jet brut)", mini_table(["Mode", "Réussite", "Échec"], [["Pulp", "01–09", "91–00"], ["Serious Cat", "01–05", "96–00"], ["Co-investigation", "01–05", "96–00"]]),
                  note="Pulp : un autre joueur peut rattraper un échec critique ; un échec simple peut être retenté (l'échec suivant est flagrant).")
    p1 += panneau("Pouvoirs", "<ul><li>+20 à l'attribut lié (−20 au dé).</li><li>Perte de PM = <strong>chiffre des unités</strong> du dé ; un 0 ne coûte rien.</li><li>À 0 PM : plus de pouvoir avant un sommeil de 20 h.</li><li>Plusieurs pouvoirs dans une action : un jet et une perte chacun.</li></ul>")
    p1 += panneau("Folie", "<ul><li>Jet de Folie : D100 ≤ PF.</li><li>Échec : une carte Folie, jouée tout de suite ou gardée.</li><li>Fin de scénario : −10 PF par carte non jouée.</li><li>Sous 20 PF : le Chat est injouable.</li></ul>")
    p1 += panneau("Dégâts", mini_table([], [["Coup de griffe", "1D4"], ["Chute", "1D4 par étage (max 6D4)"], ["Objet tranchant", "1D6"], ["Pistolet", "1D6+1"], ["Fusil", "2D6"], ["Explosion", "4D6"], ["Feu", "2D6 par tour"], ["Choc par véhicule", "1D6"]], "mu-deux-col"))
    p1 += panneau("Mort et vies de Chat", "<ul><li>À 0 PV : le Chat meurt, puis Bast le ressuscite à la fin du round.</li><li>Chaque résurrection coûte <strong>une vie de Chat</strong> (3 au départ, 9 avec « Neuf vies »).</li><li>Plus de vie : mort définitive.</li></ul>")
    p1 += panneau("Création d'un Chat", "<ol><li><strong>Surnom</strong></li><li><strong>Attributs</strong> : 50 % chacun ; ajustements +20, +10, +5, −5, −10, −20 (entre 30 et 70 %)</li><li><strong>Race</strong> : bonus et malus, un pouvoir de race</li><li><strong>Deux pouvoirs innés</strong> (+1 avec un handicap à −20 %)</li><li><strong>Calculs</strong> : Santé (tableau), Folie = (PER + CHA) / 2, Magie = INT</li><li><strong>Vies de Chat</strong> : 3</li></ol>")
    p1 += panneau("Points de Santé", mini_table(["PHY + AGI", "PV"], [["0–39", "1"], ["40–59", "2"], ["60–89", "3"], ["90–109", "4"], ["110–119", "5"], ["120–139", "6"], ["140+", "7"]], "mu-deux-col"))
    p1 += panneau("Progression et XP", "<ul><li>Chaque échec coche une case ; 6 cases cochées : +1D10 à l'attribut.</li><li>Fin de scénario : <strong>2 XP</strong>.</li><li>2 XP : +10 PM ou +1 Santé · 4 XP : pouvoir temporaire permanent ou +1 vie de Chat.</li><li>Santé, Magie et vies reviennent au maximum ; la Folie, non.</li></ul>", large=True)
    p1 += "</div>"
    # ---- page 2 : tables de l'écran
    villes = ["Circulation automobile dense", "Animaux errants agressifs", "Déchets dangereux", "Chasseurs de chats", "Pièges à rongeurs empoisonnés", "Bouche d'aération qui expulse de la vapeur", "Personnes hostiles", "Pollution sonore", "Fourrière", "Mauvaises conditions météorologiques"]
    humains = [("1–2", "Ignore le chat"), ("3", "Caresse le chat"), ("4", "Joue avec le chat"), ("5", "Alimente le chat"), ("6", "Prend le chat dans les bras"), ("7", "Tente de chasser le chat"), ("8", "Intimide le chat"), ("9", "Lance des objets au chat"), ("10", "Maltraite le chat")]
    animaux = [("Chat", "Chat", "Ignore"), ("Chat", "Chien", "Curieux"), ("Chien", "Rongeur", "Amitié"), ("Chien", "Oiseau", "Dominant"), ("Rongeur", "Loup / Renard", "Fuite"), ("Rongeur", "Chèvre / Mouton", "Hostile"), ("Oiseau", "Cochon", "Soumission"), ("Oiseau", "Vache / Cheval", "Jeu"), ("Insecte", "Insecte", "Se cache"), ("Insecte", "Sanglier", "Ignore")]
    surnoms = ["Bella", "Luna", "Oliver", "Charlie", "Max", "Rosie", "Cléo", "Milo", "Ruby", "Daisy", "Mimolette", "Simba", "Felix", "Misty", "Teddy", "Jasper", "Nala", "Whiskers", "Leo", "Olive", "Willow"]
    p2 = '<div class="mu-ecran">'
    p2 += panneau("Événements en ville (1D10)", mini_table(["D10", "Événement"], [[str(i + 1), esc(t)] for i, t in enumerate(villes)]) + lien_table("Événements en ville"))
    p2 += panneau("Réactions humaines (1D10)", mini_table(["D10", "Réaction"], [[d, esc(t)] for d, t in humains]) + lien_table("Réactions humaines"))
    p2 += panneau("Réactions des animaux (1D10)", mini_table(["D10", "En ville", "À la campagne", "Réaction"], [[str(i + 1), v, c, f"<em>{r}</em>"] for i, (v, c, r) in enumerate(animaux)]) + lien_table("Réactions des animaux"), large=True)
    p2 += panneau("Surnoms (1D21)", '<p class="mu-surnoms">' + " · ".join(esc(n) for n in surnoms) + "</p>" + lien_table("Surnoms"))
    p2 += panneau("Pouvoirs temporaires (1D100)", "<p>Deux tirages par Chat au début de l'aventure ; doublon : on relance. Macro du Gardien « Début d'aventure » pour tout le groupe.</p>" + lien_table("Pouvoirs temporaires"))
    p2 += panneau("Cartes Folie (1D20)", "<ol class='mu-folies'>" + "".join(f"<li>{esc(t)}</li>" for t in D["ACTIONS_FOLIE"]) + "</ol>" + lien_table("Cartes Folie"), large=True)
    p2 += "</div>"
    # ---- page 3 : adversaires et comportements
    adv = [("Chat", "50 %", "1d4", "5", None), ("Chien", "60 %", "1d6", "10", None), ("Oiseau", "40 %", "1d4", "4", "Corbeau"), ("Homme", "50 %", "1d6", "10", None),
           ("Mafieu", "60 %", "1d8", "12", None), ("Rat", "50 %", "1d4", "3", None), ("Serpent", "60 %", "1d6", "6", None), ("Abhoth", "60 %", "2d8", "60", None),
           ("Chat Saturne", "70 %", "1d6", "8", None), ("Goule", "65 %", "1d8", "13", None), ("Loup-garou", "75 %", "2d8+2", "35", "Loup-Garou"), ("Migo", "70 %", "1d6", "8", None),
           ("Profond", "70 %", "2d10", "35", None), ("Rhan-Tegoth", "80 %", "2d10", "70", None), ("Chien de Tindalos", "75 %", "2d6+3", "60", "Chien Dimensionnel"), ("Zoog", "30 %", "1d4", "5", None)]
    p3 = '<div class="mu-ecran">'
    p3 += panneau("Adversaires (écran)", mini_table(["Adversaire", "Attaque", "Dégâts", "PV"], [[fiche(n, a), at, dg, pv] for n, at, dg, pv, a in adv]), large=True,
                  note="Clic sur un nom : fiche de l'adversaire dans le bestiaire (à glisser sur la scène). Les valeurs de l'écran peuvent différer un peu du bestiaire.")
    p3 += panneau("Bulle onirique", "<ol><li><strong>Connexion mentale</strong> : jet de Charisme +20 ; seule étape qui coûte des PM.</li><li><strong>Objectif</strong> défini avec le Gardien.</li><li><strong>Scène initiale</strong> dans l'esprit de la cible.</li><li><strong>Altérations</strong> : deux réussites atteignent l'objectif ; deux échecs font éclater la bulle.</li><li><strong>État final</strong> ; sur un critique, la Contrée du Rêve change vraiment.</li></ol>")
    p3 += panneau("Comportements félins", "<ul><li><strong>Langage corporel</strong> : queue, oreilles, yeux, pattes.</li><li><strong>Vocalisations</strong> : miaulements, ronronnements, gémissements.</li><li><strong>Comportement</strong> : chasseur, joueur, territoire, indifférent, peur.</li><li><strong>Affection</strong> : frottements, câlins, ronronnements, clignements des yeux, offrandes, léchouilles.</li></ul>")
    p3 += panneau("Conseils de table", "<ul><li>Un joueur passif ? Décris ce qui attire son instinct et demande un jet de Folie.</li><li>L'horreur par petites touches : symboles, rats qui fuient, lumières qui vacillent.</li><li>Les Chats ne parlent pas aux humains sans pouvoir : ils observent, écoutent, lisent les pensées.</li></ul>", large=True)
    p3 += "</div>"
    return [("Jets et règles", p1), ("Tables de l'écran", p2), ("Adversaires et comportements", p3)]

def construire_wikis(bestiaire):
    R = charger("regles")
    # --- wiki joueur
    pj = {}
    pj["Bien débuter un jeu de rôle"] = page_blocs("regles", 8, 11, "Bien débuter un jeu de rôle")
    crea = page_blocs("regles", 12, 22, "Création des personnages")
    crea.append(("Les races en un coup d'œil", tableau_races()))
    pj["Création des personnages"] = crea
    pj["Races des Chats"] = page_blocs("regles", 23, 43, "Races des Chats")
    sysj = page_blocs("regles", 44, 66, "Système de jeu")
    sysj.append(("Les pouvoirs temporaires (table D100)", tableau_temporaires()))
    pj["Système de jeu"] = sysj
    pj["Les Chats d'Ulthar"] = page_blocs("regles", 93, 103, "Les Chats d'Ulthar")
    pj["Jouer un Chat"] = page_blocs("regles", 104, 113, "Jouer un Chat")
    nouv = charger("nouvelle")
    pj["Lecture : la nouvelle des Chats d'Ulthar"] = page_blocs("nouvelle", 1, 2, "Les Chats d'Ulthar")
    pj["Aide-mémoire du joueur"] = [("Aide-mémoire", aide_memoire_joueur())]
    # Retouches (v0.11.0) : chapitre Création remis en forme à la main, pages abîmées corrigées, listes et notes
    import importlib.util as _u
    _spec = _u.spec_from_file_location("wiki_joueur_retouches", os.path.join(os.path.dirname(os.path.abspath(__file__)), "wiki_joueur_retouches.py"))
    _r = _u.module_from_spec(_spec); _spec.loader.exec_module(_r)
    _innes = next((h for t, h in crea if t.startswith("Pouvoirs innés")), "")
    pj = _r.retoucher(pj, D, table_html, esc, tableau_races(), _innes)
    ordre = ["Bien débuter un jeu de rôle", "Création des personnages", "Races des Chats", "Système de jeu", "Les Chats d'Ulthar", "Jouer un Chat", "Lecture : la nouvelle des Chats d'Ulthar", "Aide-mémoire du joueur"]
    pj_acc = une("Édition spéciale pour les Chats d'Ulthar", "Wiki des joueurs", "Arkham, 1921") + "<p>Bienvenue dans <strong>Les Miaulements d'Ulthar</strong>, un jeu de rôle de Xaviiiier où vous incarnez des Chats d'Ulthar, dotés de pouvoirs mystiques par la déesse Bast, face à l'horreur lovecraftienne.</p><p>Ce wiki est celui des joueurs. Il suit le livre des règles ; le Gardien (meneur de jeu) a son propre wiki.</p><ul>" + "".join(f"<li>{lien(PJ, 'JournalEntry', n, n)}</li>" for n in ordre) + "</ul><h2>Sur la fiche de Chat</h2><ul><li>Bouton « Création du Chat » : l'assistant vous guide pas à pas.</li><li>Clic sur un attribut : jet (Maj = jet rapide). Clic sur une petite case : coche un échec.</li><li>Clic sur le nom d'un pouvoir : il est montré à la table.</li></ul>"
    journal(PJ, "Accueil du wiki des joueurs", [("Accueil", pj_acc)], tri=0, ownership=OBS)
    for k, nom in enumerate(ordre):
        journal(PJ, nom, pj[nom], tri=(k + 1) * 100000, ownership=OBS)

    # --- wiki MJ (Gardien)
    mj = {}
    mj["Guide du maître de jeu"] = page_blocs("regles", 114, 129, "Guide du maître de jeu")
    mj["L'univers de Lovecraft"] = page_blocs("regles", 67, 92, "L'univers de Lovecraft")
    mj["Scénario d'initiation : les chiens dimensionnels"] = page_blocs("regles", 131, 143, "Les chiens dimensionnels")
    ecran_pages = ecran_du_mj(bestiaire)
    mj["Écran du MJ"] = ecran_pages
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
    mj_acc = une("Édition réservée au Gardien", "Wiki du Gardien", "Arkham, 1921") + "<p>Wiki du <strong>Gardien</strong> (meneur de jeu). Il n'est visible que par le MJ.</p><ul>" + "".join(f"<li>{lien(MJ, 'JournalEntry', n, n)}</li>" for n in ordre_mj) + f"</ul><h2>Autres compendiums</h2><ul><li>« Scénarios » : le livre des scénarios (enquêtes émergentes guidées, campagne « Les Clefs Interdites », aides de jeu) et le scénario Sommilius.</li><li>« Bestiaire » : {len(bestiaire)} adversaires prêts à jouer (glisser sur la scène).</li><li>« Prétirés » : 7 Chats prêts à jouer.</li><li>« Tables » : cartes Folie, pouvoirs temporaires, événements, réactions.</li></ul><h2>Wiki des joueurs</h2><p>{lien(PJ, 'JournalEntry', 'Accueil du wiki des joueurs', 'Ouvrir le wiki des joueurs')}</p>"
    journal(MJ, "Accueil du wiki du Gardien", [("Accueil", mj_acc)], tri=0, ownership=NONE)
    for k, nom in enumerate(ordre_mj):
        journal(MJ, nom, mj[nom], tri=(k + 1) * 100000, ownership=NONE)
    print("wiki joueur :", len(ordre) + 1, "entrées ; wiki MJ :", len(ordre_mj) + 1, "entrées")

CARTES = [("Massachusetts", "massachusetts", "La côte du Massachusetts : Arkham, Innsmouth, Salem, Ipswich…"),
          ("Arkham", "arkham", "Plan d'Arkham : asile, musée, université, hôpital, docks, cimetière…"),
          ("Contrée du Rêve", "contree-du-reve", "La Contrée du Rêve : Ulthar, la mer de Cerenaria, l'Île aux Quatre Colonnes, la Ville aux Deux Ports…"),
          ("Ulthar", "ulthar", "Plan d'Ulthar : la librairie, l'auberge du Pain Blanc, le temple de Bast, la rivière Skai…")]


def aides_de_jeu():
    """Aides de jeu du livre des scénarios (v0.17.0) : présentation, fiches de suivi (fenêtre en jeu + versions à remplir), cartes, réseaux."""
    macro = lien("macros", "Macro", "Suivi de campagne (Gardien)", "Ouvrir le suivi de campagne")
    lignes_chats = "".join("<tr><td></td><td></td><td></td></tr>" for _ in range(6))
    lignes_ep = "".join(f"<tr><td>{i}</td><td></td><td></td></tr>" for i in range(1, 9))
    pages = [
        ("Aides de jeu", une("Pour le Gardien", "Aides de jeu", "Arkham, 1921")
         + "<p>Pour vous aider à vivre pleinement vos campagnes, plusieurs outils pratiques sont à votre disposition : une <strong>fiche de suivi de campagne</strong>, une <strong>fiche de suivi des personnages</strong> et les <strong>cartes des lieux</strong>.</p>"
         + "<p>Les aventures émergentes invitent le maître de jeu à garder en mémoire les choix, les conséquences et les événements marquants. Ces ressources sont conçues pour vous accompagner dans la gestion et la cohérence de votre histoire.</p>"
         + "<h3>Dans ce journal</h3><ul><li><strong>Fiches de suivi</strong> : à remplir en jeu dans la fenêtre « Suivi de campagne », ou dans les tableaux de ce journal.</li><li><strong>Cartes des lieux</strong> : Massachusetts, Arkham, Contrée du Rêve et Ulthar (aussi en scènes dans le compendium « Scènes »).</li><li><strong>Continuer l'aventure</strong> : où suivre les Miaulements d'Ulthar.</li></ul>"),
        ("Suivi de campagne en jeu", "<p>Les deux fiches de suivi du livre sont réunies dans une fenêtre réservée au Gardien. Tout ce que vous y écrivez est enregistré dans le monde, d'une partie à l'autre.</p>"
         + f'<p class="mu-a-retenir">{macro}</p>'
         + "<ul><li>Aussi depuis la barre d'outils de la scène : icône <strong>livre ouvert</strong> (Suivi de campagne).</li><li>Onglet <strong>Personnages</strong> : joueur, surnom du Chat et notes. Le bouton « Ajouter les Chats du monde » crée une ligne pour chaque Chat d'un joueur.</li><li>Onglet <strong>Épisodes</strong> : un bloc de notes par scénario joué.</li></ul>"
         + '<div class="mu-note"><span class="mu-note-titre">Préférez le papier ?</span> Importez ce journal dans votre monde : les deux pages suivantes sont des tableaux à remplir directement dans Foundry.</div>'),
        ("Fiche de suivi des personnages", "<p>Cette fiche de suivi, conçue pour les campagnes, vous permettra de consigner des éléments concernant chaque personnage. Elle sert à conserver toutes les informations susceptibles d'influencer la suite de l'aventure.</p>"
         + f'<table class="mu-fiche-suivi"><thead><tr><th style="width:22%">Joueur</th><th style="width:22%">Surnom</th><th>Notes</th></tr></thead><tbody>{lignes_chats}</tbody></table>'),
        ("Fiche de suivi de la campagne", "<p>Cette fiche de suivi de campagne, à l'usage du meneur de jeu, permet de consigner l'évolution de l'intrigue et les événements majeurs impactant l'ensemble du groupe ou la campagne.</p>"
         + f'<table class="mu-fiche-suivi"><thead><tr><th style="width:8%">N°</th><th style="width:30%">Épisode</th><th>Notes</th></tr></thead><tbody>{lignes_ep}</tbody></table>'),
    ]
    for titre, fichier, legende in CARTES:
        pages.append((f"Carte : {titre}", {"type": "image", "src": f"systems/{SYS}/assets/cartes/{fichier}.webp", "legende": legende}))
    pages.append(("Continuer l'aventure", "<p>Envie de poursuivre l'aventure des <strong>Miaulements d'Ulthar</strong> ? Suivez nos prochaines sorties sur les réseaux sociaux :</p>"
        + '<ul class="mu-definitions">'
        + '<li><strong>Site web</strong> : <a href="https://www.xaviiiier.com" target="_blank" rel="noopener">xaviiiier.com</a></li>'
        + '<li><strong>Facebook</strong> : <a href="https://www.facebook.com/xaviiiierjdr" target="_blank" rel="noopener">facebook.com/xaviiiierjdr</a></li>'
        + '<li><strong>Instagram</strong> : <a href="https://www.instagram.com/xaviiiierjdr" target="_blank" rel="noopener">instagram.com/xaviiiierjdr</a></li>'
        + '<li><strong>Twitter</strong> : <a href="https://twitter.com/xaviiiierjdr" target="_blank" rel="noopener">twitter.com/xaviiiierjdr</a></li></ul>'
        + '<p class="mu-a-retenir">Miaourci et à miaoutôt !</p><p style="text-align:center"><em>Xaviiiier</em></p>'))
    return pages


def construire_scenarios():
    # Retouches (v0.16.0) : fautes, ligatures, typographie, tags, listes, notes de marge
    import importlib.util as _u
    _spec = _u.spec_from_file_location("scenarios_retouches", os.path.join(os.path.dirname(os.path.abspath(__file__)), "scenarios_retouches.py"))
    _sr = _u.module_from_spec(_spec); _spec.loader.exec_module(_sr)
    S = charger("scenarios")
    plan = [("Enquête émergente guidée (EEG)", 6, 15), ("Les Profonds", 16, 25), ("Les peintures maudites", 26, 34), ("Étranges souvenirs", 35, 45),
            ("Les Clefs Interdites (campagne)", 46, 49), ("Le Sanctuaire aux Crabes (scénario 1)", 50, 57), ("À la recherche d'Ester (scénario 2)", 58, 63),
            ("La bibliothèque de Pnakotus (scénario 3)", 64, 73), ("L'Île aux Quatre Colonnes (scénario 4)", 74, 79), ("L'affrontement final (scénario 5)", 80, 88),
            ("Aides de jeu", 89, 103)]
    for k, (nom, a, b) in enumerate(plan):
        if nom == "Aides de jeu":
            journal("scenarios", nom, aides_de_jeu(), tri=(k + 1) * 100000, ownership=NONE)
            continue
        journal("scenarios", nom, _sr.retoucher(page_blocs("scenarios", a, b, nom), nom), tri=(k + 1) * 100000, ownership=NONE)
    som = charger("sommilius")
    journal("scenarios", "Sommilius (scénario)", _sr.retoucher(page_blocs("sommilius", 1, 6, "Sommilius")), tri=(len(plan) + 1) * 100000, ownership=NONE)
    idx = une("Les affaires en cours", "Scénarios", "Arkham, 1921") + "<p>Livre des scénarios des Miaulements d'Ulthar : cinq scénarios en « enquête émergente guidée », la campagne « Les Clefs Interdites » et les aides de jeu. Le texte est repris du PDF : les tableaux et encadrés en colonnes peuvent perdre un peu de leur mise en page.</p><ul>" + "".join(f"<li>{lien('scenarios', 'JournalEntry', n, n)}</li>" for n, _, _ in plan) + f"<li>{lien('scenarios', 'JournalEntry', 'Sommilius (scénario)', 'Sommilius (scénario)')}</li></ul>"
    journal("scenarios", "Index des scénarios", [("Index", idx)], tri=0, ownership=NONE)
    print("scénarios :", len(plan) + 2, "entrées")

def construire_macros():
    pack = "macros"
    macros = [
        ("Début d'aventure : pouvoirs temporaires", "icons/svg/waterfall.svg",
         "game.miaulementsUlthar.debutAventure();", "Tire deux pouvoirs temporaires pour chaque Chat des joueurs (la fontaine enchantée)."),
        ("Fin de scénario : tous les Chats", "icons/svg/sleep.svg",
         "game.miaulementsUlthar.finDeScenarioGroupe();", "+2 XP, PV, PM et vies remis au maximum, −10 PF par carte Folie non jouée, pour chaque Chat des joueurs."),
        ("Jet de Folie du groupe", "icons/svg/terror.svg",
         "game.miaulementsUlthar.folieDuGroupe(\"Un événement troublant frappe le groupe\");", "Chaque Chat des joueurs fait un jet de Folie (peur, instinct de chasseur…)."),
        ("Suivi des Chats (ouvrir ou fermer)", "icons/svg/heal.svg",
         "game.miaulementsUlthar.suiviGroupe();", "Ouvre la fenêtre qui montre Santé, Magie, Folie et vies de tous les Chats."),
        ("Suivi de campagne (Gardien)", f"systems/{SYS}/assets/icones/suivi-campagne.svg",
         "game.miaulementsUlthar.suiviCampagne();", "Ouvre les fiches de suivi des personnages et de la campagne (aides de jeu du livre des scénarios)."),
        ("Tableau du Gardien", f"systems/{SYS}/assets/icones/tableau-gardien.svg",
         "game.miaulementsUlthar.tableau();", "Ouvre ou ferme le tableau de bord du Gardien : Chats, adversaires de la scène, derniers jets et outils."),
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

def niveau_scene(pack, sid, nom, src, fit="fill"):
    """Foundry v14 : le fond d'une scène est porté par un niveau (Scene.levels), l'ancien champ background est ignoré."""
    lid = ident(pack, "Level", nom)
    return lid, [{"_id": lid, "name": "Fond", "background": {"src": src, "color": "#0b0a10", "tint": "#ffffff", "alphaThreshold": 0.75},
                  "elevation": {"bottom": 0, "top": None}, "foreground": {"src": None, "tint": "#ffffff", "alphaThreshold": 0.75}, "fog": {"src": None},
                  "textures": {"anchorX": 0.5, "anchorY": 0.5, "offsetX": 0, "offsetY": 0, "fit": fit, "scaleX": 1, "scaleY": 1, "rotation": 0},
                  "visibility": {"levels": []}, "sort": 0, "flags": {}, "_key": f"!scenes.levels!{sid}.{lid}"}]


def construire_scenes():
    pack = "scenes"
    sid = ident(pack, "Scene", "Accueil")
    img = f"systems/{SYS}/assets/images/accueil_foundry.webp"
    lid, niveaux = niveau_scene(pack, sid, "Accueil", img)
    ecrire(pack, {"_id": sid, "name": "Accueil — Les Miaulements d'Ulthar", "active": False, "navigation": True, "navOrder": 0, "navName": "Accueil",
        "background": {"src": img, "fit": "fill"}, "levels": niveaux, "initialLevel": lid, "width": 2335, "height": 851, "padding": 0, "backgroundColor": "#0b0a10",
        "grid": {"type": 0, "size": 100, "distance": 1, "units": "m"}, "tokenVision": False, "fog": {"exploration": False},
        "environment": {"globalLight": {"enabled": True}}, "initial": None, "thumb": img,
        "tokens": [], "lights": [], "notes": [], "sounds": [], "templates": [], "tiles": [], "walls": [], "drawings": [], "regions": [],
        "folder": None, "sort": 0, "ownership": {"default": 0}, "flags": {SYS: {"accueil": True}}, "_stats": STATS, "_key": f"!scenes!{sid}"})
    from PIL import Image as _Im
    for k, (titre, fichier, legende) in enumerate(CARTES):
        src = f"systems/{SYS}/assets/cartes/{fichier}.webp"
        w, h = _Im.open(os.path.join(RACINE, "assets", "cartes", f"{fichier}.webp")).size
        sid = ident(pack, "Scene", "Carte " + titre)
        lid, niveaux = niveau_scene(pack, sid, "Carte " + titre, src)
        ecrire(pack, {"_id": sid, "name": f"Carte — {titre}", "active": False, "navigation": False, "navOrder": k + 1, "navName": titre,
            "background": {"src": src, "fit": "fill"}, "levels": niveaux, "initialLevel": lid, "width": w, "height": h, "padding": 0.1, "backgroundColor": "#0b0a10",
            "grid": {"type": 0, "size": 100, "distance": 1, "units": "m"}, "tokenVision": False, "fog": {"exploration": False},
            "environment": {"globalLight": {"enabled": True}}, "initial": None, "thumb": src,
            "tokens": [], "lights": [], "notes": [], "sounds": [], "templates": [], "tiles": [], "walls": [], "drawings": [], "regions": [],
            "folder": None, "sort": (k + 1) * 100000, "ownership": {"default": 0}, "flags": {SYS: {"carte": fichier}}, "_stats": STATS, "_key": f"!scenes!{sid}"})
    print("scènes :", 1 + len(CARTES))

if __name__ == "__main__":
    if os.path.isdir(SORTIE): shutil.rmtree(SORTIE)
    construire_pouvoirs()
    construire_tables()
    best = construire_bestiaire()
    construire_pretires()
    construire_wikis(best)
    construire_scenarios()
    construire_macros()
    construire_scenes()
