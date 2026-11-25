import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { loadCompatEngine, makePillarPairGenerator } from '../fixtures/saju-compat-engine-loader.mjs';

// 기본 사주 궁합(레거시 결정론 엔진)의 현행 출력을 고정한다.
// analyzeCompat 가 구조화 사실(facts)을 추가로 내놓도록 바꿀 때에도 html·점수·등급은 바이트 단위로 같아야 한다.
// 기준값을 일부러 바꿔야 할 때만 GM_PRINT=1 로 새 값을 뽑아 이 파일에 반영한다.
const TYPES = ['love', 'business', 'friend'];

// 등급(S·A·B·C·D·F)마다 2쌍 — 년월일시 간지. 등급은 원점수 임계(≥13 S, ≥8 A, ≥3 B, ≥-2 C, ≥-6 D, 그 외 F).
const NAMED_PAIRS = {
  S: [['庚寅 乙亥 壬申 壬戌', '甲戌 丁巳 乙卯 己酉'], ['丁亥 丁丑 丁未 乙亥', '甲午 乙酉 丙辰 癸亥']],
  A: [['辛丑 辛卯 辛亥 壬寅', '癸巳 甲午 甲午 戊子'], ['戊辰 乙丑 壬子 壬寅', '甲戌 己巳 己丑 己未']],
  B: [['辛丑 丙子 丙辰 己巳', '辛巳 丁巳 辛亥 己丑'], ['乙酉 丁卯 丙子 甲子', '戊申 丁亥 戊子 甲寅']],
  C: [['戊寅 己亥 丙午 甲寅', '庚寅 甲午 丙寅 丙子'], ['己酉 丁卯 庚戌 癸亥', '戊寅 壬子 丙午 辛巳']],
  D: [['癸卯 庚戌 丙辰 壬申', '己丑 丙子 癸丑 乙亥'], ['甲戌 戊戌 丙寅 乙亥', '丁巳 己丑 壬辰 壬戌']],
  F: [['癸酉 乙未 辛巳 丁巳', '壬申 癸未 乙酉 壬寅'], ['癸酉 癸丑 乙卯 丁巳', '壬寅 辛丑 己酉 壬寅']],
};
const CORPUS_SEED = 20261004;
const CORPUS_SIZE = 300;

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const digestCompat = (c) => sha(JSON.stringify({
  score: c.score, integratedScore: c.integratedScore, grade: c.grade, gradeCls: c.gradeCls, label: c.label, emoji: c.emoji, html: c.html,
})).slice(0, 16);
const digestText = (text) => sha(String(text)).slice(0, 16);

function measure() {
  const engine = loadCompatEngine();
  engine.api.setUser('테스트');
  const named = {};
  const gradeSeen = {};
  for (const [letter, pairs] of Object.entries(NAMED_PAIRS)) {
    pairs.forEach(([a, b], index) => {
      for (const type of TYPES) {
        const c = engine.compat(a, b, type);
        named[`${letter}${index}-${type}`] = digestCompat(c);
        if (type === 'love') gradeSeen[`${letter}${index}`] = c.grade;
      }
      named[`${letter}${index}-pastLife`] = digestText(engine.pastLife(a, b));
    });
  }
  const next = makePillarPairGenerator(CORPUS_SEED);
  const corpus = crypto.createHash('sha256');
  const gradeCount = {};
  for (let i = 0; i < CORPUS_SIZE; i += 1) {
    const [a, b] = next();
    for (const type of TYPES) {
      const c = engine.compat(a, b, type);
      corpus.update(digestCompat(c));
      gradeCount[c.grade] = (gradeCount[c.grade] || 0) + 1;
    }
    corpus.update(digestText(engine.pastLife(a, b)));
  }
  return { named, gradeSeen, corpus: corpus.digest('hex').slice(0, 32), gradeCount };
}

