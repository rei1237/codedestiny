"""Independent, isolated MIT oracle. No birth-time/calendar conversion or I/O fallback."""
import sys
sys.dont_write_bytecode = True
import hashlib
import importlib.metadata
import json
from pathlib import Path
from datetime import datetime


def audit(event, args):
    if event.startswith(("socket.", "subprocess.", "os.system", "os.spawn")):
        raise RuntimeError("ORACLE_IO_BLOCKED")
    if event == "import" and any(word in str(args[0]).lower() for word in ("swiss", "sweph", "jyotish")):
        raise RuntimeError("SWISS_BLOCKED")


sys.addaudithook(audit)
distributions = list(importlib.metadata.distributions())
assert len(distributions) == 1, "UNREVIEWED_DEPENDENCIES"
dist = distributions[0]
assert dist.metadata["Name"] == "korean-saju" and dist.version == "0.3.0", "ORACLE_VERSION_MISMATCH"
assert dist.metadata.get("License-Expression") == "MIT", "LICENSE_GATE"
license_file = next(dist.locate_file(f) for f in dist.files if str(f).endswith("/licenses/LICENSE"))
assert "MIT License" in license_file.read_text(encoding="utf-8"), "LICENSE_FILE_MISSING"
assert Path(sys.prefix).resolve() in license_file.resolve().parents, "ISOLATED_VENV_REQUIRED"

from korean_saju.saju.saju import Saju
from korean_saju.saju.gan_ji import GanJi
from korean_saju.saju.saju_analysis import SajuAnalysis

source = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
results = []
for row in source:
    text = row["pillars"]
    pillars = [GanJi.from_hanja(text[i:i + 2]) for i in range(0, len(text), 2)]
    if len(pillars) not in (3, 4) or any(p is None for p in pillars):
        results.append({**row, "classification": "C", "reason": "Synthetic pair outside the oracle's valid sexagenary pairs"})
        continue
    # Moment/longitude are required container fields only. Neither jeonggyeok
    # nor oegyeok calls calendar methods; no from_birth/solar-term source is used.
    saju = Saju(*pillars[:3], pillars[3] if len(pillars) == 4 else None, datetime(2000, 1, 1), 126.978)
    analysis = SajuAnalysis(saju)
    regular = analysis.jeonggyeok.gyeokguk.hangul
    outer = [{"name": r.type.hangul, "verdict": r.verdict.label, "reason": r.reason, "score": r.score} for r in analysis.oegyeok]
    expected = row["expected"].split("(")[0]
    # Names from different school taxonomies are not silently equated.
    match = not outer and expected == regular
    results.append({**row, "oracleRegular": regular, "oracleAcceptedOuter": outer,
                    "classification": "match" if match else "B",
                    "reason": "Identical pillars; profile and taxonomy differences require school adjudication" if not match else "Regular name matches; not universal proof"})

report = {"provider": "korean-saju", "version": dist.version, "license": "MIT", "licensePath": str(license_file),
          "licenseSha256": hashlib.sha256(license_file.read_bytes()).hexdigest(), "newDependencies": 0,
          "network": "blocked", "swiss": "blocked", "calendarRecalculation": False, "rows": results,
          "summary": {key: sum(r["classification"] == key for r in results) for key in ("match", "B", "C")}}
Path(sys.argv[2]).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report["summary"]))
