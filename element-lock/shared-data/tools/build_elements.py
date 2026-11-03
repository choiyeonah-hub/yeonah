#!/usr/bin/env python3
"""Generate shared-data/elements.json.

Inputs
  - English name, symbol, period, group, series: the `elements.db` SQLite file shipped in the
    PyPI package `mendeleev` (verified with mendeleev 1.3.0). Pass its path as argv[1].
  - Korean names: the table below (대한화학회 원소 이름 표기, 2014 개정 기준), except Na and K,
    which use the school-textbook names 나트륨/칼륨 as the primary name (product decision).
    The other names are kept in aliasesKo for the detail view and search.

Display-layout rule (our decision, not the source's):
  La-Lu (57-71) and Ac-Lr (89-103) are all treated as the f-block series. They get group=None
  and are displayed in two separate rows (9, 10) under the main table, columns 3..17.
  mendeleev puts La/Ac in group 3 and Lu/Lr in category 'transition metal'; we override that so
  the 15-element series are shown together, as most school periodic tables do.

Usage: python3 -I build_elements.py /path/to/mendeleev/elements.db > ../elements.json
"""
import json
import sqlite3
import sys

KO = """수소 헬륨 리튬 베릴륨 붕소 탄소 질소 산소 플루오린 네온
나트륨 마그네슘 알루미늄 규소 인 황 염소 아르곤 칼륨 칼슘
스칸듐 타이타늄 바나듐 크로뮴 망가니즈 철 코발트 니켈 구리 아연
갈륨 저마늄 비소 셀레늄 브로민 크립톤 루비듐 스트론튬 이트륨 지르코늄
나이오븀 몰리브데넘 테크네튬 루테늄 로듐 팔라듐 은 카드뮴 인듐 주석
안티모니 텔루륨 아이오딘 제논 세슘 바륨 란타넘 세륨 프라세오디뮴 네오디뮴
프로메튬 사마륨 유로퓸 가돌리늄 터븀 디스프로슘 홀뮴 어븀 툴륨 이터븀
루테튬 하프늄 탄탈럼 텅스텐 레늄 오스뮴 이리듐 백금 금 수은
탈륨 납 비스무트 폴로늄 아스타틴 라돈 프랑슘 라듐 악티늄 토륨
프로트악티늄 우라늄 넵투늄 플루토늄 아메리슘 퀴륨 버클륨 캘리포늄 아인슈타이늄 페르뮴
멘델레븀 노벨륨 로렌슘 러더포듐 더브늄 시보귬 보륨 하슘 마이트너륨 다름슈타튬
뢴트게늄 코페르니슘 니호늄 플레로븀 모스코븀 리버모륨 테네신 오가네손""".split()

# Other names in use. Shown in the element detail and matched by search; never in quiz prompts.
KO_ALIASES = {
    9: ["불소"], 11: ["소듐"], 19: ["포타슘"], 22: ["티타늄"], 24: ["크롬"], 25: ["망간"],
    32: ["게르마늄"], 35: ["브롬"], 41: ["니오븀"], 42: ["몰리브덴"], 51: ["안티몬"],
    52: ["텔루르"], 53: ["요오드"], 54: ["크세논"], 57: ["란탄"], 73: ["탄탈"],
}

SERIES = {
    1: "nonmetal", 2: "noble-gas", 3: "alkali-metal", 4: "alkaline-earth-metal", 5: "metalloid",
    6: "halogen", 7: "post-transition-metal", 8: "transition-metal", 9: "lanthanide", 10: "actinide",
}


def main(db_path):
    assert len(KO) == 118, len(KO)
    rows = sqlite3.connect(db_path).execute(
        "select atomic_number, symbol, name, period, group_id, series_id from elements "
        "where atomic_number <= 118 order by atomic_number").fetchall()
    out = []
    for z, sym, en, period, group, series in rows:
        category = SERIES[series]
        if 57 <= z <= 71 or 89 <= z <= 103:
            category = "lanthanide" if z <= 71 else "actinide"
            group = None
            row, col = (9 if z <= 71 else 10), 3 + (z - (57 if z <= 71 else 89))
        else:
            row, col = period, group
        out.append({
            "number": z, "symbol": sym, "nameKo": KO[z - 1], "aliasesKo": KO_ALIASES.get(z, []),
            "nameEn": en, "period": period, "group": group,
            "displayRow": row, "displayColumn": col, "category": category,
        })
    doc = {
        "schemaVersion": 1,
        "sources": [
            "Symbols, English names, periods, groups, series: PyPI package mendeleev 1.3.0 (elements.db)",
            "Korean names: 대한화학회 원소 이름 표기법 (2014 개정); Na=나트륨, K=칼륨 use textbook names (official 소듐/포타슘 in aliasesKo)",
            "Layout rule: La-Lu, Ac-Lr shown as separate f-block rows with group=null (see build_elements.py)",
        ],
        "verification": "Run shared-data/tools/validate_elements.py. Cross-checked against mendeleev 1.3.0 on 2026-11-03.",
        "elements": out,
    }
    json.dump(doc, sys.stdout, ensure_ascii=False, indent=1)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main(sys.argv[1])
