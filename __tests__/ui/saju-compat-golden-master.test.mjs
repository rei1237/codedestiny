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
    'S0-love': 'aa5ebce32144b007',
    'S0-business': 'c0b409447297035f',
    'S0-friend': 'e4f0593923ed91fc',
    'S0-pastLife': 'fc093d2b35084491',
    'S1-love': 'cc083ce114b85d9d',
    'S1-business': 'abf004d12ba8dd04',
    'S1-friend': '0db3d20cde4387cf',
    'S1-pastLife': '62117452203d3945',
    'A0-love': '6a3530e7d229e051',
    'A0-business': '11760edfc0c28661',
    'A0-friend': 'dca5ab127d3e8c6c',
    'A0-pastLife': 'b5486ce4ec73a1a4',
    'A1-love': 'd98e26f538c21ce1',
    'A1-business': 'ac1d920ea5fbeabc',
    'A1-friend': '5b6ca5541be6949a',
    'A1-pastLife': '52e13a3ab7e7b901',
    'B0-love': 'b14f0e683b503789',
    'B0-business': '01db3260c640ea0f',
    'B0-friend': '8e7379fa31cbb917',
    'B0-pastLife': '4860cff456c94689',
    'B1-love': 'aae3b533bbaf2cf6',
    'B1-business': '104decf5e8f5a371',
    'B1-friend': '3b350e361d0a9db2',
    'B1-pastLife': 'c5cb8cc88ef8e066',
    'C0-love': '0c425d4147e5a55b',
    'C0-business': 'a0ea64e82180f351',
    'C0-friend': '26654941ba555bab',
    'C0-pastLife': '17b7a6b2d64812cd',
    'C1-love': '5be09753d7429d22',
    'C1-business': '8d0ca356feae493f',
    'C1-friend': 'c092048fe237dd6c',
    'C1-pastLife': 'ce30d90fb375e807',
    'D0-love': 'd5399a3533b5e782',
    'D0-business': '542ad87c5ac155ab',
    'D0-friend': '6a2c0c710d2df4af',
    'D0-pastLife': '6854d329b154f84d',
    'D1-love': '461bc7813e503963',
    'D1-business': 'd436f04cedfa7491',
    'D1-friend': '8bc7aebfb5266db6',
    'D1-pastLife': '2bd154ae25461420',
    'F0-love': 'c32afe1f2a59cf02',
    'F0-business': '477724f994636533',
    'F0-friend': '9c7bbe76291e351a',
    'F0-pastLife': 'ab0c717fa269cc29',
    'F1-love': 'd414ff09ceba2e5e',
    'F1-business': '170e5badcefea2c7',
    'F1-friend': 'b579e5962599e37b',
    'F1-pastLife': '17899fc1a9557f20',
  },
  corpus: '5e5805be08ffcd6745340fdecae316dc',
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
