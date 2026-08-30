import { connectDb } from "./db.js";
import { IdempotencyKey } from "./models.js";
import { getEnv } from "./env.js";
import { getKstDateKey, getKstDateParts, getSiteBaseUrl, getTodayPillars } from "./daily-fortune-task.js";
import { escapeTelegramHtml, sendTelegramMessage } from "./telegram.js";

/**
 * SNS 일일 자동 발행 태스크.
 *
 * 🔴 문안은 **템플릿으로만** 조립한다. LLM 실호출은 0회다(CLAUDE.md 절대 규칙 1) — 하루 한 번
 * 나가는 홍보 문구를 만들자고 과금 모델을 부르는 것은 비용 대비 얻는 것이 없고, 크론에서
 * 부르면 실패해도 아무도 안 본다.
 *
 * 🔴 기본값은 **꺼짐**이다. 공개 채널에 글이 나가는 것은 되돌릴 수 없는 외부 행위라,
 * 토큰이 우연히 들어와 있다는 이유로 발행이 시작되면 안 된다. SNS_DAILY_POST_ENABLED 를
 * 명시적으로 켜야 돈다.
 *
 * 🔴 크론을 새로 만들지 않는다. worker/wrangler.toml 의 crons 는 수정 금지 대상이라
 * 기존 일일 크론("0 22 * * *" = KST 07:00)의 태스크 목록에 얹혀 간다.
 */

// 중복 발행 잠금은 기존 IdempotencyKey 를 그대로 쓴다. {userId, endpoint, keyHash} 에 unique
// 인덱스가 있어(models.js:622) 삽입 자체가 원자적 선점이 되고, expiresAt TTL 이 청소까지 맡는다.
// 이걸 두고 새 컬렉션을 만들면 같은 장치가 둘이 된다(CLAUDE.md 원칙 6).
const SNS_POST_ENDPOINT = "cron:sns-daily-post";
const DEDUPE_TTL_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * 요일별 소개 코너. 인덱스는 getKstDateParts().day (0=일요일) 와 같은 축이다.
 * 🔴 경로는 전부 sitemap.xml 에 실재하는 것만 골랐다(2026-08-28 확인) — 링크가 404 면
 * 발행 자체가 역효과다. 여기에 경로를 더할 때도 사이트맵에서 먼저 확인할 것.
 */
const WEEKDAY_PICKS = [
  { path: "/tarot/", label: "타로", line: "한 장 뽑아 오늘의 마음을 읽어 보세요." },
  { path: "/saju/", label: "사주 분석", line: "타고난 기운의 균형부터 확인해 보세요." },
  { path: "/compatibility/", label: "궁합", line: "그 사람과의 결이 어떻게 맞물리는지 봅니다." },
  { path: "/dream/", label: "꿈해몽", line: "간밤의 꿈이 무엇을 가리키는지 찾아봅니다." },
  { path: "/astrology/", label: "점성술", line: "오늘의 별자리 흐름을 짚어 봅니다." },
  { path: "/love/", label: "연애운", line: "이번 주 인연의 온도를 확인해 보세요." },
  { path: "/ziwei/", label: "자미두수", line: "명반으로 보는 올해의 큰 흐름입니다." },
];

