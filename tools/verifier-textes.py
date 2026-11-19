#!/usr/bin/env python3
"""Contrôle des textes des journaux (wikis, scénarios) : repère les défauts typiques d'extraction."""
import json, glob, re, html, sys, collections
REGLES = [
    ("lettres éparses", r"(?:\b\w\b\s){5,}"),
    ("gras doublé", r"\b(\w)\1(\w)\2(\w)\3"),
    ("case à cocher", r"□"),
    ("mention d'imprimeur", r"UNIQUEMENT POUR|upscal|polyrize|ISBN|Dépôt légal|\b20€|v2025\d{4}"),
    ("mot collé à À", r"\bÀ[a-zé]"),
    ("tiret coupé", r"\w- [a-zà-ÿ]{2,}"),
    ("espace avant virgule", r"\w ,"),
    ("ponctuation doublée", r"(?<![.])\.\.(?![.])|,,"),
    ("filigrane", r"orange\.fr|BEZIER"),
]
compte = collections.Counter(); exemples = collections.defaultdict(list)
for pack in sys.argv[1:] or ["wiki-mj", "wiki-joueur", "scenarios"]:
    for f in sorted(glob.glob(f"src/packs/{pack}/*.json")):
        d = json.load(open(f))
        for p in d.get("pages", []):
            c = p["text"]["content"]
            t = html.unescape(re.sub(r"<[^>]+>", " ", c))
            for nom, rx in REGLES:
                for m in re.finditer(rx, t):
                    compte[(pack, nom)] += 1
                    if len(exemples[(pack, nom)]) < 4: exemples[(pack, nom)].append(f"{d['name']} › {p['name']} : …{t[max(0,m.start()-40):m.end()+40].strip()}…")
            # paragraphes qui commencent en minuscule (phrase coupée)
            for m in re.finditer(r"<p>([a-zà-ÿ][^<]{0,60})", c):
                compte[(pack, "paragraphe coupé")] += 1
                if len(exemples[(pack, "paragraphe coupé")]) < 4: exemples[(pack, "paragraphe coupé")].append(f"{d['name']} › {p['name']} : {m.group(1)}")
            for m in re.finditer(r"<h3>([^<]{70,})</h3>", c):
                compte[(pack, "intertitre trop long")] += 1
                if len(exemples[(pack, "intertitre trop long")]) < 4: exemples[(pack, "intertitre trop long")].append(f"{d['name']} › {p['name']} : {m.group(1)[:90]}")
for k, n in sorted(compte.items()):
    print(f"{k[0]:12} {k[1]:22} {n}")
    for e in exemples[k]: print("     ", e[:200])
