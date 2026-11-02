"""Texte brut des PDF -> HTML lisible (paragraphes, listes, intertitres probables)."""
import re, html

FIN_PHRASE = re.compile(r"[.!?»…:;)\]]\s*$")
PUCE = re.compile(r"^\s*([-•∙▪*]|\d+[.)])\s+")

def blocs(texte):
    """Découpe en blocs séparés par des lignes vides ; garde le texte ligne à ligne."""
    out, cur = [], []
    for l in texte.split("\n"):
        if l.strip() == "":
            if cur: out.append(cur); cur = []
        else:
            cur.append(l.strip())
    if cur: out.append(cur)
    return out

def est_titre(b):
    if len(b) != 1: return False
    l = b[0]
    return 3 <= len(l) <= 58 and not FIN_PHRASE.search(l) and l[0].isupper() and not PUCE.match(l) and len(l.split()) <= 9

def paragraphe(lignes):
    """Joint les lignes d'un bloc : retour à la ligne = espace, sauf avant une puce."""
    items, cur = [], ""
    for l in lignes:
        if PUCE.match(l):
            if cur: items.append(cur)
            cur = PUCE.sub("", l)
            items.append(("li", None)) if False else None
        else:
            cur = (cur + " " + l).strip() if cur else l
    return cur

def vers_html(texte, titre_page=None):
    sortie = []
    for b in blocs(texte):
        if est_titre(b):
            sortie.append(("h", b[0]))
            continue
        if any(PUCE.match(l) for l in b):
            # liste : une puce = un élément (les lignes suivantes sans puce prolongent l'élément)
            avant, items = [], []
            for l in b:
                if PUCE.match(l): items.append(PUCE.sub("", l))
                elif items: items[-1] += " " + l
                else: avant.append(l)
            if avant: sortie.append(("p", " ".join(avant)))
            sortie.append(("ul", items))
        else:
            sortie.append(("p", " ".join(b)))
    h = []
    for t, v in sortie:
        if t == "h": h.append(f"<h3>{html.escape(v)}</h3>")
        elif t == "p": h.append(f"<p>{html.escape(v)}</p>")
        else: h.append("<ul>" + "".join(f"<li>{html.escape(i)}</li>" for i in v) + "</ul>")
    # recolle les paragraphes coupés par un saut de colonne (pas de ponctuation finale + minuscule ensuite)
    res = []
    for x in h:
        if res and x.startswith("<p>") and res[-1].startswith("<p>"):
            fin = res[-1][3:-4]
            deb = x[3:-4]
            if not FIN_PHRASE.search(html.unescape(fin)) and deb[:1].islower():
                res[-1] = "<p>" + fin + " " + deb + "</p>"
                continue
        res.append(x)
    return "\n".join(res)
