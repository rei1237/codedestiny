/**
 * @jest-environment node
 */

// 글 저장 경로가 두 벌이었던 시절의 사고를 되풀이하지 않기 위한 계약 테스트.
//
// 같은 Insight 컬렉션을 /api/admin/content 와 /api/admin/insights 가 서로 다른 정규화기로 썼다.
// insights 쪽은 seo{} 중첩·summary·content·type 을 안 남겼는데 읽을 때는 중첩 seo 가 이겨서,
// 어느 화면에서 고쳤는지에 따라 SEO 가 되살아나거나 사라졌다. isPublished 도 status 와 따로
// 저장될 수 있었는데 공개 조회는 status 만 봐서 "관리자엔 발행됨, 사이트엔 안 나옴"이 났다.
//
// 목록 응답은 본문을 싣지 않아야 한다. 이력 스냅샷 하나하나가 본문 전체를 담고 있어서
// 20건 한 페이지가 게시글 본문 수백 벌을 실어 나르고 있었다.

import { __adminContentTestUtils } from "../../worker/routes/admin.js";

const { normalizeContentPayload, toContentItem, CONTENT_LIST_PROJECTION } = __adminContentTestUtils;

const BODY = {
  title: "테스트 글",
  slug: "test-post",
  summary: "요약입니다.",
  content: "<p>본문입니다.</p>",
  contentHtml: "<p>본문입니다.</p>",
  metaTitle: "메타 제목",
  metaDescription: "메타 설명입니다. 검색 결과에 나오는 문장.",
  ogTitle: "OG 제목",
  status: "published",
};

describe("글 저장 정규화 — 단일 경로", () => {
  test("중첩 seo{} 와 평면 SEO 필드를 항상 함께 쓴다", () => {
    const { payload } = normalizeContentPayload(BODY, "create");

    expect(payload.seo).toBeDefined();
    // 한쪽만 쓰면 읽을 때 이기는 쪽(중첩)이 낡은 값을 계속 이긴다.
    expect(payload.seo.metaTitle).toBe(payload.metaTitle);
    expect(payload.seo.metaDescription).toBe(payload.metaDescription);
    expect(payload.seo.ogTitle).toBe(payload.ogTitle);
    expect(payload.metaTitle).toBe("메타 제목");
  });

  test("summary 와 excerpt 를 함께 채운다", () => {
    const { payload } = normalizeContentPayload(BODY, "create");
    expect(payload.summary).toBe("요약입니다.");
    expect(payload.excerpt).toBe("요약입니다.");
  });

  test("isPublished 는 언제나 status 에서 파생된다", () => {
    const published = normalizeContentPayload({ ...BODY, status: "published" }, "create").payload;
    expect(published.status).toBe("published");
    expect(published.isPublished).toBe(true);

    const draft = normalizeContentPayload({ ...BODY, status: "draft" }, "create").payload;
    expect(draft.status).toBe("draft");
    expect(draft.isPublished).toBe(false);
  });

  // 공개 조회(worker/routes/insights.js buildPublicInsightStatusQuery)는 status 만 본다.
  // isPublished 를 따로 받아 주면 관리자 화면과 사이트가 갈린다.
  test("isPublished 를 직접 보내도 status 를 이기지 못한다", () => {
    const { payload } = normalizeContentPayload(
      { ...BODY, status: "draft", isPublished: true },
      "create",
    );
    expect(payload.status).toBe("draft");
    expect(payload.isPublished).toBe(false);
  });

  /* 두 편집기 모두 평면 metaTitle 을 보낸다(중첩 seo 객체를 보내지 않는다).
     update 모드의 "안 보낸 필드는 건드리지 않는다" 규칙이 이름만 보고 seo 를 지우면,
     갱신에서 seo 가 통째로 빠져 낡은 중첩값이 DB 에 남고 읽을 때 그게 이긴다. */
  test("평면 SEO 만 보낸 수정 요청도 중첩 seo{} 를 갱신 대상에 남긴다", () => {
    const { payload } = normalizeContentPayload(
      { metaTitle: "새 메타 제목" },
      "update",
      { status: "draft", seo: { metaTitle: "낡은 메타 제목" } },
    );

    expect(payload.seo).toBeDefined();
    expect(payload.seo.metaTitle).toBe("새 메타 제목");
    expect(payload.metaTitle).toBe("새 메타 제목");
  });

  test("SEO 를 아예 안 보낸 수정 요청은 seo 를 건드리지 않는다", () => {
    const { payload } = normalizeContentPayload({ title: "제목만 변경" }, "update", { status: "draft" });
    expect(payload).not.toHaveProperty("seo");
    expect(payload.title).toBe("제목만 변경");
  });

  test("같은 본문은 create/update 어느 모드로도 같은 SEO 를 만든다", () => {
    const created = normalizeContentPayload(BODY, "create").payload;
    const updated = normalizeContentPayload(BODY, "update", { status: "draft" }).payload;

    expect(updated.seo).toEqual(created.seo);
    expect(updated.metaTitle).toBe(created.metaTitle);
    expect(updated.isPublished).toBe(created.isPublished);
  });
});

describe("목록 응답 — 본문을 싣지 않는다", () => {
  const doc = {
    _id: "abc123",
    title: "테스트 글",
    slug: "test-post",
    status: "published",
    content: "<p>아주 긴 본문</p>",
    contentHtml: "<p>아주 긴 본문</p>",
    contentJson: { type: "doc" },
    revisionHistory: [{ id: "rev_1", contentHtml: "<p>예전 본문</p>" }],
  };

  test("목록 모드는 본문·이력 키를 아예 내보내지 않는다", () => {
    const item = toContentItem(doc, { list: true });

    for (const key of ["content", "contentHtml", "contentJson", "revisionHistory"]) {
      expect(item).not.toHaveProperty(key);
    }
    // 목록이 실제로 그리는 필드는 남아 있어야 한다.
    expect(item.title).toBe("테스트 글");
    expect(item.slug).toBe("test-post");
    expect(item.status).toBe("published");
  });

  test("상세 모드는 예전처럼 본문과 이력을 담는다", () => {
    const item = toContentItem(doc);
    expect(item.contentHtml).toContain("아주 긴 본문");
    expect(Array.isArray(item.revisionHistory)).toBe(true);
    expect(item.revisionHistory).toHaveLength(1);
  });

  // projection 이 본문을 다시 끌어오면 DB→워커 구간의 비용이 그대로 돌아온다.
  test("목록 projection 이 본문·이력 필드를 읽지 않는다", () => {
    const fields = CONTENT_LIST_PROJECTION.split(" ");
    for (const key of ["content", "contentHtml", "contentJson", "revisionHistory"]) {
      expect(fields).not.toContain(key);
    }
    // 목록 화면이 쓰는 대표 필드는 읽어야 한다.
    for (const key of ["title", "slug", "status", "seo", "publishedAt"]) {
      expect(fields).toContain(key);
    }
  });
});
