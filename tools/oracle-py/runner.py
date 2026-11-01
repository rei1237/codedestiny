"""One JSON request on stdin; no service imports, network, or subprocesses."""
import dataclasses
import enum
import importlib.metadata
import json
import math
from pathlib import Path
import re
import socket
import subprocess
import sys
from datetime import datetime, date

ROOT = Path(__file__).resolve().parent
VERSION = "0.3.0"


def verify_license():
    if Path(sys.prefix).resolve() != (ROOT / ".venv").resolve():
        raise ValueError("ISOLATION_REQUIRED: use tools/oracle-py/.venv Python")
    distributions = list(importlib.metadata.distributions())
    if len(distributions) != 1 or distributions[0].metadata["Name"] != "korean-saju":
        raise ValueError("UNREVIEWED_PYTHON_DEPENDENCIES")
    dist = distributions[0]
    if dist.version != VERSION or dist.metadata.get("License-Expression") != "MIT":
        raise ValueError("LICENSE_GATE")
    licenses = [item for item in dist.files if str(item).endswith("/licenses/LICENSE")]
    if len(licenses) != 1 or "MIT License" not in dist.locate_file(licenses[0]).read_text(encoding="utf-8"):
        raise ValueError("LICENSE_FILE_MISSING")


def deny_io(*args, **kwargs):
    raise RuntimeError("ORACLE_IO_DISABLED")


