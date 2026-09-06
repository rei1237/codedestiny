/**
 * 운기 판정 코어 — `js/luck-sync-diary.js` 축자 복사본.
 *
 * 셸 모달(`js/luck-sync-diary.js`)은 4,798줄짜리 IIFE 라 함수를 밖에서 부를 길이 없고
 * (`window.LuckSyncDiary` 는 open/close 만 내준다), 본문이 모달 DOM 과 엮여 있다.
 * `/diary` 는 **같은 판정을 내야 하므로** 계산 함수만 순수 ESM 으로 옮긴다.
 *
 * 🔴 **계산식은 한 글자도 바꾸지 않는다.** 동치는 `__tests__/ui/diary-fortune-parity.test.js`
 * 가 원본 소스를 중괄호 균형으로 잘라내 **실제로 실행**해 매번 다시 증명한다.
 *
 * 원본 위치(2026-09-06 기준): `js/luck-sync-diary.js` — SHENG/GEN/KE:235 / calcTenStar:239 /
 * calcGodlifeScores:528 / getLuckyElement:579 / _normalizeElementList:2663 /
 * _classifyDayFromSaju:2677
 *
 * ── 원본에서 바뀐 것 (계산이 아니라 배선) ────────────────────────────────────
 * 1. `_classifyDayFromSaju` 의 첫 줄 `var gz = getGanZhiByDate(dateObj)` 를 **인자로 승격**했다.
 *    날짜 → 일진 변환은 계층3 어댑터가 `lib/korean-calendar` 로 한다(야자시 KEEP_DAY · 조회 12시).
 * 2. 본문 `:2693-2694` 가 모듈 스코프 `_lsdCtx.dEl`/`_lsdCtx.luckyEl` 를 폴백으로 읽던 것을
 *    **인자 `ctxDayEl`/`ctxLuckyEl` 로 승격**했다. 🔴 `ctxLuckyEl` 은 폴백이 아니라 **상시 우선**
 *    값이다(`luckyEl = ctxLuckyEl || dayMasterEl`) — 어댑터가 기준일 일진으로 한 번 계산해
 *    모든 날짜에 같은 값을 넘겨야 모달과 같은 답이 나온다.
 * 3. 등급 라벨(`label`)은 옮기지 않는다. 원본의 `lsd.label.020`="강함"·`.021`="아주강함" 이
 *    **최하위 두 등급**에 붙어 있어 나쁜 날이 "아주강함"으로 읽힌다. `/diary` 는 `tone`
 *    열거값에만 매핑하고 등급명을 자체 어휘로 붙인다(셸 라벨 수정은 별도 후속 과제).
 */

/* ─── 천간/지지 오행 맵 ─────────────────────────────────────── */
export const GAN_ELEM = {
  '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire',
  '戊': 'earth', '己': 'earth', '庚': 'metal', '辛': 'metal',
  '壬': 'water', '癸': 'water',
};
export const JI_ELEM = {
  '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood',
  '辰': 'earth', '巳': 'fire', '午': 'fire', '未': 'earth',
  '申': 'metal', '酉': 'metal', '戌': 'earth', '亥': 'water',
};

/* ─── 십성 계산 ─────────────────────────────────────────────── */
export const ELEM_LIST = ['wood', 'fire', 'earth', 'metal', 'water'];
/* 🔴 이 축의 SHENG 은 "나를 생하는 오행"이고 GEN 이 "내가 생하는 오행"이다.
   `lib/saju/natal-power.js` 의 SHENG 은 **반대 방향**이다 — 두 원본 파일이 같은 이름을 다른
   뜻으로 쓴다. 모듈을 합치거나 상수를 공유하면 그 자리에서 판정이 조용히 뒤집힌다. */
