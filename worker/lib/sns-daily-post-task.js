import { connectDb, withMongoRetry } from "./db.js";
import { IdempotencyKey } from "./models.js";
import { getEnv } from "./env.js";
import { getKstDateKey, getKstDateParts, getSiteBaseUrl, getTodayPillars } from "./daily-fortune-task.js";
import { escapeTelegramHtml, sendTelegramMessage } from "./telegram.js";
import { postThreadsChain } from "./threads.js";
import { buildThreadsDayContext, buildThreadsPostChain } from "./threads-daily-content.js";
import { writeDailyThreadsCopy } from "./threads-ai-writer.js";

/**
 * SNS 일일 자동 발행 태스크. 채널은 텔레그램 · Threads(Meta) 둘이다.
 *
 * 🔴 **텔레그램 문안은 템플릿 전용이고 LLM 을 부르지 않는다.** Threads 문안만 2026-09-01 부터
 * 하이브리드다(사용자 결정): 십성·십이운성·신살·좋은 글자는 정본 표가 계산하고(daily-stem-guidance.js),
 * 모델은 그 사실을 문장으로 옮기기만 한다(threads-ai-writer.js). 스위치 SNS_THREADS_AI_ENABLED 가
 * 꺼져 있거나 호출·검증이 실패하면 **문안 전체가 결정론 템플릿으로 되돌아가고 발행은 계속된다** —
 * 모델이 죽었다고 그날 글이 안 나가면 안 된다.
 *
 * 🔴 기본값은 **꺼짐**이다. 공개 채널에 글이 나가는 것은 되돌릴 수 없는 외부 행위라,
 * 토큰이 우연히 들어와 있다는 이유로 발행이 시작되면 안 된다. SNS_DAILY_POST_ENABLED 를
 * 명시적으로 켜야 돌고, Threads 는 거기에 더해 SNS_THREADS_POST_ENABLED **와** 토큰 존재를
 * 둘 다 요구한다(스테이징에는 토큰을 넣지 않는다).
 *
 * 🔴 크론을 새로 만들지 않는다. worker/wrangler.toml 의 crons 는 수정 금지 대상이라
 * 기존 일일 크론("0 22 * * *" = KST 07:00)의 태스크 목록에 얹혀 간다.
 *
 * 🔴 **채널이 하나라도 실패하면 마지막에 던진다.** 예전에는 {ok:false} 를 돌려주고 끝냈는데,
 * worker/index.js 의 크론 래퍼는 **던진 것만** 잡아 사람에게 알린다. 그래서 2026-08-29 에
 * 발행이 0건이었는데도 알림이 0건이었다. 잠금 문서에 사유를 기록한 **뒤에** 던진다.
 *
 * 🔴 이 파일과 threads-daily-content.js 는 서로를 import 한다(WEEKDAY_PICKS ↔ buildThreadsPostChain).
 * 두 모듈 다 평가 시점에는 상대의 바인딩을 건드리지 않고 **호출 시점에만** 쓰므로 순환이 안전하다.
 * WEEKDAY_PICKS 를 저쪽으로 옮기면 scripts/verify-sns-daily-post.mjs 의 소스 파싱이 깨진다.
 */

// 중복 발행 잠금은 기존 IdempotencyKey 를 그대로 쓴다. {userId, endpoint, keyHash} 에 unique
// 인덱스가 있어(models.js:622) 삽입 자체가 원자적 선점이 되고, expiresAt TTL 이 청소까지 맡는다.
// 이걸 두고 새 컬렉션을 만들면 같은 장치가 둘이 된다(CLAUDE.md 원칙 6).
const SNS_POST_ENDPOINT = "cron:sns-daily-post";
const DEDUPE_TTL_MS = 3 * 24 * 60 * 60 * 1000;

// 🔴 채널마다 잠금 키가 다르다 — 한 채널이 실패해도 다른 채널의 재시도를 막지 않는다.
// 텔레그램은 **접미사 없이 dateKey 그대로** 둔다(기존 잠금 문서를 고아로 만들지 않는다).
const THREADS_KEY_SUFFIX = ":threads";

