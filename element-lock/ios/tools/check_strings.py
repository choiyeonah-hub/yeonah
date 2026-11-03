#!/usr/bin/env python3
"""Check that every L("key") used in Swift code exists in the matching ko.lproj/Localizable.strings.
Also expands the few dynamic keys (category.*, help.q1..5). Standard library only."""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGETS = {"App": ROOT / "App", "ShieldConfiguration": ROOT / "ShieldConfiguration", "ShieldAction": ROOT / "ShieldAction"}
CATEGORIES = {e["category"] for e in json.loads((ROOT.parent / "shared-data/elements.json").read_text())["elements"]}

ok = True
for name, folder in TARGETS.items():
    defined = set(re.findall(r'^"([^"]+)"\s*=', (folder / "ko.lproj/Localizable.strings").read_text(), re.M))
    used = set()
    for swift in folder.rglob("*.swift"):
        src = swift.read_text()
        used |= set(re.findall(r'(?:L|NSLocalizedString)\(\s*"([a-zA-Z0-9.\-]+)"', src))
        # keys inside ternaries: L(cond ? "a" : "b")
        for a, b in re.findall(r'(?:L|NSLocalizedString)\([^()"]*\?\s*"([^"]+)"\s*:\s*"([^"]+)"', src):
            used |= {a, b}
    used = {k for k in used if not k.endswith(".")} | ({f"category.{c}" for c in CATEGORIES} if name == "App" else set())
    if name == "App":
        used |= {f"help.q{i}" for i in range(1, 6)} | {f"help.a{i}" for i in range(1, 6)}
    missing = sorted(used - defined)
    unused = sorted(defined - used)
    print(f"{name}: {len(used)} used, {len(defined)} defined")
    if missing:
        ok = False
        print("  MISSING:", missing)
    if unused:
        print("  unused:", unused)
sys.exit(0 if ok else 1)
