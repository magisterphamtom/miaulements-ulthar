"""Retouches des scénarios (v0.16.0) — appliquées aux pages du compendium « Scénarios ».

1. Caractères mal décodés du PDF : (cid:46) = « ti », (cid:47) = « tt ».
2. Fautes de frappe et d'orthographe (souvent présentes dans le livre lui-même), mots perdus à l'extraction.
3. Typographie française : pas d'espace avant le point ou la virgule, espace avant « : ; ! ? », guillemets « ».
4. Mise en forme : « Tags : … » séparés du texte qui suit, listes écrites en ligne (« - a - b ») en vraies listes,
   notes de marge du livre (encadrés) déplacées en fin de rubrique au lieu de couper les listes,
   guillemet ouvrant ajouté aux « Textes à lire ».
"""
import re

LIGATURES = {"(cid:46)": "ti", "(cid:47)": "tt"}

# Corrections mot à mot (limites de mot), du livre ou de l'extraction.
MOTS = {
    "llvre": "livre", "shéma": "schéma", "réccurent": "récurrent", "inquiètude": "inquiétude", "pièçe": "pièce",
    "envouté": "envoûté", "envoutée": "envoûtée", "envoutés": "envoûtés", "envoutant": "envoûtant",
    "désagreable": "désagréable", "brullées": "brûlées", "brulées": "brûlées", "narrrative": "narrative",
    "appeuré": "apeuré", "provennant": "provenant", "herrissent": "hérissent", "affuteur": "affûteur",
    "apercoivent": "aperçoivent", "archaîques": "archaïques", "artéfact": "artefact", "cariole": "carriole",
    "decrivez": "décrivez", "degats": "dégâts", "delient": "délient", "dernierement": "dernièrement",
    "devoués": "dévoués", "dispaition": "disparition", "enigmes": "énigmes", "kidnaper": "kidnapper",
    "medecin": "médecin", "menerez": "mènerez", "plaçé": "placé", "remouleur": "rémouleur", "role": "rôle",
    "révèlera": "révélera", "scéne": "scène", "suggèrant": "suggérant", "trés": "très", "âbime": "abîme",
    "choppes": "chopes", "eaustagnante": "eau stagnante", "luimême": "lui-même", "Demon": "Démon",
    "Epée": "Épée", "Egarant": "Égarant", "Electrique": "Électrique", "ArkhamI": "Arkham", "Scoty": "Scotty",
    "Ile": "Île", "ile": "île", "iles": "îles", "puit": "puits"
}

# Corrections de passages (texte exact).
PASSAGES = {
    "Sanctuaire au Crabes": "Sanctuaire aux Crabes",
    "un île": "une île",
    "Des nombreux bateaux sont en réparations dus aux attaques des crabes en mer": "De nombreux bateaux sont en réparation à cause des attaques des crabes en mer",
    "éclairée de qui vacillent": "éclairée de lumières qui vacillent",
    "est tapi sous un fauteuil,": "est tapi sous un fauteuil.",
    "Ainsi,Les Chats": "Ainsi, les Chats",
    "es tout aussi valable": "est tout aussi valable",
    "en déduiront peut être": "en déduiront peut-être",
    "fraîchement déplacées": "fraîchement déplacée",
    "la vérité.,": "la vérité,",
    "#moustaches-- brûlées": "#moustaches-brûlées",
    "#moustaches-- brulées": "#moustaches-brûlées",
    "Le deuxième partie": "La deuxième partie",
    "un teinte": "une teinte",
    "liberté d'improvisations": "liberté d'improvisation",
    "il murmure : Nous": "il murmure : « Nous",
    "( ex: ": "(ex. : ",
    "etc...°": "etc.)",
    "[ Jet intelligence ]": "[Jet d'Intelligence]",
}


def texte(t):
    """Corrections sur du texte (hors balises)."""
    for a, b in LIGATURES.items():
        t = t.replace(a, b)
    for a, b in PASSAGES.items():
        t = t.replace(a, b)
    for a, b in MOTS.items():
        t = re.sub(rf"(?<![\w#-]){re.escape(a)}(?![\w-])", b, t)
    # « A » en début de phrase devant un mot : « À »
    t = re.sub(r"(^|[.!?»:]\s+|>\s*)A (?=[a-zà-ÿl])", r"\1À ", t)
    # typographie
    t = re.sub(r"\s+([.,)])(?!\.)", r"\1", t)                         # pas d'espace avant . , )
    t = re.sub(r"(?<=[\wÀ-ÿ%»)\]])(:|;|!|\?)(?!//)", r" \1", t)          # espace avant : ; ! ?
    t = re.sub(r"(?<=[:;])(?=[A-Za-zÀ-ÿ«\"])", " ", t)                   # espace après : ;
    t = re.sub(r"\(\s+", "(", t)
    t = re.sub(r"([a-zà-ÿ])\.([A-ZÀ-Ý][a-zà-ÿ])", r"\1. \2", t)          # « effroi.Parution » -> « effroi. Parution »
    t = re.sub(r"\[\s+", "[", t)
    t = re.sub(r"\s+\]", "]", t)
    t = re.sub(r"\s{2,}", " ", t)
    return t