function isEnabled(env) {
  const raw = String(getEnv(env, "SNS_DAILY_POST_ENABLED") || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

function isDuplicateKeyError(error) {
  return error?.code === 11000 || String(error?.message || "").includes("E11000");
}

/**
 * 그날의 발행 본문. 순수 함수라 검증 스크립트가 시각만 주입해 그대로 확인할 수 있다.
 * @param {Object} env
 * @param {number} [now] epoch ms
 */
export function buildDailyPostText(env, now = Date.now()) {
  const today = getTodayPillars(now);
  const { day } = getKstDateParts(now);
  const base = getSiteBaseUrl(env);
  const pick = WEEKDAY_PICKS[day % WEEKDAY_PICKS.length];

  const lines = [
    `<b>🌙 ${escapeTelegramHtml(today.date)} (${escapeTelegramHtml(today.dayName)}) 오늘의 기운</b>`,
    "",
    `오늘의 일진은 <b>${escapeTelegramHtml(today.dayPillar)}</b>일, 올해는 <b>${escapeTelegramHtml(today.yearPillar)}</b>년입니다.`,
    "",
    `오늘의 운세 → ${escapeTelegramHtml(base)}/fortune/`,
    "",
    `<b>${escapeTelegramHtml(pick.label)}</b> ${escapeTelegramHtml(pick.line)}`,
    `${escapeTelegramHtml(base)}${escapeTelegramHtml(pick.path)}`,
  ];

  return lines.join("\n");
}

/**
 * @param {Object} env
 * @param {Object} [options]
 * @param {number} [options.now] 검증용 시각 주입
 * @param {Function} [options.fetchImpl] 검증용 fetch 주입 — 실제 발행 없이 계약을 확인한다
 */
export async function runSnsDailyPostTask(env, options = {}) {
  const now = typeof options.now === "number" ? options.now : Date.now();
  const { fetchImpl } = options;

  if (!isEnabled(env)) {
    console.log("[CRON] SNS Daily Post: SNS_DAILY_POST_ENABLED 가 꺼져 있다 — 건너뛴다.");
    return { ok: true, skipped: "disabled" };
  }

  const dateKey = getKstDateKey(now);
  await connectDb(env);

  // 🔴 그날 "실패" 로 남은 문서는 재선점한다 — 실패는 흔적으로 남기되(아래) 재시도를 막지는 않는다.
  // 관리자 수동 실행(routes/admin-sns.js)이 이 경로로 같은 날 다시 시도한다.
  const reclaimed = await IdempotencyKey.findOneAndUpdate(
    { userId: null, endpoint: SNS_POST_ENDPOINT, keyHash: dateKey, status: "failed" },
    { $set: { status: "processing", updatedAt: new Date(now), expiresAt: new Date(now + DEDUPE_TTL_MS) } },
    { new: true },
  );

  // 선점 실패(중복 키)는 "오늘 이미 나갔다(성공 또는 진행 중)"는 뜻이다. 크론 재시도로 같은 글이 두 번 나가는 것을 막는다.
  if (!reclaimed) {
    try {
      await IdempotencyKey.create({
        endpoint: SNS_POST_ENDPOINT,
        keyHash: dateKey,
        status: "processing",
        expiresAt: new Date(now + DEDUPE_TTL_MS),
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        console.log(`[CRON] SNS Daily Post: ${dateKey} 는 이미 발행됐다 — 건너뛴다.`);
        return { ok: true, skipped: "already_posted", dateKey };
      }
      throw error;
    }
  }

  const text = buildDailyPostText(env, now);
  const result = await sendTelegramMessage(env, { text, fetchImpl });

  if (!result.ok) {
    // 🔴 실패는 **지우지 않고 failed 로 남긴다.** 예전에는 잠금을 삭제했는데, 그러면 DB 에 흔적이 0건이라
    // 2026-08-29 크론이 왜 발행을 못 했는지 아무도 알 수 없었다(Workers Logs 도 꺼져 있었다).
    // failed 문서는 위 findOneAndUpdate 가 재선점하므로 재시도 경로도 그대로 열려 있다.
    await IdempotencyKey.updateOne(
      { endpoint: SNS_POST_ENDPOINT, keyHash: dateKey },
      {
        $set: {
          status: "failed",
          responseRef: { error: result.error, status: result.status ?? null, at: new Date(now).toISOString() },
          updatedAt: new Date(now),
        },
      },
    ).catch(() => {});
    console.error(`[CRON] SNS Daily Post: 발행 실패(${result.error}) — failed 로 기록했다.`);
    return { ok: false, error: result.error, dateKey };
  }

  await IdempotencyKey.updateOne(
    { endpoint: SNS_POST_ENDPOINT, keyHash: dateKey },
    {
      $set: {
        status: "success",
        responseRef: { messageId: result.data?.result?.message_id ?? null, at: new Date(now).toISOString() },
        updatedAt: new Date(now),
      },
    },
  ).catch(() => {});

  console.log(`[CRON] SNS Daily Post: ${dateKey} 발행 완료.`);
  return { ok: true, dateKey };
}
