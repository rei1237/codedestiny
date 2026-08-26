// DOM 부트스트랩과 엔진 로딩은 scripts/lib/ziwei-engine-harness.cjs 하나를 쓴다.
// 예전에는 그 120줄이 이 파일 안에 있었는데, 같은 엔진을 verify:ziwei-sohan 도 돌리게 되면서
// 두 벌로 갈라질 자리가 됐다.
const harness = require('./lib/ziwei-engine-harness.cjs');

const CASES = {
  A: {
    label: '1991-02-20 08:30 (solar, male)',
    gender: 'M',
    year: 1991,
    month: 2,
    day: 20,
    hour: 8,
    minute: 30,
  },
  B: {
    label: '1991-09-02 11:45 (solar, female)',
    gender: 'F',
    year: 1991,
    month: 9,
    day: 2,
    hour: 11,
    minute: 45,
  },
  C: {
    // KASI local seed in this repo maps lunar 1997-01-03 -> solar 1997-02-10.
    label: '1997-01-03 12:00 (lunar, female; seeded solar=1997-02-10)',
    gender: 'F',
    year: 1997,
    month: 2,
    day: 10,
    hour: 12,
    minute: 0,
  },
  D: {
    label: '2000-01-01 12:00 (solar, female)',
    gender: 'F',
    year: 2000,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
  },
};

const CONSTRAINTS = [
  ['A', '문곡', '△'],
  ['A', '칠살', '○|◎'],
  ['A', '문창', 'X'],
  ['A', '천마', '△'],
  ['A', '천기', '○|◎'],
  ['A', '화성', '○|◎'],
  ['A', '파군', '△'],

  ['B', '자미', '△'],
  ['B', '탐랑', '△'],
  ['B', '녹존', '○|◎'],
  ['B', '거문', '○|◎'],
  ['B', '천상', '△'],
  ['B', '천량', '◎'],
  ['B', '염정', '○|◎'],
  ['B', '칠살', '◎'],
  ['B', '천마', 'X'],
  ['B', '무곡', '△'],
  ['B', '파군', '▲'],
  ['B', '천기', '△'],
  ['B', '태음', '△'],

  ['C', '경양', '◎'],
  ['C', '칠살', '○|◎'],
  ['C', '천량', 'X'],
  ['C', '지겁', '▲'],
  ['C', '자미', 'X'],
  ['C', '천상', '○|◎'],
  ['C', '영성', '○|◎'],
  ['C', '천기', '○|◎'],
  ['C', '거문', '◎'],
  ['C', '탐랑', '△'],
  ['C', '무곡', '○|◎'],
  ['C', '천마', '△'],
  ['C', '천괴', '▲'],

  ['D', '경양', '◎'],
  ['D', '파군', 'X'],
  ['D', '우필', '◎'],
  ['D', '천괴', '○|◎'],
  ['D', '거문', '○|◎'],
  ['D', '좌보', '◎'],
  ['D', '화성', '△'],
  ['D', '천량', '◎'],
  ['D', '칠살', '○|◎'],
  ['D', '영성', '○|◎'],
  ['D', '지겁', '▲'],
  ['D', '천마', '△'],
];

function parseArgs(argv) {
  const out = {
    engine: 'js/saju-engine.js',
    json: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--engine' && argv[i + 1]) {
      out.engine = argv[i + 1];
      i += 1;
    } else if (a === '--json') {
      out.json = true;
    }
  }
  return out;
}

function symbolPass(current, target) {
  if (target === '○|◎') return current === '○' || current === '◎';
  return current === target;
}

function buildStarMap(zw) {
  const map = {};
  for (const p of (zw.palaceStarData || [])) {
    const groups = [p.stars || [], p.auxStars || [], p.badStars || []];
    for (const arr of groups) {
      for (const s of arr) {
        if (s.borrowed) continue;
        if (!map[s.name]) map[s.name] = [];
        map[s.name].push({
          symbol: s.symbol,
          level: s.strength,
          palace: p.palace,
          branch: p.branch,
        });
      }
    }
  }
  return map;
}

function evalCase(caseKey, engineRelPath) {
  const c = CASES[caseKey];
  const zw = harness.calcChart(c, engineRelPath);
  return {
    caseInfo: c,
    map: buildStarMap(zw),
  };
}

function main() {
  const args = parseArgs(process.argv);
  const enginePath = harness.loadEngine(args.engine);

  const caseData = {};
  for (const key of Object.keys(CASES)) {
    caseData[key] = evalCase(key, args.engine);
  }

  const details = [];
  for (const [caseKey, star, target] of CONSTRAINTS) {
    const entries = (caseData[caseKey].map[star] || []);
    if (!entries.length) {
      details.push({ case: caseKey, star, target, ok: false, reason: 'star_not_found' });
      continue;
    }
    const first = entries[0];
    details.push({
      case: caseKey,
      star,
      target,
      current: first.symbol,
      level: first.level,
      palace: first.palace,
      branch: first.branch,
      ok: symbolPass(first.symbol, target),
    });
  }

  const fails = details.filter((d) => !d.ok);
  const report = {
    engine: args.engine,
    enginePath,
    summary: {
      total: details.length,
      pass: details.length - fails.length,
      fail: fails.length,
    },
    fails,
    details,
  };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('[Ziwei Brightness Verify] engine:', args.engine);
    console.log('[Ziwei Brightness Verify] total:', report.summary.total, 'pass:', report.summary.pass, 'fail:', report.summary.fail);
    if (fails.length) {
      console.log('[Ziwei Brightness Verify] failures:');
      for (const f of fails) {
        console.log(' -', f.case, f.star, `expected=${f.target}`, `actual=${f.current}`, `palace=${f.palace}`, `branch=${f.branch}`);
      }
    }
  }

  process.exitCode = fails.length ? 1 : 0;
}

main();
