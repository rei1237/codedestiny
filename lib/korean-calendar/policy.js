/**
 * 한국 음양력 코어 — 정책 상수.
 *
 * 🔴 기본값은 **현행 동작과 같아야 한다.** 그러지 않으면 마이그레이션 PR 이 "달력 수정"과
 * "정책 변경"을 한꺼번에 담게 되고, 그러면 어느 쪽이 결과를 바꿨는지 판정할 수 없다.
 */

/**
 * 야자시(夜子時) — 23시대 출생의 일진을 어느 날로 볼 것인가.
 *
 * 🔴 이 정책이 적용되는 축은 **일진 하나뿐**이다.
 *   · 시지는 자시가 23:00~00:59 로 자정을 감싸므로 날짜와 무관하다.
 *   · 세차·월건은 절기가 가르므로 날짜와 무관하다.
 * 세 축을 섞지 않는 것이 이 상수가 여기 따로 있는 이유다.
 */
export const NIGHT_ZI_POLICY = Object.freeze({
  /** 23시대 → 익일 일진. 셸의 _cdCivilDayPillar(js/saju-engine.js:1433)가 이 축이고, 그래서 기본값이다.
   * 🔴 **앱 localSajuCalculator 는 이 축이 아니다**(2026-08-28 정정 — 그렇게 적혀 있었으나 사실이 아니다).
   * 그쪽 기본값은 zashiMode `"late"` 이고(:556) 일자를 미는 것은 `"early"` 뿐이라(:803) keep-day 다.
   * 🔴 출생 원국을 세우는 세 소비자(life-book·new-year·destiny-bias)도 keep-day 를 **소스에 명시**한다
   * (verify:natal-day-pillar-axis ①). 즉 이 기본값에 기대는 23시대 원국 소비자는 현재 없다. */
  SHIFT_DAY: "shift-day",
  /** 23시대도 당일 일진. **"오늘 일진" 축**이고 호출부가 둘 있다 — 둘 다 KasiEngine.getGanji 를
   * { yaja: false } 로 부르거나 그 값과 나란히 쓰이므로 기본값으로 부르면 한 화면에 두 축이 섞인다.
   *   · js/saju-engine-tarot-sukuyo-quantum.js getGanZhiForDate (일·월운 카드 · js/share.js)
   *   · js/luck-sync-diary.js _coreGanjiPillars
   * 🔴 두 축이 다른 것은 유파 결정이라 이 코어가 정하지 않는다 — 호출부가 명시한다. */
  KEEP_DAY: "keep-day",
});

export const DEFAULT_NIGHT_ZI_POLICY = NIGHT_ZI_POLICY.SHIFT_DAY;
