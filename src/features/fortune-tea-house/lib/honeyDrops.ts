import type {
  FortuneTeaHouseConsultRequest,
  FortuneTeaHouseConsultResponse,
  FortuneTeaHouseHoneyDropBonusAdvice,
  FortuneTeaHouseHoneyDropsState,
} from "../data/consult";

const GUEST_HONEY_STORAGE_KEY = "code-destiny-fortune-tea-house-honey-drops";
const MAX_GUEST_EARNED_KEYS = 80;

type GuestHoneyStore = {
  currentHoneyDrops: number;
  totalHoneyDrops: number;
  lastEarnedAt?: string;
  earnedResultIds: string[];
};

function clampCount(value: unknown) {
  const count = Math.floor(Number(value));
  if (!Number.isFinite(count) || count < 0) return 0;
  return Math.min(count, 9999);
}

function readGuestStore(): GuestHoneyStore {
  if (typeof window === "undefined") {
    return { currentHoneyDrops: 0, totalHoneyDrops: 0, earnedResultIds: [] };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(GUEST_HONEY_STORAGE_KEY) || "{}") as Partial<GuestHoneyStore>;
    return {
      currentHoneyDrops: clampCount(parsed.currentHoneyDrops),
      totalHoneyDrops: clampCount(parsed.totalHoneyDrops),
      lastEarnedAt: typeof parsed.lastEarnedAt === "string" ? parsed.lastEarnedAt : undefined,
      earnedResultIds: Array.isArray(parsed.earnedResultIds) ? parsed.earnedResultIds.map(String).filter(Boolean).slice(-MAX_GUEST_EARNED_KEYS) : [],
    };
  } catch {
    return { currentHoneyDrops: 0, totalHoneyDrops: 0, earnedResultIds: [] };
  }
}

function writeGuestStore(store: GuestHoneyStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_HONEY_STORAGE_KEY, JSON.stringify({
      currentHoneyDrops: clampCount(store.currentHoneyDrops),
      totalHoneyDrops: clampCount(store.totalHoneyDrops),
      lastEarnedAt: store.lastEarnedAt,
      earnedResultIds: store.earnedResultIds.slice(-MAX_GUEST_EARNED_KEYS),
    }));
  } catch {
    void 0;
  }
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

export function readGuestHoneyDrops(): FortuneTeaHouseHoneyDropsState {
  const store = readGuestStore();
  return {
    currentHoneyDrops: store.currentHoneyDrops,
    totalHoneyDrops: store.totalHoneyDrops,
    lastEarnedAt: store.lastEarnedAt,
    unlocked: store.currentHoneyDrops >= 10,
    authenticated: false,
  };
}

export function applyGuestHoneyDropReward(resultId: string): FortuneTeaHouseHoneyDropsState {
  const safeResultId = String(resultId || "").trim();
  const store = readGuestStore();
  const duplicateResult = Boolean(safeResultId && store.earnedResultIds.includes(safeResultId));

  if (!duplicateResult && safeResultId) {
    store.currentHoneyDrops += 1;
    store.totalHoneyDrops += 1;
    store.lastEarnedAt = new Date().toISOString();
    store.earnedResultIds.push(safeResultId);
    writeGuestStore(store);
  }

  return {
    currentHoneyDrops: store.currentHoneyDrops,
    totalHoneyDrops: store.totalHoneyDrops,
    lastEarnedAt: store.lastEarnedAt,
    resultId: safeResultId,
    earnedThisResult: !duplicateResult && Boolean(safeResultId),
    duplicateResult,
    unlocked: store.currentHoneyDrops >= 10,
    authenticated: false,
  };
}

export function normalizeHoneyDropsState(value: unknown): FortuneTeaHouseHoneyDropsState | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<FortuneTeaHouseHoneyDropsState>;
  return {
    currentHoneyDrops: clampCount(source.currentHoneyDrops),
    totalHoneyDrops: clampCount(source.totalHoneyDrops),
    lastEarnedAt: typeof source.lastEarnedAt === "string" ? source.lastEarnedAt : undefined,
    resultId: typeof source.resultId === "string" ? source.resultId : undefined,
    earnedThisResult: Boolean(source.earnedThisResult),
    duplicateResult: Boolean(source.duplicateResult),
    unlocked: Boolean(source.unlocked || clampCount(source.currentHoneyDrops) >= 10),
    authenticated: Boolean(source.authenticated),
    disabled: Boolean(source.disabled),
    reason: typeof source.reason === "string" ? source.reason : undefined,
  };
}

export function buildGuestHoneyBonusAdvice(result: FortuneTeaHouseConsultResponse): FortuneTeaHouseHoneyDropBonusAdvice {
  const mode = result.consultationMode || "tarot";
  const action =
    mode === "saju"
      ? "오늘은 내 속도를 지키는 약속 하나만 정해 보세요."
      : mode === "sukuyo"
        ? "오늘은 상대에게 확인하고 싶은 마음을 한 문장으로만 부드럽게 건네 보세요."
        : "오늘은 카드가 건넨 키워드 하나를 적고, 지금 할 수 있는 가장 작은 행동을 골라 보세요.";

  return {
    title: "연이의 따뜻한 조언",
    message: "꿀방울이 충분히 모였어요. 지금 마음을 급하게 결론내리기보다, 먼저 스스로에게 다정한 쪽을 골라 주세요. 흔들림이 있더라도 오늘의 작은 선택 하나가 내일의 온도를 조금 바꿔 줄 거예요.",
    action,
    source: "guest_local",
  };
}

export function attachHoneyBonusAdvice(
  result: FortuneTeaHouseConsultResponse,
  honeyDrops: FortuneTeaHouseHoneyDropsState | null,
): FortuneTeaHouseConsultResponse {
  if (!honeyDrops?.unlocked || result.honeyDropBonusAdvice) return result;
  return {
    ...result,
    honeyDropBonusAdvice: buildGuestHoneyBonusAdvice(result),
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
    "꿀방울은 약간 치킨집 쿠폰 같은 거예요. 모이면 괜히 뿌듯하잖아요?",
  ];
  return earnedMessages[Math.max(0, count) % earnedMessages.length];
}
