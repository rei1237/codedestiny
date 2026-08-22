import { readAiProfileSeed } from "@/app/_lib/ai-prefill-seed";
import type { LoadingLocale } from "@/constants/loadingMessages";
import type { NeoWarRoomConsultMode } from "./assets";

type NonKoLocale = Exclude<LoadingLocale, "ko">;

type NeoValidationMessages = {
  profile: string;
  birthDate: string;
  gender: string;
  birthTime: string;
  birthPlace: string;
  method: string;
  topic: string;
  intensity: string;
  question: (min: number) => string;
};

const NEO_VALIDATION_MESSAGES_KO: NeoValidationMessages = {
  profile: "저장된 프로필에 출생정보가 부족하다. 직접 입력으로 작전을 세워라.",
  birthDate: "생년월일이 빠졌다. 운명의 좌표부터 찍어라.",
  gender: "성별을 선택해라. 계산의 기준이 흐려진다.",
  birthTime: "출생시간을 입력하거나 모름으로 표시해라.",
  birthPlace: "베다점과 점성술은 시간대가 필요하다.",
  method: "분석 방식을 선택해라. 도구 없이 전장에 나갈 수는 없다.",
  topic: "상담 주제를 골라라. 전선이 정해져야 작전이 선다.",
  intensity: "팩폭 강도를 정해라. 어디까지 찌를지 알아야 한다.",
  question: (min) => `질문은 최소 ${min}자 이상 적어라. 흐린 질문에는 흐린 답만 온다.`,
};

const NEO_VALIDATION_MESSAGES_EN: NeoValidationMessages = {
  profile: "Your saved profile is missing birth info. Set up the operation with manual entry.",
  birthDate: "Date of birth is missing. Pin down the coordinates of your fate first.",
  gender: "Select a gender. Without it the basis of the calculation goes fuzzy.",
  birthTime: "Enter a time of birth, or mark it as unknown.",
  birthPlace: "Vedic and astrology both need a timezone.",
  method: "Pick an analysis method. You can't head into the field without a tool.",
  topic: "Choose a consultation topic. The operation can't stand until the front line is set.",
  intensity: "Set the fact-punch intensity. You need to know how far this goes.",
  question: (min) => `Write at least ${min} characters for your question. A vague question only gets a vague answer.`,
};

const NEO_VALIDATION_MESSAGES_JA: NeoValidationMessages = {
  profile: "保存されたプロフィールに出生情報が足りない。直接入力で作戦を立てろ。",
  birthDate: "生年月日が抜けている。運命の座標から打ち込め。",
  gender: "性別を選択しろ。計算の基準がぶれる。",
  birthTime: "出生時間を入力するか、不明として表示しろ。",
  birthPlace: "ベーダ占星術と西洋占星術にはタイムゾーンが必要だ。",
  method: "分析方式を選択しろ。道具なしで戦場には出られない。",
  topic: "相談テーマを選べ。前線が決まらなければ作戦は立たない。",
  intensity: "ファクトパンチの強度を決めろ。どこまで突くか知っておく必要がある。",
  question: (min) => `質問は最低${min}文字以上書け。曖昧な質問には曖昧な答えしか返らない。`,
};

const NEO_VALIDATION_MESSAGES_ZH_CN: NeoValidationMessages = {
  profile: "已保存资料缺少出生信息。请用手动输入来制定作战。",
  birthDate: "出生日期缺失。先标出命运的坐标。",
  gender: "请选择性别，否则计算基准会失准。",
  birthTime: "请输入出生时间，或标记为不详。",
  birthPlace: "吠陀占星与西洋占星都需要时区。",
  method: "请选择分析方式。没有工具无法上战场。",
  topic: "请选择咨询主题。前线定了，作战才能成立。",
  intensity: "请设定犀利程度，得知道要戳到什么地步。",
  question: (min) => `问题至少写${min}个字。模糊的问题只会得到模糊的答案。`,
};

const NEO_VALIDATION_MESSAGES_ZH_TW: NeoValidationMessages = {
  profile: "已保存資料缺少出生資訊。請用手動輸入來制定作戰。",
  birthDate: "出生日期缺失。先標出命運的座標。",
  gender: "請選擇性別，否則計算基準會失準。",
  birthTime: "請輸入出生時間，或標記為不詳。",
  birthPlace: "吠陀占星與西洋占星都需要時區。",
  method: "請選擇分析方式。沒有工具無法上戰場。",
  topic: "請選擇諮詢主題。前線定了，作戰才能成立。",
  intensity: "請設定犀利程度，得知道要戳到什麼地步。",
  question: (min) => `問題至少寫${min}個字。模糊的問題只會得到模糊的答案。`,
};

const NEO_VALIDATION_MESSAGES_BY_LOCALE: Partial<Record<NonKoLocale, NeoValidationMessages>> = {
  en: NEO_VALIDATION_MESSAGES_EN,
  ja: NEO_VALIDATION_MESSAGES_JA,
  "zh-CN": NEO_VALIDATION_MESSAGES_ZH_CN,
  "zh-TW": NEO_VALIDATION_MESSAGES_ZH_TW,
};

