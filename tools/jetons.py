#!/usr/bin/env python3
"""Jetons des adversaires et portraits de secours des Chats (anneau violet, glyphes), faits avec Chromium.
Usage : python3 tools/jetons.py   (écrit assets/jetons/*.png et assets/portraits/*.png)"""
import os, re, unicodedata
from playwright.sync_api import sync_playwright

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def slug(nom):
    s = unicodedata.normalize("NFKD", nom.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

CREATURES = {
    "Abhoth": "🐙", "Bokrug": "🦎", "Byahkee": "🦇", "Chat": "🐈‍⬛", "Chat Saturne": "🪐", "Chien": "🐕",
    "Chien Dimensionnel": "📐", "Corbeau": "🐦‍⬛", "Être antique": "⭐", "Fourrière": "🚐", "Ghatanothoa": "🗿",
    "Gnoph-Keh": "❄️", "Goule": "🧟", "Loup": "🐺", "Loup-Garou": "🌕", "Mafieu": "🕴️", "Migo": "🍄",
    "Maigre Bête": "👻", "Profond": "🐟", "Rat": "🐀", "Rhan-Tegoth": "🦀", "Roi Jaune": "👑", "Serpent": "🐍",
    "Sorcière": "🧙‍♀️", "Tsathoggua": "🐸", "Ubbosathla": "🧬", "Wendigo": "🦌", "Yith": "🔻", "Zoog": "🐭",
}
CHATS = {"Ator": ("#8a5a2b", "#d9a441"), "Filou": ("#1b1b22", "#f0d040"), "Léonard": ("#7d838c", "#b5b04a")}

CSS = """body{margin:0;background:transparent}.t{width:512px;height:512px;border-radius:50%;box-sizing:border-box;position:relative;
background:radial-gradient(circle at 35% 30%,#2b2540 0%,#15121f 60%,#0b0a12 100%);border:14px solid #9b86e8;
box-shadow:inset 0 0 40px rgba(155,134,232,.35);display:flex;align-items:center;justify-content:center;overflow:hidden}
.t::after{content:"";position:absolute;inset:18px;border-radius:50%;border:3px solid rgba(155,134,232,.35)}
.g{font-family:'Noto Color Emoji';font-size:270px;line-height:1;filter:drop-shadow(0 8px 14px rgba(0,0,0,.6))}"""

def cat(corps, yeux):
    return f"""<svg width="330" height="330" viewBox="0 0 100 100"><path fill="{corps}" stroke="rgba(255,255,255,.4)" stroke-width="1.6" d="M14 88V30L30 8l16 20h8L70 8l16 22v58C74 98 26 98 14 88Z"/>
<path fill="{yeux}" d="M28 52q10-11 18 0q-8 7-18 0ZM54 52q10-11 18 0q-8 7-18 0Z"/><path fill="#e7a0a0" d="M45 66h10l-5 6Z"/>
<path stroke="rgba(255,255,255,.25)" stroke-width="1" d="M14 66l-12 -3M14 72l-12 3M86 66l12 -3M86 72l12 3"/></svg>"""

def main():
    os.makedirs(f"{RACINE}/assets/jetons", exist_ok=True)
    os.makedirs(f"{RACINE}/assets/portraits", exist_ok=True)
    items = [(f"{RACINE}/assets/jetons/{slug(n)}.png", f'<div class="g">{g}</div>') for n, g in CREATURES.items()]
    items += [(f"{RACINE}/assets/portraits/{slug(n)}.png", cat(*c)) for n, c in CHATS.items()]
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 512, "height": 512})
        for chemin, contenu in items:
            pg.set_content(f"<style>{CSS}</style><div class='t'>{contenu}</div>")
            pg.wait_for_timeout(120)
            pg.locator(".t").screenshot(path=chemin, omit_background=True)
        b.close()
    print(len(items), "images écrites")

if __name__ == "__main__":
    main()
