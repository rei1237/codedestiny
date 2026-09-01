import { BRANCH_HANGUL, BRANCH_HANJA, STEM_HANGUL, STEM_HANJA, ganji } from "../../lib/korean-calendar/index.js";
import { getKstDateParts, getSiteBaseUrl, getTodayPillars } from "./daily-fortune-task.js";
import { buildTodaySajuPublic } from "./today-saju-detail.js";
import { threadsTextWeight, THREADS_TEXT_LIMIT } from "./threads.js";
import { THREADS_ROOT_HASHTAG, WEEKDAY_PICKS } from "./sns-daily-post-task.js";

/**
 * Threads 일일 발행 본문.
 *
 * 🔴 LLM 실호출 0회 · DB 조회 0회다. 재료는 **이미 워커 번들에 들어 있는 것만** 쓴다:
 * 역법 코어(lib/korean-calendar)와 today-saju-detail.js 의 buildTodaySajuPublic — 생년 없이
 * 날짜만으로 참인 사주 해설을 내주는 함수이고, 배선 선례는 worker/routes/fortune-today.js:169-186 이다.
 * 새 데이터 모듈을 import 하면 그 크기가 그대로 워커 번들에 얹힌다(선례: today-sukuyo-detail.js:7-8).
 *
 * 🔴 **평문이다.** 텔레그램 문안(sns-daily-post-task.js 의 buildDailyPostText)은 parse_mode:"HTML"
 * 전용이라 <b> 태그와 escapeTelegramHtml 이 들어가는데, Threads 는 태그를 해석하지 않고 글자
 * 그대로 보여준다. 그래서 두 채널은 렌더러를 공유하지 않는다.
 *
 * 🔴 일진은 역법 코어(ganji)로 잡는다. daily-fortune-task.js 의 getTodayPillars 는 자체 율리우스일
 * 계산이고 **연주를 달력 연도로 낸다**(입춘 절입을 안 본다). 일진은 두 원천이 일치해야 하며
 * scripts/verify-sns-daily-post.mjs 가 365일 표본으로 그것을 단언한다.
 */

// API 상한(500)보다 낮게 잡는다. 상한에 딱 붙이면 문안을 한 글자 손볼 때마다 넘칠 위험이 있고,
// 넘긴 글은 잘리는 게 아니라 발행 자체가 거절된다(threads.js).
const CHAIN_TEXT_LIMIT = 480;

/** 코드포인트 경계와 줄/공백 경계를 지켜 자른다. 이모지를 반으로 쪼개지 않는다. */
export function clampThreadsText(text, limit = CHAIN_TEXT_LIMIT) {
  const normalized = String(text ?? "").trim();
  if (threadsTextWeight(normalized) <= limit) return normalized;

  const chars = [...normalized];
  let kept = "";
  let weight = 0;
  for (const ch of chars) {
    const next = weight + threadsTextWeight(ch);
    if (next > limit - 1) break; // 말줄임표 한 자리를 남긴다
    kept += ch;
    weight = next;
  }

  const boundary = Math.max(kept.lastIndexOf("\n"), kept.lastIndexOf(" "));
  if (boundary > limit / 2) kept = kept.slice(0, boundary);
  return `${kept.trimEnd()}…`;
}

/**
 * 루트 글 끝에 토픽 태그를 붙인다.
 *
 * 🔴 **태그를 붙인 뒤 클램프하면 태그가 먼저 잘린다** — clampThreadsText 는 문자열 끝에서 자른다.
 * 그래서 태그 몫을 예산에서 먼저 빼고 **본문만** 클램프한 뒤 태그를 잇는다.
 * 🔴 태그는 하나뿐이다 — Threads 는 게시물당 토픽 태그가 1개만 기능하고, 두 번째부터는
 * 글자 그대로 노출된다(sns-daily-post-task.js 의 THREADS_ROOT_HASHTAG 주석).
 */
