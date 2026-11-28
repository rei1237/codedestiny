import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { BRANCH_ORDER, STEM_ORDER } from '../../lib/saju/natal-core/tables.mjs';
import {
  BAEKHO_GANJI, CHEONEUL_BY_STEM, CHUNG_PAIRS, GOEGANG_GANJI, GWIMUN_PAIRS, HONGYEOM_BY_STEM, SAMHAP_GROUPS,
  SINSAL_RULES, TWELVE_SINSAL_NAMES, WONJIN_PAIRS, YANGIN_BY_STEM, dohwaBranch, gongmangBranches, hwagaeBranch,
  isPair, jogaekBranch, renderRuleTableHtml, sangmunBranch, twelveSinsalName, twelveSinsalRow, yeokmaBranch,
} from '../../lib/saju/sinsal-rules.mjs';

// 만세력 화면 엔진(IIFE)을 격리 컨텍스트에서 읽는다. 엔진 파일은 고치지 않는다.
const sandbox = { globalThis: {} };
sandbox.globalThis = sandbox;
vm.runInNewContext(readFileSync(new URL('../../js/core/saju/manse-shinsal.js', import.meta.url), 'utf8'), sandbox);
const engine = sandbox.CdManseShinsal;
// 다른 realm 의 배열은 deepStrictEqual 에서 프로토타입이 달라 JSON 으로 옮긴다.
const plain = (value) => JSON.parse(JSON.stringify(value));
const manse = { build: (p) => plain(engine.build(p)), twelveName: engine.twelveName, gongmangBranches: (s, b) => plain(engine.gongmangBranches(s, b)) };

const SIXTY = Array.from({ length: 60 }, (_, i) => [STEM_ORDER[i % 10], BRANCH_ORDER[i % 12]]);
const CHECKED = ['도화살', '홍염살', '천을귀인', '양인살', '공망', '괴강살', '백호살', '귀문관살', '원진살'];

function expectedExtras(rows, dayStem, dayBranch, yearBranch) {
  const out = {};
  const byBranch = (name, branches) => {
    const hit = rows.filter((row) => branches.includes(row.branch)).map((row) => row.label);
    if (hit.length) out[name] = hit;
  };
  const byGanji = (name, list) => {
    const hit = rows.filter((row) => list.includes(row.stem + row.branch)).map((row) => row.label);
    if (hit.length) out[name] = hit;
  };
  const byPair = (name, pairs) => {
    const hit = [];
    for (let i = 0; i < rows.length; i += 1) for (let j = i + 1; j < rows.length; j += 1) {
      if (isPair(pairs, rows[i].branch, rows[j].branch)) hit.push(rows[i].label, rows[j].label);
    }
    if (hit.length) out[name] = [...new Set(hit)];
  };
  byBranch('도화살', [dohwaBranch(dayBranch), dohwaBranch(yearBranch)]);
  byBranch('홍염살', [HONGYEOM_BY_STEM[dayStem]]);
  byBranch('천을귀인', CHEONEUL_BY_STEM[dayStem]);
  byGanji('괴강살', GOEGANG_GANJI);
  byGanji('백호살', BAEKHO_GANJI);
  byBranch('양인살', YANGIN_BY_STEM[dayStem] ? [YANGIN_BY_STEM[dayStem]] : []);
  byBranch('공망', gongmangBranches(dayStem, dayBranch));
  byPair('귀문관살', GWIMUN_PAIRS);
  byPair('원진살', WONJIN_PAIRS);
  return out;
}

test('만세력 엔진과 60일주 × 12년지 전수 대조(별신살·12신살)', () => {
  let cases = 0;
  for (const [dayStem, dayBranch] of SIXTY) {
    for (const yearBranch of BRANCH_ORDER) {
      for (const yearStem of ['甲', '庚']) {
        const result = manse.build({ d: { g: dayStem, j: dayBranch }, y: { g: yearStem, j: yearBranch } });
        const rows = [
          { label: '일주', stem: dayStem, branch: dayBranch },
          { label: '년주', stem: yearStem, branch: yearBranch },
        ];
        const actual = Object.fromEntries(result.extras.filter((row) => CHECKED.includes(row.name)).map((row) => [row.name, row.positions]));
        assert.deepEqual(actual, expectedExtras(rows, dayStem, dayBranch, yearBranch), `${dayStem}${dayBranch}/${yearStem}${yearBranch}`);
        for (const row of result.twelve) {
          const branch = row.key === 'd' ? dayBranch : yearBranch;
          assert.equal(row.name, twelveSinsalName(yearBranch, branch));
        }
        cases += 1;
      }
    }
  }
  assert.equal(cases, 1440);
});

test('12신살 표 144칸과 공망 60일주가 엔진 함수와 같다', () => {
  for (const year of BRANCH_ORDER) for (const target of BRANCH_ORDER) {
    assert.equal(twelveSinsalName(year, target), manse.twelveName(year, target), `${year}->${target}`);
  }
  for (const [stem, branch] of SIXTY) assert.deepEqual(gongmangBranches(stem, branch), [...manse.gongmangBranches(stem, branch)], stem + branch);
});

