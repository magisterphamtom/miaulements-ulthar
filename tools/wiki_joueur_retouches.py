"""Retouches du wiki des joueurs (v0.11.0).

L'extraction automatique du livre mélangeait par endroits les encadrés de la colonne de droite au texte.
Ce module :
  1. remplace le chapitre « Création des personnages » par sa version remise en forme à la main (tools/wiki-joueur/creation.html) ;
  2. corrige page par page les défauts repérés dans « Système de jeu », « Jouer un Chat » et « Bien débuter » ;
  3. applique à toutes les pages des retouches de lisibilité : listes à puces, notes encadrées, définitions en liste,
     suppression des débris (annotations de la fiche imprimée).
"""
import os
import re

ICI = os.path.dirname(os.path.abspath(__file__))


def pages_html(fichier, remplacements):
    """Fichier HTML découpé par « <!-- page: Titre --> » -> [(titre, html)]."""
    brut = open(os.path.join(ICI, "wiki-joueur", fichier), encoding="utf-8").read()
    for cle, val in remplacements.items():
        brut = brut.replace("{{" + cle + "}}", val)
    morceaux = re.split(r"<!-- page: (.+?) -->", brut)
    return [(morceaux[i].strip(), morceaux[i + 1].strip()) for i in range(1, len(morceaux), 2)]


# ---------------------------------------------------------------- retouches générales

def puces(html):
    """« • a • b • c » dans un paragraphe -> liste à puces ; suites de paragraphes « - … » -> liste."""
    def p_puces(m):
        contenu = m.group(1)
        if contenu.count("•") < 2:
            return m.group(0)
        avant, *items = [x.strip() for x in contenu.split("•")]
        res = f"<p>{avant}</p>" if avant else ""
        return res + "<ul>" + "".join(f"<li>{i}</li>" for i in items if i) + "</ul>"
    html = re.sub(r"<p>((?:(?!</p>).)*•(?:(?!</p>).)*)</p>", p_puces, html)

    def suite_tirets(m):
        items = re.findall(r"<p>\s*[-–]\s*((?:(?!</p>).)+?)</p>", m.group(0))
        return "<ul>" + "".join(f"<li>{i.strip()}</li>" for i in items) + "</ul>"
    html = re.sub(r"(?:<p>\s*[-–]\s+(?:(?!</p>).)+?</p>\s*){2,}", suite_tirets, html)
    return html


def notes(html):
    """Intertitre « Note » suivi d'un paragraphe -> note encadrée."""
    return re.sub(r"<h3>\s*Note\s*</h3>\s*<p>(.*?)</p>", r'<div class="mu-note"><span class="mu-note-titre">Note</span> \1</div>', html, flags=re.S)


def definitions(html):
    """Au moins deux paragraphes de suite « <strong>Libellé</strong> : … » -> liste de définitions (mieux espacée)."""
    motif = r"<p><strong>[^<]{1,60}?(?:\s*:\s*</strong>|</strong>\s*:)(?:(?!</p>).)*</p>"
    def liste(m):
        items = re.findall(r"<p>(.*?)</p>", m.group(0), flags=re.S)
        items = [re.sub(r"<strong>\s*[-–]?\s*([^<]*?)\s*:?\s*</strong>\s*:?", r"<strong>\1</strong> : ", i, count=1).replace(" :  ", " : ") for i in items]
        return '<ul class="mu-definitions">' + "".join(f"<li>{i}</li>" for i in items) + "</ul>"
    return re.sub(rf"(?:{motif}\s*){{2,}}", liste, html, flags=re.S)


DEBRIS = [r"<p>\s*[-–]?\s*</p>", r"<p>\s*Mimolette\s*</p>", r"<p>\s*Persan[ x<>/strong]*</p>", r"<p>\s*\d+ fois \]\s*</p>"]


