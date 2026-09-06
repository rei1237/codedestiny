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
export function detectJong(p) {
  var GANHE = {
    '甲': { '己': 'earth' }, '己': { '甲': 'earth' },
    '乙': { '庚': 'metal' }, '庚': { '乙': 'metal' },
    '丙': { '辛': 'water' }, '辛': { '丙': 'water' },
    '丁': { '壬': 'wood' }, '壬': { '丁': 'wood' },
    '戊': { '癸': 'fire' }, '癸': { '戊': 'fire' },
  };
  var GANCHONG = [['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸']];
  var JIHE = {
    '子': { '丑': 'earth' }, '丑': { '子': 'earth' },
    '寅': { '亥': 'wood' }, '亥': { '寅': 'wood' },
    '卯': { '戌': 'fire' }, '戌': { '卯': 'fire' },
    '辰': { '酉': 'metal' }, '酉': { '辰': 'metal' },
    '巳': { '申': 'water' }, '申': { '巳': 'water' },
    '午': { '未': 'fire' }, '未': { '午': 'fire' },
  };
  var JICHONG = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];

  var gans = [p.y.g, p.m.g, p.d.g, p.h.g];
  var zhis = [p.y.j, p.m.j, p.d.j, p.h.j];

  var ganChongSet = {};
  GANCHONG.forEach(function (pr) {
    if (gans.indexOf(pr[0]) >= 0 && gans.indexOf(pr[1]) >= 0) {
      ganChongSet[pr[0]] = true; ganChongSet[pr[1]] = true;
    }
  });
  var jiChongSet = {};
  JICHONG.forEach(function (pr) {
    if (zhis.indexOf(pr[0]) >= 0 && zhis.indexOf(pr[1]) >= 0) {
      jiChongSet[pr[0]] = true; jiChongSet[pr[1]] = true;
    }
  });

  // ── 원국 원칙: 합의 힘이 충보다 강하다 ──────────────────────────
  // 천간합이 성립하면 충을 제압하여 합화된 오행으로 변환한다.
  // 합화된 천간은 ganChongSet에서 제거 → 이미 합으로 묶인 천간에 대한 충은 무효.
  var ganElMap = {};
  gans.forEach(function (g) { if (g && GAN[g]) ganElMap[g] = GAN[g].e; });
  var ganHeMerged = {};
  for (var gi = 0; gi < gans.length; gi++) {
    for (var gj = gi + 1; gj < gans.length; gj++) {
      var g1 = gans[gi], g2 = gans[gj];
      if (!g1 || !g2) continue;
      if (GANHE[g1] && GANHE[g1][g2]) {
        // 원국 천간합 우선 원칙: 충 여부 관계없이 합화 무조건 적용
        ganElMap[g1] = GANHE[g1][g2]; ganElMap[g2] = GANHE[g1][g2];
        ganHeMerged[g1] = true; ganHeMerged[g2] = true;
        // 합화된 천간은 충 대상에서 제외 (합이 충을 제압)
        delete ganChongSet[g1]; delete ganChongSet[g2];
      }
    }
  }
  var jiElMap = {};
  zhis.forEach(function (z) { if (z && JI[z]) jiElMap[z] = JI[z].e; });
  var jiHeMerged = {}; // 지지합은 충 우선 원칙 미적용 — jiChongSet 가드 유지
  for (var zi = 0; zi < zhis.length; zi++) {
    for (var zj = zi + 1; zj < zhis.length; zj++) {
      var z1 = zhis[zi], z2 = zhis[zj];
      if (!z1 || !z2) continue;
      if (JIHE[z1] && JIHE[z1][z2]) {
        if (!jiChongSet[z1] && !jiChongSet[z2]) {
          jiElMap[z1] = JIHE[z1][z2]; jiElMap[z2] = JIHE[z1][z2];
          jiHeMerged[z1] = true; jiHeMerged[z2] = true;
        }
      }
    }
  }

  var cnt = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  gans.forEach(function (g) { var e = ganElMap[g]; if (e && cnt[e] !== undefined) cnt[e]++; });
  zhis.forEach(function (z) { var e = jiElMap[z]; if (e && cnt[e] !== undefined) cnt[e]++; });
  if (p.m.j) { var mje = jiElMap[p.m.j]; if (mje && cnt[mje] !== undefined) cnt[mje]++; }

  var total = 9;
  var dom1 = 'wood', max1 = 0;
  Object.keys(cnt).forEach(function (e) { if (cnt[e] > max1) { max1 = cnt[e]; dom1 = e; } });
  var dom2 = 'wood', max2 = 0;
  Object.keys(cnt).forEach(function (e) {
    var par = parentOf(e);
    var c2 = cnt[e] + (par ? cnt[par] : 0);
    if (c2 > max2) { max2 = c2; dom2 = e; }
  });
  var pct1 = max1 / total * 100, pct2 = max2 / total * 100;
  var dayEl = GAN[p.d.g] && GAN[p.d.g].e;

  // ── 종격 판정 임계값: 80%+ 진종격 / 70~80% 가종격 ──────────────
  var JONG_TRUE_THRESHOLD = 80;
  var JONG_GA_THRESHOLD = 70;
  var HWA_GA_THRESHOLD = 75; // 합화格: 75%+ 성립 (가화格 시작)
  var HWA_TRUE_THRESHOLD = 80; // 합화格: 80%+ 진화格 / 75~80% 가화格

  // ── 합화格(化格) 특별 판별: 일간이 천간합화에 참여한 경우 ──────────
  // 예) 戊癸합화火: 癸 일간이 합화 → 합화된 오행+모(母)오행 기준으로 화格 판별
  var dayGanChar = p.d.g;
  if (ganHeMerged[dayGanChar]) {
    var hwaDom = ganElMap[dayGanChar]; // 합화된 오행
    var hwaPar = parentOf(hwaDom);    // 합화오행을 생하는 부모 오행
    var hwaCnt = (cnt[hwaDom] || 0) + (hwaPar ? (cnt[hwaPar] || 0) : 0);
    var hwaPct = hwaCnt / total * 100;
    if (hwaPct >= HWA_GA_THRESHOLD) {
      var hwaIsGaJong = (hwaPct < HWA_TRUE_THRESHOLD); // 75~80% = 가화格
      var hwaName = (hwaIsGaJong ? '가' : '') + '화格(化格)';
      return {
        isJong: true,
        isGaJong: hwaIsGaJong,
        dominant: hwaDom,
        parEl: hwaPar,
        pct: hwaPct.toFixed(0),
        name: hwaName,
        dayEl: dayEl,
        heHaPriority: true,
        ganHeMerged: ganHeMerged,
        jiHeMerged: jiHeMerged,
      };
    }
  }

  var maxPct = Math.max(pct1, pct2);
  // ── 단일 오행이 70% 미만이면 절대 종격 판별 모달을 띄우지 않음 ──
  if (pct1 < JONG_GA_THRESHOLD) return { isJong: false };
  if (maxPct >= JONG_GA_THRESHOLD) {
    // 지배 오행은 실제 최다 오행(dom1)이다. dom2 는 '자신+모오행' 합이라 pct2>=pct1 이 항상
    // 성립해, 예전 삼항식(pct1>=pct2 ? dom1 : dom2)은 dom1 쪽이 닿지 않는 죽은 분기였다.
    // 그 결과 동점일 때 cnt 키 순서로 엉뚱한 오행이 뽑혀 대운 길흉이 통째로 뒤집혔다.
    var dominant = dom1;
    var parEl = parentOf(dominant);
    // 세력 비율도 지배 오행 기준(자신+모오행)으로 맞춘다.
    var pct = (cnt[dominant] + (parEl ? (cnt[parEl] || 0) : 0)) / total * 100;
    var isGaJong = (pct < JONG_TRUE_THRESHOLD); // 70~80% = 가종격

    var jongName;
    if (dominant === dayEl) {
      var J_MAP = { 'wood': '곡직격(曲直格)', 'fire': '염상격(炎上格)', 'earth': '가색격(稼穡格)', 'metal': '종혁격(從革格)', 'water': '윤하격(潤下格)' };
      jongName = (isGaJong ? '가(假)' : '') + (J_MAP[dayEl] || '종왕격(從旺格)');
    } else if (parEl === dayEl) {
      jongName = (isGaJong ? '가' : '') + '종아격(從兒格)';
    } else if (dominant === parentOf(dayEl)) {
      jongName = (isGaJong ? '가' : '') + '종강격(從强格)';
    } else if (KE[dayEl] === dominant) {
      jongName = (isGaJong ? '가' : '') + '종재격(從財格)';
    } else if (KE[dominant] === dayEl) {
      jongName = (isGaJong ? '가' : '') + '종살격(從殺格)';
    } else {
      jongName = (isGaJong ? '가' : '') + '화격(化格)';
    }

    // 합화 우선 여부
    var hadChongOverride = (Object.keys(ganHeMerged).length > 0 || Object.keys(jiHeMerged).length > 0)
      && (GANCHONG.some(function (pr) { return gans.indexOf(pr[0]) >= 0 && gans.indexOf(pr[1]) >= 0; })
        || JICHONG.some(function (pr) { return zhis.indexOf(pr[0]) >= 0 && zhis.indexOf(pr[1]) >= 0; }));

    var jongResult = {
      isJong: true,          // 가종격도 isJong=true — 대운/세운 평가에 동일 적용
      isGaJong: isGaJong,    // 가종격 여부 (60~70%)
      dominant: dominant, parEl: parEl, pct: pct.toFixed(0), name: jongName, dayEl: dayEl,
      heHaPriority: hadChongOverride,
      ganHeMerged: ganHeMerged,
      jiHeMerged: jiHeMerged,
    };

    // ── 가종격은 대운 조건에 따라 진종격으로 전환될 수 있음 ──────────
    // 진종격(70%+) 이상도 반대세력 뿌리 검증
    var myForceCount = (cnt[dayEl] || 0) + (cnt[parentOf(dayEl)] || 0);
    var myForcePct = (myForceCount / total) * 100;
    var isFollowingOthers = (jongName.indexOf('종아격') >= 0 || jongName.indexOf('종재격') >= 0 || jongName.indexOf('종살격') >= 0 || jongName.indexOf('화격') >= 0);
    var JANGGAN_DB = CD_JANGGAN; /* 정본은 파일 상단 CD_JANGGAN */
    var rootElements = [dayEl, parentOf(dayEl)];
    var hasRootInJanggan = false;
    [p.y.j, p.m.j, p.d.j, p.h.j].forEach(function (z) {
      if (!z) return;
      (JANGGAN_DB[z] || []).forEach(function (jgGan) {
        if (GAN[jgGan] && rootElements.indexOf(GAN[jgGan].e) >= 0) hasRootInJanggan = true;
      });
    });

    // 가종격은 별도 'pending' 없이 바로 isGaJong=true로 처리
    // 진종격이라도 반대세력이 뚜렷하면 가종격으로 격하
    if (!isGaJong) {
      var opposingPct = ((total - myForceCount) / total) * 100;
      if (isFollowingOthers && (myForcePct >= 21 || hasRootInJanggan)) {
        jongResult.isGaJong = true;
        jongResult.name = '가(假)' + jongName;
      } else if (!isFollowingOthers && opposingPct >= 21) {
        jongResult.isGaJong = true;
        jongResult.name = '가(假)' + jongName;
      }
    }

    return jongResult;
  }
  return { isJong: false };
}
