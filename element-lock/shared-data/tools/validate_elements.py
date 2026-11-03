#!/usr/bin/env python3
"""Validate shared-data/elements.json. Standard library only. Exit code 1 on any problem."""
import json
import pathlib
import sys

PATH = pathlib.Path(__file__).resolve().parent.parent / "elements.json"
# Spot checks that must never drift (school-level facts).
KNOWN = {1: ("H", 1, 1), 2: ("He", 1, 18), 6: ("C", 2, 14), 11: ("Na", 3, 1), 17: ("Cl", 3, 17),
         20: ("Ca", 4, 2), 26: ("Fe", 4, 8), 36: ("Kr", 4, 18), 79: ("Au", 6, 11), 118: ("Og", 7, 18)}
CATEGORIES = {"nonmetal", "noble-gas", "alkali-metal", "alkaline-earth-metal", "metalloid", "halogen",
              "post-transition-metal", "transition-metal", "lanthanide", "actinide"}


def validate(doc):
    errors = []
    els = doc["elements"]
    numbers = [e["number"] for e in els]
    if sorted(numbers) != list(range(1, 119)):
        errors.append("atomic numbers must be exactly 1..118 without gaps or duplicates")
    for key in ("symbol", "nameKo", "nameEn"):
        values = [e[key] for e in els]
        dupes = {v for v in values if values.count(v) > 1}
        if dupes:
            errors.append(f"duplicate {key}: {sorted(dupes)}")
    cells = [(e["displayRow"], e["displayColumn"]) for e in els]
    if len(set(cells)) != len(cells):
        errors.append("two elements share a display cell")
    for e in els:
        z = e["number"]
        f_block = 57 <= z <= 71 or 89 <= z <= 103
        if not (1 <= e["period"] <= 7):
            errors.append(f"{z}: bad period")
        if f_block:
            if e["group"] is not None or e["displayRow"] not in (9, 10):
                errors.append(f"{z}: f-block element must have group=null and row 9/10")
        else:
            if not (1 <= (e["group"] or 0) <= 18):
                errors.append(f"{z}: bad group")
            if (e["displayRow"], e["displayColumn"]) != (e["period"], e["group"]):
                errors.append(f"{z}: display cell must equal (period, group)")
        if e["category"] not in CATEGORIES:
            errors.append(f"{z}: unknown category {e['category']}")
        if not e["symbol"][0].isupper() or not e["symbol"].isalpha() or len(e["symbol"]) > 2:
            errors.append(f"{z}: bad symbol {e['symbol']}")
        if z in KNOWN and (e["symbol"], e["period"], e["group"]) != KNOWN[z]:
            errors.append(f"{z}: spot check failed {e['symbol'], e['period'], e['group']} != {KNOWN[z]}")
    # Period boundaries: first element of each period is group 1, last is group 18.
    for first, last in [(1, 2), (3, 10), (11, 18), (19, 36), (37, 54), (55, 86), (87, 118)]:
        by = {e["number"]: e for e in els}
        if by[first]["group"] != 1 or by[last]["group"] != 18:
            errors.append(f"period boundary {first}-{last} broken")
    if not doc.get("sources"):
        errors.append("sources missing")
    return errors


if __name__ == "__main__":
    errs = validate(json.loads(PATH.read_text(encoding="utf-8")))
    for e in errs:
        print("ERROR:", e)
    print("OK: 118 elements valid" if not errs else f"{len(errs)} error(s)")
    sys.exit(1 if errs else 0)