export const SHENG = { wood: 'water', fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal' };
export const GEN = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
export const KE = { wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire' };

export function calcTenStar(dayGan, targetGan) {
  var dEl = GAN_ELEM[dayGan], tEl = GAN_ELEM[targetGan];
  if (!dEl || !tEl) return null;
  var yangGans = ['甲', '丙', '戊', '庚', '壬'];
  var dY = yangGans.indexOf(dayGan) >= 0;
  var tY = yangGans.indexOf(targetGan) >= 0;
  var same = dY === tY;
  if (tEl === dEl) return same ? '비견' : '겁재';
  if (tEl === GEN[dEl]) return same ? '식신' : '상관';
  if (tEl === KE[dEl]) return same ? '편재' : '정재';
  if (tEl === KE[GEN[GEN[GEN[GEN[dEl]]]]]) {
    // controlled by target (克我): 대입법 대신 역KE
    // nothing → handled below
  }
  // 나를 극하는 오행 (克我)
  var keMe = null;
  var els = ELEM_LIST;
  for (var i = 0; i < els.length; i++) {
    if (KE[els[i]] === dEl) { keMe = els[i]; break; }
  }
  if (tEl === keMe) return same ? '편관' : '정관';
  if (tEl === SHENG[dEl]) return same ? '편인' : '정인';
  return null;
}

/* ─── 갓생 5대 지수 계산 ─────────────────────────────────────── */
export function calcGodlifeScores(pillars, power, jong, todayGZ) {
  if (!pillars || !pillars.d || !pillars.d.g || !todayGZ || !todayGZ.g) return null;

  var dEl = GAN_ELEM[pillars.d.g] || 'earth';
  var yons = (power && power.yongshin) || [];
  var kis = (power && power.kijishin) || [];
  var todayEl = todayGZ ? (GAN_ELEM[todayGZ.g] || 'earth') : 'earth';
  var natal = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  [pillars.y, pillars.m, pillars.d, pillars.h].forEach(function (pillar) {
    if (!pillar) return;
    [pillar.g, pillar.j].forEach(function (char) {
      var element = GAN_ELEM[char] || JI_ELEM[char];
      if (element) natal[element] += 1;
    });
  });

  function score(els) {
    var s = 34;
    els.forEach(function (el) {
      s += natal[el] * 5;
      if (yons.indexOf(el) >= 0) s += 18;
      if (kis.indexOf(el) >= 0) s -= 13;
      if (el === todayEl) s += 10;
      if (SHENG[todayEl] === el) s += 5;
      if (KE[todayEl] === el) s -= 8;
      if (GEN[todayEl] === el) s += 3;
    });
    if (power && power.isStrong) s += 5;
    return Math.min(95, Math.max(15, Math.round(s)));
  }

  // keMe: 나를 극하는 오행
  var keMe = 'metal';
  ELEM_LIST.forEach(function (el) { if (KE[el] === dEl) keMe = el; });

  var wealthEl = KE[dEl];   // 내가 극하는 오행 → 재물성
  var loveEl = GEN[dEl];  // 내가 생하는 오행 → 식상 → 표현/연애
  var fameEl = keMe;      // 나를 극하는 오행 → 관성 → 명예
  var healthEl = dEl;       // 일간 자체 → 건강
  var studyEl = SHENG[dEl];// 나를 생하는 오행 → 인성 → 학습

  return {
    wealth: score([wealthEl]),
    love: score([loveEl, GEN[loveEl]]),
    fame: score([fameEl]),
    health: score([healthEl, yons[0] || 'earth']),
    study: score([studyEl]),
  };
}

/* ─── 행운 오행 결정 ─────────────────────────────────────────── */
export function getLuckyElement(power, jong, todayGZ) {
  if (jong && jong.isJong && jong.dominant) return jong.dominant;
  if (power && power.yongshin && power.yongshin.length > 0) return power.yongshin[0];
  if (todayGZ) return GAN_ELEM[todayGZ.g] || 'wood';
  return 'wood';
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function normalizeElementList(list) {
  return (Array.isArray(list) ? list : []).map(function (raw) {
    var v = String(raw || '').toLowerCase().trim();
    if (!v) return '';
    if (v === 'wood' || v === 'fire' || v === 'earth' || v === 'metal' || v === 'water') return v;
    if (v === '목' || v === '木') return 'wood';
    if (v === '화' || v === '火') return 'fire';
    if (v === '토' || v === '土') return 'earth';
    if (v === '금' || v === '金') return 'metal';
    if (v === '수' || v === '水') return 'water';
    return '';
  }).filter(Boolean);
}

/**
 * 하루의 운기 등급. 원본 `_classifyDayFromSaju(dateObj, pillars, power, jong)` 의 축자 복사본이며,
 * 날짜 → 일진 변환과 `_lsdCtx` 두 필드만 인자로 승격했다(파일 머리말 참조).
 *
 * @param {{g:string,j:string}|null} gz 그날의 일진. 어댑터가 `lib/korean-calendar` 로 만든다.
 * @param {string} ctxDayEl `pillars.d.g` 를 못 읽을 때의 일간 오행 폴백.
 * @param {string} ctxLuckyEl 기준일 기준 행운 오행. 🔴 폴백이 아니라 상시 우선값이다.
 */
export function classifyDayFromSaju(gz, pillars, power, jong, ctxDayEl, ctxLuckyEl) {
  var scores = calcGodlifeScores(pillars, power, jong, gz);
  if (!scores) {
    return { tone: 'profile', goodness: null, badness: null, scores: null, gz: gz };
  }
  var avg = Math.round((
    Number(scores.wealth)
    + Number(scores.love)
    + Number(scores.fame)
    + Number(scores.health)
    + Number(scores.study)
  ) / 5);

  var stemEl = (gz && gz.g) ? (GAN_ELEM[gz.g] || 'earth') : 'earth';
  var branchEl = (gz && gz.j) ? (JI_ELEM[gz.j] || 'earth') : stemEl;
  var dayMasterEl = (pillars && pillars.d && pillars.d.g) ? (GAN_ELEM[pillars.d.g] || 'earth') : (ctxDayEl || 'earth');
  var luckyEl = ctxLuckyEl || dayMasterEl;
  var yons = normalizeElementList(power && power.yongshin);
  var kis = normalizeElementList(power && power.kijishin);

  var huiPool = [];
  yons.forEach(function (el) {
    huiPool.push(el);
    huiPool.push(SHENG[el]);
  });
  if (!huiPool.length) huiPool.push(luckyEl);

  var positives = {};
  huiPool.forEach(function (el) {
    if (el) positives[el] = true;
  });
  positives[luckyEl] = true;

  var negatives = {};
  kis.forEach(function (el) {
    if (el) negatives[el] = true;
  });

  function _elementImpact(el, roleWeight) {
    var s = 0;
    if (positives[el]) s += roleWeight;
    if (negatives[el]) s -= roleWeight + 2;
    return s;
  }

  var elementTune = _elementImpact(stemEl, 16) + _elementImpact(branchEl, 12);
  var relationTune = 0;

  if (stemEl === dayMasterEl) relationTune += 6;
  if (branchEl === dayMasterEl) relationTune += 4;
  if (SHENG[dayMasterEl] === stemEl) relationTune += 4;
  if (SHENG[dayMasterEl] === branchEl) relationTune += 3;
  if (GEN[dayMasterEl] === stemEl) relationTune += 3;
  if (GEN[dayMasterEl] === branchEl) relationTune += 2;
  if (KE[dayMasterEl] === stemEl) relationTune += 2;
  if (KE[dayMasterEl] === branchEl) relationTune += 1;
  if (KE[stemEl] === dayMasterEl) relationTune -= 9;
  if (KE[branchEl] === dayMasterEl) relationTune -= 7;
  if (stemEl === luckyEl) relationTune += 4;
  if (branchEl === luckyEl) relationTune += 2;
  if (positives[stemEl] && positives[branchEl]) relationTune += 7;
  if (negatives[stemEl] && negatives[branchEl]) relationTune -= 8;
  if (positives[stemEl] && negatives[branchEl]) relationTune -= 3;
  if (negatives[stemEl] && positives[branchEl]) relationTune -= 2;

  var normalizedBase = 50 + ((avg - 50) * 0.58);
  var goodness = clamp(Math.round(normalizedBase + elementTune + relationTune), 8, 96);
  var badness = clamp(100 - goodness, 5, 90);
  var tone = 'normal';
  if (goodness >= 76) {
    tone = 'very-good';
  } else if (goodness >= 62) {
    tone = 'good';
  } else if (goodness >= 47) {
    tone = 'normal';
  } else if (goodness >= 33) {
    tone = 'bad';
  } else {
    tone = 'very-bad';
  }
  return {
    tone: tone,
    goodness: goodness,
    badness: badness,
    scores: scores,
    gz: gz,
  };
}