test('삼합의 도화·역마·화개는 12신살 행의 년살·역마살·화개살 자리와 같다', () => {
  for (const group of SAMHAP_GROUPS) for (const branch of group.branches) {
    const row = twelveSinsalRow(branch);
    assert.equal(row[TWELVE_SINSAL_NAMES.indexOf('년살')], dohwaBranch(branch));
    assert.equal(row[TWELVE_SINSAL_NAMES.indexOf('역마살')], yeokmaBranch(branch));
    assert.equal(row[TWELVE_SINSAL_NAMES.indexOf('화개살')], hwagaeBranch(branch));
  }
});

// app/saju/animal-destiny/engine/localSajuCalculator.ts 의 상수(한글 표기)를 고정값으로 묶는다.
// 엔진 함수는 export 되지 않아 직접 부를 수 없다 — 엔진이 바뀌면 이 고정값과 규칙표를 함께 갱신한다.
const KO_STEMS = [...'갑을병정무기경신임계'];
const KO_BRANCHES = [...'자축인묘진사오미신유술해'];
const hanStem = (ko) => STEM_ORDER[KO_STEMS.indexOf(ko)];
const hanBranch = (ko) => BRANCH_ORDER[KO_BRANCHES.indexOf(ko)];
const hanGanji = (ko) => hanStem(ko[0]) + hanBranch(ko[1]);
const CALC = {
  // 3570 getPeachBlossomBranch / 3612 getHwagaeBranch / 3620 getYeokmaBranch (기준 지지 그룹 → 결과)
  groups: [['신자진', '유', '인', '진'], ['인오술', '묘', '신', '술'], ['사유축', '오', '해', '축'], ['해묘미', '자', '사', '미']],
  // 3578 getHongyeomBranch
  hongyeom: '오오인미진진술유자신',
  // 3628 getCheoneulBranches
  cheoneul: ['축미', '자신', '해유', '해유', '축미', '자신', '축미', '인오', '묘사', '묘사'],
  // 2024 YANGIN_BRANCH_BY_STEM
  yangin: { 갑: '묘', 병: '오', 무: '오', 경: '유', 임: '자' },
  // 3739 dangerousGanji / 3740 whiteTigerGanji
  goegang: ['경진', '경술', '임진', '무술'],
  baekho: ['갑진', '을미', '병술', '정축', '무진', '임술', '계축'],
  // 3741 gwimunPairs / 3749 wonjinPairs
  gwimun: ['자유', '축오', '인미', '묘신', '진해', '사술'],
  wonjin: ['자미', '축오', '인유', '묘신', '진해', '사술'],
};

test('사주 엔진(localSajuCalculator) 상수와 규칙표가 같다', () => {
  for (const [members, dohwa, yeokma, hwagae] of CALC.groups) {
    for (const ko of members) {
      const branch = hanBranch(ko);
      assert.equal(dohwaBranch(branch), hanBranch(dohwa), `도화 ${ko}`);
      assert.equal(yeokmaBranch(branch), hanBranch(yeokma), `역마 ${ko}`);
      assert.equal(hwagaeBranch(branch), hanBranch(hwagae), `화개 ${ko}`);
    }
  }
  KO_STEMS.forEach((ko, index) => {
    const stem = hanStem(ko);
    assert.equal(HONGYEOM_BY_STEM[stem], hanBranch(CALC.hongyeom[index]), `홍염 ${ko}`);
    assert.deepEqual(CHEONEUL_BY_STEM[stem], [...CALC.cheoneul[index]].map(hanBranch), `천을 ${ko}`);
    assert.equal(YANGIN_BY_STEM[stem], CALC.yangin[ko] ? hanBranch(CALC.yangin[ko]) : undefined, `양인 ${ko}`);
  });
  assert.deepEqual(GOEGANG_GANJI, [...CALC.goegang.slice(0,3), '임술', CALC.goegang[3]].map(hanGanji));
  assert.deepEqual(BAEKHO_GANJI, CALC.baekho.map(hanGanji));
  const hanPair = (v) => hanBranch(v[0]) + hanBranch(v[1]);
  assert.deepEqual(GWIMUN_PAIRS, CALC.gwimun.map(hanPair));
  assert.deepEqual(WONJIN_PAIRS, CALC.wonjin.map(hanPair));
});

test('상충은 일곱 번째 지지, 상문·조객은 두 칸 앞뒤, 규칙표 HTML 은 모든 글 이름을 렌더한다', () => {
  for (const [a, b] of CHUNG_PAIRS.map((v) => [...v])) assert.equal(Math.abs(BRANCH_ORDER.indexOf(a) - BRANCH_ORDER.indexOf(b)), 6);
  assert.equal(sangmunBranch('子'), '寅');
  assert.equal(jogaekBranch('子'), '戌');
  assert.equal(sangmunBranch('戌'), '子');
  for (const name of Object.keys(SINSAL_RULES)) {
    const html = renderRuleTableHtml(name);
    assert.match(html, /^<table><thead><tr><th>/);
    assert.ok(!html.includes('undefined') && !html.includes('>-<'), name);
  }
  assert.throws(() => renderRuleTableHtml('없는살'));
});
