/**
 * @jest-environment node
 */

let REVIEW_PRODUCTS;
let REVIEW_EXCLUDED_FEATURE_KEYS;
let getReviewProduct;
let resolveReviewProductByContentKey;
let resolveReviewProductByFeatureKey;
let normalizePaidFeatureKey;
let FEATURE_KEY_PRICE_TABLE;
let UNLOCK_PRODUCT_BY_FEATURE_KEY;
let screenReviewText;
let REVIEW_FLAGS;

beforeAll(async () => {
  const catalog = await import("../../worker/lib/review-product-catalog.js");
  REVIEW_PRODUCTS = catalog.REVIEW_PRODUCTS;
  REVIEW_EXCLUDED_FEATURE_KEYS = catalog.REVIEW_EXCLUDED_FEATURE_KEYS;
  getReviewProduct = catalog.getReviewProduct;
  resolveReviewProductByContentKey = catalog.resolveReviewProductByContentKey;
  resolveReviewProductByFeatureKey = catalog.resolveReviewProductByFeatureKey;

  const registry = await import("../../worker/lib/paid-feature-registry.js");
  normalizePaidFeatureKey = registry.normalizePaidFeatureKey;
  FEATURE_KEY_PRICE_TABLE = registry.FEATURE_KEY_PRICE_TABLE;
  UNLOCK_PRODUCT_BY_FEATURE_KEY = registry.UNLOCK_PRODUCT_BY_FEATURE_KEY;

  const moderation = await import("../../worker/lib/review-moderation.js");
  screenReviewText = moderation.screenReviewText;
  REVIEW_FLAGS = moderation.REVIEW_FLAGS;
});