export function appendRootHashtag(text, limit) {
  const suffix = `\n\n#${THREADS_ROOT_HASHTAG}`;
  return `${clampThreadsText(text, limit - threadsTextWeight(suffix))}${suffix}`;
}
function findSection(card, key) {
  return (card?.sections || []).find((section) => section?.key === key) || null;
}

function renderItems(section) {
  return (section?.items || [])
    .map((item) => `${item?.label}: ${item?.value}`)
    .filter((line) => !line.includes("undefined"));
}

/**
 * 오늘의 기둥 — 역법 코어 기준. 한자 일주(buildTodaySajuPublic 의 입력)와 한글 세차를 함께 낸다.
 * @returns {{stem: string, branch: string, yearPillarKo: string}|null}
 */
export function getTodayCorePillars(now = Date.now()) {
  const { y, m, d } = getKstDateParts(now);
  // 일주는 정오 기준으로 잡는다(자시 경계에서 하루가 튀지 않게 — fortune-today.js:152 와 같은 관례).
  const core = ganji({ year: y, month: m, day: d, hour: 12, minute: 0 });
  if (!core) return null;
  return {
    stem: STEM_HANJA[core.day.stemIndex],
    branch: BRANCH_HANJA[core.day.branchIndex],
    yearPillarKo: `${STEM_HANGUL[core.year.stemIndex]}${BRANCH_HANGUL[core.year.branchIndex]}`,
  };
}

/**
 * 그날 Threads 에 올릴 글 묶음. 루트 1글 + 답글 최대 3글.
 * 순수 함수라 검증 스크립트가 시각만 주입해 그대로 확인한다(buildDailyPostText 와 같은 관례).
 *
 * @param {Object} env
 * @param {number} [now] epoch ms
 * @returns {string[]} 각 글은 CHAIN_TEXT_LIMIT 이하로 클램프된 평문(루트는 토픽 태그 1개 포함)
 */
export function buildThreadsPostChain(env, now = Date.now()) {
  const pillars = getTodayCorePillars(now);
  if (!pillars) return [];

  const card = buildTodaySajuPublic({ stem: pillars.stem, branch: pillars.branch });
  if (!card) return [];

  const today = getTodayPillars(now);
  const { day } = getKstDateParts(now);
  const base = getSiteBaseUrl(env);
  const pick = WEEKDAY_PICKS[day % WEEKDAY_PICKS.length];

  const posts = [];

  // ── 루트: 날짜 · 한 줄 요약 · 사이트 진입 링크
  posts.push([
    `🌙 ${today.date} (${today.dayName}) 오늘의 기운`,
    "",
    card.headline,
    card.body,
    `올해는 ${pillars.yearPillarKo}년입니다.`,
    "",
    `오늘의 운세 → ${base}/fortune/`,
  ].join("\n"));

  // ── 답글 1: 오늘의 기둥
  const pillarLines = renderItems(findSection(card, "pillar"));
  if (pillarLines.length) {
    posts.push([`① 오늘의 기둥`, "", ...pillarLines].join("\n"));
  }

  // ── 답글 2: 기운의 결 + 오늘 지지와 띠
  const moodLines = findSection(card, "mood")?.lines || [];
  const zodiacLines = renderItems(findSection(card, "zodiac"));
  if (moodLines.length || zodiacLines.length) {
    const block = [`② 오늘 기운의 결`, "", ...moodLines];
    if (zodiacLines.length) block.push("", ...zodiacLines);
    posts.push(block.join("\n"));
  }

  // ── 답글 3: 요일 코너 (링크는 sitemap.xml 실재 확인 대상 — sns-daily-post-task.js:30 참조)
  posts.push([`③ ${pick.label}`, "", pick.line, `${base}${pick.path}`].join("\n"));

  const limit = Math.min(CHAIN_TEXT_LIMIT, THREADS_TEXT_LIMIT);
  // 태그는 루트에만 단다. 답글에 붙여도 토픽으로 안 잡히고 글자 수만 는다.
  return posts.map((text, index) => (index === 0 ? appendRootHashtag(text, limit) : clampThreadsText(text, limit)));
}
