// 코드로 확인한 계산·해석 방식만 적는다(2026-10-01 실측). 근거가 바뀌면 문구를 같이 고친다.
// 정적 셸은 key 로 i18n/authored 의 home.funnelCopy.expertise.* 번역을 쓴다.
export const EXPERTISE_FACTS = Object.freeze([
  // lib/korean-calendar/natal.js(결정론 원국) · worker/lib/saju-correction.js assertSajuPillarClaims(결과 검사, fortune/shared/result.ts)
  {key: 'engine', ko: '원국은 정해진 계산 규칙으로 세우고, AI는 계산된 결과를 바탕으로 해설을 써요. 해설에 계산과 다른 일주·시주가 적히면 서버가 걸러내요.'},
  // lib/korean-calendar/ganji.js — 월건은 절입 시각 기준
  {key: 'solarTerms', ko: '달은 음력 날짜가 아니라 절기가 바뀌는 시각을 기준으로 나눠요.'},
  // natal.js — 지역 평균시(경도) 보정과 과거 서머타임 차감. 균시차는 쓰지 않으므로 '진태양시'라 하지 않는다.
  {key: 'birthTime', ko: '출생지 경도와 과거 서머타임을 반영해 출생 시각을 보정해요.'},
  // natal.js — nightZiPolicy 'shift-day' 하나만 쓴다.
  {key: 'nightZi', ko: '보정한 시각으로 23시 이후에 태어났다면 다음 날 일주로 계산하는 한 가지 규칙을 일관되게 적용해요.'},
  // .github/workflows/pr-ci.yml 의 KASI 대조 — 계산 출처가 아니라 검증용이다.
  {key: 'kasi', ko: '계산 결과를 한국천문연구원 공개 데이터와 자동으로 대조해 검증해요.'},
  // docs/SERVICE_STRUCTURE.md · 천원 페이지 SYSTEMS
  {key: 'systems', ko: '사주·자미두수·숙요점·베다점·서양 점성술·타로, 여섯 체계를 각자의 기준으로 따로 풀어요.'},
]);