/**
 * 굳은 잠금(= processing 인 채 남은 문서)을 회수해도 되는 최소 나이.
 *
 * 🔴 **이 값은 안전 장치가 아니다.** 안전은 아래 markSendStarted 표식이 진다 — 표식이 없는
 * processing 은 "네트워크 호출이 0회였음"이 증명된 상태다. 시간만으로 회수하면 ⓐ 아무것도 안 나갔다
 * ⓑ 일부 나갔다 ⓒ 다 나갔는데 기록만 실패했다가 DB 상 구분되지 않는데, Threads 는 6글 × 왕복 12회라
 * 벽시계 대부분이 ⓑ·ⓒ 구간이다(2026-09-02 에 실제로 그렇게 중복 발행됐다).
 *
 * 그래서 여기서 정하는 것은 **동시성뿐이다**: 10분 크론 주기보다 크고, 살아 있는 실행의
 * 선점→표식 구간(DB 왕복 1회, op 예산 8초)보다 두 자릿수 배 크다.
 */
const STALE_PROCESSING_MS = 15 * 60 * 1000;

/**
 * 같은 날 자동 재시도 창(UTC). 일일 크론은 22:00Z 에 돌고 10분 크론은 매 10분마다 도는데,
 * 22:00 정각은 두 크론이 같은 아이솔레이트에서 겹치므로 분 10 부터 연다(22:10~22:50, 하루 5회).
 *
 * 🔴 창을 넓히면 안 된다 — KST 자정(15:00Z)을 넘기면 dateKey 가 바뀌어 **다음 날 글을 00:10 에**
 * 발행하게 된다. 발행 시각을 바꾸는 것은 요청받은 적 없는 동작 변경이다.
 */
const RECOVERY_UTC_HOUR = 22;
const RECOVERY_MIN_UTC_MINUTE = 10;

// 장기 토큰 수명은 60일이다(Threads 공식 문서, 2026-08-31 확인). D-14 에 경고를 시작한다.
const THREADS_TOKEN_WARN_AFTER_DAYS = 46;

/**
 * 요일별 소개 코너. 인덱스는 getKstDateParts().day (0=일요일) 와 같은 축이다.
 * 🔴 경로는 전부 sitemap.xml 에 실재하는 것만 골랐다(2026-08-28 확인) — 링크가 404 면
 * 발행 자체가 역효과다. 여기에 경로를 더할 때도 사이트맵에서 먼저 확인할 것.
 */
export const WEEKDAY_PICKS = [
  { path: "/tarot/", label: "타로", line: "한 장 뽑아 오늘의 마음을 읽어 보세요.", tag: "타로" },
  { path: "/saju/", label: "사주 분석", line: "타고난 기운의 균형부터 확인해 보세요.", tag: "사주" },
  { path: "/compatibility/", label: "궁합", line: "그 사람과의 결이 어떻게 맞물리는지 봅니다.", tag: "궁합" },
  { path: "/dream/", label: "꿈해몽", line: "간밤의 꿈이 무엇을 가리키는지 찾아봅니다.", tag: "꿈해몽" },
  { path: "/astrology/", label: "점성술", line: "오늘의 별자리 흐름을 짚어 봅니다.", tag: "별자리운세" },
  { path: "/love/", label: "연애운", line: "이번 주 인연의 온도를 확인해 보세요.", tag: "연애운" },
  { path: "/ziwei/", label: "자미두수", line: "명반으로 보는 올해의 큰 흐름입니다.", tag: "자미두수" },
];

/**
 * 발행 문안에 붙는 고정 해시태그(앞의 # 은 렌더 시점에 붙인다).
 * 🔴 채널마다 기능이 달라 개수를 통일하지 않는다:
 *   - 텔레그램: 해시태그가 채널 내 검색 대상이라 여러 개가 값을 낸다.
 *   - Threads: **게시물당 토픽 태그 1개만 기능한다.** 두 번째부터는 글자 그대로 보인다.
 * 🔴 공백·문장부호를 넣지 말 것 — 두 채널 모두 첫 공백에서 태그가 끊긴다.
 */
export const DAILY_HASHTAGS = ["오늘의운세", "무료운세", "코드데스티니"];

/** Threads 루트 글의 토픽 태그. 위 규칙 때문에 **1개뿐이다.** */
export const THREADS_ROOT_HASHTAG = "오늘의운세";

