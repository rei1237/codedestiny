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
  /** 보정 시각 23시대 → 익일 일진.
   * 출생 원국은 natal.js의 calculateNatalSaju가 지역 평균시 보정 후 이 정책을 명시한다.
   * 정적 셸·앱·life-book·new-year·destiny-bias는 그 공통 원국을 소비하며,
   * 시주 천간도 확정된 같은 일간에서 파생한다(사주 시간 계약 검사로 검증).
   * 오늘의 일진 등 출생 원국 이외의 소비자는 각자의 시계와 정책을 명시한다. */
  SHIFT_DAY: "shift-day",
  /** 23시대도 당일 일진. **"오늘 일진" 축**이고 호출부가 둘 있다 — 둘 다 KasiEngine.getGanji 를
   * { yaja: false } 로 부르거나 그 값과 나란히 쓰이므로 기본값으로 부르면 한 화면에 두 축이 섞인다.
   *   · js/saju-engine-tarot-sukuyo-quantum.js getGanZhiForDate (일·월운 카드 · js/share.js)
   *   · js/luck-sync-diary.js _coreGanjiPillars
   * 🔴 두 축이 다른 것은 유파 결정이라 이 코어가 정하지 않는다 — 호출부가 명시한다. */
  KEEP_DAY: "keep-day",
});

export const DEFAULT_NIGHT_ZI_POLICY = NIGHT_ZI_POLICY.SHIFT_DAY;
