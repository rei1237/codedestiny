/** @jest-environment node */
/**
 * scripts/lib/master-love-codex-repair.mjs — 부분 생성 세션 복구 계획.
 *
 * 이 계획은 결제한 고객의 문서를 고치는 경로라, 운영에서 확인할 수 없는 두 가지를 여기서 고정한다.
 *   · 멱등성: 같은 세션에 두 번 돌려도 두 번째는 아무 것도 쓰지 않는다.
 *   · 결제 무변경: 어떤 갈래에서도 결제·구매 권리 필드가 계획에 들어가지 않는다.
 * 기대 장 목록은 서버·크론과 같은 diagnoseCodexSession 에서 오므로, 여기서 20 같은 숫자를
 * 적어 두지 않는다 — 모드 표가 바뀌면 이 테스트도 따라간다.
 */
import { planCodexRepair, plannedFields, PAYMENT_FIELDS } from "../../scripts/lib/master-love-codex-repair.mjs";
import { diagnoseCodexSession } from "../../worker/routes/master-love-codex.js";

const NOW = Date.UTC(2026, 8, 19, 0, 0, 0);
const plan = (doc, options = {}) => planCodexRepair(doc, { diagnose: diagnoseCodexSession, now: NOW, ...options });
const specsFor = mode => diagnoseCodexSession({ mode, chapters: [] }).expected;

/** 하한(minChars 의 절반)을 넉넉히 넘는 본문. 길이만 의미가 있다. */
function chapterRow(spec) {
  return { id: spec.id, order: spec.order, title: spec.title, ok: true, body: "본".repeat(Math.max(2400, Number(spec.minChars) || 0)) };
}

function makeDoc({ mode = "solo", status = "generating", exposed = 1, saved = exposed, meta = {}, progress = null } = {}) {
  const specs = specsFor(mode);
  const rows = specs.slice(0, saved).map(chapterRow);
  return {
    _id: "000000000000000000000001",
    id: "mlc-test-session-0001",
    userId: "64b000000000000000000001",
    mode,
    status,
    chapters: rows.slice(0, exposed),
    totalCharCount: rows.slice(0, exposed).reduce((sum, row) => sum + row.body.length, 0),
    deliveryMeta: { savedChapters: rows, ...meta },
    generationProgress: progress,
    generationError: null,
    updatedAt: new Date(NOW - 60_000),
  };
}

/** MongoDB 의 $set/$unset 을 점 표기까지 흉내 낸다 — 멱등성은 "적용한 뒤 다시 계획"으로만 증명된다. */
function applyPlan(doc, result) {
  const next = structuredClone(doc);
  const walk = (root, path) => {
    const keys = path.split(".");
    const leaf = keys.pop();
    let node = root;
    for (const key of keys) node = node[key] ||= {};
    return [node, leaf];
  };
  for (const [path, value] of Object.entries(result.set || {})) {
    const [node, leaf] = walk(next, path);
    node[leaf] = value;
  }
  for (const path of Object.keys(result.unset || {})) {
    const [node, leaf] = walk(next, path);
    delete node[leaf];
  }
  next.updatedAt = new Date(NOW);
  return next;
}