function isSwitchOn(env, key) {
  const raw = String(getEnv(env, key) || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

function isEnabled(env) {
  return isSwitchOn(env, "SNS_DAILY_POST_ENABLED");
}

/**
 * Threads 를 돌려도 되는지. 못 돌리는 사유 문자열을 돌려주고, 돌려도 되면 null 이다.
 * 🔴 스위치와 토큰을 **둘 다** 요구한다 — 어느 하나만으로 공개 발행이 시작되면 안 된다.
 */
export function getThreadsSkipReason(env) {
  if (!isSwitchOn(env, "SNS_THREADS_POST_ENABLED")) return "threads_disabled";
  if (!getEnv(env, "THREADS_ACCESS_TOKEN")) return "missing_threads_token";
  return null;
}

function isDuplicateKeyError(error) {
  return error?.code === 11000 || String(error?.message || "").includes("E11000");
}

/** 텔레그램 문안의 해시태그 줄. 고정 태그 뒤에 그날 요일 코너 태그를 하나 더 붙인다. */
function telegramHashtagLine(pick) {
  const tags = pick?.tag ? DAILY_HASHTAGS.concat(pick.tag) : DAILY_HASHTAGS;
  return tags.map((tag) => `#${escapeTelegramHtml(tag)}`).join(" ");
}

/**
 * 그날의 텔레그램 발행 본문. 순수 함수라 검증 스크립트가 시각만 주입해 그대로 확인할 수 있다.
 * 🔴 parse_mode:"HTML" 전용이다 — Threads 는 태그를 해석하지 않으므로 이 문안을 재사용하지 않는다.
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
    "",
    telegramHashtagLine(pick),
  ];

  return lines.join("\n");
}

/**
 * 그날 잠금 문서를 **재선점해도 되는** 조건.
 *
 * 인라인 객체가 아니라 내보내는 순수 함수인 이유는 verify:sns-daily-post 가 정규식이 아니라
 * **실제 필터 객체**를 검사하게 하기 위해서다 — 예전 정규식 단언은 `[\s\S]*?` 가 파일 끝까지 훑어
 * 아래 실패 기록의 `status:"failed"` 를 우연히 잡고 **잘못된 이유로** 통과했다.
 *
 * 🔴 공통 조건 — **이미 일부라도 공개된 날은 어떤 분기로도 재선점하지 않는다**
 * (responseRef.ids 가 없거나 비어 있어야 한다). Threads 체인은 언제나 1번 글부터 발행하므로,
 * 2번째 글에서 죽은 날을 재시도하면 이미 나간 1번 글이 계정에 한 번 더 올라간다. 2026-09-02 에
 * 실제로 그렇게 중복 발행됐다(같은 날 관리자 실행 2회). "나간 데부터 이어 붙이기"는 성립하지 않는다 —
 * 문안은 실행할 때마다 새로 쓰므로 재시도분은 다른 원고의 뒷부분이 된다. 그래서 부분 발행된 날은
 * 그대로 두고 다음 날 dateKey 에서 다시 시작한다.
 *
 * 분기 ① `failed` — 실패는 흔적으로 남기되(아래 runChannel) 재시도를 막지는 않는다.
 *   관리자 수동 실행(routes/admin-sns.js)이 이 경로로 같은 날 다시 시도한다.
 * 분기 ② 굳은 `processing` — 잠금을 잡은 뒤 **표식(sendStartedAt)을 남기기 전에** 죽은 문서.
 *   🔴 표식이 없다는 것은 send() 를 한 번도 안 불렀다는 **증명**이라 중복 발행 위험이 0 이다.
 *   이 분기가 없으면 2026-09-03 처럼 잠금만 잡고 죽은 날이 영원히 unique 인덱스에 걸려
 *   `already_posted` 로 조용히 건너뛰어진다(관리자 수동 실행도 같은 이유로 막힌다).
 */
export function buildReclaimFilter(keyHash, now) {
  return {
    userId: null,
    endpoint: SNS_POST_ENDPOINT,
    keyHash,
    $and: [
      { $or: [{ "responseRef.ids": { $exists: false } }, { "responseRef.ids": { $size: 0 } }] },
      {
        $or: [
          { status: "failed" },
          {
            status: "processing",
            updatedAt: { $lt: new Date(now - STALE_PROCESSING_MS) },
            "responseRef.sendStartedAt": { $exists: false },
          },
        ],
      },
    ],
  };
}

/**
 * send() 를 부르기 **직전에** 굳히는 표식. 이 쓰기가 성공해야만 네트워크로 나간다.
 *
 * 🔴 순서를 뒤집으면 buildReclaimFilter 분기 ②의 불변식("표식 없음 = 호출 0회")이 통째로 무너져
 * 중복 발행이 열린다. verify:sns-daily-post 가 이 함수와 `await send()` 의 위치 관계를 단언한다.
 * 실패하면 던진다 — 호출부가 발행을 포기하고 stage="mark" 로 보고한다.
 *
 * 🔴 점 표기(`$set: {"responseRef.sendStartedAt": …}`)를 쓰지 않는다 — responseRef 의 스키마
 * 기본값이 `null` 이라(models.js) create 로 갓 만든 문서와 2026-09-03 에 굳은 좀비 문서에서
 * "Cannot create field 'sendStartedAt' in element {responseRef: null}" 로 서버가 거절한다.
 * 파이프라인 업데이트로 null 을 흡수하면서 기존 실패 흔적(error·stage)은 그대로 보존한다.
 *
 * 🔴 그래서 세 번째 인자 `{ updatePipeline: true }` 가 **빠지면 안 된다** — Mongoose 9 는 배열 업데이트를
 * 쿼리 계층에서 거부한다(DB 왕복조차 없이 즉시 던진다). 위 규약대로 표식이 실패하면 발행을 포기하므로
 * 그 한 줄이 없는 동안 **텔레그램·스레드 양 채널이 매일 stage=mark 로 죽었다**(2026-09-03~09-05, 발행 0건).
 * 같은 요구사항의 선례는 lib/rate-limit.js — 전수 가드는 verify:mongoose-update-pipeline.
 */
async function markSendStarted(env, keyHash, now) {
  await withMongoRetry(
    env,
    () => IdempotencyKey.updateOne(
      { endpoint: SNS_POST_ENDPOINT, keyHash },
      [
        {
          $set: {
            responseRef: { $mergeObjects: [{ $ifNull: ["$responseRef", {}] }, { sendStartedAt: new Date(now) }] },
            updatedAt: new Date(now),
          },
        },
      ],
      { updatePipeline: true },
    ),
    { retries: 0 },
  );
}

/**
 * 한 채널의 잠금 선점 → 발행 → 결과 기록. 채널끼리 공유하는 것은 이 절차 하나뿐이고,
 * 잠금 키(keyHash)와 발행 함수(send)는 채널마다 다르다.
 *
 * 🔴 DB op 을 전부 withMongoRetry 로 감싼다 — 등록하지 않으면 db.js 의 in-flight 가드
 * (`countActiveMongoOps() > activeOpsOwned`)가 이 op 들을 못 보고, 옆 태스크의 ping 실패가
 * 웜 커넥션을 떼어 내면서 `Cannot use a session that has ended` 로 죽인다(2026-09-03 실사고).
 * 🔴 이 서브트리 안에 재시도를 새로 추가하지 말 것(verify:no-nested-retry 가 잡는다).
 *
 * @param {Object} params
 * @param {Object} params.env withMongoRetry 용 워커 env
 * @param {number} params.now
 * @param {string} params.keyHash 채널별 잠금 키
 * @param {Function} params.send 발행 실행부. {ok, status, error?, permanent?, ref} 를 돌려주고 던지지 않는다.
 */
async function runChannel({ env, now, keyHash, send }) {
  // 🔴 재시도 금지({retries:0}) — 1차 선점이 성공했는데 응답만 유실되면 2차가 같은 문서를 다시
  // processing 으로 만들고, 그 사이 표식이 없으므로 두 실행이 같은 날을 동시에 발행할 수 있다.
  const reclaimed = await withMongoRetry(
    env,
    () => IdempotencyKey.findOneAndUpdate(
      buildReclaimFilter(keyHash, now),
      { $set: { status: "processing", updatedAt: new Date(now), expiresAt: new Date(now + DEDUPE_TTL_MS) } },
      { new: true },
    ),
    { retries: 0 },
  );

  // 선점 실패(중복 키)는 "오늘 이미 나갔다(성공 또는 진행 중)"는 뜻이다. 크론 재시도로 같은 글이 두 번 나가는 것을 막는다.
  if (!reclaimed) {
    try {
      // 🔴 재시도 금지({retries:0}) — 1차 create 가 성공했는데 응답만 유실되면 2차가 E11000 을 받고
      // `already_posted` 로 {ok:true} 를 돌려준다. 그러면 그날 발행이 0건인데 알림도 안 뜬다(조용한 누락).
      await withMongoRetry(
        env,
        () => IdempotencyKey.create({
          endpoint: SNS_POST_ENDPOINT,
          keyHash,
          status: "processing",
          expiresAt: new Date(now + DEDUPE_TTL_MS),
        }),
        { retries: 0 },
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        // 여기까지 왔는데 문서가 아직 failed 라면 위 재선점이 ids 조건에서 걸렸다는 뜻 — 부분 발행된 날이다.
        // 성공/진행 중과 구분해 남긴다(관리자 status 응답과 실행 요약 줄에 이 값이 그대로 보인다).
        const existing = await withMongoRetry(
          env,
          () => IdempotencyKey.findOne({ endpoint: SNS_POST_ENDPOINT, keyHash }),
        ).catch(() => null);
        const partial = existing?.status === "failed";
        const posted = Array.isArray(existing?.responseRef?.ids) ? existing.responseRef.ids.length : 0;
        console.log(
          partial
            ? `[CRON] SNS Daily Post: ${keyHash} 는 ${posted}개가 이미 나간 날이다 — 중복 발행을 막으려고 건너뛴다.`
            : `[CRON] SNS Daily Post: ${keyHash} 는 이미 발행됐다 — 건너뛴다.`,
        );
        return { ok: true, skipped: partial ? "already_posted_partial" : "already_posted", keyHash };
      }
      throw error;
    }
  }

  // 🔴 **여기서부터 네트워크로 나간다.** 표식을 먼저 굳혀야 "표식 없는 processing = 호출 0회" 라는
  // buildReclaimFilter 분기 ②의 불변식이 성립한다. 이 쓰기가 실패하면 발행하지 않는다 —
  // 발행해 놓고 표식이 없으면 다음 회수가 같은 날을 한 번 더 내보낸다.
  try {
    await markSendStarted(env, keyHash, now);
  } catch (error) {
    const message = error?.message || String(error);
    console.error(`[CRON] SNS Daily Post: ${keyHash} 발행 표식을 남기지 못했다(${message}) — 발행을 건너뛴다.`);
    return { ok: false, stage: "mark", error: message, keyHash };
  }

  const result = await send();
  const at = new Date(now).toISOString();

  if (!result.ok) {
    // 🔴 실패는 **지우지 않고 failed 로 남긴다.** 예전에는 잠금을 삭제했는데, 그러면 DB 에 흔적이 0건이라
    // 2026-08-29 크론이 왜 발행을 못 했는지 아무도 알 수 없었다(Workers Logs 도 꺼져 있었다).
    // failed 문서는 위 findOneAndUpdate 가 재선점하므로 재시도 경로도 그대로 열려 있다.
    await withMongoRetry(
      env,
      () => IdempotencyKey.updateOne(
        { endpoint: SNS_POST_ENDPOINT, keyHash },
        {
          $set: {
            status: "failed",
            // stage 를 함께 굳힌다 — 알림은 지워지지만(2026-08-31 에 실제로 지워졌다) 이 문서는 TTL 3일간 남는다.
            responseRef: { error: result.error, stage: "send", permanent: Boolean(result.permanent), status: result.status ?? null, at, ...(result.ref || {}) },
            updatedAt: new Date(now),
          },
        },
      ),
      // 🔴 여기서 던지면 안 된다(발행 결과 보고가 기록 실패에 묻힌다). 다만 조용히 삼키지도 않는다 —
      // 이 쓰기가 실패한 순간이 곧 좀비 문서가 생기는 순간인데, 예전 `.catch(() => {})` 는
      // 그 순간을 로그에 한 줄도 남기지 않았다.
    ).catch((error) => {
      console.error(`[CRON] SNS Daily Post: ${keyHash} 실패 기록을 남기지 못했다(${error?.message || error}).`);
    });
    console.error(`[CRON] SNS Daily Post: ${keyHash} 발행 실패(${result.error}) — failed 로 기록했다.`);
    return { ok: false, stage: "send", error: result.error, status: result.status ?? null, code: result.code ?? null, endpoint: result.endpoint ?? null, permanent: Boolean(result.permanent), keyHash };
  }

  // 🔴 성공 기록이 실패하면 문서는 processing + 표식 있음으로 남는다 — 회수 대상이 **아니다**
  // (buildReclaimFilter 분기 ②가 표식을 요구한다). 나간 글을 한 번 더 내보내지 않기 위한 의도된 정지이고,
  // 사람이 채널을 보고 판단해야 하므로 이 로그가 유일한 단서다.
  await withMongoRetry(
    env,
    () => IdempotencyKey.updateOne(
      { endpoint: SNS_POST_ENDPOINT, keyHash },
      { $set: { status: "success", responseRef: { at, ...(result.ref || {}) }, updatedAt: new Date(now) } },
    ),
  ).catch((error) => {
    console.error(`[CRON] SNS Daily Post: ${keyHash} 성공 기록을 남기지 못했다(${error?.message || error}) — 발행 자체는 끝났다.`);
  });

  console.log(`[CRON] SNS Daily Post: ${keyHash} 발행 완료.`);
  return { ok: true, keyHash, ref: result.ref || null };
}

async function sendTelegramChannel(env, now, fetchImpl) {
  const result = await sendTelegramMessage(env, { text: buildDailyPostText(env, now), fetchImpl });
  return { ...result, ref: { messageId: result.data?.result?.message_id ?? null } };
}

async function sendThreadsChannel(env, now, fetchImpl, generateImpl) {
  // 🔴 문안 생성 실패는 발행 실패가 아니다 — copy 가 null 이면 결정론 문안이 그대로 나간다.
  const context = buildThreadsDayContext(env, now);
  const copy = context
    ? await writeDailyThreadsCopy(env, { day: context.day, rows: context.rows, generateImpl }).catch(() => null)
    : null;

  const texts = buildThreadsPostChain(env, now, copy);
  if (!texts.length) {
    console.error("[CRON] SNS Daily Post: Threads 본문을 만들지 못했다 — 발행을 건너뛴다.");
    return { ok: false, status: 0, error: "empty_chain", ref: { posts: 0 } };
  }
  const result = await postThreadsChain(env, { texts, fetchImpl });
  return {
    ...result,
    ref: {
      ids: result.ids || [],
      posts: texts.length,
      // 그날 문안을 모델이 썼는지 결정론으로 갔는지를 잠금 문서에 남긴다 — 발행은 됐는데 문장이
      // 늘 같다는 신고가 오면 여기부터 본다(GET /api/admin/sns-daily-post/status 로 보인다).
      aiModel: copy?.model || null,
      ...(result.failedAt == null ? {} : { failedAt: result.failedAt }),
      // 🔴 실패한 날은 Graph 가 말한 사유를 그대로 굳힌다. 알림은 지워지고 Workers Logs 는 못 볼 수도
      // 있지만 이 문서는 TTL 3일간 남는다 — 2026-09-02 실패가 code 없이 남는 바람에 스코프인지
      // 답글 대상 문제인지 못 갈랐다. endpoint 는 컨테이너 생성/발행 중 어디서 죽었는지를 가른다.
      ...(result.ok
        ? {}
        : {
            endpoint: result.endpoint ?? null,
            code: result.code ?? null,
            type: result.type ?? null,
            subcode: result.subcode ?? null,
          }),
    },
  };
}

/**
 * Threads 장기 토큰 만료 경고. 발급 후 THREADS_TOKEN_WARN_AFTER_DAYS 일이 지나면
 * 갱신할 때까지 **매일 한 건** 텔레그램으로 올린다 — 사용자 결정(2026-08-31)이 "만료 임박 경고만"이라
 * 자동 갱신은 하지 않고 사람이 회전시킨다. 회전 런북은 docs/handoff/marketing-automation-2026-08-28.md §③C.
 *
 * 발행 성공·실패와 무관하게 도는 별개 경로이고, 실패해도 던지지 않는다(경고가 발행을 막으면 안 된다).
 */
export async function warnThreadsTokenExpiry(env, now = Date.now(), fetchImpl) {
  const issued = String(getEnv(env, "THREADS_TOKEN_ISSUED_AT") || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issued)) return { ok: true, skipped: "no_issued_at" };

  const issuedMs = Date.parse(`${issued}T00:00:00Z`);
  if (!Number.isFinite(issuedMs)) return { ok: true, skipped: "no_issued_at" };

  const ageDays = Math.floor((now - issuedMs) / (24 * 60 * 60 * 1000));
  if (ageDays < THREADS_TOKEN_WARN_AFTER_DAYS) return { ok: true, skipped: "not_due", ageDays };

  const text = [
    "<b>⚠️ Threads 액세스 토큰 갱신 필요</b>",
    "",
    `발급일 ${escapeTelegramHtml(issued)} 로부터 ${ageDays}일 지났습니다(장기 토큰 수명 60일).`,
    "갱신 절차: docs/handoff/marketing-automation-2026-08-28.md 의 Threads 토큰 회전 런북",
  ].join("\n");

  return await sendTelegramMessage(env, { text, fetchImpl });
}

/**
 * @param {Object} env
 * @param {Object} [options]
 * @param {number} [options.now] 검증용 시각 주입
 * @param {Function} [options.fetchImpl] 검증용 fetch 주입 — 실제 발행 없이 계약을 확인한다
 * @param {Function} [options.generateImpl] 검증용 LLM 주입 — 실제 과금 호출 없이 문안 경로를 확인한다
 * @param {"all"|"telegram"|"threads"} [options.channel] 기본 "all"
 * @returns {Promise<{ok: true, dateKey?: string, skipped?: string, channels?: Object}>}
 * @throws 채널이 하나라도 실패하면 던진다 — 크론 래퍼가 그때만 사람에게 알린다.
 */
export async function runSnsDailyPostTask(env, options = {}) {
  const now = typeof options.now === "number" ? options.now : Date.now();
  const { fetchImpl, generateImpl } = options;
  const channel = String(options.channel || "all").toLowerCase();

  if (!isEnabled(env)) {
    console.log("[CRON] SNS Daily Post: SNS_DAILY_POST_ENABLED 가 꺼져 있다 — 건너뛴다.");
    return { ok: true, skipped: "disabled" };
  }

  const dateKey = getKstDateKey(now);

  // 🔴 connectDb 실패는 채널 루프에 **닿기도 전에** 던지므로 잠금 문서가 한 건도 안 생긴다.
  // 흔적을 DB 에 남길 수 없는 유일한 구간이라(DB 가 안 붙는 순간이다) 던지는 문구에 단계를 박는다.
  // 2026-08-31 22:00Z 실측: idempotency_keys 의 cron:sns-daily-post 문서는 08-30 수동 실행 1건뿐이고
  // 09-01·09-01:threads 는 0건이었다 — 그날 실패는 여기 아니면 모듈 로드(worker/index.js 의 loadFailed)다.
  try {
    await connectDb(env);
  } catch (error) {
    const failure = new Error(`SNS 일일 발행 실패(${dateKey}): stage=connect_db ${String(error?.message || error)}`);
    failure.dateKey = dateKey;
    failure.stage = "connect_db";
    throw failure;
  }

  const channels = {};

  // 🔴 채널마다 try 로 감싼다 — 한 채널의 DB/네트워크 예외가 다른 채널의 발행을 막으면 안 된다.
  // 사유는 아래에서 한꺼번에 던져 알림에 실린다.
  const guarded = async (name, run) => {
    try {
      channels[name] = await run();
    } catch (error) {
      console.error(`[CRON] SNS Daily Post: ${name} 채널이 예외로 끝났다 —`, error?.message || error);
      // send() 는 계약상 던지지 않으므로(verify-sns-daily-post ②) 여기까지 오는 예외는 잠금 문서 쓰기다.
      channels[name] = { ok: false, stage: "lock", error: String(error?.message || "channel_threw") };
    }
  };

  if (channel === "all" || channel === "telegram") {
    await guarded("telegram", () =>
      runChannel({ env, now, keyHash: dateKey, send: () => sendTelegramChannel(env, now, fetchImpl) }),
    );
  }

  if (channel === "all" || channel === "threads") {
    const skipReason = getThreadsSkipReason(env);
    if (skipReason) {
      console.log(`[CRON] SNS Daily Post: Threads 를 건너뛴다 — ${skipReason}.`);
      channels.threads = { ok: true, skipped: skipReason };
    } else {
      await guarded("threads", () =>
        runChannel({
          env,
          now,
          keyHash: `${dateKey}${THREADS_KEY_SUFFIX}`,
          send: () => sendThreadsChannel(env, now, fetchImpl, generateImpl),
        }),
      );
      await warnThreadsTokenExpiry(env, now, fetchImpl).catch(() => {});
    }
  }

  // 🔴 성공한 채널을 **같은 문구에** 적는다. 한 채널만 죽어도 태스크는 통째로 던지므로, 성공을 빼면
  // 알림 한 줄이 "오늘 아무것도 안 나갔다"로 읽힌다 — Threads 토큰이 죽어 있는 동안 매일 그렇게 읽힌다.
  // permanent(OAuth·code 190/200)는 재시도로 안 풀리므로 사람이 할 일을 문구에 박는다.
  // 🔴 Graph 원본 code 와 죽은 엔드포인트도 사유 바로 뒤에 박는다 — 문구만으로는 "스코프가 없다"와
  // "답글 대상을 못 찾았다"가 똑같이 읽힌다(2026-09-02 실측: 1번째 글은 발행됐고 2번째 답글만 400).
  // 알림은 사유를 200자에서 자르므로 뒤가 아니라 사유 바로 뒤다.
  const failed = Object.entries(channels).filter(([, result]) => !result.ok);
  if (failed.length) {
    const sent = Object.entries(channels).filter(([, r]) => r.ok).map(([name, r]) => `${name}=${r.skipped || "sent"}`);
    const reasons = failed.map(([name, r]) => `${name}(stage=${r.stage || "send"})=${r.error}${r.code == null ? "" : ` [code=${r.code}${r.endpoint ? ` @${r.endpoint}` : ""}]`}${r.permanent ? " [토큰 회전 필요]" : ""}`);
    const error = new Error(
      `SNS 일일 발행 실패(${dateKey}): ${reasons.join(", ")} / 성공 ${sent.length ? sent.join(", ") : "0건"}`,
    );
    error.dateKey = dateKey;
    error.channels = channels;
    throw error;
  }

  return { ok: true, dateKey, channels };
}

/**
 * 같은 날 안에서의 자동 재시도. 매 10분 크론이 부른다(wrangler.toml 의 두 번째 스케줄).
 *
 * 🔴 이 함수가 없으면 buildReclaimFilter 분기 ②는 **영원히 발동하지 않는다** — 22:00Z 일일 크론이
 * 그날 유일한 시도이고, 굳은 문서가 회수 가능해지는 15분 뒤에는 아무도 다시 두드리지 않기 때문이다.
 *
 * 새 잠금도 새 발행 경로도 만들지 않는다 — 창을 확인한 뒤 runSnsDailyPostTask 를 그대로 부른다.
 * 이미 성공한 날은 unique 인덱스에 걸려 `already_posted` 로 즉시 빠지므로 정상적인 날의 비용은
 * connectDb 1회 + 채널당 조회 2회다.
 *
 * 🔴 알림은 붙이지 않는다 — cron-failure-alert 가 10분 크론 알림을 금지하고 있고, 그날 실패는
 * 22:00Z 가 이미 한 통 보냈다. 여기서 또 던져 봐야 같은 사실을 5번 더 말할 뿐이다.
 */
export async function runSnsDailyPostRecovery(env, options = {}) {
  const now = typeof options.now === "number" ? options.now : Date.now();
  const at = new Date(now);
  const hour = at.getUTCHours();
  const minute = at.getUTCMinutes();

  // 🔴 22:00 정각은 일일 크론과 같은 아이솔레이트에서 겹치므로 뺀다(둘이 같은 잠금을 두고 경합한다).
  // 창을 22시대 밖으로 넓히면 KST 자정(15:00Z)을 넘긴 실행이 **다음 날 dateKey** 로 발행해
  // 발행 시각 자체가 바뀐다 — 요청받은 적 없는 동작 변경이다.
  if (hour !== RECOVERY_UTC_HOUR || minute < RECOVERY_MIN_UTC_MINUTE) {
    return { ok: true, skipped: "outside_recovery_window" };
  }

  return await runSnsDailyPostTask(env, options);
}