function getNeoValidationMessages(locale: LoadingLocale): NeoValidationMessages {
  if (locale === "ko") return NEO_VALIDATION_MESSAGES_KO;
  return NEO_VALIDATION_MESSAGES_BY_LOCALE[locale as NonKoLocale] || NEO_VALIDATION_MESSAGES_EN;
}

export type NeoWarRoomIntensityId = "soft" | "standard" | "roar";
export type NeoWarRoomProfileMode = "saved" | "manual";
export type NeoWarRoomGender = "" | "male" | "female" | "unknown";
export type NeoWarRoomCalendarType = "solar" | "lunar";

export type NeoWarRoomBirthInput = {
  name: string;
  gender: NeoWarRoomGender;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: NeoWarRoomCalendarType;
  city: string;
  country: string;
  timezone: string;
  latitude: string;
  longitude: string;
};

export type NeoWarRoomBirthState = {
  profileMode: NeoWarRoomProfileMode;
  hasSavedProfile: boolean;
  savedBirth: NeoWarRoomBirthInput;
  birth: NeoWarRoomBirthInput;
};

export type NeoWarRoomValidationInput = {
  profileMode: NeoWarRoomProfileMode;
  birth: NeoWarRoomBirthInput;
  method: NeoWarRoomConsultMode | "";
  topic: string;
  intensity: NeoWarRoomIntensityId | "";
  question: string;
};

export type NeoWarRoomValidationError = {
  field:
    | "profile"
    | "method"
    | "topic"
    | "intensity"
    | "question"
    | "birthDate"
    | "gender"
    | "birthTime"
    | "birthPlace";
  message: string;
};

export type NeoWarRoomAccessPayload = {
  idempotencyKey: string;
  profileMode: NeoWarRoomProfileMode;
  method: NeoWarRoomConsultMode;
  topic: string;
  intensity: NeoWarRoomIntensityId;
  question: string;
  birthInput: NeoWarRoomBirthInput;
  userProfile: NeoWarRoomBirthInput;
  clientFlow: "neo-operation-room:v1";
};

export const NEO_WAR_ROOM_ACCESS_ENDPOINT = "/api/neo-operation-room/ensure-access";
export const NEO_WAR_ROOM_MIN_QUESTION_LENGTH = 12;

const defaultBirthInput: NeoWarRoomBirthInput = {
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  city: "Seoul",
  country: "KR",
  timezone: "Asia/Seoul",
  latitude: "37.5665",
  longitude: "126.9780",
};

function normalizeGender(value: string | undefined): NeoWarRoomGender {
  if (value === "male" || value === "female" || value === "unknown") return value;
  return "";
}

function normalizeCalendarType(value: string | undefined): NeoWarRoomCalendarType {
  return value === "lunar" ? "lunar" : "solar";
}

function hasAnySavedBirth(input: NeoWarRoomBirthInput) {
  return Boolean(input.name || input.gender || input.birthDate || input.birthTime || input.city || input.timezone);
}

// 스토리지를 읽지 않는 결정적 기본 상태. 서버 프리렌더와 클라이언트 첫 렌더가 항상 일치해야
// 하이드레이션 예외("client-side exception")가 나지 않으므로, 초기 useState 값은 이 함수를 쓴다.
export function buildDefaultNeoWarRoomBirthState(): NeoWarRoomBirthState {
  return {
    profileMode: "manual",
    hasSavedProfile: false,
    savedBirth: defaultBirthInput,
    birth: defaultBirthInput,
  };
}

export function buildInitialNeoWarRoomBirthState(): NeoWarRoomBirthState {
  const seed = readAiProfileSeed();
  const savedBirth: NeoWarRoomBirthInput = {
    ...defaultBirthInput,
    name: seed.name || "",
    gender: normalizeGender(seed.gender),
    birthDate: seed.birthDate || "",
    birthTime: seed.birthTimeUnknown ? "" : seed.birthTime || defaultBirthInput.birthTime,
    birthTimeUnknown: seed.birthTimeUnknown ?? false,
    calendarType: normalizeCalendarType(seed.calendarType),
    city: seed.city || defaultBirthInput.city,
    country: seed.country || defaultBirthInput.country,
    timezone: seed.timezone || defaultBirthInput.timezone,
    latitude: seed.latitude || defaultBirthInput.latitude,
    longitude: seed.longitude || defaultBirthInput.longitude,
  };
  const hasSavedProfile = hasAnySavedBirth(savedBirth) && Boolean(seed.name || seed.gender || seed.birthDate || seed.birthTime || seed.birthTimeUnknown !== undefined);
  return {
    profileMode: hasSavedProfile ? "saved" : "manual",
    hasSavedProfile,
    savedBirth,
    birth: hasSavedProfile ? savedBirth : defaultBirthInput,
  };
}

