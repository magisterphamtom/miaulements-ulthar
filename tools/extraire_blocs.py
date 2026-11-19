#!/usr/bin/env python3
"""Extraction v2 des PDF par blocs de mise en page (pdfminer) : respecte les colonnes, isole les notes grises
des marges, reconnaît les intertitres (taille et police), le gras imprimé en double, les cases à cocher « □ »,
et retire les titres en biais (lettres éparses), filigranes et numéros de page.
Sortie : /tmp/ulthar-txt/<livre>-blocs.json = [{"page": n, "blocs": [{"type": "h2|h3|p|li|note|journal", "html": ...}]}]
Usage : python3 tools/extraire_blocs.py <dossier des PDF>"""
import sys, os, re, json, html, unicodedata
from pdfminer.high_level import extract_pages
from pdfminer.layout import LAParams, LTTextBoxHorizontal, LTChar, LTAnno

SRC = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = "/tmp/ulthar-txt"
os.makedirs(OUT, exist_ok=True)
PARAMS = LAParams(line_margin=0.55, char_margin=8.0, word_margin=0.15, boxes_flow=0.5)

def norm(t):
    t = unicodedata.normalize("NFKC", t).replace("‐", "-").replace("‑", "-")
    t = re.sub(r"\bÀ(?=[a-zé])", "À ", t)                # « Àl'intérieur » -> « À l'intérieur »
    t = re.sub(r"\bYa-t-il\b", "Y a-t-il", t)
    t = re.sub(r"#([\wÀ-ÿ'’]+)- +(?=[\wÀ-ÿ])", r"#\1-", t)   # « #vieux- pantalon » -> « #vieux-pantalon »
    t = re.sub(r"[ \t]+", " ", t)
    return t

def ligne(l):
    """Texte d'une ligne, gras imprimé en double retiré ; renvoie (html, taille, police, part de gras)."""
    morceaux, prec, gras_n, total, tailles, polices = [], None, 0, 0, [], set()
    chars = [c for c in l if isinstance(c, (LTChar, LTAnno))]
    i = 0
    sortie = []  # (caractère, gras)
    while i < len(chars):
        c = chars[i]
        if isinstance(c, LTAnno):
            sortie.append((c.get_text(), None)); i += 1; continue
        t = c.get_text()
        gras = False
        n = chars[i + 1] if i + 1 < len(chars) else None
        if isinstance(n, LTChar) and n.get_text() == t and abs(n.x0 - c.x0) < 1.2:
            gras = True; i += 1          # caractère doublé = gras
        sortie.append((t, gras)); tailles.append(c.size); polices.add(c.fontname.split("+")[-1].split("-")[0].split(",")[0])
        total += 1; gras_n += gras; i += 1
    # html avec <strong> sur les suites en gras
    h, en_gras = "", False
    for t, g in sortie:
        if g is True and not en_gras and t.strip(): h += "<strong>"; en_gras = True
        elif g is False and en_gras and t.strip(): h += "</strong>"; en_gras = False
        h += html.escape(t, quote=False)
    if en_gras: h += "</strong>"
    h = h.replace("</strong> <strong>", " ").replace("\n", "")
    return norm(h).strip(), (max(tailles) if tailles else 0), polices, (gras_n / total if total else 0)

def texte_brut(h):
    return html.unescape(re.sub(r"<[^>]+>", "", h))

def ordre_lecture(page):
    """Ordre de lecture : bandes séparées par les blocs pleine largeur ; dans chaque bande, colonne gauche puis droite."""
    W = page.width
    boites = [b for b in page if isinstance(b, LTTextBoxHorizontal)]
    pleines = sorted([b for b in boites if b.width > 0.58 * W or (b.x0 < W * 0.45 and b.x1 > W * 0.55 and b.width > 0.45 * W)], key=lambda b: -b.y1)
    autres = [b for b in boites if b not in pleines]
    res, haut = [], 10 ** 6
    for sep in pleines + [None]:
        bas = sep.y1 if sep is not None else -1
        bande = [b for b in autres if bas < (b.y0 + b.y1) / 2 <= haut]
        res += sorted(bande, key=lambda b: (0 if (b.x0 + b.x1) / 2 < W / 2 else 1, -b.y1))
        if sep is not None:
            res.append(sep); haut = sep.y0
    reste = [b for b in autres if b not in res]
    return res + sorted(reste, key=lambda b: -b.y1)