def guillemets(html):
    """Guillemets droits appariés dans l'ordre, paragraphe par paragraphe : "…" -> « … »."""
    def para(m):
        ouvert = [False]
        brut = re.sub(r"<[^>]+>", "", m.group(2))
        n = brut.count('"')
        if n % 2 == 1:  # guillemet orphelin : le livre n'a que le fermant (ou que l'ouvrant)
            pos = brut.rfind('"')
            if pos >= len(brut.rstrip()) - 6:
                m = type("M", (), {"group": (lambda g: (lambda self, i: ('"' + g(2)) if i == 2 else g(i)))(m.group)})()
            else:
                m = type("M", (), {"group": (lambda g: (lambda self, i: (g(2) + '"') if i == 2 else g(i)))(m.group)})()
        def seg(t):
            res = []
            for ch in t:
                if ch == '"':
                    res.append("« " if not ouvert[0] else " »")
                    ouvert[0] = not ouvert[0]
                else:
                    res.append(ch)
            return "".join(res)
        inner = sur_texte(m.group(2), seg)
        inner = re.sub(r"«\s+", "« ", inner)
        inner = re.sub(r"\s+»", " »", inner)
        return f"<{m.group(1)}{m.group(3)}>{inner}</{m.group(1)}>"
    return re.sub(r"<(p|li|blockquote)((?:\s[^>]*)?)>(.*?)</\1>", lambda m: para(type("M", (), {"group": lambda self, i: {1: m.group(1), 2: m.group(3), 3: m.group(2)}[i]})()), html, flags=re.S)


def ponctuation_balises(html):
    """Défauts qui chevauchent une balise de mise en forme."""
    html = re.sub(r"\s+((?:</(?:em|strong|a|span|b|i)>)*)\s*([.,)])(?!\.)", r"\1\2", html)   # « sacrée</em> , » -> « sacrée</em>, »
    html = re.sub(r"(</(?:strong|em|b|i)>)\s*([:;!?])", r"\1 \2", html)                      # « apeuré</strong>: » -> « apeuré</strong> : »
    html = re.sub(r"([.!?])((?:</(?:strong|em)>)?)(?=<strong>|[A-ZÀ-Ý][a-zà-ÿ])", r"\1\2 ", html)
    return html


def sur_texte(html, fn):
    """Applique fn au texte seulement (pas aux balises ni aux liens @UUID)."""
    morceaux = re.split(r"(<[^>]+>|@UUID\[[^\]]+\]\{[^}]*\})", html)
    return "".join(m if (m.startswith("<") or m.startswith("@UUID")) else fn(m) for m in morceaux)


def tags(html):
    """« Tags : #a, #b Phrase… » -> une ligne de tags, puis le texte dans son propre paragraphe."""
    def coupe(m):
        brut = re.sub(r"#(?=[^\s,#<]*#)", "#", m.group(1))
        brut = re.sub(r"(#[^\s,#<]+?)(?=#)", r"\1, ", brut)                        # « #a#b » -> « #a, #b »
        brut = re.sub(r"(#[^\s,#<]*?[a-zà-ÿ])([A-ZÀ-Ý][a-zà-ÿ])", r"\1 \2", brut)   # « #silenceLe » -> « #silence Le »
        m = type("M", (), {"group": lambda self, i, b=brut: b})()
        contenu = re.sub(r"^\s*(?:<strong>)?\s*Tags\s*:?\s*(?:</strong>)?\s*:?\s*", "", m.group(1))
        mt = re.match(r"((?:#[^\s,#<]+\s*,\s*)*#[^\s,#<]+)[\s,.]*(.*)$", contenu, flags=re.S)
        if not mt:
            return m.group(0)
        liste = ", ".join(re.findall(r"#[^\s,#<]+", mt.group(1)))
        reste = mt.group(2).strip()
        res = f'<p class="mu-tags"><strong>Tags :</strong> {liste}</p>'
        return res + (f"<p>{reste}</p>" if reste else "")
    html = re.sub(r"#\s*(?:<strong>)?Tags(?:</strong>)?\s*:", "Tags :", html)
    return re.sub(r'<p(?: class="mu-tags")?>(\s*(?:<strong>)?\s*Tags\s*:.*?)</p>', coupe, html, flags=re.S)