export function validateNeoWarRoomInput(input: NeoWarRoomValidationInput, locale: LoadingLocale = "ko"): NeoWarRoomValidationError[] {
  const errors: NeoWarRoomValidationError[] = [];
  const birth = input.birth;
  const question = input.question.trim();
  const messages = getNeoValidationMessages(locale);

  if (input.profileMode === "saved" && !birth.birthDate && !birth.gender) {
    errors.push({ field: "profile", message: messages.profile });
  }
  if (!birth.birthDate) {
    errors.push({ field: "birthDate", message: messages.birthDate });
  }
  if (!birth.gender) {
    errors.push({ field: "gender", message: messages.gender });
  }
  if (!birth.birthTimeUnknown && !birth.birthTime) {
    errors.push({ field: "birthTime", message: messages.birthTime });
  }
  if ((input.method === "vedic" || input.method === "astrology") && !birth.timezone) {
    errors.push({ field: "birthPlace", message: messages.birthPlace });
  }
  if (!input.method) {
    errors.push({ field: "method", message: messages.method });
  }
  if (!input.topic) {
    errors.push({ field: "topic", message: messages.topic });
  }
  if (!input.intensity) {
    errors.push({ field: "intensity", message: messages.intensity });
  }
  if (question.length < NEO_WAR_ROOM_MIN_QUESTION_LENGTH) {
    errors.push({
      field: "question",
      message: messages.question(NEO_WAR_ROOM_MIN_QUESTION_LENGTH),
    });
  }

  return errors;
}

export function createNeoWarRoomIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `neo-war-room-${crypto.randomUUID()}`;
  }
  return `neo-war-room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * 🔴 요청키는 새로고침을 견뎌야 한다. 이 값이 결제의 멱등키(서버 원장의 sourceId)이므로,
 * 메모리에만 두면 "결제 실패 → 새로고침 → 다시 시도"가 **새 키 = 두 번째 차감**이 된다.
 * 같은 입력(지문)이면 같은 키를 돌려줘 서버가 replay 로 흡수하게 한다.
 *
 * 탭 단위(sessionStorage)로 충분하다 — 결제-생성 흐름은 한 탭 안에서 끝나고, 탭을 새로 열면
 * 새 상담으로 보는 것이 맞다. 저장소를 못 쓰면 조용히 새 키로 폴백한다(기능은 계속 동작한다).
 */
const NEO_WAR_ROOM_REQUEST_KEY_PREFIX = "cd_neo_war_room_request_key::";

function neoWarRoomRequestKeyStorageKey(inputFingerprint: string) {
  // 지문 원문은 생년월일·질문을 담고 있어 그대로 키로 쓰지 않는다(저장소 노출 최소화 + 길이 제한).
  let hash = 5381;
  for (let index = 0; index < inputFingerprint.length; index += 1) {
    hash = ((hash * 33) ^ inputFingerprint.charCodeAt(index)) >>> 0;
  }
  return `${NEO_WAR_ROOM_REQUEST_KEY_PREFIX}${hash.toString(36)}`;
}

export function resolveNeoWarRoomIdempotencyKey(inputFingerprint: string) {
  const storageKey = neoWarRoomRequestKeyStorageKey(inputFingerprint);
  try {
    const saved = window.sessionStorage.getItem(storageKey);
    if (saved) return saved;
  } catch {
    return createNeoWarRoomIdempotencyKey();
  }
  const created = createNeoWarRoomIdempotencyKey();
  try {
    window.sessionStorage.setItem(storageKey, created);
  } catch {
    /* 저장 실패는 치명적이지 않다 — 이번 시도는 그대로 진행한다. */
  }
  return created;
}

/** 결과를 받은 뒤에는 같은 입력이라도 새 상담이므로 저장된 키를 비운다(재사용 = 무료 재열람 오해). */
export function clearNeoWarRoomIdempotencyKey(inputFingerprint: string) {
  try {
    window.sessionStorage.removeItem(neoWarRoomRequestKeyStorageKey(inputFingerprint));
  } catch {
    /* 무시 */
  }
}

export function buildNeoWarRoomAccessPayload(input: NeoWarRoomValidationInput, idempotencyKey: string): NeoWarRoomAccessPayload {
  if (!input.method || !input.intensity) {
    throw new Error("INVALID_NEO_WAR_ROOM_INPUT");
  }
  const birthInput = {
    ...input.birth,
    birthTime: input.birth.birthTimeUnknown ? "" : input.birth.birthTime,
  };
  return {
    idempotencyKey,
    profileMode: input.profileMode,
    method: input.method,
    topic: input.topic,
    intensity: input.intensity,
    question: input.question.trim(),
    birthInput,
    userProfile: birthInput,
    clientFlow: "neo-operation-room:v1",
  };
}

export function createNeoWarRoomInputFingerprint(input: NeoWarRoomValidationInput) {
  return JSON.stringify({
    profileMode: input.profileMode,
    birth: input.birth,
    method: input.method,
    topic: input.topic,
    intensity: input.intensity,
    question: input.question.trim(),
  });
}