def validate(raw):
    allowed = {"schemaVersion", "calendar", "date", "leapMonth", "time", "timeUnknown", "gender", "place", "options", "referenceDate"}
    if not isinstance(raw, dict) or set(raw) - allowed:
        raise ValueError("INVALID_INPUT: object or unknown key")
    if type(raw.get("schemaVersion")) is not int or raw["schemaVersion"] != 1:
        raise ValueError("INVALID_INPUT: schemaVersion")
    if raw.get("calendar") not in ("solar", "lunar") or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(raw.get("date", ""))):
        raise ValueError("INVALID_INPUT: calendar/date")
    y, m, d = map(int, raw["date"].split("-"))
    if not (1800 <= y <= 2300 and 1 <= m <= 12 and 1 <= d <= (30 if raw["calendar"] == "lunar" else 31)):
        raise ValueError("INVALID_INPUT: date range")
    if raw["calendar"] == "solar":
        date(y, m, d)
    leap = raw.get("leapMonth", False)
    if type(leap) is not bool or (raw["calendar"] == "solar" and leap):
        raise ValueError("INVALID_INPUT: leapMonth")
    unknown = raw.get("timeUnknown")
    if type(unknown) is not bool or (unknown and raw.get("time") is not None) or (not unknown and not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", str(raw.get("time", "")))):
        raise ValueError("INVALID_INPUT: time/timeUnknown")
    if raw.get("gender") not in ("male", "female", "unknown"):
        raise ValueError("INVALID_INPUT: gender")
    place = raw.get("place")
    if not isinstance(place, dict) or not isinstance(place.get("timezone"), str) or not place["timezone"] or set(place) - {"timezone", "latitude", "longitude", "utcOffsetMinutes"}:
        raise ValueError("INVALID_INPUT: place")
    for key, limit in (("latitude", 90), ("longitude", 180)):
        if place.get(key) is not None and (type(place[key]) not in (int, float) or not math.isfinite(place[key]) or abs(place[key]) > limit):
            raise ValueError("INVALID_INPUT: coordinate")
    if place.get("utcOffsetMinutes") is not None and (type(place["utcOffsetMinutes"]) is not int or abs(place["utcOffsetMinutes"]) > 840):
        raise ValueError("INVALID_INPUT: utcOffsetMinutes")
    options = raw.get("options", {})
    if not isinstance(options, dict) or set(options) - {"yajaSiSeparated"}:
        raise ValueError("UNSUPPORTED_OPTION")
    if "yajaSiSeparated" in options and type(options["yajaSiSeparated"]) is not bool:
        raise ValueError("INVALID_OPTION: yajaSiSeparated")
    reference = raw.get("referenceDate", "2026-11-01")
    if not isinstance(reference, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", reference):
        raise ValueError("INVALID_INPUT: referenceDate")
    date.fromisoformat(reference)
    return {**raw, "leapMonth": leap, "time": None if unknown else raw["time"], "options": options, "referenceDate": reference}


def encode(value):
    if isinstance(value, enum.Enum):
        return {"name": value.name, **{key: getattr(value, key) for key in ("hanja", "hangul") if hasattr(value, key)}}
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if type(value).__name__ == "GanJi" and type(value).__module__.startswith("korean_saju."):
        return {"hanja": value.hanja, "index": value.index}
    if dataclasses.is_dataclass(value):
        return {field.name: encode(getattr(value, field.name)) for field in dataclasses.fields(value)}
    if isinstance(value, dict):
        return {(key.name if isinstance(key, enum.Enum) else str(key)): encode(item) for key, item in value.items()}
    if isinstance(value, (tuple, list)):
        return [encode(item) for item in value]
    if isinstance(value, (set, frozenset)):
        return sorted((encode(item) for item in value), key=lambda item: json.dumps(item, sort_keys=True))
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    raise TypeError(f"UNSUPPORTED_OUTPUT_TYPE: {type(value).__name__}")


def run(raw):
    request = validate(raw)
    result = {"schemaVersion": 1, "provider": "korean-saju", "version": VERSION, "status": "ok", "input": request, "policy": {}, "facts": {}, "school": {}, "limitations": []}
    if request["place"]["timezone"] != "Asia/Seoul" or request["place"].get("utcOffsetMinutes") is not None:
        return {**result, "status": "unsupported", "reason": "Library accepts KST; IANA conversion and offset override are not implemented"}
    year, month, day = map(int, request["date"].split("-"))
    if not 1900 <= year <= 2050:
        return {**result, "status": "unsupported", "reason": "Outside bundled lunar data envelope 1900–2050"}
    verify_license()
    socket.socket = socket.create_connection = socket.getaddrinfo = deny_io
    subprocess.Popen = subprocess.run = deny_io
    from korean_saju import load_bundled_data, Saju, SajuAnalysis, Daewoon, Gender, IlganStrengthAnalyzer, JohuAnalyzer
    lunar_data, terms = load_bundled_data()
    solar = (lunar_data.lunar_to_solar(year=year, month=month, day=day, is_leap=request["leapMonth"])
             if request["calendar"] == "lunar" else datetime(year, month, day))
    if solar is None:
        raise ValueError("INVALID_OR_OUT_OF_RANGE_LUNAR_DATE")
    lunar = lunar_data.solar_to_lunar(solar)
    if lunar is None:
        return {**result, "status": "unsupported", "reason": "Outside exact bundled lunar coverage"}
    result["facts"]["calendar"] = {"solar": solar.date().isoformat(), "lunar": {"year": lunar.year, "month": lunar.month, "day": lunar.day, "leapMonth": lunar.is_leap}}
    longitude = request["place"].get("longitude") if request["place"].get("longitude") is not None else 126.978
    result["policy"] = {"timezone": "library-native KST", "solarCorrection": "apparent (mandatory)", "longitude": longitude, "yajaSiSeparated": request["options"].get("yajaSiSeparated", True), "solarTerms": "bundled KASI 2000–2027; library Meeus fallback outside"}
    result["limitations"] = ["Bundled data is not a live KASI verification.", "Historical standard-time/DST equivalence is unverified; library converts KST using its own convention.", "School judgments are observations only, not replacement decisions."]
    if request["timeUnknown"]:
        result.update(status="partial")
        result["facts"]["pillars"] = None
        result["limitations"].append("Unknown time: calendar only; no substitute birth time was used for pillars.")
        return result
    hour, minute = map(int, request["time"].split(":"))
    chart = Saju.from_birth(kst_moment=datetime(solar.year, solar.month, solar.day, hour, minute), solar_terms=terms,
                            longitude=longitude,
                            yaja_si_separated=result["policy"]["yajaSiSeparated"])
    analysis = SajuAnalysis(chart)
    result["facts"].update({"pillars": {key: getattr(chart, key + "_pillar").hanja for key in ("year", "month", "day", "hour")},
        "tenGods": {"stems": encode(analysis.cheon_gan_shipsin), "branches": encode(analysis.ji_ji_shipsin)},
        "voidBranches": encode(analysis.gongmang_by_pillar),
        "majorLuck": None if request["gender"] == "unknown" else encode(Daewoon.compute(saju=chart, gender=Gender.MALE if request["gender"] == "male" else Gender.FEMALE, solar_terms=terms, count=10))})
    result["school"] = encode({"regularPattern": analysis.jeonggyeok, "specialPatterns": analysis.oegyeok, "usefulGod": analysis.yongsin,
        "strength": IlganStrengthAnalyzer.analyze(chart), "seasonalAdjustment": JohuAnalyzer.analyze(chart), "twelveStages": analysis.sibiunseong, "stars": analysis.sinsal})
    return result


if __name__ == "__main__":
    try:
        data = sys.stdin.buffer.read(65537)
        if len(data) > 65536:
            raise ValueError("INVALID_INPUT: maximum 64 KiB")
        request = json.loads(data.decode("utf-8-sig"), parse_constant=lambda value: (_ for _ in ()).throw(ValueError("INVALID_JSON_NUMBER")))
        print(json.dumps(run(request), ensure_ascii=False, allow_nan=False, separators=(",", ":")))
    except Exception as error:
        print(json.dumps({"schemaVersion": 1, "status": "error", "error": str(error)}, ensure_ascii=False))
        sys.exit(1)