// 기준값(현행 엔진 출력). 이 값이 바뀌면 사용자에게 보이는 궁합 결과가 달라진 것이다.
const EXPECTED = {
  named: {
    'S0-love': 'eb77d0a628c5c2ee',
    'S0-business': '6abf1039a5089169',
    'S0-friend': '9f35c84083ec6a8e',
    'S0-pastLife': 'c27c308fe5a929c1',
    'S1-love': '697e235b32e69bc2',
    'S1-business': '0e46beba1440a22c',
    'S1-friend': '9a08801daf8a3004',
    'S1-pastLife': '0e1c6027f7dce0a4',
    'A0-love': 'cb5e879ea7d3740d',
    'A0-business': 'c3efe8ebbd9a2e02',
    'A0-friend': '9d0667fe467e9375',
    'A0-pastLife': 'ce8cbc8a52c50e95',
    'A1-love': 'a58011786e387b7b',
    'A1-business': '545e80626988e8e5',
    'A1-friend': 'f6d3b287fc983377',
    'A1-pastLife': 'ad14c19df6fbfeed',
    'B0-love': '6d94a7ab2eb33f13',
    'B0-business': '8d138007c9c148d3',
    'B0-friend': '3f14e96c7b93e802',
    'B0-pastLife': '31c68bb264cf4908',
    'B1-love': '1a744000df3adce4',
    'B1-business': '1b2a82e355b6b5c5',
    'B1-friend': '08089228eca38128',
    'B1-pastLife': 'aa68029f6078b5ea',
    'C0-love': '57bc12703910368a',
    'C0-business': '51958c1b0bbbe76b',
    'C0-friend': 'df519d6084ebc9b6',
    'C0-pastLife': 'f20f535d6288a0e8',
    'C1-love': '595ada0125639634',
    'C1-business': '7b71d860f601bcbc',
    'C1-friend': '1e7590492caf81e6',
    'C1-pastLife': 'a14dce29a1eb9a9a',
    'D0-love': 'd51f1d5a3ab842f9',
    'D0-business': '10c520d73f6d6d74',
    'D0-friend': '30c57cb5d2a3f248',
    'D0-pastLife': '9145f4fbc22319a5',
    'D1-love': 'bd44deea81261c1d',
    'D1-business': '2e2a0a2d326c8fdd',
    'D1-friend': '2ca63580870809e3',
    'D1-pastLife': 'cdad1556c0a2afa4',
    'F0-love': 'ef98f6cdc5057d6b',
    'F0-business': '1294021c2b249b05',
    'F0-friend': '199b8a5311c13d06',
    'F0-pastLife': '535e73a3b7c0a1c1',
    'F1-love': 'b8c0eaa61f6f997a',
    'F1-business': 'd6244e4ba8b8d8c9',
    'F1-friend': 'dc80a84b53a93b9f',
    'F1-pastLife': 'ed860a711239cb47',
  },
  // 2026-10-26 종격 판정을 natal-core로 옮기며 코퍼스 300쌍 중 19쌍이 바뀌었다(고정 쌍 36건은 그대로).
  corpus: '80801ae6f6250b1cb22ada0ac9a5257b',
};

const measured = measure();

if (process.env.GM_PRINT) {
  console.log(JSON.stringify({ named: measured.named, corpus: measured.corpus, gradeSeen: measured.gradeSeen, gradeCount: measured.gradeCount }, null, 2));
}

test('로더가 궁합 분석 의존 심볼을 모두 실제 선언에서 가져온다', () => {
  const { closureSymbols } = loadCompatEngine();
  for (const name of ['analyzeCompat', 'analyzeSokCompat', 'analyzePastLifeCompat', 'calcNatalElement', 'analyzeJohu', 'calcPower', 'detectJong', 'GAN', 'JI']) {
    assert.ok(closureSymbols.includes(name), `closure missing ${name}`);
  }
});

test('고정 쌍이 의도한 등급 S·A·B·C·D·F 를 모두 덮는다', () => {
  const seen = new Set(Object.values(measured.gradeSeen).map((grade) => String(grade).charAt(0)));
  assert.deepEqual([...seen].sort(), ['A', 'B', 'C', 'D', 'F', 'S']);
  for (const [key, grade] of Object.entries(measured.gradeSeen)) {
    assert.equal(String(grade).charAt(0), key.charAt(0), `${key} grade ${grade}`);
  }
});

test('코퍼스가 모든 등급을 한 번 이상 지난다(분기 커버리지)', () => {
  const grades = new Set(Object.keys(measured.gradeCount).map((grade) => grade.charAt(0)));
  assert.deepEqual([...grades].sort(), ['A', 'B', 'C', 'D', 'F', 'S']);
});

test('고정 쌍 36건 + 전생 12건의 출력이 기준값과 같다', () => {
  assert.deepEqual(measured.named, EXPECTED.named);
});

test('결정론 코퍼스 300쌍 × 3유형 + 전생의 출력이 기준값과 같다', () => {
  assert.equal(measured.corpus, EXPECTED.corpus);
});
