import type {
  FortuneTeaHouseConsultRequest,
  FortuneTeaHouseHoneyDropsState,
} from "../data/consult";

function clampCount(value: unknown) {
  const count = Math.floor(Number(value));
  if (!Number.isFinite(count) || count < 0) return 0;
  return Math.min(count, 9999);
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const source = value as Record<string, unknown>;
  return `{${Object.keys(source).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(source[key])}`).join(",")}}`;
}

export function createFortuneTeaAttemptId(request: FortuneTeaHouseConsultRequest) {
  const seed = stableStringify({
    mode: request.consultationMode || "tarot",
    cup: request.selectedTeaCupId,
    topic: request.selectedTeaCupTopic,
    question: request.question,
    birthDate: request.birthDate,
    birthTime: request.birthTime,
    sukuyo: request.sukuyo,
    at: Date.now(),
    random: Math.random().toString(36).slice(2),
  });
  return `ftea_${hashText(seed)}_${Date.now().toString(36)}`;
}

export function normalizeHoneyDropsState(value: unknown): FortuneTeaHouseHoneyDropsState | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<FortuneTeaHouseHoneyDropsState>;
  const balance = clampCount(source.balance ?? source.fortuneTeaHouseHoneyDrops ?? source.currentHoneyDrops);
  const totalEarned = clampCount(source.totalEarned ?? source.totalHoneyDrops);
  const totalSpent = clampCount(source.totalSpent);
  return {
    serviceScope: source.serviceScope === "FORTUNE_TEA_HOUSE" ? "FORTUNE_TEA_HOUSE" : undefined,
    balance,
    fortuneTeaHouseHoneyDrops: balance,
    currentHoneyDrops: balance,
    totalHoneyDrops: totalEarned,
    totalEarned,
    totalSpent,
    lastEarnedAt: typeof source.lastEarnedAt === "string" ? source.lastEarnedAt : undefined,
    tarotAlbumUnlocked: Boolean(source.tarotAlbumUnlocked),
    tarotAlbumUnlockedAt: typeof source.tarotAlbumUnlockedAt === "string" ? source.tarotAlbumUnlockedAt : undefined,
    resultId: typeof source.resultId === "string" ? source.resultId : undefined,
    earnedThisResult: Boolean(source.earnedThisResult),
    duplicateResult: Boolean(source.duplicateResult),
    unlocked: Boolean(source.unlocked || balance >= 10),
    authenticated: Boolean(source.authenticated),
    disabled: Boolean(source.disabled),
    reason: typeof source.reason === "string" ? source.reason : undefined,
  };
}

export function pickHoneyDropMessage(honeyDrops: FortuneTeaHouseHoneyDropsState | null) {
  const count = honeyDrops?.currentHoneyDrops || 0;
  if (count >= 10 && honeyDrops?.earnedThisResult) {
    const unlockedMessages = [
      "꿀방울 10개 달성!",
      "연이: 어... 이거 혹시 꿀로 바꿀 수 있는 건 아니죠? 아, 아니에요. 그냥 물어본 거예요...!",
      "연이: 저... 달콤한 걸 조금 좋아하긴 해요. 너무 티 났나요?",
      "꽃돼지: 꿀꿀! 연이가 엄청 좋아하면서 아닌 척해요!",
    ];
    return unlockedMessages[count % unlockedMessages.length];
  }

  if (count >= 5 && count < 10) {
    const midMessages = [
      "제법 모였어요. 이러다 연이가 먼저 달려올지도 몰라요.",
      "찻집이 조금 더 달콤해졌어요.",
      "꽃돼지가 흐뭇하게 바라보고 있어요.",
    ];
    return midMessages[count % midMessages.length];
  }

  const earnedMessages = [
    "꿀방울이 톡 떨어졌어요!",
    "오늘도 찻집에 달콤한 한 방울이 쌓였어요.",
    "꽃돼지가 몰래 꿀방울 하나를 두고 갔어요.",
    "꿀방울이 모일수록 찻잔 끝의 달빛도 조금 더 달콤해져요.",
  ];
  return earnedMessages[Math.max(0, count) % earnedMessages.length];
}