def nettoyer(html):
    for motif in DEBRIS:
        html = re.sub(motif, "", html)
    html = re.sub(r"<strong>([^<]*?)\s+</strong>\s*<strong>", r"<strong>\1 ", html)   # gras coupé en deux
    html = re.sub(r"\s+</strong>", "</strong> ", html)
    html = re.sub(r"<h3>[^<]*</h3>\s*$", "", html)                                     # intertitre orphelin en fin de page
    return html.strip()


def generales(html):
    return nettoyer(definitions(notes(puces(html))))


# ---------------------------------------------------------------- corrections page par page

def _page(pages, debut):
    for i, (t, h) in enumerate(pages):
        if t.startswith(debut):
            return i
    return None


def _blocs(html):
    """Découpe grossière en blocs de premier niveau (p, h3, div exemple/note, ul, table)."""
    return re.findall(r"<(?:p|h3|ul|ol|table)\b.*?</(?:p|h3|ul|ol|table)>|<div class=\"mu-(?:exemple|note)\">.*?</div>(?:</div>)?", html, flags=re.S)


EX = r'<div class="mu-exemple"><div class="mu-exemple-titre">.*?</div>.*?</div>'


def systeme(pages, D, table_html, esc):
    # « Test de compétence » et « Bonus et malus » : réécrits à la main (exemples mal placés, pages en double)
    faites = dict(pages_html("systeme-pages.html", {}))
    idx = [k for k, (t, h) in enumerate(pages) if t.startswith("Bonus et malus aux actions")]
    for k in reversed(idx[1:]):
        del pages[k]
    for k, (t, h) in enumerate(pages):
        for titre, html in faites.items():
            if t.startswith(titre):
                pages[k] = (titre, html)
    # « Les dés » : le titre du chapitre traîne en tête
    i = _page(pages, "Les dés")
    if i is not None:
        t, h = pages[i]
        pages[i] = (t, re.sub(r"^<h3>Système de jeu</h3>", "", h))

    # « Gestion de la folie » : un exemple de création égaré ; fusion avec « Folie et comportement du chat »
    a, b = _page(pages, "Gestion de la folie"), _page(pages, "Folie et comportement du chat")
    if a is not None:
        h = re.sub(EX, "", pages[a][1], flags=re.S)
        if b is not None:
            h += "<h3>Folie et comportement du chat</h3>" + pages[b][1]
        pages[a] = ("Gestion de la folie et du comportement", h)
        if b is not None:
            del pages[b]

    # « Gestion de la peur » : l'intertitre « Action de folies » annonçait la liste des cartes Folie
    i = _page(pages, "Gestion de la peur")
    if i is not None:
        t, h = pages[i]
        cartes = "<h3>Les cartes Folie</h3><p>En cas d'échec au jet de Folie, le joueur tire une carte (1D20) :</p><ol class=\"mu-colonnes-liste\">" + "".join(f"<li>{esc(c)}</li>" for c in D["ACTIONS_FOLIE"]) + "</ol>"
        h = re.sub(r"<h3>Action de folies</h3>\s*$", "", h) + cartes
        pages[i] = (t, h)

    # « Utilisation des pouvoirs mystiques » : la fin de l'exemple était partie dans le texte
    i = _page(pages, "Utilisation des pouvoirs mystiques")
    if i is not None:
        t, h = pages[i]
        m = re.search(r"<p>perception de 40,(.*?)</p>", h, flags=re.S)
        if m:
            h = h.replace(m.group(0), "")
            h = h.replace("Si le résultat est supérieur ou égal à la valeur de</p>", "Si le résultat est inférieur ou égal à la valeur de perception de 40," + m.group(1) + "</p>")
        pages[i] = ("Utilisation des pouvoirs mystiques", h)

    # « Dégâts » : les dégâts courants en tableau
    i = _page(pages, "Dégâts et blessures")
    if i is not None:
        t, h = pages[i]
        lignes = [["Coup de griffe", "1D4"], ["Chute", "1D4 par étage (6D4 au plus)"], ["Coup avec un objet tranchant", "1D6"], ["Coup de pistolet", "1D6+1"],
                  ["Coup de fusil", "2D6"], ["Explosion", "4D6"], ["Feu", "2D6 par tour"], ["Choc avec un véhicule", "1D6"]]
        h = re.sub(r"(<h3>Aperçu de dégâts communs</h3>)\s*<p>Coup de griffe.*?</p>\s*<p>Coup de fusil.*?</p>", r"\1" + table_html(["Source", "Dégâts"], lignes), h, flags=re.S)
        pages[i] = (t, h)

    # « Pouvoirs mystiques temporaires » : liste incomplète en paragraphes -> la table complète (une seule page)
    a, b = _page(pages, "Pouvoirs mystiques temporaires"), _page(pages, "Les pouvoirs temporaires (table")
    if a is not None and b is not None:
        rappel = re.search(r"<p>Rappel.*?</p>", pages[a][1], flags=re.S)
        pages[a] = ("Pouvoirs mystiques temporaires (table D100)", (rappel.group(0) if rappel else "") + pages[b][1])
        del pages[b]

    # « Expérience » : débris de la fiche imprimée
    i = _page(pages, "Expérience")
    if i is not None:
        t, h = pages[i]
        h = re.sub(r"<p>- Charme délicat.*?</p>|<p>- Appel des insectes</p>", "", h)
        pages[i] = (t, h)
    return pages


