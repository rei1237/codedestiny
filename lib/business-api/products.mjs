export const BUSINESS_API_TERMS_VERSION = "business-api-v1";
const astronomyRights =
  "Swiss Ephemeris의 기업 API 제공 권리를 확인하고 있어요.";
const rows = [
  [
    "saju",
    "사주",
    99000,
    "회원 생년월일시로 내 앱에 명식표 표시",
    "pillars.year, pillars.month, pillars.day, pillars.hour, dayMaster",
    { birthDate: "1994-05-18", birthTime: "08:30", calendarType: "solar" },
  ],
  [
    "ziwei",
    "자미두수",
    50000,
    "출생 명반의 궁과 별 배치 표시",
    "mingGong, shenGong, palaces",
    { birthDate: "1994-05-18", birthTime: "08:30", gender: "F" },
  ],
  [
    "astrology",
    "서양 점성술",
    50000,
    "출생 차트의 행성과 하우스 표시",
    "",
    null,
    astronomyRights,
  ],
  [
    "vedic",
    "베다점",
    50000,
    "출생 차트의 라시와 나크샤트라 표시",
    "",
    null,
    astronomyRights,
  ],
  [
    "sukuyo",
    "숙요점",
    50000,
    "출생시각의 본명숙 표시",
    "",
    null,
    astronomyRights,
  ],
  [
    "tarot",
    "타로",
    30000,
    "선택한 카드로 자리별 타로 결과 표시",
    "spread, cards[].id, cards[].name, cards[].direction, cards[].position",
    { spread: "one_card", cards: [{ id: "M00", direction: "upright" }] },
  ],
];
const inputHelp = {
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
