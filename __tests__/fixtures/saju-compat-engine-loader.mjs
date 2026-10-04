import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// js/saju-engine.js 의 실제 최상위 선언에서 궁합 분석 함수와 그 의존 심볼만 꺼내 vm 에서 실행한다.
// (DOM·KASI·결제에 닿지 않는 순수 함수만 — document 는 undefined 로 막아 두어 새 의존이 생기면 즉시 실패한다.)
const ROOTS = ['analyzeCompat', 'analyzePastLifeCompat', 'calcNatalElement', 'analyzeJohu', 'calcPower', 'detectJong'];

export function loadCompatEngine(sourceUrl = new URL('../../js/saju-engine.js', import.meta.url)) {
  const source = fs.readFileSync(sourceUrl, 'utf8');
  const ast = ts.createSourceFile('saju-engine.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const decl = new Map();
  for (const node of ast.statements) {
    if (ts.isFunctionDeclaration(node) && node.name) decl.set(node.name.text, { node, text: node.getText(ast) });
    if (ts.isVariableStatement(node)) {
      for (const d of node.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) decl.set(d.name.text, { node: d, text: `var ${d.getText(ast)};` });
      }
    }
  }
  const idsOf = (node) => {
    const out = new Set();
    (function walk(n) { if (ts.isIdentifier(n)) out.add(n.text); ts.forEachChild(n, walk); })(node);
    return out;
  };
  const order = [];
  const seen = new Set();
  const add = (name) => {
    if (seen.has(name) || !decl.has(name)) return;
    seen.add(name);
    order.push(name);
    for (const id of idsOf(decl.get(name).node)) add(id);
  };
  for (const root of ROOTS) {
    if (!decl.has(root)) throw new Error(`Production declaration missing: ${root}`);
    add(root);
  }
  const code = order.slice().reverse().map((name) => decl.get(name).text).join('\n');
  const ctx = vm.createContext({ window: {}, document: undefined, console });
  vm.runInContext(
    `${code}\nthis.__api={${ROOTS.join(',')},GAN,JI,setUser:function(n){USER_NAME=n;}};`,
    ctx,
    { filename: 'compat-engine-closure.js' },
  );
  const api = ctx.__api;

  const pillar = (pair) => ({ g: pair[0], j: pair[1], gE: (api.GAN[pair[0]] || {}).e, jE: (api.JI[pair[1]] || {}).e });
  const toPillars = (text) => {
    const [y, m, d, h] = text.split(' ');
    return { y: pillar(y), m: pillar(m), d: pillar(d), h: pillar(h) };
  };
  const side = (p) => ({ natal: api.calcNatalElement(p), johu: api.analyzeJohu(p), power: api.calcPower(p), jong: api.detectJong(p) });

  return {
    api,
    closureSymbols: order.slice(),
    toPillars,
    // 두 사람 기둥 문자열("년월일시" 각 간지, 공백 구분) → 궁합 본 분석 결과
    compat(a, b, type, name = '상대') {
      const p1 = toPillars(a);
      const p2 = toPillars(b);
      const s1 = side(p1);
      const s2 = side(p2);
      return api.analyzeCompat(p1, s1.natal, s1.power, s1.johu, s1.jong, p2, s2.natal, s2.power, s2.johu, s2.jong, type, name);
    },
    // out 을 주면 out.facts 에 전생 구조화 사실이 채워진다(반환 html 은 그대로).
    pastLife(a, b, name = '상대', out) {
      return api.analyzePastLifeCompat(toPillars(a), toPillars(b), name, out);
    },
    // 정적 소스 검사용 — 실제 선언 본문.
    functionSource(name) {
      if (!decl.has(name)) throw new Error(`Production declaration missing: ${name}`);
      return decl.get(name).text;
    },
  };
}

// 결정론 의사난수(LCG) — 코퍼스 생성용. 같은 시드면 같은 쌍이 나온다.
export function makePillarPairGenerator(seed) {
  const GANS = '甲乙丙丁戊己庚辛壬癸';
  const JIS = '子丑寅卯辰巳午未申酉戌亥';
  const cycle = [];
  for (let i = 0; i < 60; i += 1) cycle.push(GANS[i % 10] + JIS[i % 12]);
  let state = seed;
  const rnd = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const pick = () => cycle[Math.floor(rnd() * 60)];
  const four = () => [pick(), pick(), pick(), pick()].join(' ');
  return () => [four(), four()];
}
