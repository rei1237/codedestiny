// 관리자 프롬프트 랩의 출생지 프리셋 — 도시 이름 → 좌표·시간대의 단일 정본.
//
// 워커(worker/lib/admin-geocode.js)와 관리자 UI(app/admin/prompts 의 datalist)가 이 파일을 함께
// import 한다. 양쪽에 따로 적으면 반드시 어긋나므로 순수 데이터만 두고 import 는 넣지 않는다
// (lib/admin/prompt-lab-registry.mjs 와 같은 이유·같은 규칙).
//
// 여기 없는 지명은 워커가 Nominatim 으로 조회한다 — 이 표는 "네트워크 없이 즉답할 도시" 목록이지
// 지원 도시의 전부가 아니다.
//
// 🔴 레포에는 이것 말고도 좌표표가 여럿 있다(js/saju-engine.js·worker/lib/vedic-ai-chart.js 등).
//    그쪽은 사용자용 런타임 경로라 통합 범위가 다르다 — 여기에 합치지 말 것.

export const ADMIN_GEOCODE_PRESETS = Object.freeze([
  { keys: ["서울", "seoul"], label: "서울", latitude: 37.5665, longitude: 126.9780, timezone: "Asia/Seoul" },
  { keys: ["부산", "busan"], label: "부산", latitude: 35.1796, longitude: 129.0756, timezone: "Asia/Seoul" },
  { keys: ["대구", "daegu"], label: "대구", latitude: 35.8714, longitude: 128.6014, timezone: "Asia/Seoul" },
  { keys: ["인천", "incheon"], label: "인천", latitude: 37.4563, longitude: 126.7052, timezone: "Asia/Seoul" },
  { keys: ["광주", "gwangju"], label: "광주", latitude: 35.1595, longitude: 126.8526, timezone: "Asia/Seoul" },
  { keys: ["대전", "daejeon"], label: "대전", latitude: 36.3504, longitude: 127.3845, timezone: "Asia/Seoul" },
  { keys: ["울산", "ulsan"], label: "울산", latitude: 35.5384, longitude: 129.3114, timezone: "Asia/Seoul" },
  { keys: ["세종", "sejong"], label: "세종", latitude: 36.4800, longitude: 127.2890, timezone: "Asia/Seoul" },
  { keys: ["제주", "jeju"], label: "제주", latitude: 33.4996, longitude: 126.5312, timezone: "Asia/Seoul" },
  { keys: ["도쿄", "tokyo"], label: "도쿄", latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo" },
  { keys: ["오사카", "osaka"], label: "오사카", latitude: 34.6937, longitude: 135.5023, timezone: "Asia/Tokyo" },
  { keys: ["베이징", "beijing"], label: "베이징", latitude: 39.9042, longitude: 116.4074, timezone: "Asia/Shanghai" },
  { keys: ["상하이", "shanghai"], label: "상하이", latitude: 31.2304, longitude: 121.4737, timezone: "Asia/Shanghai" },
  { keys: ["타이베이", "taipei"], label: "타이베이", latitude: 25.0330, longitude: 121.5654, timezone: "Asia/Taipei" },
  { keys: ["홍콩", "hong kong", "hongkong"], label: "홍콩", latitude: 22.3193, longitude: 114.1694, timezone: "Asia/Hong_Kong" },
  { keys: ["싱가포르", "singapore"], label: "싱가포르", latitude: 1.3521, longitude: 103.8198, timezone: "Asia/Singapore" },
  { keys: ["뉴욕", "new york", "nyc"], label: "뉴욕", latitude: 40.7128, longitude: -74.0060, timezone: "America/New_York" },
  { keys: ["로스앤젤레스", "la", "los angeles"], label: "로스앤젤레스", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles" },
  { keys: ["런던", "london"], label: "런던", latitude: 51.5072, longitude: -0.1276, timezone: "Europe/London" },
  { keys: ["파리", "paris"], label: "파리", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" },
  { keys: ["시드니", "sydney"], label: "시드니", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney" },
]);

/** 입력 자동완성용 도시 이름 목록. UI 의 datalist 가 그대로 쓴다. */
export function adminGeocodePresetLabels() {
  return ADMIN_GEOCODE_PRESETS.map((preset) => preset.label);
}
