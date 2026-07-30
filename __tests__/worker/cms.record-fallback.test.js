/**
 * @jest-environment node
 */

// 운세 해설 CMS 배선의 생명선은 "폴백 우선"이다.
// 오버라이드가 없거나 망가져 있어도 사용자 화면은 코드 기본값 그대로 나와야 한다.
// 여기가 깨지면 발행 실수 하나로 유료 결과 화면의 문장이 통째로 비어 버린다.

let store;

beforeEach(async () => {
  store = await import("../../worker/lib/cms-record-store.js");
  store.setCmsRecords({});
});

describe("워커 해설 표 오버라이드", () => {
  const fallbackRow = { instinct: "기본 본능", shadow: "기본 그림자", advice: "기본 조언" };

  test("오버라이드가 없으면 원본 객체를 그대로 돌려준다", () => {
    expect(store.cmsRecordRowSync("vedic-reading", "nakshatra", "Ashwini", fallbackRow)).toBe(fallbackRow);
  });

  test("지정한 필드만 덮고 나머지는 보존한다", () => {
    store.setCmsRecords({ "vedic-reading": { nakshatra: { Ashwini: { advice: "고친 조언" } } } });

    const merged = store.cmsRecordRowSync("vedic-reading", "nakshatra", "Ashwini", fallbackRow);
    expect(merged.advice).toBe("고친 조언");
    expect(merged.instinct).toBe("기본 본능");
    expect(merged.shadow).toBe("기본 그림자");
  });

  test("기본값에 없는 필드는 무시한다(표 구조를 늘리지 않는다)", () => {
    store.setCmsRecords({ "vedic-reading": { nakshatra: { Ashwini: { unknownField: "새 필드" } } } });

    const merged = store.cmsRecordRowSync("vedic-reading", "nakshatra", "Ashwini", fallbackRow);
    expect(merged).toBe(fallbackRow);
    expect(merged.unknownField).toBeUndefined();
  });

  test("빈 문자열·비문자열은 폴백을 밀어내지 못한다", () => {
    store.setCmsRecords({
      "vedic-reading": { nakshatra: { Ashwini: { advice: "   ", instinct: 42, shadow: null } } },
    });

    const merged = store.cmsRecordRowSync("vedic-reading", "nakshatra", "Ashwini", fallbackRow);
    expect(merged).toEqual(fallbackRow);
  });

  test("다른 항목은 영향을 받지 않는다", () => {
    store.setCmsRecords({ "vedic-reading": { nakshatra: { Ashwini: { advice: "고친 조언" } } } });

    const other = { instinct: "b", shadow: "b", advice: "b" };
    expect(store.cmsRecordRowSync("vedic-reading", "nakshatra", "Bharani", other)).toBe(other);
  });

  test("셀 단위 조회도 같은 규칙을 따른다", () => {
    store.setCmsRecords({ "sukuyo-day": { mansion: { 3: { great: "고친 조언" } } } });

    expect(store.cmsRecordCellSync("sukuyo-day", "mansion", 3, "great", "기본")).toBe("고친 조언");
    expect(store.cmsRecordCellSync("sukuyo-day", "mansion", 3, "caution", "기본")).toBe("기본");
    expect(store.cmsRecordCellSync("sukuyo-day", "mansion", 26, "great", "기본")).toBe("기본");
    expect(store.cmsRecordCellSync("unknown-ns", "mansion", 3, "great", "기본")).toBe("기본");
  });

  test("표 자체가 망가져도 던지지 않고 폴백한다", () => {
    store.setCmsRecords({ "sukuyo-day": { mansion: "문자열이 들어옴" } });
    expect(store.cmsRecordCellSync("sukuyo-day", "mansion", 3, "great", "기본")).toBe("기본");

    store.setCmsRecords(null);
    expect(store.cmsRecordCellSync("sukuyo-day", "mansion", 3, "great", "기본")).toBe("기본");
    expect(store.cmsRecordRowSync("sukuyo-day", "mansion", 3, fallbackRow)).toBe(fallbackRow);
  });
});