describe("review product catalog", () => {
  test("모든 featureKey가 결제 레지스트리에 실재한다", () => {
    const known = new Set([
      ...Object.keys(FEATURE_KEY_PRICE_TABLE),
      ...Object.keys(UNLOCK_PRODUCT_BY_FEATURE_KEY),
    ]);

    const unknown = [];
    for (const product of REVIEW_PRODUCTS) {
      for (const rawKey of product.featureKeys) {
        const key = normalizePaidFeatureKey(rawKey);
        if (!known.has(key)) unknown.push(`${product.productId} -> ${rawKey}`);
      }
    }

    expect(unknown).toEqual([]);
  });

  test("한 featureKey는 한 상품 그룹에만 속한다", () => {
    const owners = new Map();
    for (const product of REVIEW_PRODUCTS) {
      for (const rawKey of product.featureKeys) {
        const key = normalizePaidFeatureKey(rawKey);
        if (!owners.has(key)) owners.set(key, []);
        owners.get(key).push(product.productId);
      }
    }

    const duplicated = [...owners.entries()]
      .filter(([, groups]) => groups.length > 1)
      .map(([key, groups]) => `${key}: ${groups.join(", ")}`);

    expect(duplicated).toEqual([]);
  });

  test("productId는 중복되지 않는다", () => {
    const ids = REVIEW_PRODUCTS.map((product) => product.productId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("프론트 별칭 featureKey도 상품으로 해석된다", () => {
    expect(resolveReviewProductByFeatureKey("gotoZiweiPremium")?.productId).toBe("ziwei");
    expect(resolveReviewProductByFeatureKey("openTarotLoveModal")?.productId).toBe("tarot");
    expect(resolveReviewProductByFeatureKey("gotoVedicPremium")?.productId).toBe("vedic");
  });

  test("ContentEntitlement의 contentKey도 상품으로 해석된다", () => {
    expect(resolveReviewProductByContentKey("saju.daeunAnalysis", "saju")?.productId).toBe("saju-ai");
    expect(resolveReviewProductByContentKey("ziwei.decadeLuck", "ziwei")?.productId).toBe("ziwei");
  });

  test("알 수 없는 키는 null을 돌려준다", () => {
    expect(resolveReviewProductByFeatureKey("")).toBeNull();
    expect(resolveReviewProductByFeatureKey("definitely-not-a-feature")).toBeNull();
    expect(getReviewProduct("no-such-product")).toBeNull();
  });

  test("초기 시딩 목표 상품 5종이 카탈로그에 있다", () => {
    for (const productId of ["saju-ai", "tarot", "ziwei", "destiny-island", "love-coach"]) {
      expect(getReviewProduct(productId)).not.toBeNull();
    }
  });

  test("레지스트리의 모든 유료 featureKey는 카탈로그에 있거나 명시적으로 제외돼야 한다", () => {
    const catalogKeys = new Set();
    for (const product of REVIEW_PRODUCTS) {
      for (const rawKey of product.featureKeys) {
        catalogKeys.add(normalizePaidFeatureKey(rawKey));
      }
    }

    const excludedKeys = new Set(REVIEW_EXCLUDED_FEATURE_KEYS.map((key) => normalizePaidFeatureKey(key)));

    const registryKeys = new Set([
      ...Object.keys(FEATURE_KEY_PRICE_TABLE),
      ...Object.keys(UNLOCK_PRODUCT_BY_FEATURE_KEY),
    ]);

    const unclassified = [];
    for (const rawKey of registryKeys) {
      const key = normalizePaidFeatureKey(rawKey);
      if (!catalogKeys.has(key) && !excludedKeys.has(key)) unclassified.push(rawKey);
    }

    expect(unclassified).toEqual([]);
  });
});

describe("review moderation", () => {
  test("정상 후기에는 플래그가 붙지 않는다", () => {
    const result = screenReviewText({
      title: "생각보다 구체적이었어요",
      body: "사주 분석이 생각보다 구체적이라 놀랐어요. 제 성향을 이해하는 데 도움이 됐습니다.",
    });
    expect(result.flags).toEqual([]);
  });

  test("외부 링크·오픈채팅은 광고로 잡는다", () => {
    expect(screenReviewText({ body: "여기가 더 좋아요 https://example.com 가보세요" }).flags)
      .toContain(REVIEW_FLAGS.ADVERTISING);
    expect(screenReviewText({ body: "오픈채팅 오시면 무료로 봐드립니다" }).flags)
      .toContain(REVIEW_FLAGS.ADVERTISING);
  });

  test("연락처·이메일은 개인정보로 잡는다", () => {
    expect(screenReviewText({ body: "연락처는 010-1234-5678 입니다 좋았어요" }).flags)
      .toContain(REVIEW_FLAGS.PERSONAL_INFO);
    expect(screenReviewText({ body: "메일 주세요 someone@example.com 감사합니다" }).flags)
      .toContain(REVIEW_FLAGS.PERSONAL_INFO);
  });

  test("반복 도배를 잡는다", () => {
    expect(screenReviewText({ body: "좋아요 좋아요 좋아요 좋아요 좋아요 좋아요 좋아요" }).flags)
      .toContain(REVIEW_FLAGS.SPAM);
    expect(screenReviewText({ body: "대박이네요ㅋㅋㅋㅋㅋㅋㅋㅋ 진짜 잘 맞았습니다" }).flags)
      .toContain(REVIEW_FLAGS.SPAM);
  });

  test("공백으로 우회한 욕설도 잡는다", () => {
    expect(screenReviewText({ body: "이거 진짜 시 발 별로임 돈 아까움" }).flags)
      .toContain(REVIEW_FLAGS.PROFANITY);
  });

  test("허위 구매 주장은 구매 미인증일 때만 잡는다", () => {
    const text = { body: "결제 했는데 결과가 안 나와요 환불 요청합니다" };
    expect(screenReviewText({ ...text, isVerifiedPurchase: false }).flags)
      .toContain(REVIEW_FLAGS.FALSE_PURCHASE_CLAIM);
    expect(screenReviewText({ ...text, isVerifiedPurchase: true }).flags)
      .not.toContain(REVIEW_FLAGS.FALSE_PURCHASE_CLAIM);
  });

  test("플래그마다 한국어 라벨이 있다", () => {
    const result = screenReviewText({ body: "https://example.com 010-1234-5678" });
    expect(result.labels.length).toBe(result.flags.length);
    expect(result.labels.every((label) => typeof label === "string" && label.length > 0)).toBe(true);
  });
});
