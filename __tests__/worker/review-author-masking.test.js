/**
 * @jest-environment node
 */

// 공개 후기 응답에 원본 표시 이름이 실리지 않는지 지킨다.
//
// 🔴 이 레포의 User.name 은 가입 시 이메일 로컬파트에서 파생된다
//    (worker/lib/validation.js 의 deriveNameFromEmail). 그래서 리뷰의 authorName 을 그대로
//    내보내면 이메일 아이디가 공개된다. 마스킹을 프론트가 아니라 서버가 해야 하는 이유이고,
//    그 계약이 깨지면 여기가 먼저 빨개지도록 실제 응답 빌더를 직접 부른다.

let maskDisplayName;
let toPublicReview;
let toOwnReview;

beforeAll(async () => {
  ({ maskDisplayName } = await import("../../worker/lib/mask-display-name.js"));
  ({ toPublicReview, toOwnReview } = await import("../../worker/routes/reviews.js"));
});

function reviewDoc(authorName) {
  return {
    _id: "507f1f77bcf86cd799439011",
    authorName,
    authorImage: "https://example.com/a.png",
    productId: "saju-basic",
    productName: "사주 기본",
    rating: 5,
    title: "좋았습니다",
    body: "설명이 자세해서 도움이 되었어요.",
    locale: "ko",
    isVerifiedPurchase: true,
    usageSource: "purchase",
    displayedAt: new Date("2026-09-01T00:00:00.000Z"),
    status: "approved",
    adminNote: "",
    createdAt: new Date("2026-08-31T00:00:00.000Z"),
  };
}

describe("maskDisplayName", () => {
  test("첫 글자만 남기고 별 3개로 고정한다", () => {
    expect(maskDisplayName("seongbae555")).toBe("s***");
    expect(maskDisplayName("neo1234")).toBe("n***");
    expect(maskDisplayName("a.b-c_d")).toBe("a***");
    expect(maskDisplayName("홍길동")).toBe("홍***");
    // 별 개수가 고정이라 원본 길이가 새지 않는다.
    expect(maskDisplayName("ab")).toBe("a***");
    expect(maskDisplayName("abcdefghijklmnopqrstuvwxyz")).toBe("a***");
  });

  test("가릴 수 없는 입력을 안전하게 처리한다", () => {
    expect(maskDisplayName("x")).toBe("*"); // 1글자는 첫 글자마저 남기면 원본이 전부 드러난다
    expect(maskDisplayName("")).toBe("");
    expect(maskDisplayName(null)).toBe("");
    expect(maskDisplayName(undefined)).toBe("");
    expect(maskDisplayName("   ")).toBe("");
    expect(maskDisplayName("🙂ab")).toBe("🙂***"); // 서로게이트 페어가 깨지지 않는다
  });
});

describe("공개 후기 응답(GET /api/reviews)", () => {
  test("authorName 을 마스킹해 내보낸다", () => {
    expect(toPublicReview(reviewDoc("seongbae555")).authorName).toBe("s***");
  });

  test("직렬화된 payload 어디에도 원본 표시 이름이 남지 않는다", () => {
    const payload = JSON.stringify(toPublicReview(reviewDoc("seongbae555")));
    expect(payload).not.toContain("seongbae555");
  });

  test("응답 키 집합이 화이트리스트 그대로다 — 이메일성 필드가 끼어들 자리가 없다", () => {
    expect(Object.keys(toPublicReview(reviewDoc("seongbae555"))).sort()).toEqual([
      "authorImage",
      "authorName",
      "body",
      "displayedAt",
      "id",
      "isVerifiedPurchase",
      "locale",
      "productId",
      "productName",
      "rating",
      "title",
      "usageSource",
    ]);
  });
});

describe("본인 후기 응답(GET /api/reviews/mine)", () => {
  test("authorName 은 원본을 유지한다 — 자기가 쓴 자기 데이터라 가릴 이유가 없다", () => {
    expect(toOwnReview(reviewDoc("seongbae555")).authorName).toBe("seongbae555");
  });
});
