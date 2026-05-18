import type { YeonMessageOutput } from "./types";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

const bannedWords = [
  "무조건 성공",
  "반드시",
  "흉운",
  "큰일",
  "팔자",
  "운명입니다",
  "헤어져야",
  "대박 운",
];

export function validateYeonMessage(payload: unknown): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const p = payload as YeonMessageOutput;

  if (!p || typeof p !== "object") errors.push("payload must be object");
  if (!isNonEmptyString(p?.zodiac_sign)) errors.push("zodiac_sign missing");
  if (!isNonEmptyString(p?.weekly_vibe?.keyword)) errors.push("weekly_vibe.keyword missing");
  if (!isNonEmptyString(p?.emotion_adaptive_opening?.first_sentence)) {
    errors.push("emotion_adaptive_opening.first_sentence missing");
  }
  if (!Array.isArray(p?.yeon_is_hug?.message)) errors.push("yeon_is_hug.message must be array");

  const msgLen = p?.yeon_is_hug?.message?.length || 0;
  if (msgLen < 4 || msgLen > 5) errors.push("yeon_is_hug.message must be 4~5 sentences");

  const allTexts = [
    ...(p?.yeon_is_hug?.message || []),
    p?.share_card?.short_message || "",
    p?.gentle_advice?.love || "",
    p?.gentle_advice?.work || "",
    p?.gentle_advice?.money || "",
    p?.gentle_advice?.relationship || "",
  ].join(" ");

  bannedWords.forEach((word) => {
    if (allTexts.includes(word)) {
      errors.push(`contains banned tone: ${word}`);
    }
  });

  if (!isNonEmptyString(p?.share_card?.short_message)) {
    errors.push("share_card.short_message missing");
  } else if ((p.share_card.short_message.match(/[.!?。！？]/g) || []).length > 2) {
    errors.push("share_card.short_message should be short 1~2 sentences");
  }

  return { ok: errors.length === 0, errors };
}