def blocs_page(page):
    blocs = []
    for b in ordre_lecture(page):
        if not isinstance(b, LTTextBoxHorizontal):
            continue
        lignes = [ligne(l) for l in b]
        lignes = [x for x in lignes if x[0]]
        brut = " ".join(texte_brut(x[0]) for x in lignes)
        if not brut.strip() or "orange.fr" in brut or re.fullmatch(r"\s*\d{1,3}\s*", brut):
            continue
        # titres en biais / lettres éparses (ex. « s l e n n o i s n e m i D »)
        mots = brut.split()
        if len(mots) >= 4 and sum(len(m) == 1 for m in mots) / len(mots) > 0.6:
            continue
        taille_box = max(x[1] for x in lignes)
        if re.match(r"^\s*Note\s*:", brut) and taille_box < 14:
            blocs.append({"type": "note", "html": re.sub(r"^\s*(<strong>)?\s*Note\s*(</strong>)?\s*:\s*", "", norm(" ".join(x[0] for x in lignes)))}); continue
        premiere = texte_brut(lignes[0][0]).strip()
        debut = 1
        if len(lignes) > 1 and re.match(r"^(Exemples?|Suite)\b", premiere) and re.search(r"\b(de|de la|la|du)$", premiere):
            suite = texte_brut(lignes[1][0]).strip()
            mot = suite.split(" ", 1)[0]
            premiere += " " + mot
            reste_l2 = lignes[1][0].split(mot, 1)[1].strip() if mot in lignes[1][0] else ""
            lignes = [lignes[0], (reste_l2,) + tuple(lignes[1][1:])] + lignes[2:] if reste_l2 else [lignes[0]] + lignes[2:]
            debut = 1
        if re.match(r"^(Exemples?\b.*|Suite de la\s+création.*)$", premiere) and len(premiere) <= 40 and len(lignes) > 1:
            titre_ex, _, reste_titre = premiere.partition(":")
            corps = norm(" ".join(([reste_titre.strip()] if reste_titre.strip() else []) + [x[0] for x in lignes[debut:]]))
            blocs.append({"type": "exemple", "titre": titre_ex.strip(), "html": corps}); continue
        if re.match(r"^\s*MORT MYST|^\s*LA VOIX D", brut):
            blocs.append({"type": "journal", "html": norm(" ".join(x[0] for x in lignes))}); continue
        para = []
        def vider():
            if para:
                t = norm(" ".join(para))
                if texte_brut(t).startswith("Tags"):
                    blocs.append({"type": "tags", "html": re.sub(r"^\s*Tags\s*:\s*", "", t)})
                else:
                    blocs.append({"type": "p", "html": t})
                para.clear()
        for h, taille, polices, part_gras in lignes:
            bt = texte_brut(h).strip()
            tags = "#" in bt or (para and texte_brut(para[-1]).lstrip().startswith("Tags") and not texte_brut(para[-1]).rstrip().endswith("."))
            titre = (not tags) and (taille >= 22) or (not tags) and (taille >= 15.8 and ("DejaVuSans" in polices or part_gras > 0.8) and len(bt) < 90 and not bt.startswith("□"))
            if titre and not re.match(r"^(Tags|Pieces|Pièces)\s*:", bt):
                vider()
                niv = "h2" if taille >= 22 else "h3"
                t = re.sub(r"</?strong>", "", h).strip().rstrip(" :")
                if blocs and blocs[-1]["type"] == niv and not blocs[-1].get("ferme"):
                    blocs[-1]["html"] += " " + t          # titre sur deux lignes
                else:
                    blocs.append({"type": niv, "html": t})
                continue
            if bt.startswith("□"):
                vider(); blocs.append({"type": "li", "html": re.sub(r"^\s*(<strong>)?\s*□\s*", r"\1", h)}); continue
            if bt.startswith("Tags") or (para and texte_brut(para[0]).startswith("Tags") and tags):
                if not (para and texte_brut(para[0]).startswith("Tags")): vider()
                para.append(re.sub(r"</?strong>", "", h)); continue
            if blocs and blocs[-1]["type"] == "li" and not para:
                blocs[-1]["html"] += " " + h; continue
            # une ligne « Étiquette : » en gras ouvre un nouveau paragraphe
            if para and re.match(r"^<strong>[^<]{2,60}</strong>\s*:", h):
                vider()
            para.append(h)
        vider()
        for x in blocs: x["ferme"] = True       # un titre ne se prolonge jamais dans le bloc suivant
    # marque la fin des titres (évite de coller deux titres de blocs différents)
    for x in blocs: x["ferme"] = True
    # suite d'une ligne « Tags » passée dans un autre bloc ; paragraphes faits seulement de chiffres (mini-fiches dessinées)
    res = []
    for x in blocs:
        bt = texte_brut(x["html"]).strip()
        if x["type"] == "p" and re.fullmatch(r"[\d\s%]+", bt):
            continue
        mots = bt.split()
        if x["type"] == "p" and len(mots) >= 6 and sum(len(m) <= 2 for m in mots) / len(mots) > 0.55:
            continue                      # mini-fiche dessinée (croix, chiffres, noms épars)
        if x["type"] == "p" and re.search(r"(\bx{1,2}\b\s*){4,}", bt):
            continue
        if x["type"] == "li" and "□" in x["html"]:
            for morceau in re.split(r"\s*□\s*", x["html"]):
                if morceau.strip(): res.append({"type": "li", "html": morceau.strip()})
            continue
        if x["type"] == "p" and res and res[-1]["type"] == "tags" and ("#" in bt) and len(bt) < 120:
            res[-1]["html"] = norm(res[-1]["html"].rstrip() + ("" if res[-1]["html"].rstrip().endswith("-") else " ") + re.sub(r"</?strong>", "", x["html"]).strip())
            continue
        res.append(x)
    return res