def jouer(pages):
    # page en double (« ronronnements et autres vocalises ») et intertitre orphelin « Miaulements, »
    i = _page(pages, "ronronnements et autres vocalises")
    if i is not None:
        del pages[i]
    i = _page(pages, "Instinct de chasseur")
    if i is not None:
        t, h = pages[i]
        pages[i] = (t, re.sub(r"<h3>Miaulements,\s*</h3>\s*$", "", h))
    # la note sur l'agilité était tombée dans « Face à l'inconnu »
    a, b = _page(pages, "L'agilité féline"), _page(pages, "Face à l'inconnu")
    if a is not None and b is not None:
        m = re.search(r"<h3>Note</h3>\s*<p>Les pouvoirs permettent d'exacerber cette agilité.*?</p>", pages[b][1], flags=re.S)
        if m:
            pages[b] = (pages[b][0], pages[b][1].replace(m.group(0), ""))
            pages[a] = (pages[a][0], pages[a][1] + m.group(0))
    i = _page(pages, "Jouer un chat")
    if i is not None:
        pages[i] = ("Jouer un Chat", pages[i][1])
    i = _page(pages, "Les signes d")
    if i is not None:
        pages[i] = ("Les signes d'affection", pages[i][1])
    return pages


def debuter(pages):
    i = _page(pages, "Bien débuter")
    if i is not None:
        t, h = pages[i]
        h = h.replace("<h3>Que votre aventure commence !</h3>", "")
        h += '<p class="mu-a-retenir">Que votre aventure commence !</p>'
        pages[i] = ("Bien débuter un jeu de rôle", h.replace("J eu de Rôle", "Jeu de Rôle"))
    return pages


def retoucher(pj, D, table_html, esc, table_races, pouvoirs_innes_html):
    """pj : {chapitre: [(titre, html)]} -> pj retouché."""
    innes = definitions(re.sub(r'<div class="mu-note">.*?</div>|<p>Les joueurs incarnent.*?</p>|<p>\*\s*Utilisation.*?</p>', "", pouvoirs_innes_html, flags=re.S))
    table_seule = re.sub(r"^<p>.*?</p>", "", table_races, flags=re.S)
    pj["Création des personnages"] = pages_html("creation.html", {"POUVOIRS_INNES": innes, "TABLE_RACES": table_seule})
    pj["Système de jeu"] = systeme(pj["Système de jeu"], D, table_html, esc)
    pj["Jouer un Chat"] = jouer(pj["Jouer un Chat"])
    pj["Bien débuter un jeu de rôle"] = debuter(pj["Bien débuter un jeu de rôle"])
    for chap, pages in pj.items():
        if chap in ("Aide-mémoire du joueur",):
            continue
        pj[chap] = [(t, generales(h)) for t, h in pages]
    return pj
