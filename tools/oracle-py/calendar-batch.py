"""Read-only independent calendar controls, through the reviewed oracle runner."""
import json
from pathlib import Path
import runpy
import sys

runner = runpy.run_path(str(Path(__file__).with_name('runner.py')), run_name='audit_runner')
runner['verify_license']()
requests = json.load(sys.stdin)
results = []
for request in requests:
    try:
        result = runner['run']({**request, 'timeUnknown': True, 'time': None})
        results.append({'status': result['status'], 'calendar': result['facts'].get('calendar'), 'reason': result.get('reason')})
    except Exception as error:
        results.append({'status': 'error', 'error': str(error)})
print(json.dumps(results, ensure_ascii=False, allow_nan=False))