def listes_en_ligne(html):
    def conv(m):
        items = [i.strip() for i in re.split(r"\s+-\s+", " " + m.group(1)) if i.strip()]
        return "<ul>" + "".join(f"<li>{i}</li>" for i in items) + "</ul>" if len(items) > 1 else m.group(0)
    return re.sub(r"<p>\s*-\s+((?:(?!</p>).)+?\s-\s(?:(?!</p>).)+)</p>", conv, html)


ENCADRE = r'<div class="mu-(?:note|exemple)">(?:(?!<div class="mu-).)*?</div>(?:</div>)?'


def notes_en_fin(html):
    """Les encadrés (notes de marge) qui coupent une liste ou une rubrique vont à la fin de la rubrique."""
    parties = re.split(r"(?=<h3>)", html)
    sortie = []
    for p in parties:
        notes = re.findall(ENCADRE, p, flags=re.S)
        if not notes:
            sortie.append(p)
            continue
        corps = re.sub(ENCADRE, "", p, flags=re.S)
        corps = re.sub(r"</ul>\s*<ul>", "", corps)  # listes recollées
        sortie.append(corps + "".join(notes))
    return "".join(sortie)


def texte_a_lire(html):
    """Guillemet ouvrant manquant dans les « Textes à lire »."""
    def ajoute(m):
        p = m.group(2)
        if "«" not in p and ("»" in p or p.rstrip().endswith('"')):
            p = re.sub(r"^(<p>)\s*", r"\1« ", p)
            p = re.sub(r'\s*"\s*</p>$', " »</p>", p)
        return m.group(1) + p
    return re.sub(r"(<h3>Texte à lire</h3>\s*)(<p>.*?</p>)", ajoute, html, flags=re.S)


def guillemets_restants(html):
    return sur_texte(html, lambda t: re.sub(r'"([^"]{1,200})"', r"« \1 »", t))


def retoucher_page(html):
    html = sur_texte(html, texte)
    html = ponctuation_balises(html)
    html = guillemets(html)
    html = tags(html)
    html = listes_en_ligne(html)
    html = notes_en_fin(html)
    html = texte_a_lire(html)
    html = guillemets_restants(html)
    return html


def specifiques(nom, pages):
    """Corrections propres à un scénario (structure abîmée à l'extraction)."""
    if nom.startswith("L'Île aux Quatre Colonnes"):
        idx = [i for i, (t, h) in enumerate(pages) if t.startswith("Personnages de l'aventure")]
        if len(idx) == 2:
            a, b = idx
            # 1re page : la fin de liste fusionnée (Gardes + caractéristiques) remise en ordre
            h = pages[a][1]
            h = re.sub(r"<ul><li><strong>Gardes Profonds\s*</strong>.*?</li>(<li><strong>Gouverneur)", r"""<ul><li><strong>Gardes Profonds</strong></li></ul>
<p class="mu-tags"><strong>Tags :</strong> #imposants, #yeux-globuleux, #puissants</p><p>Obéissants et d'une force extraordinaire, ils sont dévoués à leur commandant quelle que soit sa requête.</p>
<ul>\1""", h, flags=re.S)
            h += """<h3>Caractéristiques de combat</h3><ul>
<li><strong>Chef des Profonds</strong> : enfin victorieux contre les humains, il veut garder l'île pour les Profonds ! Vie : 70 PV · Att [60%] / griffe 1D6, dégâts +1 à chaque tour (max +5).</li>
<li><strong>Gardes Profonds</strong> : ils sont à l'affût des intrus, suivent les ordres et aiment bousculer les prisonniers. Vie : 30 PV · Att [60%] / griffe 1D6 · Perception [60%].</li></ul>"""
            pages[a] = (pages[a][0], h)
            # 2e page : doublon des PNJ ; on garde la rubrique « Sur l'Île aux Quatre Colonnes » dans les indices
            suite = pages[b][1]
            k = suite.find("<h3>Sur l")
            reste = suite[k:] if k >= 0 else ""
            ind = next((i for i, (t, h) in enumerate(pages) if t.startswith("Indices")), None)
            if ind is not None and reste:
                pages[ind] = (pages[ind][0], pages[ind][1] + reste)
            del pages[b]
    return pages


def retoucher(pages, nom=""):
    """[(titre, html)] -> [(titre, html)]"""
    pages = specifiques(nom, list(pages))
    return [(sur_texte(t, texte) if "<" not in t else t, retoucher_page(h)) for t, h in pages]
