"""Phase 2 corpus reader; uses the reviewed runner, never service modules."""
import gzip
import json
from pathlib import Path
import runpy
import time

root = Path(__file__).resolve().parent
output = root.parent.parent / "docs/engine-audit/results/phase2-20261101"
runner = runpy.run_path(str(root / "runner.py"), run_name="audit_runner")
runner["verify_license"]()
start = time.monotonic()
count = 0
with gzip.open(output / "inputs.jsonl.gz", "rt", encoding="utf-8") as source, gzip.open(output / "python.jsonl.gz", "xt", encoding="utf-8") as sink:
    for line in source:
        case = json.loads(line)
        try:
            result = runner["run"](case["input"])
            result = {key: result[key] for key in ("status", "facts", "school", "policy", "reason") if key in result}
        except Exception as error:
            result = {"status": "error", "error": str(error)}
        sink.write(json.dumps({"id": case["id"], "koreanSaju": result}, ensure_ascii=False, allow_nan=False, separators=(",", ":")) + "\n")
        count += 1
        if count % 1000 == 0:
            print(json.dumps({"provider": "korean-saju", "done": count, "elapsedSeconds": round(time.monotonic() - start)}), flush=True)
runner["verify_license"]()
print(json.dumps({"provider": "korean-saju", "done": count, "complete": True, "elapsedSeconds": round(time.monotonic() - start)}), flush=True)
