import { BRANCH_HANGUL, BRANCH_HANJA, STEM_HANGUL, STEM_HANJA, ganji } from "../../lib/korean-calendar/index.js";
import { getKstDateParts, getSiteBaseUrl, getTodayPillars } from "./daily-fortune-task.js";
import { buildTodaySajuPublic, TEN_GOD_LINE } from "./today-saju-detail.js";
import { buildAllStemGuidance, formatGoodLetters } from "./daily-stem-guidance.js";
import { threadsTextWeight, THREADS_TEXT_LIMIT } from "./threads.js";
import { THREADS_ROOT_HASHTAG, WEEKDAY_PICKS } from "./sns-daily-post-task.js";

/**
 * Threads 일일 발행 본문. 루트 1글 + 오행 짝 답글 5글 = 6글.
 *
 * 🔴 **이 파일은 여전히 LLM 0회 · DB 0회다.** 문장을 모델이 쓰는 경로는 threads-ai-writer.js
 * 한 곳뿐이고, 그 결과는 `copy` 인자로 들어온다. copy 가 없거나 일부만 통과했으면 그 자리는
 * 정본 문장표(today-saju-detail.js 의 TEN_GOD_LINE)로 메운다 — 그래서 모델이 죽어도 발행은 산다.
 *
 * 재료는 **이미 워커 번들에 들어 있는 것만** 쓴다: 역법 코어(lib/korean-calendar), 날짜만으로
 * 참인 해설을 내는 buildTodaySajuPublic, 그리고 일간 10개 판정 daily-stem-guidance.js.
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

// 좋은 글자 중 지지는 최대 2개만 적는다. 토(土) 계열은 진·술·축·미 넷이라 전부 적으면
// "좋은 글자"가 한 줄을 넘기고, 읽는 쪽에서는 넷이나 되면 고르는 의미가 없다.
const GOOD_BRANCH_SHOWN = 2;

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
    dayPillarKo: `${STEM_HANGUL[core.day.stemIndex]}${BRANCH_HANGUL[core.day.branchIndex]}`,
    yearPillarKo: `${STEM_HANGUL[core.year.stemIndex]}${BRANCH_HANGUL[core.year.branchIndex]}`,
  };
}

/**
 * 그날 발행에 필요한 재료 전부. 순수 함수다.
 *
 * 🔴 AI 문안 생성부(threads-ai-writer.js)와 본문 조립부가 **같은 사실**을 보게 하려고 하나로 낸다.
 * 두 곳이 각자 계산하면 프롬프트에 박힌 사실과 발행되는 사실이 갈릴 수 있다.
 *
 * @returns {{day: object, groups: object[], rows: object[], card: object, base: string, pick: object}|null}
 */
export function buildThreadsDayContext(env, now = Date.now()) {
  const pillars = getTodayCorePillars(now);
  if (!pillars) return null;

  const card = buildTodaySajuPublic({ stem: pillars.stem, branch: pillars.branch });
  if (!card) return null;

  const groups = buildAllStemGuidance({ stem: pillars.stem, branch: pillars.branch });
  if (!groups.length) return null;

  const today = getTodayPillars(now);
  const { day: weekday } = getKstDateParts(now);

  return {
    day: {
      dateLabel: `${today.date} (${today.dayName})`,
      // 🔴 일진은 역법 코어에서 온 것을 쓴다. getTodayPillars 의 연주는 입춘을 안 보므로
      // 세차만 코어 값(pillars.yearPillarKo)으로 덮는다.
      dayPillar: `${pillars.stem}${pillars.branch}`,
      dayPillarKo: pillars.dayPillarKo,
      yearPillarKo: pillars.yearPillarKo,
      moodLine: card.headline,
    },
    groups,
    rows: groups.flatMap((group) => group.rows),
    card,
    base: getSiteBaseUrl(env),
    pick: WEEKDAY_PICKS[weekday % WEEKDAY_PICKS.length],
  };
}

/** 일간 한 줄 — 확정된 사실만. 예: `갑(甲) 비견·목욕 | 좋은 십성 식신·상관 | 좋은 글자 병(丙)·정(丁)/사(巳)·오(午)` */
function factLine(row) {
  const letters = formatGoodLetters(row, GOOD_BRANCH_SHOWN);
  const parts = [`${row.stemKo}(${row.stem}) ${row.tenGod}·${row.twelveStage}`];
  if (row.shinsal.length) parts[0] += `·${row.shinsal[0]}`;
  parts.push(`좋은 십성 ${row.flowTenGods.join("·")}`);
  parts.push(`좋은 글자 ${letters}`);
  return parts.join(" | ");
}

