"""Run every test suite and print one summary line per suite."""
import subprocess, sys, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
suites = [
    ('unit (node)', ['node', '--test', *sorted(f'tests/{f}' for f in os.listdir(os.path.join(ROOT, 'tests')) if f.endswith('.test.js'))]),
    *[(f, [sys.executable, f'tests/browser/{f}']) for f in sorted(os.listdir(os.path.join(ROOT, 'tests', 'browser'))) if f.startswith('test_')],
    ('e2e onboarding', [sys.executable, 'tools/e2e.py']),
]
bad = 0
for name, cmd in suites:
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    out = r.stdout + r.stderr
    m = re.search(r'# pass (\d+)\s+# fail (\d+)', out) or re.search(r'(\d+)/(\d+) passed', out) or re.search(r'PASSED steps: (\d+)', out)
    ok = r.returncode == 0 and 'FAIL' not in out and 'errors: none' in out if 'e2e' in name else r.returncode == 0
    bad += not ok
    print(f"{'OK  ' if ok else 'FAIL'} {name}: {m.group(0) if m else out[-300:]}")
sys.exit(1 if bad else 0)
