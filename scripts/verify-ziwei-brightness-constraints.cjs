// 자미두수 명암(廟旺利平陷) 제약 검사 — 셸 엔진(js/saju-engine.js)의 별 강약을 케이스 4건으로 본다.
//
// 🔴 상태(2026-08-27 실측): **미배선이고 45건 중 19건이 실패한다.**
//    package.json 에도 .github/workflows/ 에도 등록돼 있지 않다(리포 전체 참조 0건).
//    같은 날 표기 버그 3건을 고쳐 22건 → 19건이 됐다(symbolPass 의 '○' vs ASCII 'O' — 아래 참고).
//
// 🔴 남은 19건은 **이 스크립트만으로는 판정할 수 없다.** 아래 CASES 45개 기대값에 출처 주석이
//    전혀 없어서, 엔진이 틀린 것인지 기대값이 낡은 것인지 가릴 근거가 파일 안에 없다.
//    지금 엔진 출력으로 기대값을 다시 뜨면 "틀린 값을 고정하는 가드"가 될 위험이 있어 그러지 않았다.
//    특히 세 패턴이 엔진 결함 쪽을 가리킨다:
//      · 천마가 4개 케이스에서 4건 모두 실패(A·C·D 는 △ 기대에 ▲, B 는 X 기대에 △)
//      · 지겁이 C·D 두 곳에서 같은 방향으로 실패(▲ 기대에 △)
//      · B 케이스에 실패가 몰린다(자미·천상·무곡·태음이 한꺼번에 X) — 명궁/지지 산출 자체가 의심된다
//
//    배선은 그 판정이 끝난 뒤에 한다. 정본을 세우는 법은 verify:ziwei-sohan 이 보여 준다 —
//    외부 명반 하나를 통째로 대조해 값을 박고 출처를 주석에 남기는 방식이다.
//    실행: node scripts/verify-ziwei-brightness-constraints.cjs
//
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

// 🔴 '득'의 기호는 엔진에서 **ASCII 'O'** 다(js/saju-engine.js 의 map = {'묘':'◎','득':'O',…}).
// 여기서는 전각 '○'(U+25CB) 만 비교하고 있어서, 엔진이 '득'을 내놓으면 '○|◎' 기대는
// 구조적으로 절대 통과할 수 없었다. 앱 쪽은 이 이중성을 이미 알고 둘 다 받는다
// (app/components/AdvancedZiweiSectionV2.tsx 의 `symbol === "O" || symbol === "○"`).
function symbolPass(current, target) {
  if (target === '○|◎') return current === '○' || current === 'O' || current === '◎';
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
