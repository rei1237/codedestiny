/**
 * 최애운명(K-POP 케미) 공유 스냅샷 계약.
 * - 입력 검증은 서버가 하고, 저장 문서·OG HTML 어디에도 생일이 남지 않아야 한다.
 */
import {
  DESTINY_BIAS_SHARE_ID_PATTERN,
  DESTINY_BIAS_SHARE_RATE_LIMIT_MAX,
  DESTINY_BIAS_SHARE_TTL_MS,
  buildDestinyBiasOgHtml,
  collectDestinyBiasOgGlyphs,
  computeDestinyBiasShareContentHash,
  createDestinyBiasShare,
  destinyBiasShareRateLimitVerdict,
  findPublicDestinyBiasShare,
  normalizeDestinyBiasShareInput,
  projectDestinyBiasShare,
  resolveReferenceDate,
} from "../../worker/lib/destiny-bias-share.js";
import { runChemi } from "../../lib/idol-chemi/index.js";

const NOW = new Date("2026-10-04T03:00:00.000Z"); // KST 2026-10-04 12:00
const USER_BIRTH = "1995-03-14";
const input = {
  user: { birthDate: USER_BIRTH, calendarType: "solar" },
  partner: { kind: "roster", id: "bts-jungkook" },
  nickname: "민지",
  showNickname: true,
};
const requestUrl = "https://api.code-destiny.com/api/destiny-bias/share";
const env = { PUBLIC_SITE_URL: "https://code-destiny.com" };

function createMemoryModel() {
  const records = [];
  return {
    records,
    findOne(query) {
      return {
        lean: async () => records.find((record) => Object.entries(query).every(([key, value]) => record[key] === value)) || null,
      };
    },
    async create(record) {
      if (records.some((item) => item.shareId === record.shareId || (record.contentHash && item.contentHash === record.contentHash))) {
        const error = new Error("duplicate");
        error.code = 11000;
        throw error;
      }
      records.push({ ...record });
      return records[records.length - 1];
    },
  };
}

async function expectCode(promise, code) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("destiny-bias share — input validation", () => {
  it("rejects malformed birth date, under-age user, unknown partner, PII nickname", async () => {
    const model = createMemoryModel();
    const run = (patch) => createDestinyBiasShare({ input: { ...input, ...patch }, requestUrl, env, now: NOW, model });

    await expectCode(run({ user: { birthDate: "1995-13-40" } }), "DESTINY_BIAS_SHARE_BIRTH_DATE_INVALID");
    await expectCode(run({ user: { birthDate: "2015-01-01" } }), "DESTINY_BIAS_SHARE_UNDER_AGE");
    await expectCode(run({ partner: { kind: "roster", id: "nope-nobody" } }), "DESTINY_BIAS_SHARE_PARTNER_INVALID");
    await expectCode(run({ partner: { kind: "roster", id: "../etc" } }), "DESTINY_BIAS_SHARE_PARTNER_INVALID");
    await expectCode(run({ nickname: "010-1234-5678" }), "DESTINY_BIAS_SHARE_NICKNAME_INVALID");
    await expectCode(run({ nickname: "https://x.test" }), "DESTINY_BIAS_SHARE_NICKNAME_INVALID");
    expect(model.records).toHaveLength(0);
  });

  it("uses the server reference date and rejects spoofed dates beyond ±1 day", () => {
    expect(resolveReferenceDate("", NOW)).toBe("2026-10-04");
    expect(resolveReferenceDate("2026-10-05", NOW)).toBe("2026-10-04");
    expect(() => resolveReferenceDate("2030-01-01", NOW)).toThrow(expect.objectContaining({ code: "DESTINY_BIAS_SHARE_REFERENCE_DATE_INVALID" }));
    expect(() => resolveReferenceDate("yesterday", NOW)).toThrow(expect.objectContaining({ code: "DESTINY_BIAS_SHARE_REFERENCE_DATE_INVALID" }));
  });
});