def extraire_livret(pdf, nom):
    """Nouvelle imprimée en livret A4 (deux pages par feuille) : remet les demi-pages dans l'ordre 1, 2, 3, 4."""
    demi = {}
    for p in extract_pages(os.path.join(SRC, pdf), laparams=PARAMS):
        W = p.width
        for cote in (0, 1):
            class Demi(list): pass
            d = Demi(b for b in p if isinstance(b, LTTextBoxHorizontal) and ((b.x0 + b.x1) / 2 < W / 2) == (cote == 0))
            d.width = W / 2
            demi[(p.pageid, cote)] = d
    ordre = [(1, 1), (2, 0), (2, 1), (1, 0)]
    pages = [{"page": i + 1, "blocs": blocs_page(demi[k])} for i, k in enumerate(ordre)]
    for p in pages:
        for b in p["blocs"]: b.pop("ferme", None)
    json.dump(pages, open(f"{OUT}/{nom}-blocs.json", "w"), ensure_ascii=False)
    print(nom, "(livret)", len(pages), "demi-pages")

def extraire(pdf, nom):
    pages = []
    for p in extract_pages(os.path.join(SRC, pdf), laparams=PARAMS):
        pages.append({"page": p.pageid, "blocs": blocs_page(p)})
    for p in pages:
        for b in p["blocs"]: b.pop("ferme", None)
    json.dump(pages, open(f"{OUT}/{nom}-blocs.json", "w"), ensure_ascii=False)
    print(nom, len(pages), "pages,", sum(len(p["blocs"]) for p in pages), "blocs")

if __name__ == "__main__":
    extraire("ulthar__livre_des_regles__a4__v2025100296dpi.pdf", "regles")
    extraire("ulthar__livre_des_scenarios__a4__v20251002a.pdf", "scenarios")
    extraire("ulthar-scenario-sommilius.pdf", "sommilius")
    extraire_livret("ulthar__nouvelle_les_chats_dulthar_a4__v20250825.pdf", "nouvelle")
