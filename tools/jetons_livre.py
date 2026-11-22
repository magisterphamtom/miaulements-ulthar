#!/usr/bin/env python3
"""Jetons « médaillon papier » à partir des illustrations détourées du livre (avec l'accord de Xavier Laporte).
Usage : python3 jetons_livre.py <dossier des illustrations détourées> <racine du système>
Sources : bestiaire p. 2-59 (une illustration par créature), livre de règles p. 24-42 (races),
livre des scénarios p. 43 et 58 (Filou, Léonard)."""
import os, sys
from PIL import Image, ImageDraw

def rogner(im):
    return im.crop(im.getchannel("A").point(lambda a: 255 if a > 20 else 0).getbbox())

def medaillon(src, S=512, k=2):
    T = S * k
    im = rogner(Image.open(src).convert("RGBA"))
    o = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(o)
    d.ellipse((0, 0, T - 1, T - 1), fill=(246, 241, 228, 255))
    f = min(T * .80 / im.width, T * .80 / im.height)
    t = im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)
    calque = Image.new("RGBA", (T, T), (0, 0, 0, 0)); calque.paste(t, ((T - t.width) // 2, T - t.height - int(T * .09)), t)
    masque = Image.new("L", (T, T), 0); ImageDraw.Draw(masque).ellipse((10 * k, 10 * k, T - 10 * k, T - 10 * k), fill=255)
    a = Image.composite(calque.getchannel("A"), Image.new("L", (T, T), 0), masque)
    o.paste(calque, (0, 0), a)
    d = ImageDraw.Draw(o)
    d.ellipse((3 * k, 3 * k, T - 3 * k, T - 3 * k), outline=(28, 26, 23, 255), width=15 * k)
    d.ellipse((20 * k, 20 * k, T - 20 * k, T - 20 * k), outline=(201, 162, 39, 255), width=5 * k)
    return o.resize((S, S), Image.LANCZOS)

def illustration(src, H=600):
    im = rogner(Image.open(src).convert("RGBA")); im.thumbnail((H, H), Image.LANCZOS); return im

BESTIAIRE = {"abhoth": 6, "bokrug": 38, "byahkee": 70, "chat": 102, "chat-saturne": 134, "chien": 166, "chien-dimensionnel": 198,
    "corbeau": 230, "etre-antique": 262, "fourriere": 294, "ghatanothoa": 326, "gnoph-keh": 358, "goule": 390, "loup": 422,
    "loup-garou": 454, "mafieu": 486, "migo": 518, "maigre-bete": 550, "profond": 582, "rat": 614, "rhan-tegoth": 646,
    "roi-jaune": 682, "serpent": 714, "sorciere": 746, "tsathoggua": 778, "ubbosathla": 810, "wendigo": 842, "yith": 874, "zoog": 906}
PRETIRES = {"orichat": "races/bengal", "maya": "races/persan", "isis": "races/sphynx", "chiffon": "races/gouttiere",
    "ator": "races/mainecoon", "filou": "chats/filou", "leonard": "chats/leonard"}
RACES = "bengal gouttiere cornish mainecoon norvegien persan savannah scottish siamois sphynx".split()

if __name__ == "__main__":
    src, sys_ = sys.argv[1], sys.argv[2]; A = lambda *p: os.path.join(sys_, "assets", *p)
    for n, num in BESTIAIRE.items():
        medaillon(f"{src}/bestiaire/x-{num:03d}.png").save(A("jetons", f"{n}.webp"), "WEBP", quality=88)
    os.makedirs(A("chats"), exist_ok=True)
    for n in ("filou", "leonard"):
        illustration(f"{src}/chats/{n}.png").save(A("chats", f"{n}.webp"), "WEBP", quality=88)
    for r in RACES:
        medaillon(A("races", f"{r}.webp")).save(A("races", f"jeton-{r}.webp"), "WEBP", quality=88)
    for n, s in PRETIRES.items():
        medaillon(A(*(s + ".webp").split("/"))).save(A("portraits", f"{n}.webp"), "WEBP", quality=88)
    print("ok")
