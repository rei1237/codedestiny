import * as SajuNatalCore from './natal-core/index.mjs';
import { sajuHapAssessment } from './luck-rules.js';
/**
 * 원국 억부(신강/신약)·종격 판정 — `js/saju-engine.js` 축자 복사본.
 *
 * ── 왜 복사인가 ──────────────────────────────────────────────────────────────
 * `js/saju-engine.js`(2.29MB)는 정적 셸 전용이다. 로드 체인이 11개 파일 ≈ 4.4MB 이고,
 * 본문이 셸 DOM(`heroAnimal`·`tsGrid` …)을 무방비로 만진다 — App Router 라우트에는 그 노드가
 * 없다. 그래서 `/diary` 는 **판정에 필요한 함수만** 순수 ESM 으로 옮긴다.
 *
 * 🔴 **계산식은 한 글자도 바꾸지 않는다.** 바뀐 것은 선언 형태(`var` → `export const`)뿐이고,
 * 함수 본문은 원본 그대로다. 동치는 `__tests__/ui/diary-fortune-parity.test.js` 가 원본 소스를
 * 잘라내 **실제로 실행**해 매번 다시 증명한다 — 이 파일을 손으로 "정리"하면 거기서 터진다.
 *
 * 원본 위치(2026-09-06 기준): `js/saju-engine.js` — GAN:1903 / JI:1910 / SHENG:1921 /
 * KE:1922 / whoControls:1923 / parentOf:1924 / CD_JANGGAN:1932 / calcPower:3853 / detectJong:3892
 *
 * 🔴 `lib/saju/myeongri-tables.js` 를 재사용하지 않는 이유: 그쪽 오행 값은 간체 중국어(`木`)이고
 * `verify:myeongri-tables` 가 `LunarUtil` 과 키 단위 전수 대조로 잠가 둔 표다. 여기 표는
 * `wood`/`fire` 어휘를 쓰는 별개 축이라, 옮겨 쓰면 변환 한 겹이 계산식 사이에 끼어든다.
 */

export const GAN = {
  '甲': { e: 'wood', y: '+', n: '갑목' }, '乙': { e: 'wood', y: '-', n: '을목' },
  '丙': { e: 'fire', y: '+', n: '병화' }, '丁': { e: 'fire', y: '-', n: '정화' },
  '戊': { e: 'earth', y: '+', n: '무토' }, '己': { e: 'earth', y: '-', n: '기토' },
  '庚': { e: 'metal', y: '+', n: '경금' }, '辛': { e: 'metal', y: '-', n: '신금' },
  '壬': { e: 'water', y: '+', n: '임수' }, '癸': { e: 'water', y: '-', n: '계수' },
};

export const JI = {
  '子': { e: 'water', y: '-', a: '쥐' }, '丑': { e: 'earth', y: '-', a: '소' },
  '寅': { e: 'wood', y: '+', a: '호랑이' }, '卯': { e: 'wood', y: '-', a: '토끼' },
  '辰': { e: 'earth', y: '+', a: '용' }, '巳': { e: 'fire', y: '+', a: '뱀' },
  '午': { e: 'fire', y: '-', a: '말' }, '未': { e: 'earth', y: '-', a: '양' },
  '申': { e: 'metal', y: '+', a: '원숭이' }, '酉': { e: 'metal', y: '-', a: '닭' },
  '戌': { e: 'earth', y: '+', a: '개' }, '亥': { e: 'water', y: '+', a: '돼지' },
};

/* 🔴 이 축의 SHENG 은 "내가 생하는 오행"이다(wood→fire). `lib/diary/fortune-core.js` 의
   같은 이름 상수는 **반대 방향**(wood→water, 나를 생하는 오행)이다 — 두 원본 파일이 같은
   이름을 다른 뜻으로 쓰고 있어서, 모듈을 합치면 그 자리에서 판정이 조용히 뒤집힌다. */
export const SHENG = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
export const KE = { wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire' };

export function whoControls(e) { var k = Object.keys(KE); for (var i = 0; i < k.length; i++) { if (KE[k[i]] === e) return k[i]; } return 'metal'; }
export function parentOf(e) { var k = Object.keys(SHENG); for (var i = 0; i < k.length; i++) { if (SHENG[k[i]] === e) return k[i]; } return 'water'; }

/* 지장간 — 배열 순서 = 여기(餘氣) → 중기(中氣) → 정기(正氣). 2원소면 여기 → 정기. */
export const CD_JANGGAN = {
  '子': ['壬', '癸'], '丑': ['癸', '辛', '己'], '寅': ['戊', '丙', '甲'], '卯': ['甲', '乙'], '辰': ['乙', '癸', '戊'], '巳': ['戊', '庚', '丙'],
  '午': ['丙', '己', '丁'], '未': ['丁', '乙', '己'], '申': ['戊', '壬', '庚'], '酉': ['庚', '辛'], '戌': ['辛', '丁', '戊'], '亥': ['戊', '甲', '壬'],
};

/* ─ 억부(신강/신약) 계산 ─ */
export function calcPower(p) {
  var dg = p.d.g, dayEl = GAN[dg] && GAN[dg].e;
  if (!dayEl) return null;
  var parEl = parentOf(dayEl);
  var score = 0;
  var mjEl = JI[p.m.j] && JI[p.m.j].e;
  if (mjEl) {
    if (mjEl === dayEl) score += 40;
    else if (mjEl === parEl) score += 27;
    else if (KE[mjEl] === dayEl) score -= 27;
    else if (SHENG[dayEl] === mjEl) score -= 10;
  }
  var djEl = JI[p.d.j] && JI[p.d.j].e;
  if (djEl) {
    if (djEl === dayEl || djEl === parEl) score += 13;
    else if (KE[djEl] === dayEl) score -= 9;
  }
  [p.y.g, p.y.j, p.m.g, p.h.g, p.h.j].forEach(function (c) {
    if (!c) return;
    var ce = (GAN[c] && GAN[c].e) || (JI[c] && JI[c].e); if (!ce) return;
    if (ce === dayEl || ce === parEl) score += 7;
    else if (KE[ce] === dayEl) score -= 7;
  });
  var isStrong = score >= 30;
  var yongshin, kijishin;
  if (isStrong) {
    var drain = SHENG[dayEl];
    var reEl = drain ? SHENG[drain] : null;
    var ctrlEl = whoControls(dayEl);
    yongshin = [drain, reEl, ctrlEl].filter(Boolean);
    kijishin = [dayEl, parEl].filter(Boolean);
  } else {
    yongshin = [dayEl, parEl].filter(Boolean);
    kijishin = [SHENG[dayEl], whoControls(dayEl), KE[dayEl]].filter(Boolean);
  }
  return { isStrong: isStrong, score: score, yongshin: yongshin, kijishin: kijishin, dayEl: dayEl, parEl: parEl };
}

/* ─ 종격(從格) 감지 — 천간합/충·지지합/충 반영, 70% 기준 ─ */
export function detectJong(p){
  // 종격·격국은 원국으로만 판정한다. 설문·사건 응답은 받지 않는다.
  // lib/saju/natal-power.js 에 이 함수만 복사되므로 헬퍼(_sajuNatalCore) 없이 직접 찾는다.
  var core = typeof SajuNatalCore !== 'undefined' ? SajuNatalCore : (typeof window !== 'undefined' ? window.SajuNatalCore : null);
  if (!core || typeof core.analyzeNatalCore !== 'function') throw new Error('SajuNatalCore 미로드 — js/core/saju/natal-core.generated.js 가 먼저 실행돼야 한다');
  return core.legacyJongShape(core.analyzeNatalCore(p));
}