/**
 * 일간 한 명분 조언. AI 문안이 그 일간을 통과시켰으면 그것을, 아니면 정본 문장표를 쓴다.
 * 🔴 폴백 문장은 **오늘 들어온 십성**을 설명하고, 위 factLine 이 이미 말한 "좋은 십성"을 되풀이하지
 * 않는다 — 480자 안에서 같은 말을 두 번 할 여유가 없다.
 */
function adviceLine(row, copy) {
  const written = copy?.advice?.[row.stem];
  if (written) return written;
  return TEN_GOD_LINE[row.tenGod]?.good || row.flowLine;
}

/**
 * 그날 Threads 에 올릴 글 묶음. 루트 1글 + 오행 짝 답글 5글.
 * 순수 함수라 검증 스크립트가 시각만 주입해 그대로 확인한다(buildDailyPostText 와 같은 관례).
 *
 * @param {Object} env
 * @param {number} [now] epoch ms
 * @param {{intro?: string, advice?: Object<string,string>}|null} [copy] threads-ai-writer.js 의 결과. 없으면 전부 결정론.
 * @returns {string[]} 각 글은 CHAIN_TEXT_LIMIT 이하로 클램프된 평문
 */
export function buildThreadsPostChain(env, now = Date.now(), copy = null) {
  const ctx = buildThreadsDayContext(env, now);
  if (!ctx) return [];

  const { card, base, pick, day, groups } = ctx;
  const posts = [];

  // ── 루트: 날짜 · 일진 · 오늘의 기둥 · 하루 총평 · 오늘과 합/충하는 띠 · 사이트 진입 링크
  const zodiacLines = renderItems(findSection(card, "zodiac"));
  // 🔴 천간·지지 줄은 AI 서문이 들어와도 남겨 둔다 — 서문이 card.body 를 대체하면 그 두 오행이
  // 루트에서 통째로 사라진다(예전 체인의 '① 오늘의 기둥' 답글이 하던 몫이다).
  const pillarLines = renderItems(findSection(card, "pillar")).filter((line) => !line.startsWith("오늘 일진:"));
  posts.push(
    [
      `🌙 ${day.dateLabel} 오늘의 기운`,
      "",
      `오늘 일진은 ${day.dayPillarKo}일(${day.dayPillar}), 올해는 ${day.yearPillarKo}년입니다.`,
      ...pillarLines,
      "",
      copy?.intro || `${card.headline}. ${card.body}`,
      ...(zodiacLines.length ? ["", ...zodiacLines] : []),
      "",
      `일간별로 이어서 답니다. 오늘의 운세 → ${base}/fortune/`,
    ].join("\n"),
  );

  // ── 답글 ①~⑤: 오행 짝으로 일간 2개씩. 순서는 DAY_STEM_GROUPS(목화토금수) 고정이다.
  const marks = ["①", "②", "③", "④", "⑤"];
  groups.forEach((group, index) => {
    const blocks = group.rows.flatMap((row) => [factLine(row), `→ ${adviceLine(row, copy)}`, ""]);
    const lines = [`${marks[index]} ${group.hanja} ${group.rows.map((row) => row.stemKo).join("·")} 일간`, "", ...blocks];

    // 요일 코너는 마지막 답글 끝에 붙인다 — 링크 하나짜리 글을 따로 두면 체인이 7글이 된다.
    if (index === groups.length - 1) lines.push(`${pick.label} — ${pick.line}`, `${base}${pick.path}`);

    posts.push(lines.join("\n").trimEnd());
  });

  // 🔴 토픽 태그는 **루트에만** 붙인다 — Threads 는 게시물당 1개만 기능하고, 답글마다 달면
  // 같은 태그가 6번 반복되며 스팸으로 보인다.
  const limit = Math.min(CHAIN_TEXT_LIMIT, THREADS_TEXT_LIMIT);
  return posts.map((text, index) => (index === 0 ? appendRootHashtag(text, limit) : clampThreadsText(text, limit)));
}
