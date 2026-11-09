export const BUSINESS_API_TERMS_VERSION = "business-api-v1";
const vedicVerification =
  "대체 천문력으로 계산한 차트와 기존 서비스 결과를 대조하고 있어요.";
const chartInput = {
  birthDate: "2025-01-12",
  birthTime: "08:30",
  timezoneOffsetHours: 9,
  latitude: 37.5665,
  longitude: 126.978,
};
const rows = [
  [
    "saju",
    "사주",
    149000,
    "회원 생년월일시로 내 앱에 명식표 표시",
    "pillars.year, pillars.month, pillars.day, pillars.hour, dayMaster",
    { birthDate: "1994-05-18", birthTime: "08:30", calendarType: "solar" },
  ],
  [
    "ziwei",
    "자미두수",
    79000,
    "출생 명반의 궁과 별 배치 표시",
    "mingGong, shenGong, palaces",
    { birthDate: "1994-05-18", birthTime: "08:30", gender: "F" },
  ],
  [
    "astrology",
    "서양 점성술",
    79000,
    "출생 차트의 행성과 하우스 표시",
    "planets, ascendant, midheaven, houseSystem, houseCusps, providerVersion",
    chartInput,
  ],
  [
    "vedic",
    "베다점",
    79000,
    "출생 차트의 라시와 나크샤트라 표시",
    "lagna, planets, ayanamsha, providerVersion",
    chartInput,
    vedicVerification,
  ],
  [
    "sukuyo",
    "숙요점",
    79000,
    "출생시각의 본명숙 표시",
    "mansion, index, moonSiderealLongitude, providerVersion",
    { birthDate: "2026-05-18", birthTime: "08:30", timezoneOffsetHours: 9 },
    "제한된 출생 연도에서 검증한 예시입니다. 일반 출생 명반 판매를 준비하고 있어요.",
  ],
  [
    "tarot",
    "타로",
    49000,
    "선택한 카드로 자리별 타로 결과 표시",
    "spread, cards[].id, cards[].name, cards[].direction, cards[].position",
    { spread: "one_card", cards: [{ id: "M00", direction: "upright" }] },
  ],
];
const chartHelp =
  "양력 birthDate(YYYY-MM-DD), 확정된 birthTime(HH:mm), 출생 당시 UTC 시차 timezoneOffsetHours, latitude·longitude(도)가 필요합니다.";
const inputHelp = {
  astrology:
    chartHelp +
    " 1900~2050년의 열대황도, 지심 황경, Placidus 기준입니다. signIndex 0은 양자리입니다. 극권에서 하우스는 null입니다. 별자리 전환 직전·직후에는 수 분 차이로 판정이 바뀔 수 있습니다.",
  vedic:
    chartHelp +
    " 1956년 IMD 기준점의 항성황도를 사용합니다. 검증 예시는 라시·낙샤트라·파다와 라그나이며 과거 전 연대의 정확도는 검증 중입니다.",
  sukuyo:
    "양력 birthDate(YYYY-MM-DD), 확정된 birthTime(HH:mm), 출생 당시 UTC 시차 timezoneOffsetHours가 필수입니다. 지원 UTC 구간은 2024년과 2025년 각각 1월 1일 00:00부터 1월 30일 23:00 직전, 2026-03-23부터 2027-03-20 직전입니다. 경계 2각분 이내는 판정을 보류합니다. index는 0~26입니다.",
  saju: "birthDate는 YYYY-MM-DD입니다. calendarType은 solar(양력), lunar(음력), lunar_leap(윤달)입니다. birthTime은 HH:mm이며 생략하면 시주는 null입니다. 출생지 생략 시 서울 기준입니다. birthPlace로 timezone과 longitude를 함께 지정할 수 있습니다.",
  ziwei:
    "한국 출생 기준입니다. 양력 birthDate(YYYY-MM-DD), birthTime(HH:mm), gender(M 또는 F)를 입력하세요. 명궁·신궁과 12궁의 이름, 지지, 별 이름을 반환합니다.",
  tarot:
    "spread는 one_card 또는 three_card_past_present_future입니다. 메이저 카드는 M00~M21, 완드·컵·소드·펜타클은 각각 W·C·S·P와 01~14를 조합합니다. 파트너가 선택한 서로 다른 카드의 id와 direction(upright 또는 reversed)을 자리 순서로 전달하세요.",
};
export const businessProducts = rows.map(
  ([slug, name, priceKRW, use, fields, input, reason]) => ({
    slug,
    inputHelp: inputHelp[slug] || null,
    id: "business-api-" + slug,
    name: name + " API",
    priceKRW,
    use,
    fields,
    input,
    reason: reason || null,
  }),
);
export function businessProduct(id) {
  return businessProducts.find((p) => p.id === id);
}
export function perMinute(env = {}) {
  const value = Number(env.BUSINESS_API_PER_MINUTE ?? 60);
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error("INVALID_BUSINESS_API_LIMIT");
  return value;
}
export function saleReason(p, env) {
  return (
    p.reason ||
    (String(env.BUSINESS_API_SALES || "")
      .split(",")
      .map((s) => s.trim())
      .includes(p.slug)
      ? null
      : "운영 판매 준비 중입니다.")
  );
}
export function addKstMonth(value) {
  const offset = 9 * 3600000;
  const date = new Date(new Date(value).getTime() + offset);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const end = new Date(date);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  date.setUTCDate(Math.min(day, end.getUTCDate()));
  return new Date(date.getTime() - offset);
}
// Payment is the order ledger. Refunded purchases drop out of the chronological fold.
export function expiryForOrders(orders) {
  let expiry = null;
  for (const order of [...orders].sort(
    (a, b) =>
      new Date(a.paidAt) - new Date(b.paidAt) ||
      a.merchantUid.localeCompare(b.merchantUid),
  )) {
    if (order.status === "paid" && order.entitlementGrantedAt)
      expiry = addKstMonth(
        Math.max(Number(expiry), new Date(order.paidAt).getTime()),
      );
  }
  return expiry;
}
