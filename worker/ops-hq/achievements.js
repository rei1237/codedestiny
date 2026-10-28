// 업적 — 장식 보상. XP 를 주지 않는다.
// 달성 시각은 판정한 시각이 아니라 근거 기록의 최초 시각(퀘스트 완료 검증·결제 시각 등)이다.
// 한 번 기록되면 _id(업적 키) 고유로 다시 쓰이지 않는다 — 이후 환불·되돌림이 있어도 장식은 남긴다.

import { BUSINESS_ID, isDuplicateKeyError } from "./db.js";
import { levelStartXp } from "./levels.js";

const PUBLISH_CHANNELS = ["naver_blog", "tiktok", "youtube_shorts", "x"];

export const ACHIEVEMENTS = Object.freeze([
  { key: "first_quest", game: "첫 별빛", label: "첫 퀘스트 완료", hint: "퀘스트 하나를 증빙과 함께 완료" },
  { key: "first_publish", game: "첫 전령", label: "첫 채널 발행", hint: "공개 URL 로 발행 퀘스트 완료" },
  { key: "all_channels", game: "사방의 전령", label: "4개 채널 모두 발행", hint: "블로그·TikTok·Shorts·X 에 각 1회 이상" },
  { key: "first_order", game: "첫 별전", label: "캠페인 기간 첫 결제 반영", hint: "제공 완료된 실결제 1건" },
  { key: "revenue_100k", game: "은하 금고 10만", label: "환불 차감 결제액 10만 원", hint: "인정 매출 누적 ₩100,000" },
  { key: "week1_clear", game: "첫 주 완주", label: "1주 차 계획 완료", hint: "10/12~10/18 수동 퀘스트 전부 완료" },
  { key: "first_review", game: "별자리 판독", label: "첫 주간 결산", hint: "캠페인 분석 퀘스트 완료" },
  { key: "level_5", game: "운명 기록가", label: "레벨 5 도달", hint: `운영 XP ${levelStartXp(5)}` },
  { key: "level_10", game: "별의 안내자", label: "레벨 10 도달", hint: `운영 XP ${levelStartXp(10)}` },
]);

function earliest(dates) {
  const times = dates.filter(Boolean).map((value) => new Date(value).getTime()).filter(Number.isFinite);
  return times.length ? new Date(Math.min(...times)) : null;
}

/** 근거 기록 → { key: 달성 시각 | null }. 순수 함수. */
export function evaluateAchievements({ doneQuests = [], countedFacts = [], plannedWeek1 = [], ledgerTimeline = [] }) {
  const out = {};
  out.first_quest = earliest(doneQuests.filter((quest) => quest.kind !== "auto_publish_check").map((quest) => quest.xpVerifiedAt));
  const publishes = doneQuests.filter((quest) => quest.kind === "publish");
  out.first_publish = earliest(publishes.map((quest) => quest.xpVerifiedAt));
  const firstByChannel = PUBLISH_CHANNELS.map((channel) => earliest(publishes.filter((quest) => quest.channel === channel).map((quest) => quest.xpVerifiedAt)));
  out.all_channels = firstByChannel.every(Boolean) ? new Date(Math.max(...firstByChannel.map((date) => date.getTime()))) : null;
  const facts = [...countedFacts].sort((a, b) => new Date(a.paidAt) - new Date(b.paidAt));
  out.first_order = facts.length ? new Date(facts[0].paidAt) : null;
  let running = 0;
  out.revenue_100k = null;
  for (const fact of facts) {
    running += Number(fact.netKRW) || 0;
    if (running >= 100_000) { out.revenue_100k = new Date(fact.paidAt); break; }
  }
  const manualWeek1 = plannedWeek1.filter((quest) => quest.kind !== "auto_publish_check" && quest.status !== "archived" && quest.status !== "cancelled");
  out.week1_clear = manualWeek1.length && manualWeek1.every((quest) => quest.status === "done")
    ? new Date(Math.max(...manualWeek1.map((quest) => new Date(quest.xpVerifiedAt || quest.doneAt || 0).getTime())))
    : null;
  out.first_review = earliest(doneQuests.filter((quest) => quest.kind === "analysis").map((quest) => quest.xpVerifiedAt));
  // 원장 누적이 기준선을 처음 넘은 시각(정정으로 내려가도 기록은 남는다).
  for (const [key, level] of [["level_5", 5], ["level_10", 10]]) {
    let total = 0;
    out[key] = null;
    for (const row of ledgerTimeline) {
      total += Number(row.delta) || 0;
      if (total >= levelStartXp(level)) { out[key] = new Date(row.processedAt); break; }
    }
  }
  return out;
}

export async function syncAchievements(cols, { now = new Date() } = {}) {
  const [doneQuests, countedFacts, plannedWeek1, ledgerTimeline] = await Promise.all([
    cols.quests.find({ status: "done", xpVerifiedAt: { $ne: null } }, { projection: { kind: 1, channel: 1, xpVerifiedAt: 1 } }).toArray(),
    cols.revenueFacts.find({ xpState: "counted", netKRW: { $gt: 0 } }, { projection: { paidAt: 1, netKRW: 1 } }).toArray(),
    cols.quests.find({ origin: "plan", plannedDate: { $gte: "2026-10-12", $lte: "2026-10-18" } }, { projection: { kind: 1, status: 1, xpVerifiedAt: 1, doneAt: 1 } }).toArray(),
    cols.ledger.find({}, { projection: { delta: 1, processedAt: 1 } }).sort({ processedAt: 1, _id: 1 }).toArray(),
  ]);
  const evaluated = evaluateAchievements({ doneQuests, countedFacts, plannedWeek1, ledgerTimeline });
  let created = 0;
  for (const spec of ACHIEVEMENTS) {
    const achievedAt = evaluated[spec.key];
    if (!achievedAt) continue;
    try {
      await cols.achievements.insertOne({ _id: spec.key, businessId: BUSINESS_ID, achievedAt, recordedAt: now });
      created += 1;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
  return { created };
}

export async function readAchievements(cols) {
  const rows = await cols.achievements.find({}).toArray();
  const by = new Map(rows.map((row) => [row._id, row]));
  return ACHIEVEMENTS.map((spec) => ({ ...spec, achievedAt: by.get(spec.key)?.achievedAt || null, unlocked: by.has(spec.key) }));
}