describe("destiny-bias share — storage", () => {
  it("stores a public projection without the birth date, with dbs_ id and 90d TTL", async () => {
    const model = createMemoryModel();
    const created = await createDestinyBiasShare({ input, requestUrl, env, now: NOW, model });

    expect(created.reused).toBe(false);
    expect(created.snapshot.shareId).toMatch(DESTINY_BIAS_SHARE_ID_PATTERN);
    expect(created.shareUrl).toBe(`https://code-destiny.com/saju/destiny-bias/share/?s=${created.snapshot.shareId}`);
    expect(created.snapshot.partner).toMatchObject({ kind: "roster", id: "bts-jungkook" });
    expect(created.snapshot.nicknameDisplay).toBe("민지");
    expect(created.snapshot.minorMode).toBe(false);

    const serialized = JSON.stringify(model.records);
    expect(serialized).not.toContain(USER_BIRTH);
    expect(serialized).not.toContain("1995");
    expect(serialized).not.toContain("pillars");
    expect(serialized).not.toContain("1997-09-01"); // 최애 생일도 저장하지 않는다

    const record = model.records[0];
    expect(record.expiresAt.getTime() - record.createdAt.getTime()).toBe(DESTINY_BIAS_SHARE_TTL_MS);
    expect(DESTINY_BIAS_SHARE_TTL_MS).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it("stores the server-recomputed score and grade, ignoring client-sent values", async () => {
    const model = createMemoryModel();
    const { result } = runChemi({
      user: { birthDate: USER_BIRTH, calendarType: "solar" },
      partner: { kind: "roster", id: "bts-jungkook" },
      referenceDate: "2026-10-04",
    });
    const created = await createDestinyBiasShare({
      input: { ...input, score: 100, grade: "LEGENDARY", totalScore: 100 },
      requestUrl,
      env,
      now: NOW,
      model,
    });
    expect(created.snapshot.score).toBe(result.score.total);
    expect(created.snapshot.grade).toBe(result.score.grade);
    expect(created.snapshot.gradeTitle).toBe(result.score.gradeTitle);
    expect(model.records[0].scoreVersion).toBe(result.scoreVersion);
  });

  it("does not reuse another share whose score differs (score is in the content hash)", async () => {
    const base = projectDestinyBiasShare(normalizeDestinyBiasShareInput(input, NOW));
    const same = await computeDestinyBiasShareContentHash(base);
    const other = await computeDestinyBiasShareContentHash({ ...base, score: base.score + 1 });
    expect(other).not.toBe(same);
  });

  it("reads back pre-score shares with null score fields", async () => {
    const model = createMemoryModel();
    const created = await createDestinyBiasShare({ input, requestUrl, env, now: NOW, model });
    const record = model.records[0];
    delete record.score;
    delete record.grade;
    delete record.gradeTitle;
    const found = await findPublicDestinyBiasShare({ shareId: created.snapshot.shareId, now: NOW, model });
    expect(found).toMatchObject({ score: null, grade: null, gradeTitle: null });
  });

  it("reuses the same share for identical content and hides the nickname when not opted in", async () => {
    const model = createMemoryModel();
    const first = await createDestinyBiasShare({ input, requestUrl, env, now: NOW, model });
    const second = await createDestinyBiasShare({ input, requestUrl, env, now: NOW, model });
    expect(second.reused).toBe(true);
    expect(second.snapshot.shareId).toBe(first.snapshot.shareId);

    const anonymous = await createDestinyBiasShare({ input: { ...input, showNickname: false }, requestUrl, env, now: NOW, model });
    expect(anonymous.snapshot.nicknameDisplay).toBeNull();
    expect(anonymous.snapshot.shareId).not.toBe(first.snapshot.shareId);
    expect(model.records).toHaveLength(2);
  });

  it("switches to minor mode for an under-19 partner and reads back only active unexpired shares", async () => {
    const model = createMemoryModel();
    const minor = await createDestinyBiasShare({
      input: { ...input, partner: { kind: "roster", id: "ive-jang-wonyoung" } },
      requestUrl,
      env,
      now: new Date("2022-01-10T03:00:00.000Z"), // 장원영 만 17세 시점
      model,
    });
    expect(minor.snapshot.minorMode).toBe(true);

    const found = await findPublicDestinyBiasShare({ shareId: minor.snapshot.shareId, now: new Date("2022-01-11T00:00:00Z"), model });
    expect(found?.shareId).toBe(minor.snapshot.shareId);
    expect(JSON.stringify(found)).not.toContain("1995");

    const expired = await findPublicDestinyBiasShare({ shareId: minor.snapshot.shareId, now: new Date("2022-06-01T00:00:00Z"), model });
    expect(expired).toBeNull();
    expect(await findPublicDestinyBiasShare({ shareId: "not-an-id", model })).toBeNull();
  });
});

describe("destiny-bias share — rate limit and OG", () => {
  it("allows the 10th call and blocks the 11th with a Retry-After", () => {
    const now = NOW.getTime();
    expect(destinyBiasShareRateLimitVerdict({ count: DESTINY_BIAS_SHARE_RATE_LIMIT_MAX, resetAt: now + 60_000, now })).toBeNull();
    const blocked = destinyBiasShareRateLimitVerdict({ count: DESTINY_BIAS_SHARE_RATE_LIMIT_MAX + 1, resetAt: now + 60_000, now });
    expect(blocked).toMatchObject({ status: 429, error: "DESTINY_BIAS_SHARE_RATE_LIMITED", retryAfterSeconds: 60 });
  });

  it("renders OG markup without birth data and with escaped text", async () => {
    const model = createMemoryModel();
    const created = await createDestinyBiasShare({
      input: { ...input, nickname: "민지 & \"지\" <b>x</b>" },
      requestUrl,
      env,
      now: NOW,
      model,
    });
    const html = buildDestinyBiasOgHtml(created.snapshot, "code-destiny.com");
    expect(html).not.toContain("1995");
    expect(html).not.toContain("<b>"); // sanitizeShareText 가 태그를 먼저 제거
    expect(html).toContain("민지 &amp; &quot;지&quot;");
    expect(html).toContain(created.snapshot.chemiTypeNameKo);
    expect(html).toContain("오락용");
    const glyphs = collectDestinyBiasOgGlyphs(created.snapshot, "code-destiny.com");
    expect(glyphs).toContain("케");
    expect(glyphs).not.toContain("<");
  });
});