describe("master-love-codex 복구 계획", () => {
  test("본문이 있는데 노출만 안 된 장은 LLM 재호출 없이 되살린다", () => {
    const doc = makeDoc({ exposed: 1, saved: 3 });
    const result = plan(doc);
    expect(result.exposedBefore).toBe(1);
    expect(result.exposedAfter).toBe(3);
    expect(result.set.chapters.map(row => row.id)).toEqual(specsFor("solo").slice(0, 3).map(spec => spec.id));
    expect(result.set.totalCharCount).toBe(result.set.chapters.reduce((sum, row) => sum + row.body.length, 0));
    expect(result.regenerationChapters).toBe(0);
  });

  test("완료 표기인데 장이 빠진 세션은 생성 중으로 되돌린다", () => {
    const result = plan(makeDoc({ status: "completed", exposed: 2, saved: 2 }));
    expect(result.set.status).toBe("generating");
    expect(result.regenerationChapters).toBe(specsFor("solo").length - 2);
    expect(result.set["deliveryMeta.repairSnapshot"]).toMatchObject({ status: "completed", chapterIds: expect.any(Array) });
  });

  test("한 장의 시도 소진으로 닫힌 세션은 남은 장이 있으면 다시 연다", () => {
    const [, second] = specsFor("solo");
    const result = plan(makeDoc({
      status: "generation_failed",
      exposed: 1,
      saved: 1,
      meta: { reviewRequired: true, reviewReason: "chapter_exhausted", attempts: { [second.id]: 3 } },
    }));
    expect(result.set["deliveryMeta.reviewRequired"]).toBe(false);
    expect(result.set.status).toBe("generating");
    expect(result.unset["deliveryMeta.reviewReason"]).toBe("");
    // --reset-attempts 가 없으면 소진된 장의 시도 기록은 그대로 둔다.
    expect(result.unset[`deliveryMeta.attempts.${second.id}`]).toBeUndefined();
    expect(result.regenerationChapters).toBe(specsFor("solo").length - 2);
  });

  test("같은 세션에 두 번 돌려도 두 번째는 아무 것도 쓰지 않는다", () => {
    const first = plan(makeDoc({ status: "completed", exposed: 1, saved: 3 }));
    const second = plan(applyPlan(makeDoc({ status: "completed", exposed: 1, saved: 3 }), first));
    expect(second.set).toBeNull();
    expect(second.blocked).toBe("nothing-to-do");
  });

  test("결제·구매 권리 필드는 어떤 계획에도 들어가지 않는다", () => {
    const docs = [
      makeDoc({ exposed: 1, saved: 3 }),
      makeDoc({ status: "completed", exposed: 2, saved: 2 }),
      makeDoc({ mode: "compat", status: "generation_failed", exposed: 1, saved: 1, meta: { reviewRequired: true } }),
    ];
    for (const doc of docs) {
      const fields = plannedFields(plan(doc, { resetAttempts: true }));
      expect(fields.length).toBeGreaterThan(0);
      for (const field of fields) {
        expect(PAYMENT_FIELDS.some(name => field === name || field.startsWith(`${name}.`))).toBe(false);
      }
    }
  });

  test("읽을 수 있던 장이 줄어드는 계획은 만들지 않는다", () => {
    const doc = makeDoc({ exposed: 3, saved: 3 });
    // 지금 하한에 못 미치는 옛 본문. 사본이 남지 않도록 양쪽을 같이 줄인다.
    doc.chapters[1] = { ...doc.chapters[1], body: "짧음" };
    doc.deliveryMeta.savedChapters[1] = doc.chapters[1];
    const result = plan(doc);
    expect(result.blocked).toBe("would-reduce-readable");
    expect(result.set).toBeNull();
  });

  test("남은 장이 전부 시도 소진이면 --reset-attempts 없이 열지 않는다", () => {
    const attempts = Object.fromEntries(specsFor("solo").slice(1).map(spec => [spec.id, 3]));
    const doc = makeDoc({ status: "generation_failed", exposed: 1, saved: 1, meta: { reviewRequired: true, attempts } });
    expect(plan(doc).blocked).toBe("exhausted-without-reset");

    const forced = plan(doc, { resetAttempts: true });
    expect(forced.set.status).toBe("generating");
    expect(forced.unset[`deliveryMeta.attempts.${specsFor("solo")[1].id}`]).toBe("");
    expect(forced.regenerationChapters).toBe(specsFor("solo").length - 1);
  });

  test("--metadata-only 는 노출만 되살리고 생성을 재개시키지 않는다", () => {
    const doc = makeDoc({ status: "generation_failed", exposed: 1, saved: 9, meta: { reviewRequired: true, reviewReason: "chapter_exhausted" } });
    const result = plan(doc, { metadataOnly: true });
    expect(result.set.chapters).toHaveLength(9);
    expect(result.regenerationChapters).toBe(0);
    // 세션을 여는 필드는 하나도 들어가지 않는다 — 이 계획으로는 LLM 이 다시 돌지 않는다.
    expect(result.set.status).toBeUndefined();
    expect(result.set["deliveryMeta.reviewRequired"]).toBeUndefined();
    expect(result.unset).toBeNull();
  });

  test("살아 있는 웨이브의 락은 빼앗지 않는다", () => {
    const progress = { lockedAt: new Date(NOW - 5_000), lockToken: "alive" };
    const result = plan(makeDoc({ status: "completed", exposed: 1, saved: 3, progress }));
    expect(result.set["generationProgress.lockedAt"]).toBeUndefined();
    expect(result.set["generationProgress.lockToken"]).toBeUndefined();
  });

  test("기대 장 수는 모드 표와 세션 manifest 에서 오고, 저장된 장 수로 역산하지 않는다", () => {
    for (const mode of ["solo", "compat"]) {
      const specs = specsFor(mode);
      expect(specs.length).toBeGreaterThan(1);
      expect(plan(makeDoc({ mode, exposed: 1, saved: 2 })).expected).toBe(specs.length);
    }
    // 생성 중 상품 구성이 바뀌어도, 세션에 고정된 목록이 그 세션의 정본이다.
    const pinned = specsFor("solo").slice(0, 4).map(spec => spec.id);
    const doc = makeDoc({ exposed: 1, saved: 2, meta: { manifest: { mode: "solo", chapterIds: pinned } } });
    expect(plan(doc).expected).toBe(pinned.length);
  });
});
