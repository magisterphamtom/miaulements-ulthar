#!/usr/bin/env python3
"""Extraction des PDF du jeu (hors dépôt) vers /tmp/ulthar-txt/<livre>.json.
Chaque page = lignes de texte (ordre de lecture de pdftotext, colonnes respectées) avec un niveau
d'intertitre (0 = texte courant) repéré par la police (autre que la police du texte, taille >= 14).
Usage : python3 tools/extraire.py <dossier des PDF>"""
import subprocess, sys, re, unicodedata, os, json, collections
import pdfplumber

SRC = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = "/tmp/ulthar-txt"
os.makedirs(OUT, exist_ok=True)

def nettoyer_ligne(l):
    l = unicodedata.normalize("NFKC", l)  # ligatures ﬁ ﬀ ﬂ …
    return l.replace("‐", "-").replace("‑", "-").rstrip()

def degeminer(s):
    """Texte « gras » imprimé en double (AAddaapp…) -> simple."""
    return s[0::2] if len(s) % 2 == 0 and s[0::2] == s[1::2] else s

def norm(s):
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD", degeminer(s).lower()))

def titres_page(page, famille_corps):
    """Lignes de titre de la page : [(texte normalisé, niveau)]."""
    mots = page.extract_words(extra_attrs=["size", "fontname"], keep_blank_chars=False)
    lignes = collections.defaultdict(list)
    for w in mots:
        fam = w["fontname"].split("+")[-1].split("-")[0].split(",")[0]
        if fam != famille_corps and w["size"] >= 14 and "Helvetica" not in fam:
            lignes[(round(w["top"] / 4), round(w["size"]))].append(w)
    res = []
    for (_, taille), ws in lignes.items():
        ws.sort(key=lambda w: w["x0"])
        t = " ".join(degeminer(w["text"]) for w in ws)
        res.append((norm(t), 2 if taille >= 24 else 3, t))
    return res

def extraire_livre(nom_pdf, sortie, pages=None):
    chemin = os.path.join(SRC, nom_pdf)
    with pdfplumber.open(chemin) as pdf:
        n = len(pdf.pages)
        # police du texte courant = la plus fréquente
        freq = collections.Counter()
        for pg in pdf.pages[min(8, n - 1):min(20, n)]:
            for w in pg.extract_words(extra_attrs=["fontname"]):
                freq[w["fontname"].split("+")[-1].split("-")[0].split(",")[0]] += len(w["text"])
        corps = freq.most_common(1)[0][0]
        livre = []
        for i in range(1, n + 1):
            if pages and i not in pages:
                continue
            brut = subprocess.run(["pdftotext", "-f", str(i), "-l", str(i), chemin, "-"], capture_output=True, text=True).stdout
            lignes = [nettoyer_ligne(l) for l in brut.split("\n")]
            lignes = [l for l in lignes if "orange.fr" not in l and not re.fullmatch(r"\s*\d{1,3}\s*", l)]
            tt = titres_page(pdf.pages[i - 1], corps)
            tset = {t[0]: t for t in tt}
            sortie_l, j = [], 0
            while j < len(lignes):
                l = lignes[j]
                niveau = 0
                # un titre peut tenir sur 1 à 3 lignes
                for k in (1, 2, 3):
                    cand = norm(" ".join(x for x in lignes[j:j + k] if x.strip()))
                    if cand and cand in tset and all(x.strip() for x in lignes[j:j + k]):
                        niveau = tset[cand][1]
                        l = " ".join(lignes[j:j + k]); j += k - 1
                        break
                sortie_l.append({"t": l, "h": niveau})
                j += 1
            livre.append({"page": i, "lignes": sortie_l})
    json.dump({"corps": corps, "pages": livre}, open(f"{OUT}/{sortie}.json", "w"), ensure_ascii=False)
    print(sortie, "pages:", len(livre), "police du texte:", corps, "titres:", sum(1 for p in livre for l in p["lignes"] if l["h"]))

if __name__ == "__main__":
    extraire_livre("ulthar__livre_des_regles__a4__v2025100296dpi.pdf", "regles")
    extraire_livre("ulthar__livre_des_scenarios__a4__v20251002a.pdf", "scenarios")
    extraire_livre("ulthar__bestiaire_a5__v20250914a.pdf", "bestiaire")
    extraire_livre("ulthar-scenario-sommilius.pdf", "sommilius")
    extraire_livre("ulthar__nouvelle_les_chats_dulthar_a4__v20250825.pdf", "nouvelle")
