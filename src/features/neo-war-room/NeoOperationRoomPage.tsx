"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { isRetriableResultPollFailure, runAccessCheckWithTransientRetry } from "@/app/_lib/consultationResultPolling";
import { toDisplayText } from "@/lib/llm-text";
import { buildResizedAssetUrl } from "@/lib/r2-public-url";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  formatPaymentWon,
  runBillingCoinGate,
} from "@/app/_lib/billing-client";
import { useServerPrice } from "@/app/hooks/useServerPrice";
import LlmParagraphs from "@/components/fortune/LlmParagraphs";
import NeoFactPunch from "./components/NeoFactPunch";
import NeoSpriteActor from "./components/NeoSpriteActor";
import NeoWarRoomAssetImage from "./components/NeoWarRoomAssetImage";
import {
  type NeoWarRoomAsset,
  type NeoWarRoomConsultMode,
  neoWarRoomAssets,
  neoWarRoomBgmTracks,
} from "./data/assets";
import {
  getNeoIntensityDialogue,
  getNeoLoadingDialogue,
  getNeoMethodDialogue,
  getNeoTopicDialogue,
  neoOperationDialogues,
  pickNeoDialogue,
} from "./data/dialogues";
import {
  NEO_WAR_ROOM_MIN_QUESTION_LENGTH,
  NEO_WAR_ROOM_ACCESS_ENDPOINT,
  buildInitialNeoWarRoomBirthState,
  buildDefaultNeoWarRoomBirthState,
  buildNeoWarRoomAccessPayload,
  clearNeoWarRoomIdempotencyKey,
  createNeoWarRoomInputFingerprint,
  resolveNeoWarRoomIdempotencyKey,
  validateNeoWarRoomInput,
  type NeoWarRoomAccessPayload,
  type NeoWarRoomBirthInput,
  type NeoWarRoomGender,
  type NeoWarRoomIntensityId,
  type NeoWarRoomValidationError,
  type NeoWarRoomValidationInput,
} from "./data/input-flow";
import { neoWarRoomMethodRegistry } from "./data/method-registry";
import type { NeoWarRoomEmotionState } from "./data/sprite-states";
import styles from "./neo-operation-room.module.css";

type IntensityId = NeoWarRoomIntensityId;
type FlowPhase = "idle" | "invalid" | "checking" | "payment" | "generating" | "completed" | "failed";
type NeoSpriteVariant = "transparent" | "with-background" | "fullbody";
type NeoPreviewMode = "" | "loading" | "briefing" | "reality" | "refined";
type PendingAccess = {
  endpoint: typeof NEO_WAR_ROOM_ACCESS_ENDPOINT;
  idempotencyKey: string;
  inputFingerprint: string;
  payload: NeoWarRoomAccessPayload;
};
type AccessType = "pass" | "paid" | "subscription" | "admin";
type NeoBriefing = {
  selectedMethod?: NeoWarRoomConsultMode;
  operationTitle?: string;
  neoOpening?: string;
  frontlineSummary?: string;
  coreDiagnosis?: string;
  repeatedChoice?: { title?: string; description?: string };
  repeatedPattern?: { title?: string; description?: string };
  innateNature?: { title?: string; description?: string; keyTraits?: string[] };
  innateStrength?: { title?: string; description?: string; strongPoints?: string[]; weakPoints?: string[] };
  topicStyle?: { title?: string; description?: string; keyPoints?: string[] };
  topicAreas?: Array<{ area?: string; reading?: string }>;
  topicTiming?: { title?: string; description?: string; windows?: string[] };
  originalStrategy?: { title?: string; description?: string; keyRules?: string[] };
  misalignedFlow?: { title?: string; description?: string };
  currentProblem?: { title?: string; description?: string };
  methodEvidence?: Array<{ method?: string; label?: string; summary?: string }>;
  bluntTruth?: string;
  forbiddenAction?: { title?: string; reason?: string };
  actionOrders?: string[];
  sevenDayMission?: Array<{ day?: number; mission?: string }>;
  realityCheckQuestions?: Array<{ question?: string; whyItMatters?: string }>;
  badge?: { name?: string; description?: string };
  tsundereClosing?: string;
  nextStepPrompt?: string;
};
type NeoRefinedOrder = {
  selectedMethod?: NeoWarRoomConsultMode;
  operationTitle?: string;
  neoReview?: string;
  verdict?: { status?: string; statement?: string };
  verdictBasis?: string;
  actionAlternatives?: Array<{ timing?: string; action?: string; rationale?: string }>;
  peopleToMeet?: Array<{ role?: string; complementaryEnergy?: string; whereToFind?: string }>;
  thirtyDayStrategy?: string[];
  forbiddenAction?: { title?: string; reason?: string };
  thisWeekFirstStep?: string;
  badge?: { name?: string; description?: string };
  tsundereClosing?: string;
};
type NeoSession = {
  ok: true;
  id?: string;
  sessionId?: string;
  status?: string;
  accessType?: AccessType;
  initialBriefing?: NeoBriefing | null;
  refinedOrder?: NeoRefinedOrder | null;
  realityCheck?: { selectedChecks?: string[]; freeform?: string };
  versionHistory?: Array<{ version?: number; documentType?: string; operationTitle?: string; createdAt?: string }>;
  resultUrl?: string;
};
type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: AccessType; consultation?: NeoSession | null }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload: Record<string, unknown> }
  | { ok: false; reason: "LOGIN_REQUIRED" | "INVALID_INPUT" | "PAYMENT_VERIFY_FAILED" | "PAYMENT_CANCELLED" | "LLM_ERROR" | "CALCULATION_ERROR" | "SERVER_ERROR"; message?: string };
type NeoCommandSpriteConfig = {
  state: NeoWarRoomEmotionState;
  variant: NeoSpriteVariant;
  asset?: NeoWarRoomAsset;
  sheetFrame?: number;
};
type NeoPrologueSpeaker = "customer" | "neo" | "lion" | "narration" | "system";
type NeoPrologueCharacter = "hidden" | "shadow" | "lion" | "lionGlitch" | "strategyMain" | "morph" | "humanNeo";
type NeoPrologueEffect = "none" | "signal" | "seal" | "morph" | "arrival";
type NeoPrologueLine = {
  id: string;
  speaker: NeoPrologueSpeaker;
  speakerLabel: string;
  text: string;
  scene: "intro" | "signal" | "lionReveal" | "patternAudit" | "nameReveal" | "transformation" | "humanNeo" | "strategyRoom" | "final";
  character: NeoPrologueCharacter;
  sheetFrame?: number;
  effect?: NeoPrologueEffect;
  notification?: { title: string; body: string };
  cta?: { label: string; helperText: string };
};

const FEATURE_KEY = "neo-operation-room-consultation";
const FEATURE_TITLE = "네오의 팩폭 작전실";
const API_ENDPOINTS = {
  ensureAccess: NEO_WAR_ROOM_ACCESS_ENDPOINT,
  start: "/api/neo-operation-room/start",
  refine: "/api/neo-operation-room/refine",
  result: "/api/neo-operation-room/result",
} as const;
const PENDING_RESULT_POLL_INTERVAL_MS = 4000;
// 백그라운드 14챕터 생성(최악 ~3분)을 덮도록 4s×60=240s 예산. CF rate-limit(10s당 100회) 여유 안.
const PENDING_RESULT_POLL_MAX_ATTEMPTS = 60;
const BRIEFING_SEAL_DELAY_MS = 1200;
const BRIEFING_REVEAL_STEP_COUNT = 8;
const BRIEFING_REVEAL_INTERVAL_MS = 1500;

const NEO_WAR_ROOM_BGM_STORAGE_KEY = "code-destiny-neo-operation-room-bgm";
const NEO_WAR_ROOM_BGM_TRACK = neoWarRoomBgmTracks.moonlitWarRoom;
const NEO_OPERATION_ROOM_ENTRY_REVISION = "neo-lobby-entry-20260630";
const NEO_STRATEGY_PROLOGUE_SEEN_KEY = "neoStrategyPrologueSeen";
const NEO_PRE_TRANSFORM_SHEET_COLUMNS = 4;
const NEO_PRE_TRANSFORM_SHEET_ROWS = 4;
const NEO_PRE_TRANSFORM_SHEET_CELL_PX = 313.5;
const NEO_PRE_TRANSFORM_FRAME_INSET_PX = 0;
const NEO_MAIN_DIALOGUE_AUTO_ADVANCE_MS = 6200;
const METHOD_INTRO_AUTO_ADVANCE_MS = 7200;
const COMMAND_DIALOGUE_BASE_SPEED_MS = 28;
const COMMAND_DIALOGUE_MAX_DURATION_MS = 2800;
const NEO_PREVIEW_MODES = new Set<NeoPreviewMode>(["loading", "briefing", "reality", "refined"]);
const NEO_LOADING_SEAL_SRC = "/neo-operation-room/lion-seal-loading.webp";

const NEO_INTRO_PORTRAIT = neoWarRoomAssets.hero.portrait;
const NEO_PROLOGUE_SHADOW = neoWarRoomAssets.hero.blackShadow;
const NEO_PROLOGUE_LION = neoWarRoomAssets.hero.lionSeal;
const NEO_PROLOGUE_PRE_TRANSFORM_MAIN = neoWarRoomAssets.hero.strategyNeoMain;
const NEO_TRANSPARENT_TALK_INTERVAL_MS = 3200;
const NEO_TRANSPARENT_TALK_SHEETS = neoWarRoomAssets.sprites.transparent;
const createNeoTransparentCropAsset = (sheetIndex: number, frameIndex: number): NeoWarRoomAsset => {
  const sourceSheet = NEO_TRANSPARENT_TALK_SHEETS[sheetIndex] ?? NEO_INTRO_PORTRAIT;
  const sheetNumber = sheetIndex + 1;
  const frameNumber = frameIndex + 1;
  const paddedFrame = String(frameNumber).padStart(2, "0");
  return {
    ...sourceSheet,
    src: `/neo-operation-room/sprites/transparent/neo-transparent-s${sheetNumber}-f${paddedFrame}.webp`,
    fallbackSrc: NEO_INTRO_PORTRAIT.src,
    objectKey: `public/neo-operation-room/sprites/transparent/neo-transparent-s${sheetNumber}-f${paddedFrame}.webp`,
    alt: `네오 배경 없는 표정 컷 ${sheetNumber}-${frameNumber}`,
    role: `transparent-crop-${sheetNumber}-${paddedFrame}`,
  };
};
const NEO_TRANSPARENT_TALK_FRAME_ASSETS: readonly NeoWarRoomAsset[] = NEO_TRANSPARENT_TALK_SHEETS.flatMap((_, sheetIndex) =>
  Array.from({ length: 8 }, (_unused, frameIndex) => createNeoTransparentCropAsset(sheetIndex, frameIndex)),
);
const getNeoTransparentTalkFrameAsset = (sheetIndex: number, frameIndex: number) =>
  createNeoTransparentCropAsset(sheetIndex % NEO_TRANSPARENT_TALK_SHEETS.length, frameIndex % 8);

const entryBriefingItems = [
  { label: "상담 방식", value: "사주 · 자미두수 · 베다 · 점성술" },
  { label: "입력 흐름", value: "출생 좌표, 현재 전선, 핵심 질문" },
  { label: "결과 구성", value: "진단, 반복 패턴, 7일 행동 기준" },
  { label: "접근 방식", value: "이용권 확인 후 전략 브리핑" },
] as const;

const methodIntroDialogues = [
  {
    key: "method.intro.front",
    category: "methodSelect",
    text: "어떤 전선부터 볼 거냐.",
    emotionState: "curious",
    spriteFrame: 1,
  },
  {
    key: "method.intro.maps",
    category: "methodSelect",
    text: "사주, 자미두수, 베다점, 점성술.",
    emotionState: "curious",
    spriteFrame: 2,
  },
  {
    key: "method.intro.purpose",
    category: "methodSelect",
    text: "보는 지도는 달라도 목적은 하나다.",
    emotionState: "curious",
    spriteFrame: 7,
  },
  {
    key: "method.intro.sharpKindness",
    category: "methodSelect",
    text: "내 말이 조금 날카롭게 들릴 수 있다. 그래도 방향만 잡히면, 그 날카로움은 꽤 쓸 만한 등불이 된다.",
    emotionState: "encouragement",
    spriteFrame: 4,
  },
  {
    key: "method.intro.side",
    category: "methodSelect",
    text: "네 편을 무작정 들어주지는 않는다. 대신 네가 다시 일어설 쪽은 끝까지 가리켜 준다.",
    emotionState: "blunt",
    spriteFrame: 5,
  },
  {
    key: "method.intro.gaze",
    category: "methodSelect",
    text: "숨기려는 표정까지 다 보인다. 그러니까 괜히 멋있는 척하지 말고, 지금 흔들리는 자리부터 골라라.",
    emotionState: "curious",
    spriteFrame: 2,
  },
  {
    key: "method.intro.promise",
    category: "methodSelect",
    text: "괜찮다. 흐트러진 기록도 지도 위에 올리면 다음 길이 된다. 내가 그 선을 같이 짚어주겠다.",
    emotionState: "encouragement",
    spriteFrame: 1,
  },
  {
    key: "method.intro.table",
    category: "methodSelect",
    text: "여기서는 듣기 좋은 말보다 쓸모 있는 기준을 먼저 꺼낸다.",
    emotionState: "blunt",
    spriteFrame: 3,
  },
  {
    key: "method.intro.saju",
    category: "methodSelect",
    text: "사주를 고르면 계절과 기질부터 본다. 네 선택의 뿌리가 어디로 기우는지 확인한다.",
    emotionState: "curious",
    spriteFrame: 4,
  },
  {
    key: "method.intro.ziwei",
    category: "methodSelect",
    text: "자미두수를 고르면 명궁의 지휘선을 본다. 반복되는 장면이 어디서 시작되는지 잡는다.",
    emotionState: "idle",
    spriteFrame: 5,
  },
  {
    key: "method.intro.vedic",
    category: "methodSelect",
    text: "베다점을 고르면 카르마의 압력을 본다. 익숙한 불안과 진짜 신호를 나눈다.",
    emotionState: "curious",
    spriteFrame: 6,
  },
  {
    key: "method.intro.astrology",
    category: "methodSelect",
    text: "점성술을 고르면 마음의 각도를 본다. 관계와 선택 습관이 어디서 흔들리는지 읽는다.",
    emotionState: "encouragement",
    spriteFrame: 8,
  },
  {
    key: "method.intro.choose",
    category: "methodSelect",
    text: "골라라. 지도는 다르지만 오늘 다시 잡아야 할 기준은 하나로 모인다.",
    emotionState: "blunt",
    spriteFrame: 2,
  },
] as const;

const neoLandingDialogues = [
  "왔냐. 여긴 마음을 달래기 전에, 네 선택의 기준을 먼저 세우는 전략 상담실이다.",
  "문이 닫히면 핑계가 아니라 사실을 올려놓는다. 어디서 같은 선택을 반복했는지부터 본다.",
  "오늘 볼 건 운이 좋고 나쁘다가 아니다. 네가 왜 비슷한 장면에서 계속 힘을 잃는지다.",
  "사주든 별자리든 지도는 다르다. 목적은 네가 다시 움직일 기준을 찾는 것이다.",
  "겁먹을 필요 없다. 감정의 안개를 판단 가능한 문장으로 바꾸는 과정이다.",
  "네가 오래 미룬 질문이 있다면, 그게 오늘 첫 번째 단서다.",
  "사자 휘장은 겁주는 표식이 아니다. 다시 기준을 세우겠다는 신호다.",
  "준비됐으면 앉아라. 이제부터는 막연한 불운이 아니라 반복된 선택 구조를 본다.",
] as const;

const neoPrologueDialogues: readonly NeoPrologueLine[] = [
  {
    id: "system-unlock",
    speaker: "system",
    speakerLabel: "작전실 시스템",
    text: "전략실 잠금 해제.\n감정 소음 차단, 판단 회로 정렬 완료.",
    scene: "intro",
    character: "hidden",
    effect: "signal",
  },
  {
    id: "story-door-open",
    speaker: "narration",
    speakerLabel: "내레이션",
    text: "육중한 문이 열리고, 차가운 빛이 바닥을 가른다.\n중앙 홀로그램 위로 한 문장이 떠오른다.",
    scene: "signal",
    character: "hidden",
    effect: "signal",
  },
  {
    id: "system-creed",
    speaker: "system",
    speakerLabel: "작전실 시스템",
    text: "운명은 착한 사람을 돕지 않는다.\n제 문제를 정면으로 마주할 사람에게만 길을 연다.",
    scene: "signal",
    character: "shadow",
    effect: "signal",
  },
  {
    id: "customer-room-check",
    speaker: "customer",
    speakerLabel: "고객",
    text: "여기… 그냥 운세 보는 곳이 아니었나.",
    scene: "intro",
    character: "shadow",
    effect: "signal",
  },
  {
    id: "story-lion-seal",
    speaker: "narration",
    speakerLabel: "내레이션",
    text: "정면 벽의 황금 사자 휘장에 불이 들어온다.\n그리고 휘장 속 사자가, 천천히 눈을 뜬다.",
    scene: "lionReveal",
    character: "lion",
    effect: "seal",
  },
  {
    id: "lion-first-word",
    speaker: "lion",
    speakerLabel: "황금 사자",
    text: "겁먹지 마라.\n너를 이 방까지 끌고 온 건, 네 발이 아니라 네가 미뤄 둔 문제다.",
    scene: "lionReveal",
    character: "lion",
    effect: "seal",
  },
  {
    id: "customer-startled",
    speaker: "customer",
    speakerLabel: "고객",
    text: "…지금, 사자가 말한 건가요?",
    scene: "lionReveal",
    character: "lion",
    effect: "seal",
  },
  {
    id: "lion-pattern-read",
    speaker: "lion",
    speakerLabel: "황금 사자",
    text: "놀랄 건 그게 아니지.\n너는 같은 자리에서 몇 번을 물러섰는지, 이미 알고 있으면서 세지 않았다.",
    scene: "patternAudit",
    character: "lion",
    effect: "seal",
  },
  {
    id: "customer-defense",
    speaker: "customer",
    speakerLabel: "고객",
    text: "…그건, 그때는 어쩔 수 없었어요.",
    scene: "patternAudit",
    character: "lion",
    effect: "seal",
  },
  {
    id: "lion-name-problem",
    speaker: "lion",
    speakerLabel: "황금 사자",
    text: "어쩔 수 없었다는 말은, 아직 이름을 안 붙였다는 뜻이다.\n이름 없는 문제는 평생 같은 얼굴로 다시 온다.",
    scene: "nameReveal",
    character: "lion",
    effect: "seal",
  },
  {
    id: "lion-offer-power",
    speaker: "lion",
    speakerLabel: "황금 사자",
    text: "묻겠다.\n힘을 원하나?",
    scene: "nameReveal",
    character: "lion",
    effect: "seal",
  },
  {
    id: "lion-define-power",
    speaker: "lion",
    speakerLabel: "황금 사자",
    text: "여기서 힘이란 운을 바꾸는 요행이 아니다.\n네 상황을 정확히 보고, 다음 한 수를 스스로 고르는 능력이다.",
    scene: "nameReveal",
    character: "lion",
    effect: "seal",
  },
  {
    id: "customer-accept",
    speaker: "customer",
    speakerLabel: "고객",
    text: "…원해요.\n이번엔 제대로 알고 싶어요.",
    scene: "nameReveal",
    character: "lion",
    effect: "seal",
  },
  {
    id: "story-lion-transform",
    speaker: "narration",
    speakerLabel: "내레이션",
    text: "사자의 몸이 황금빛으로 무너지며 다시 짜인다.\n네 발로 서 있던 짐승이, 두 발로 선 사람의 형상으로 바뀐다.",
    scene: "transformation",
    character: "morph",
    effect: "morph",
  },
  {
    id: "system-protocol",
    speaker: "system",
    speakerLabel: "작전실 시스템",
    text: "인장 해제, 인간형 전환 완료.\n팩폭 프로토콜 가동.",
    scene: "transformation",
    character: "morph",
    effect: "morph",
  },
  {
    id: "story-human-reveal",
    speaker: "narration",
    speakerLabel: "내레이션",
    text: "빛이 흩어진 자리에, 사자의 눈빛을 그대로 가진 남자가 서 있다.",
    scene: "humanNeo",
    character: "humanNeo",
    effect: "arrival",
  },
  {
    id: "neo-self-intro",
    speaker: "neo",
    speakerLabel: "네오",
    text: "네오다.\n방금 그 사자, 나다. 이 모습이 대화하기엔 편하지.",
    scene: "humanNeo",
    character: "humanNeo",
    effect: "arrival",
  },
  {
    id: "neo-blunt-first",
    speaker: "neo",
    speakerLabel: "네오",
    text: "미리 말해 두지.\n네 운은 나쁜 게 아니다. 운이 없는 게 아니라, 전략이 없는 쪽에 가깝다.",
    scene: "strategyRoom",
    character: "humanNeo",
    effect: "arrival",
  },
  {
    id: "neo-room-role",
    speaker: "neo",
    speakerLabel: "네오",
    text: "여긴 위로를 파는 곳이 아니다.\n네가 외면한 자리를 정확히 짚어 주는 곳이지.",
    scene: "strategyRoom",
    character: "humanNeo",
    effect: "arrival",
  },
  {
    id: "neo-final-briefing",
    speaker: "neo",
    speakerLabel: "네오",
    text: "상처받을 각오 됐나. 좋아, 그럼 시작하자.\n네가 이름 붙이길 피한 문제, 내가 대신 정확히 불러 주겠다.",
    scene: "final",
    character: "humanNeo",
    effect: "arrival",
    notification: {
      title: "전략실 연결 완료",
      body: "현재 전선, 출생 좌표, 질문, 직면 강도가 작전판에 오른다.",
    },
    cta: {
      label: "운명 전략실 입장하기",
      helperText: "막힌 흐름을 기준과 다음 행동으로 정리한다.",
    },
  },
] as const;

const getNeoPrologueCharacterAsset = (character: NeoPrologueCharacter): NeoWarRoomAsset => {
  if (character === "shadow") return NEO_PROLOGUE_SHADOW;
  if (character === "lion" || character === "lionGlitch" || character === "morph") return NEO_PROLOGUE_LION;
  if (character === "strategyMain") return NEO_PROLOGUE_PRE_TRANSFORM_MAIN;
  if (character === "humanNeo") return NEO_INTRO_PORTRAIT;
  return NEO_INTRO_PORTRAIT;
};

const getNeoSheetCropStyle = (
  frame: number,
  columns: number,
  rows: number,
  cellPx: number,
  insetPx: number,
) => {
  const frameCount = columns * rows;
  const safeFrame = Math.max(1, Math.min(frameCount, frame));
  const frameIndex = safeFrame - 1;
  const column = frameIndex % columns;
  const row = Math.floor(frameIndex / columns);
  const cropScale = cellPx / (cellPx - insetPx * 2);
  const sheetWidth = columns * cropScale * 100;
  const sheetHeight = rows * cropScale * 100;
  const sheetX = -((column + insetPx / cellPx) * cropScale * 100);
  const sheetY = -((row + insetPx / cellPx) * cropScale * 100);
  return {
    "--neo-sheet-columns": `${columns}`,
    "--neo-sheet-rows": `${rows}`,
    "--neo-sheet-width": `${sheetWidth}%`,
    "--neo-sheet-height": `${sheetHeight}%`,
    "--neo-sheet-x": `${sheetX}%`,
    "--neo-sheet-y": `${sheetY}%`,
  };
};

const getNeoPrologueCharacterLabel = (character: NeoPrologueCharacter) => {
  if (character === "hidden") return "전략실 홀로그램";
  if (character === "shadow") return "전략실에 서 있는 고객의 그림자";
  if (character === "lion") return "전략실에 나타난 사자";
  if (character === "lionGlitch") return "홀로그램 빛에 휘말린 사자";
  if (character === "strategyMain") return "전략실 지휘석에서 예를 갖춘 네오";
  if (character === "morph") return "전략가에서 네오로 이어지는 변신 장면";
  return "전략실에서 말하는 네오";
};

const methodCardCopy: Record<NeoWarRoomConsultMode, string> = {
  saju: "태어난 계절과 기질, 오행의 균형에서 지금 흔들리는 선택의 중심을 잡는다.",
  ziwei: "명궁과 별자리 배치로 반복되는 운명의 작전선을 읽는다.",
  vedic: "카르마와 행성의 압력, 반복되는 삶의 습관을 분석한다.",
  astrology: "별자리와 행성 각도에서 선택 습관과 관계 패턴을 읽는다.",
};

const neoCommandSpriteMap = {
  method_select: {
    state: "curious",
    variant: "transparent",
    asset: getNeoTransparentTalkFrameAsset(0, 0),
  },
  topic_select: {
    state: "curious",
    variant: "transparent",
    asset: getNeoTransparentTalkFrameAsset(1, 1),
  },
  birth_info: {
    state: "idle",
    variant: "transparent",
    asset: getNeoTransparentTalkFrameAsset(2, 2),
  },
  intensity_soft: {
    state: "encouragement",
    variant: "transparent",
    asset: getNeoTransparentTalkFrameAsset(3, 3),
  },
  intensity_normal: {
    state: "blunt",
    variant: "transparent",
    asset: getNeoTransparentTalkFrameAsset(3, 4),
  },
  intensity_roar: {
    state: "blunt",
    variant: "transparent",
    asset: getNeoTransparentTalkFrameAsset(4, 5),
  },
  asking_question: {
    state: "curious",
    variant: "transparent",
    asset: getNeoTransparentTalkFrameAsset(1, 6),
  },
  analyzing: {
    state: "analyzing",
    variant: "with-background",
    asset: neoWarRoomAssets.sprites.withBackground[2],
    sheetFrame: 3,
  },
  reality_check: {
    state: "reality_check",
    variant: "with-background",
    asset: neoWarRoomAssets.sprites.withBackground[4],
    sheetFrame: 5,
  },
  result_complete: {
    state: "completed",
    variant: "with-background",
    asset: neoWarRoomAssets.sprites.withBackground[6],
    sheetFrame: 7,
  },
} satisfies Record<string, NeoCommandSpriteConfig>;

const localPreviewBriefing: NeoBriefing = {
  selectedMethod: "saju",
  operationTitle: "흐려진 전선을 다시 잡는 작전",
  neoOpening: "좋다. 지금 네 운은 멈춘 게 아니라, 같은 선택 앞에서 자꾸 힘을 잃고 있다.",
  frontlineSummary: "겉으로는 선택지가 많은데, 실제로는 마음이 편한 쪽으로만 도망가려는 흐름이 강하다.",
  coreDiagnosis: "겉으로는 선택지가 많은데, 실제로는 마음이 편한 쪽으로만 도망가려는 흐름이 강하다.",
  repeatedChoice: {
    title: "반복되는 선택",
    description: "중요한 순간마다 확신을 기다리다가 타이밍을 놓치고, 뒤늦게 스스로를 몰아붙이는 모습이 드러난다.",
  },
  repeatedPattern: {
    title: "반복되는 선택",
    description: "중요한 순간마다 확신을 기다리다가 타이밍을 놓치고, 뒤늦게 스스로를 몰아붙이는 모습이 드러난다.",
  },
  innateNature: {
    title: "타고난 성향의 핵",
    description: "너는 감정이 가라앉은 뒤에 판단이 서는 사람이다. 즉흥보다 기준으로 움직일 때 힘이 붙고, 기준이 흐려지면 곧바로 흔들린다.",
    keyTraits: ["기준으로 움직이는 사람", "감정 정리 후 판단이 서는 구조", "확신을 기다리다 타이밍을 놓치는 경향"],
  },
  innateStrength: {
    title: "타고난 강점과 약점",
    description: "밀어붙일 자리는 기준을 세워 오래 끌고 가는 지구력이고, 지켜야 할 자리는 확신을 기다리며 결정을 미루는 습관이다.",
    strongPoints: ["기준을 세우면 오래 끌고 가는 지구력", "감정에 휩쓸리지 않는 판단력"],
    weakPoints: ["확신을 기다리다 타이밍을 놓치는 결정 지연", "남의 반응에 기준이 흔들리는 지점"],
  },
  topicStyle: {
    title: "이 주제에서 너의 방식",
    description: "이 영역에서 너는 판을 넓게 벌이기보다, 기준이 맞는 한 자리를 오래 파고들 때 성과가 난다. 조급하게 여러 갈래로 벌이면 힘이 흩어진다.",
    keyPoints: ["한 자리를 오래 파고들 때 성과", "기준이 맞는지부터 확인하는 방식", "여러 갈래로 벌이면 흩어짐"],
  },
  topicAreas: [
    { area: "중심 자리", reading: "이 주제의 축이 되는 자리가 단단해, 방향만 정하면 밀고 나갈 힘은 충분하다." },
    { area: "흐름 자리", reading: "다만 흐름을 다루는 자리가 약해, 타이밍을 재다가 놓치는 손실이 반복된다." },
    { area: "관계 자리", reading: "사람과 얽히는 자리에서 남의 반응에 기준이 흔들리는 결이 보인다." },
  ],
  topicTiming: {
    title: "이 주제의 시기 흐름",
    description: "지금 국면은 재는 때가 아니라 작게라도 벌려 확인하는 때다. 미룰수록 흐름이 닫힌다.",
    windows: ["현재: 작게 벌려 확인하는 확장 국면", "다음 전환 전: 선택지를 좁혀 정리"],
  },
  originalStrategy: {
    title: "본래 너는 이렇게 살아야 한다",
    description: "감정이 가라앉은 뒤 판단하는 사람이다. 빠른 결정보다 기준을 먼저 세울수록 운이 안정된다.",
    keyRules: ["선택 전에 기준을 적는다", "사람의 반응보다 내 리듬을 먼저 본다", "미룬 질문을 하루 안에 하나만 처리한다"],
  },
  misalignedFlow: {
    title: "지금 흐름이 어긋난 자리",
    description: "정답을 몰라서가 아니라, 답을 고르면 잃을 것이 보이기 때문에 계속 판단을 흐리고 있다.",
  },
  currentProblem: {
    title: "지금 흐름이 어긋난 자리",
    description: "정답을 몰라서가 아니라, 답을 고르면 잃을 것이 보이기 때문에 계속 판단을 흐리고 있다.",
  },
  methodEvidence: [
    { method: "saju", label: "사주 작전 브리핑", summary: "일간의 무기는 기준을 세울 때 살아나고, 계절의 기운은 선택을 오래 붙잡기보다 행동으로 닫을 때 안정된다." },
  ],
  bluntTruth: "너는 아직 준비가 안 된 게 아니다. 준비라는 이름으로 결정을 늦추는 데 익숙해진 거다.",
  forbiddenAction: {
    title: "오늘 금지 행동",
    reason: "상대 반응을 핑계로 내 결정을 다시 무르는 것.",
  },
  actionOrders: ["선택 기준 세 가지를 적어라", "오늘 버릴 선택지 하나를 정해라", "미룬 질문 하나를 밤 전까지 처리해라"],
  sevenDayMission: [
    { day: 1, mission: "가장 미룬 질문 하나를 적어라." },
    { day: 2, mission: "선택 기준 세 가지를 정리해라." },
    { day: 3, mission: "기준에 맞지 않는 선택지를 하나 버려라." },
    { day: 4, mission: "마음이 흔들린 순간과 이유를 한 줄로 남겨라." },
    { day: 5, mission: "남의 반응을 확인하기 전에 네 기준을 먼저 읽어라." },
    { day: 6, mission: "버릴 선택지 하나를 조용히 지워라." },
    { day: 7, mission: "일주일 뒤에도 남는 기준만 작전표에 남겨라." },
  ],
  realityCheckQuestions: [
    { question: "지금 네가 미루는 선택은 정말 정보가 부족해서냐?", whyItMatters: "부족한 정보와 피하고 싶은 책임은 전혀 다르다." },
    { question: "네가 잃기 싫은 것은 사람의 평가냐, 네가 상상한 안전함이냐?", whyItMatters: "지키는 대상을 잘못 보면 작전이 계속 어긋난다." },
  ],
  badge: {
    name: "안개 절단 휘장",
    description: "흐린 마음을 핑계로 쓰지 않고, 기준을 다시 세운 사람에게 주는 휘장이다.",
  },
  tsundereClosing: "여기까지 봤으면 이제 현실을 대입해라. 인정해도 되고 반박해도 된다. 대신 흐리지 마라.",
  nextStepPrompt: "현실을 대입해라. 인정해도 되고 반박해도 된다. 대신 흐리지 마라.",
};

const localPreviewRefinedOrder: NeoRefinedOrder = {
  selectedMethod: "saju",
  operationTitle: "선택의 안개를 걷는 수정 작전",
  neoReview: "네 답변까지 보면 핵심은 더 분명하다. 문제는 운이 아니라 네가 판단을 멈추는 방식이다.",
  verdict: {
    status: "방향은 맞지만 부족하다",
    statement: "방향은 맞다. 다만 결정을 확신이 올 때까지 미루는 습관이 그 방향을 자꾸 무르게 만든다.",
  },
  verdictBasis: "일간이 약하지 않은데도 판단을 멈추는 건 능력이 아니라 기준의 문제다. 지금 대운 흐름은 벌릴 때지 재는 때가 아니다.",
  actionAlternatives: [
    {
      timing: "이번 주 ~ 2주 안",
      action: "미뤄둔 결정 하나를 세 문장으로 적고, 사흘 안에 실행 여부만 정해라.",
      rationale: "지금 흐름은 확장기라 작게라도 움직여야 판단이 다시 선명해진다.",
    },
    {
      timing: "이번 달 안",
      action: "남의 반응을 확인하기 전에 내 기준부터 읽는 순서를 고정해라.",
      rationale: "관계 반응에 흔들리는 회로가 반복 선택의 방아쇠라서, 순서를 바꾸면 흔들림이 줄어든다.",
    },
    {
      timing: "다음 세운 전환 전까지",
      action: "버릴 선택지를 매주 하나씩 조용히 지워라.",
      rationale: "선택지를 좁히는 것이 지금 국면에서 운이 새는 틈을 막는 가장 빠른 방법이다.",
    },
  ],
  peopleToMeet: [
    {
      role: "결정을 빠르게 내리고 실행부터 하는 실무형 사람",
      complementaryEnergy: "재는 습관을 끊어줄 추진력(행동의 기운)을 채워준다.",
      whereToFind: "업계 실무 모임, 사이드 프로젝트 커뮤니티, 소개 자리.",
    },
    {
      role: "네 기준을 흔들지 않고 되묻어주는 관찰자형 멘토",
      complementaryEnergy: "감정에 휩쓸릴 때 기준을 다시 세워주는 안정된 기운.",
      whereToFind: "스터디, 멘토링 프로그램, 오래 본 지인 중 판단이 차분한 사람.",
    },
  ],
  forbiddenAction: {
    title: "오늘 금지 행동",
    reason: "상대 반응을 핑계로 내 결정을 다시 무르는 것.",
  },
  thirtyDayStrategy: [
    "1주차: 미룬 결정 목록을 만들고 그중 하나를 기준 세 줄로 정리해 실행 여부만 정한다. 판단을 멈추는 회로를 눈으로 확인하는 주다.",
    "2주차: 남의 반응을 확인하기 전에 내 기준부터 읽는 순서를 고정한다. 흔들림의 방아쇠를 순서로 눌러 둔다.",
    "3주차: 매주 버릴 선택지를 하나씩 지워 선택지를 좁힌다. 운이 새는 틈을 좁히는 주다.",
    "4주차: 3주간 남은 기준만 작전표에 남기고, 반복되던 불안에 이름을 붙여 다음 국면 기준으로 삼는다.",
  ],
  thisWeekFirstStep: "가장 오래 미룬 결정 하나를 오늘 세 문장으로 적어라. 그게 이번 주 첫 걸음이다.",
  badge: {
    name: "안개 절단 휘장",
    description: "흐린 마음을 핑계로 쓰지 않고, 기준을 다시 세운 사람에게 주는 휘장이다.",
  },
  tsundereClosing: "여기까지 봤으면 이제 알겠지. 네가 약한 게 아니라, 계속 같은 방식으로 흔들렸던 거다.",
};

const topicOptions = [
  "연애 / 재회",
  "직업 / 이직",
  "돈 / 재물",
  "인간관계",
  "멘탈 / 자기관리",
  "인생 방향",
  "지금 선택",
  "내가 반복하는 실수",
] as const;

// 사자 휘장 도장 시트(사자 휘장 도장-Photoroom.webp)는 4열 × 2행 = 8칸.
// 고민 종류 8개를 각 칸에 1:1로 매핑하고 고정 이름을 부여한다.
const NEO_BADGE_STAMP_COLUMNS = 4;
const NEO_BADGE_STAMP_ROWS = 2;

const neoTopicBadgeMap: Record<(typeof topicOptions)[number], { cell: number; name: string }> = {
  "연애 / 재회": { cell: 0, name: "재회 봉인 휘장" },
  "직업 / 이직": { cell: 1, name: "진로 개척 휘장" },
  "돈 / 재물": { cell: 2, name: "재물 서광 휘장" },
  "인간관계": { cell: 3, name: "관계 경계 휘장" },
  "멘탈 / 자기관리": { cell: 4, name: "멘탈 훈장" },
  "인생 방향": { cell: 5, name: "왕관 서약 휘장" },
  "지금 선택": { cell: 6, name: "결단 나침반 휘장" },
  "내가 반복하는 실수": { cell: 7, name: "숙명 성좌 휘장" },
};

function getNeoTopicBadge(topic: string) {
  return neoTopicBadgeMap[topic as (typeof topicOptions)[number]] ?? { cell: 0, name: "무명 휘장" };
}

function getNeoBadgeStampStyle(cell: number): CSSProperties {
  const cellCount = NEO_BADGE_STAMP_COLUMNS * NEO_BADGE_STAMP_ROWS;
  const safeCell = Math.max(0, Math.min(cellCount - 1, cell));
  const column = safeCell % NEO_BADGE_STAMP_COLUMNS;
  const row = Math.floor(safeCell / NEO_BADGE_STAMP_COLUMNS);
  return {
    "--neo-badge-stamp-sheet-width": `${NEO_BADGE_STAMP_COLUMNS * 100}%`,
    "--neo-badge-stamp-sheet-height": `${NEO_BADGE_STAMP_ROWS * 100}%`,
    "--neo-badge-stamp-x": `${column * -100}%`,
    "--neo-badge-stamp-y": `${row * -100}%`,
  } as CSSProperties;
}

// 도장 시트를 통째로 노출하지 않고 고민 종류에 해당하는 한 칸만 잘라 보여준다.
function NeoTopicBadge({
  topic,
  asset,
  className = "",
}: {
  topic: string;
  asset: NeoWarRoomAsset;
  className?: string;
}) {
  const { cell } = getNeoTopicBadge(topic);
  return (
    <span className={`${styles.topicBadgeFrame} ${className}`.trim()} style={getNeoBadgeStampStyle(cell)}>
      <NeoWarRoomAssetImage
        asset={asset}
        alt=""
        sizes="86px"
        className={styles.topicBadgeSheet}
        imageClassName={styles.topicBadgeImage}
        style={{ background: "transparent" }}
      />
    </span>
  );
}

const methodImagePositions: Record<NeoWarRoomConsultMode, string> = {
  saju: "center 52%",
  ziwei: "center 50%",
  vedic: "center 50%",
  astrology: "center 46%",
};

const intensityOptions: Array<{
  id: IntensityId;
  label: string;
  body: string;
  cropX: string;
  cropY: string;
  tone: "mild" | "standard" | "roar";
}> = [
  { id: "soft", label: "순한맛", body: "정곡은 찌르되 숨 고를 틈은 남긴다.", cropX: "0%", cropY: "-50%", tone: "mild" },
  { id: "standard", label: "기본맛", body: "회피한 부분까지 정확히 끌어올린다.", cropX: "-33.333%", cropY: "-50%", tone: "standard" },
  { id: "roar", label: "사자 포효맛", body: "핑계의 방패를 내려놓게 만든다.", cropX: "-66.666%", cropY: "-50%", tone: "roar" },
];

type NeoCommandChoice =
  | { kind: "method"; value: NeoWarRoomConsultMode }
  | { kind: "topic"; value: (typeof topicOptions)[number] }
  | { kind: "intensity"; value: IntensityId };

const operationMapStages = [
  "네오가 운명의 작전 지도를 펼치는 중...",
  "사자 휘장이 네 운명의 전선을 감지하는 중...",
  "반복되는 선택을 추적하는 중...",
  "듣기 좋은 말과 필요한 말을 분리하는 중...",
  "네가 피하고 있던 핵심을 찾는 중...",
  "작전 브리핑을 작성하는 중...",
] as const;

const realityCheckOptions = [
  "맞다. 요즘 계속 회피하고 있다.",
  "어느 정도 맞지만 전부는 아니다.",
  "나는 오히려 너무 성급하게 움직이는 편이다.",
  "감정적으로 흔들리는 게 가장 크다.",
  "현실 문제보다 관계 문제가 더 크다.",
  "지금은 돈/직업/가족 문제가 더 중요하다.",
  "네오의 말에 반박하고 싶은 부분이 있다.",
] as const;

const errorCopy: Record<string, string> = {
  LOGIN_REQUIRED: "작전을 시작하려면 로그인이 필요하다. 로그인하고 다시 앉아라.",
  PAYMENT_REQUIRED: "작전 브리핑 이용권이 필요하다. 결제창을 먼저 통과해라.",
  PAYMENT_VERIFY_FAILED: "결제나 이용권 확인이 끝나지 않았다. 권한을 확인한 뒤 다시 시도해라.",
  PAYMENT_CANCELLED: "결제가 취소됐다. 필요할 때 다시 작전을 시작해라.",
  INVALID_INPUT: "작전 정보가 부족하다. 입력값을 다시 확인해라.",
  CALCULATION_ERROR: "운명의 계산 지도를 펼치는 중 문제가 생겼다. 출생정보를 다시 확인해라.",
  LLM_ERROR: "작전 브리핑 작성에 실패했다. 이용권이나 결제 권한은 보존되니 다시 시도해라.",
  GENERATION_PENDING: "작전 브리핑을 아직 작성 중이다. 이용권은 그대로 유지되니, 잠시 후 결과 화면에서 확인해라.",
  TEMPORARY_UNAVAILABLE: "지금 접속이 잠시 불안정하다. 이용권은 그대로 보존되니, 잠시 후 다시 시도해라.",
  SERVER_ERROR: "작전실 연결에 문제가 생겼다. 잠시 후 다시 시도해라.",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toText(value: unknown) {
  return toDisplayText(value);
}

function toPositiveInteger(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? Math.floor(numberValue) : 0;
}

function getBriefingFrontline(briefing?: NeoBriefing | null) {
  return briefing?.frontlineSummary || briefing?.coreDiagnosis || "";
}

function getBriefingRepeatedChoice(briefing?: NeoBriefing | null) {
  return briefing?.repeatedChoice || briefing?.repeatedPattern || {};
}

function getBriefingMisalignedFlow(briefing?: NeoBriefing | null) {
  return briefing?.misalignedFlow || briefing?.currentProblem || {};
}

function verdictChipClass(status: string, styles: Record<string, string>) {
  if (/잘하고/.test(status)) return styles.verdictChipGood;
  if (/조정/.test(status)) return styles.verdictChipAdjust;
  return styles.verdictChipPartial;
}

function normalizeGatePayload(result: unknown) {
  const record = asRecord(result);
  const data = asRecord(record.data);
  return Object.keys(data).length ? data : record;
}

function extractPaymentContext(result: unknown, fallbackRequestId: string) {
  const payload = normalizeGatePayload(result);
  const consume = asRecord(payload.consume);
  const accessGrant = asRecord(payload.accessGrant);
  const payment = asRecord(payload.payment);
  const accessType = toText(payload.accessType || consume.accessType || accessGrant.accessType || payment.accessType);
  const accessMethod = toText(
    payload.accessMethod
      || payload.paymentMode
      || consume.accessMethod
      || consume.paymentMethod
      || accessGrant.accessMethod
      || accessGrant.paymentMethod
      || payment.accessMethod
      || payment.paymentMode,
  );
  const transactionId = toText(payload.transactionId || consume.transactionId || accessGrant.transactionId || payment.transactionId);
  const ledgerId = toText(payload.ledgerId || consume.ledgerId || accessGrant.ledgerId || payment.ledgerId);
  const executionId = toText(payload.executionId || consume.executionId || accessGrant.executionId);
  const paymentId = toText(
    payload.paymentId
      || payload.transactionId
      || payload.purchaseId
      || consume.transactionId
      || consume.purchaseId
      || accessGrant.transactionId
      || accessGrant.purchaseId
      || payment.paymentId
      || payment.impUid
      || payment.merchantUid
      || fallbackRequestId,
  );
  return {
    paymentId,
    payment: { ...payment, paymentId, requestId: fallbackRequestId },
    accessGrant,
    consume,
    accessType,
    accessMethod,
    paymentMode: accessMethod,
    transactionId,
    ledgerId,
    executionId,
    featureKey: toText(payload.featureKey || consume.featureKey || accessGrant.featureKey || payment.featureKey || FEATURE_KEY),
    billingGate: payload,
    requestId: fallbackRequestId,
  };
}

async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey: string) {
  const response = await authFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ ...body, idempotencyKey }),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data: data as T };
}

function useNeoTypewriter(text: string, enabled: boolean) {
  const [displayed, setDisplayed] = useState(text);
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef<number | null>(null);
  const targetRef = useRef(text);
  targetRef.current = text;

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayed(text);
      setIsTyping(false);
      return undefined;
    }
    const speed = Math.max(
      8,
      Math.min(COMMAND_DIALOGUE_BASE_SPEED_MS, Math.floor(COMMAND_DIALOGUE_MAX_DURATION_MS / Math.max(text.length, 1))),
    );
    let index = 0;
    setDisplayed("");
    setIsTyping(true);
    const timer = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
        if (timerRef.current === timer) timerRef.current = null;
        setIsTyping(false);
      }
    }, speed);
    timerRef.current = timer;
    return () => {
      window.clearInterval(timer);
      if (timerRef.current === timer) timerRef.current = null;
      setIsTyping(false);
    };
  }, [enabled, text]);

  const complete = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setDisplayed(targetRef.current);
    setIsTyping(false);
  }, []);

  return { displayed, isTyping, complete };
}

export default function NeoOperationRoomPage() {
  const [birthState, setBirthState] = useState(buildDefaultNeoWarRoomBirthState);
  const [method, setMethod] = useState<NeoWarRoomConsultMode | "">("");
  const [topic, setTopic] = useState<(typeof topicOptions)[number] | "">("");
  const [intensity, setIntensity] = useState<IntensityId | "">("");
  const [lastCommandChoice, setLastCommandChoice] = useState<NeoCommandChoice | null>(null);
  const [question, setQuestion] = useState("");
  const [operationReady, setOperationReady] = useState(false);
  const [flowPhase, setFlowPhase] = useState<FlowPhase>("idle");
  const [validationErrors, setValidationErrors] = useState<NeoWarRoomValidationError[]>([]);
  const [pendingAccess, setPendingAccess] = useState<PendingAccess | null>(null);
  const [briefing, setBriefing] = useState<NeoBriefing | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [selectedRealityChecks, setSelectedRealityChecks] = useState<string[]>([]);
  const [realityFreeform, setRealityFreeform] = useState("");
  const [refinedOrder, setRefinedOrder] = useState<NeoRefinedOrder | null>(null);
  const [refinePhase, setRefinePhase] = useState<"idle" | "generating" | "completed" | "failed">("idle");
  const [refineError, setRefineError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [consultPriceLabel, setConsultPriceLabel] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [operationStageIndex, setOperationStageIndex] = useState(0);
  const [dialogueSeed, setDialogueSeed] = useState(0);
  const [briefingRevealStep, setBriefingRevealStep] = useState(BRIEFING_REVEAL_STEP_COUNT);
  const [introStep, setIntroStep] = useState(0);
  const [prologueStep, setPrologueStep] = useState(0);
  const [methodIntroStep, setMethodIntroStep] = useState(0);
  const [hasEnteredWarRoom, setHasEnteredWarRoom] = useState(false);
  const [hasCompletedPrologue, setHasCompletedPrologue] = useState(false);
  const [hasSeenPrologue, setHasSeenPrologue] = useState(false);
  const [entryRevision, setEntryRevision] = useState("");
  const [displayedCommandDialogue, setDisplayedCommandDialogue] = useState("");
  const [isCommandTyping, setIsCommandTyping] = useState(false);
  const [localPreviewMode, setLocalPreviewMode] = useState<NeoPreviewMode>("");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(false);
  const [bgmStatus, setBgmStatus] = useState<"idle" | "playing" | "blocked" | "off">("idle");
  const [isBgmPreferenceReady, setIsBgmPreferenceReady] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isSpriteMobile, setIsSpriteMobile] = useState(false);
  const idempotencyKeyRef = useRef("");
  // 저장된 요청키를 되돌려 지울 때 쓰는 지문. 상태(pendingAccess)는 비동기 핸들러 클로저에서
  // 낡은 값을 보므로 ref 로 둔다.
  const idempotencyFingerprintRef = useRef("");
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const localPreviewEnabled = process.env.NODE_ENV !== "production";

  const selectedMethod = useMemo(
    () => neoWarRoomMethodRegistry.find((item) => item.mode === method) ?? null,
    [method],
  );
  const selectedIntensity = intensityOptions.find((item) => item.id === intensity) ?? null;
  const trimmedQuestion = question.trim();
  const questionReady = trimmedQuestion.length >= NEO_WAR_ROOM_MIN_QUESTION_LENGTH;
  const questionShortfall = Math.max(0, NEO_WAR_ROOM_MIN_QUESTION_LENGTH - trimmedQuestion.length);
  const validationInput: NeoWarRoomValidationInput = {
    profileMode: birthState.profileMode,
    birth: birthState.birth,
    method,
    topic,
    intensity,
    question,
  };
  const refining = refinePhase === "generating";
  const busy = flowPhase === "checking" || flowPhase === "payment" || flowPhase === "generating" || refining;
  const previewBriefing = localPreviewMode === "briefing" || localPreviewMode === "reality" || localPreviewMode === "refined"
    ? localPreviewBriefing
    : null;
  const previewRefinedOrder = localPreviewMode === "refined" ? localPreviewRefinedOrder : null;
  const displayBriefing = briefing || previewBriefing;
  const displayRefinedOrder = refinedOrder || previewRefinedOrder;
  const displayBriefingFrontline = getBriefingFrontline(displayBriefing);
  const displayBriefingRepeatedChoice = getBriefingRepeatedChoice(displayBriefing);
  const displayBriefingMisalignedFlow = getBriefingMisalignedFlow(displayBriefing);
  const showBriefingPanel = Boolean(displayBriefing);
  const briefingFullyRevealed = briefingRevealStep >= BRIEFING_REVEAL_STEP_COUNT;
  const showRealityPanel = Boolean(briefing || localPreviewMode === "reality" || localPreviewMode === "refined") && briefingFullyRevealed;
  const showRefinedPanel = Boolean(displayRefinedOrder);
  const previewOperationMap = localPreviewMode === "loading";
  const showOperationMap = busy || flowPhase === "completed" || previewOperationMap;
  const showOperationMapActor = busy || previewOperationMap;
  const cappedOperationStageIndex = Math.min(operationStageIndex, operationMapStages.length - 1);
  const operationStageText =
    previewOperationMap
      ? operationMapStages[cappedOperationStageIndex]
      : refining
      ? "현실 답변을 반영해 수정 작전 명령서를 쓰는 중..."
      : flowPhase === "checking"
      ? "사자 휘장 권한을 확인하는 중..."
      : flowPhase === "payment"
        ? "이용권과 결제 신호를 대조하는 중..."
        : flowPhase === "completed"
          ? "작전 브리핑 도장을 찍는 중..."
          : operationMapStages[cappedOperationStageIndex];
  const operationProgress =
    previewOperationMap
      ? Math.min(92, 34 + operationStageIndex * 10)
      : refining
      ? 88
      : flowPhase === "checking"
      ? 12
      : flowPhase === "payment"
        ? 24
        : flowPhase === "completed"
          ? 100
          : Math.min(92, 34 + operationStageIndex * 6);
  const canStart = !busy;
  const birthFieldsDisabled = birthState.profileMode === "saved";
  const actorState: NeoWarRoomEmotionState = busy || previewOperationMap
    ? "analyzing"
    : operationReady
    ? "completed"
    : flowPhase === "invalid" || flowPhase === "failed"
      ? "reality_check"
    : intensity === "roar"
      ? "blunt"
      : trimmedQuestion
        ? "curious"
        : "welcome";
  const hasBirthCoordinates =
    Boolean(birthState.birth.birthDate)
    && Boolean(birthState.birth.gender)
    && (birthState.birth.birthTimeUnknown || Boolean(birthState.birth.birthTime));
  const showLaunchConfirm = Boolean(method && topic && hasBirthCoordinates && intensity && questionReady);
  // 발사 확인 배지의 가격 표시. 예전에는 /api/billing/unlock-status 를 쳐서 priceKRW 하나만 뽑아 썼는데,
  // 같은 금액을 빌드타임 레지스트리(worker/lib/paid-feature-registry.js)에서 네트워크 0으로 얻을 수 있다.
  // 결제 확정 후에는 아래에서 서버가 준 실제 금액(consultPriceLabel)이 이 값을 덮는다.
  const registryConsultPrice = useServerPrice({ featureKey: FEATURE_KEY });
  const displayConsultPriceLabel = consultPriceLabel || registryConsultPrice.label;
  const lastChoiceDialogue = useMemo(() => {
    if (lastCommandChoice?.kind === "method" && method === lastCommandChoice.value) return getNeoMethodDialogue(method, dialogueSeed);
    if (lastCommandChoice?.kind === "topic" && topic === lastCommandChoice.value) return getNeoTopicDialogue(topic, dialogueSeed);
    if (lastCommandChoice?.kind === "intensity" && intensity === lastCommandChoice.value) return getNeoIntensityDialogue(intensity, dialogueSeed);
    return null;
  }, [dialogueSeed, intensity, lastCommandChoice, method, topic]);
  const selectedMethodDialogue = useMemo(() => (method ? getNeoMethodDialogue(method, dialogueSeed) : null), [dialogueSeed, method]);
  const activeCommandDialogue = useMemo(() => {
    if (validationErrors.length) return neoOperationDialogues.error.missingInput[0];
    if (errorMessage) return neoOperationDialogues.error.generatingFailed[0];
    if (busy || previewOperationMap) return getNeoLoadingDialogue(method, operationStageIndex);
    if (displayRefinedOrder) return neoOperationDialogues.refinedResult[0];
    if (displayBriefing) return neoOperationDialogues.initialResult[0];
    if (selectedMethodDialogue && (!topic || !hasBirthCoordinates || !intensity)) return selectedMethodDialogue;
    if (lastChoiceDialogue) return lastChoiceDialogue;
    if (!method) return methodIntroDialogues[methodIntroStep % methodIntroDialogues.length];
    if (!topic) return getNeoTopicDialogue("");
    if (!hasBirthCoordinates) return pickNeoDialogue(neoOperationDialogues.birthCheck, dialogueSeed);
    if (!intensity) return getNeoIntensityDialogue("");
    if (!trimmedQuestion) return pickNeoDialogue(neoOperationDialogues.questionInput, dialogueSeed);
    return pickNeoDialogue(neoOperationDialogues.badge, dialogueSeed);
  }, [
    dialogueSeed,
    validationErrors.length,
    errorMessage,
    busy,
    previewOperationMap,
    method,
    methodIntroStep,
    operationStageIndex,
    displayRefinedOrder,
    displayBriefing,
    selectedMethodDialogue,
    lastChoiceDialogue,
    topic,
    hasBirthCoordinates,
    intensity,
    trimmedQuestion,
  ]);
  const hasActiveWarRoomEntry = hasEnteredWarRoom && entryRevision === NEO_OPERATION_ROOM_ENTRY_REVISION;
  const showCommandDeck = hasActiveWarRoomEntry && hasCompletedPrologue;
  const isPrologueActive = hasActiveWarRoomEntry && !hasCompletedPrologue;
  const isLastPrologueStep = prologueStep >= neoPrologueDialogues.length - 1;
  const activePrologueLine = isPrologueActive
    ? neoPrologueDialogues[prologueStep] || neoPrologueDialogues[0]
    : null;
  const activeHeroDialogue = activePrologueLine?.text || neoLandingDialogues[introStep % neoLandingDialogues.length];
  const heroTypewriter = useNeoTypewriter(activeHeroDialogue, isPrologueActive && !prefersReducedMotion && isPageVisible);
  const activeHeroSpeakerLabel = activePrologueLine?.speakerLabel || "네오";
  const activeHeroSpeakerCode =
    activePrologueLine?.speaker === "customer"
      ? "CLIENT"
      : activePrologueLine?.speaker === "narration"
        ? "STORY"
        : activePrologueLine?.speaker === "system"
          ? "SYSTEM"
          : activePrologueLine?.speaker === "lion"
            ? "LION"
            : "NEO";
  const activeHeroCharacter = activePrologueLine?.character || "humanNeo";
  const activeHeroIsMorphing = activeHeroCharacter === "morph";
  const activeHeroCharacterAsset = activePrologueLine ? getNeoPrologueCharacterAsset(activeHeroCharacter) : NEO_INTRO_PORTRAIT;
  const activeHeroUsesSheetCrop = false;
  const activeHeroImageSizes =
    activeHeroCharacter === "lion" || activeHeroCharacter === "lionGlitch"
      ? "(max-width: 768px) 54vw, 24vw"
      : activeHeroCharacter === "strategyMain"
        ? "(max-width: 768px) 72vw, 36vw"
      : "(max-width: 768px) 76vw, 38vw";
  const activeHeroImagePriority = !activeHeroIsMorphing;
  const activeHeroCharacterStyle = {
    "--neo-vn-object-position": activeHeroCharacter === "lion" || activeHeroCharacter === "lionGlitch" || activeHeroCharacter === "strategyMain" || activeHeroUsesSheetCrop ? "center center" : "center bottom",
    ...(activeHeroUsesSheetCrop
      ? getNeoSheetCropStyle(
          activePrologueLine?.sheetFrame || 2,
          NEO_PRE_TRANSFORM_SHEET_COLUMNS,
          NEO_PRE_TRANSFORM_SHEET_ROWS,
          NEO_PRE_TRANSFORM_SHEET_CELL_PX,
          NEO_PRE_TRANSFORM_FRAME_INSET_PX,
        )
      : {}),
  } as unknown as CSSProperties;
  const activeHeroFallbackSrc = activeHeroCharacter === "shadow"
    ? undefined
    : activeHeroCharacter === "lion" || activeHeroCharacter === "lionGlitch" || activeHeroCharacter === "strategyMain" || activeHeroIsMorphing
      ? NEO_INTRO_PORTRAIT.src
      : activeHeroUsesSheetCrop
        ? NEO_PROLOGUE_PRE_TRANSFORM_MAIN.src
      : neoWarRoomAssets.hero.fullbody.src;
  const activeHeroEffect = activePrologueLine?.effect || "none";
  const heroScenePhase = isPrologueActive ? "prologue" : "landing";
  const warRoomScene = showCommandDeck ? "command" : heroScenePhase;
  const heroActionLabel = activePrologueLine?.cta?.label || "작전실 입장하기";
  const heroActionMeta = activePrologueLine?.cta?.helperText || (hasSeenPrologue ? "Prologue Cleared" : "Operation Entry");
  const heroDialogueHint = isPrologueActive && isLastPrologueStep
      ? "입장 준비 완료"
      : "다음";
  const showHeroActionButton = !isPrologueActive || isLastPrologueStep;
  const showTopicSelect = Boolean(method);
  const showBirthInfo = Boolean(method && topic);
  const showIntensitySelect = Boolean(method && topic && hasBirthCoordinates);
  const showQuestionInput = Boolean(method && topic && hasBirthCoordinates && intensity);
  const activeActorState: NeoWarRoomEmotionState = busy || previewOperationMap || displayBriefing || displayRefinedOrder || validationErrors.length || errorMessage
    ? activeCommandDialogue.emotionState || actorState
    : !method
      ? "curious"
    : !topic
        ? activeCommandDialogue.emotionState
        : !hasBirthCoordinates
          ? "curious"
          : !intensity
            ? "blunt"
            : !trimmedQuestion
              ? "curious"
              : "encouragement";
  const commandDialogueForDisplay = displayedCommandDialogue || (isCommandTyping ? "" : activeCommandDialogue.text);
  const methodIntroActive = showCommandDeck && !method && !busy && !previewOperationMap && !displayBriefing && !displayRefinedOrder && !validationErrors.length && !errorMessage;
  const commandSpriteConfig: NeoCommandSpriteConfig = useMemo(() => {
    if (busy || previewOperationMap) {
      if (isSpriteMobile) return neoCommandSpriteMap.asking_question;
      const loadingAsset = neoWarRoomAssets.sprites.withBackground[operationStageIndex % neoWarRoomAssets.sprites.withBackground.length] || neoCommandSpriteMap.analyzing.asset;
      return {
        ...neoCommandSpriteMap.analyzing,
        asset: loadingAsset,
        sheetFrame: (operationStageIndex % 7) + 1,
      };
    }
    if (displayRefinedOrder) return isSpriteMobile ? neoCommandSpriteMap.asking_question : neoCommandSpriteMap.result_complete;
    if (displayBriefing) return isSpriteMobile ? neoCommandSpriteMap.intensity_normal : neoCommandSpriteMap.reality_check;
    if (!method) return neoCommandSpriteMap.method_select;
    if (!topic) return neoCommandSpriteMap.topic_select;
    if (!hasBirthCoordinates) return neoCommandSpriteMap.birth_info;
    if (!intensity) return neoCommandSpriteMap.intensity_normal;
    if (!trimmedQuestion) {
      if (intensity === "soft") return neoCommandSpriteMap.intensity_soft;
      if (intensity === "roar") return neoCommandSpriteMap.intensity_roar;
      return neoCommandSpriteMap.intensity_normal;
    }
    return neoCommandSpriteMap.asking_question;
  }, [
    displayBriefing,
    busy,
    isSpriteMobile,
    operationStageIndex,
    displayRefinedOrder,
    previewOperationMap,
    method,
    topic,
    hasBirthCoordinates,
    intensity,
    trimmedQuestion,
  ]);
  const commandActorAsset = commandSpriteConfig.asset;
  const commandActorVariant = commandSpriteConfig.variant;
  const commandActorSheetFrame = commandSpriteConfig.variant === "with-background"
    ? commandSpriteConfig.sheetFrame ?? activeCommandDialogue.spriteFrame ?? 1
    : undefined;
  const commandActorTalkFrames =
    !showOperationMapActor && !displayBriefing && !displayRefinedOrder
      ? NEO_TRANSPARENT_TALK_FRAME_ASSETS
      : undefined;
  const commandActorIsTalking = Boolean(commandActorTalkFrames?.length);
  const neoBadgeStampAsset = isSpriteMobile ? neoWarRoomAssets.badges.resultStampMobile : neoWarRoomAssets.badges.resultStamp;
  const commandFlowSteps = [
    { id: "method", label: "분석 방식", targetId: "neo-method-title", done: Boolean(method), active: !method },
    { id: "topic", label: "상담 전선", targetId: "neo-topic-title", done: Boolean(topic), active: Boolean(method) && !topic },
    { id: "birth", label: "좌표 확인", targetId: "neo-profile-title", done: hasBirthCoordinates, active: Boolean(method && topic) && !hasBirthCoordinates },
    { id: "intensity", label: "팩폭 강도", targetId: "neo-intensity-title", done: Boolean(intensity), active: Boolean(method && topic && hasBirthCoordinates) && !intensity },
    { id: "question", label: "질문 입력", targetId: "neo-question-title", done: questionReady, active: Boolean(method && topic && hasBirthCoordinates && intensity) && !questionReady },
    { id: "launch", label: "작전 개시", targetId: "neo-operation-launch", done: operationReady, active: Boolean(method && topic && hasBirthCoordinates && intensity && questionReady) },
  ];
  const commandStepHint = !method
    ? "먼저 어떤 지도로 전선을 볼지 고르면 다음 단계가 열린다."
    : !topic
      ? "지금 가장 흔들리는 전선을 하나로 좁혀라."
      : !hasBirthCoordinates
        ? "출생 좌표를 확인해야 같은 벽에 부딪히는 흐름을 가를 수 있다."
        : !intensity
          ? "팩폭 강도는 네가 오늘 받아낼 수 있는 직면의 깊이다."
          : !questionReady
            ? `질문을 ${questionShortfall}자 더 적으면 작전 개시가 열린다.`
            : operationReady
              ? "작전 브리핑이 도착했다. 현실 점검까지 이어갈 수 있다."
              : "사자 휘장으로 작전을 시작할 준비가 끝났다.";
  const bgmStatusLabel =
    bgmStatus === "playing"
      ? "ON"
      : bgmStatus === "blocked"
        ? "CLICK"
        : bgmStatus === "off"
          ? "OFF"
          : "READY";

  const backgroundStyle = {
    // 배경은 CSS 변수로 나가 NeoWarRoomAssetImage 를 우회하므로 리사이즈를 여기서 직접 건다.
    "--neo-bg-desktop": `url("${buildResizedAssetUrl(neoWarRoomAssets.backgrounds.desktop.src, { width: 1600, quality: 82 })}")`,
    "--neo-bg-mobile": `url("${buildResizedAssetUrl(neoWarRoomAssets.backgrounds.mobile.src, { width: 820, quality: 82 })}")`,
    "--neo-prologue-bg": `url("${neoWarRoomAssets.backgrounds.strategyCity.src}")`,
  } as CSSProperties;
  const playNeoBgm = useCallback(async (forceEnabled = false) => {
    const audio = bgmAudioRef.current;
    if (!audio || (!forceEnabled && !bgmEnabled) || !isBgmPreferenceReady) return;
    try {
      audio.volume = NEO_WAR_ROOM_BGM_TRACK.volume;
      if (audio.src !== NEO_WAR_ROOM_BGM_TRACK.url) {
        audio.src = NEO_WAR_ROOM_BGM_TRACK.url;
        audio.load();
      }
      await audio.play();
      setBgmStatus("playing");
    } catch {
      setBgmStatus("blocked");
    }
  }, [bgmEnabled, isBgmPreferenceReady]);

  useEffect(() => {
    const audio = bgmAudioRef.current;
    let shouldOpenPrologue = false;
    try {
      const search = new URLSearchParams(window.location.search);
      const savedPrologueSeen = window.localStorage.getItem(NEO_STRATEGY_PROLOGUE_SEEN_KEY) === "true";
      const forceReplay = search.get("neoPrologue") === "replay";
      setHasSeenPrologue(savedPrologueSeen);
      shouldOpenPrologue = forceReplay || !savedPrologueSeen;
    } catch {
      shouldOpenPrologue = false;
    }
    setDialogueSeed(Math.floor(Math.random() * 9973));
    setEntryRevision(shouldOpenPrologue ? NEO_OPERATION_ROOM_ENTRY_REVISION : "");
    setHasEnteredWarRoom(shouldOpenPrologue);
    setHasCompletedPrologue(false);
    setPrologueStep(0);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (audio) audio.volume = NEO_WAR_ROOM_BGM_TRACK.volume;
    try {
      const savedPreference = window.localStorage.getItem(NEO_WAR_ROOM_BGM_STORAGE_KEY);
      if (savedPreference === "on") setBgmEnabled(true);
    } catch {
      void 0;
    }
    setIsBgmPreferenceReady(true);
    return () => {
      if (audio) audio.pause();
    };
  }, []);

  useEffect(() => {
    if (!localPreviewEnabled) {
      setLocalPreviewMode("");
      return;
    }
    const rawMode = new URLSearchParams(window.location.search).get("neoPreview") || "";
    const nextMode = NEO_PREVIEW_MODES.has(rawMode as NeoPreviewMode) ? rawMode as NeoPreviewMode : "";
    setLocalPreviewMode(nextMode);
    if (nextMode) {
      setEntryRevision(NEO_OPERATION_ROOM_ENTRY_REVISION);
      setHasEnteredWarRoom(true);
      setHasCompletedPrologue(true);
      if (!method) setMethod("saju");
      if (!topic) setTopic("지금 선택");
      if (!intensity) setIntensity("standard");
    }
  }, [intensity, localPreviewEnabled, method, topic]);

  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (!audio || !isBgmPreferenceReady) return;
    if (!bgmEnabled) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setBgmStatus("off");
      return;
    }
    void playNeoBgm();
  }, [bgmEnabled, isBgmPreferenceReady, playNeoBgm]);

  useEffect(() => {
    if (!bgmEnabled || bgmStatus !== "blocked" || !isBgmPreferenceReady) return undefined;
    const resumeBgm = () => {
      void playNeoBgm(true);
    };
    window.addEventListener("pointerdown", resumeBgm, { once: true });
    window.addEventListener("keydown", resumeBgm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resumeBgm);
      window.removeEventListener("keydown", resumeBgm);
    };
  }, [bgmEnabled, bgmStatus, isBgmPreferenceReady, playNeoBgm]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setIsPageVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  // 저장된 프로필 시드는 스토리지 접근이라 렌더가 아닌 마운트 후(클라이언트 전용)에 주입한다.
  useEffect(() => {
    const seeded = buildInitialNeoWarRoomBirthState();
    if (seeded.hasSavedProfile) setBirthState(seeded);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mobileQuery = window.matchMedia("(max-width: 768px)");
    const updateSpriteViewport = () => setIsSpriteMobile(mobileQuery.matches);
    updateSpriteViewport();
    mobileQuery.addEventListener("change", updateSpriteViewport);
    return () => mobileQuery.removeEventListener("change", updateSpriteViewport);
  }, []);

  useEffect(() => {
    const text = activeCommandDialogue.text;
    if (!showCommandDeck) {
      setDisplayedCommandDialogue("");
      setIsCommandTyping(false);
      return undefined;
    }
    if (!text || prefersReducedMotion || !isPageVisible) {
      setDisplayedCommandDialogue(text);
      setIsCommandTyping(false);
      return undefined;
    }

    const speed = Math.max(
      8,
      Math.min(COMMAND_DIALOGUE_BASE_SPEED_MS, Math.floor(COMMAND_DIALOGUE_MAX_DURATION_MS / Math.max(text.length, 1))),
    );
    let index = 0;
    setDisplayedCommandDialogue("");
    setIsCommandTyping(true);

    const timer = window.setInterval(() => {
      index += 1;
      setDisplayedCommandDialogue(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
        setIsCommandTyping(false);
      }
    }, speed);

    return () => {
      window.clearInterval(timer);
      setIsCommandTyping(false);
    };
  }, [activeCommandDialogue.text, isPageVisible, prefersReducedMotion, showCommandDeck]);

  useEffect(() => {
    if (briefingRevealStep >= BRIEFING_REVEAL_STEP_COUNT) return undefined;
    if (prefersReducedMotion || !isPageVisible) {
      setBriefingRevealStep(BRIEFING_REVEAL_STEP_COUNT);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setBriefingRevealStep((current) => Math.min(current + 1, BRIEFING_REVEAL_STEP_COUNT));
    }, BRIEFING_REVEAL_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [briefingRevealStep, isPageVisible, prefersReducedMotion]);

  useEffect(() => {
    if (!methodIntroActive || prefersReducedMotion || !isPageVisible) return undefined;
    const timer = window.setInterval(() => {
      setMethodIntroStep((current) => (current + 1) % methodIntroDialogues.length);
    }, METHOD_INTRO_AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [isPageVisible, methodIntroActive, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || hasActiveWarRoomEntry || !isPageVisible) return undefined;
    const timer = window.setInterval(() => {
      setIntroStep((current) => (current + 1) % neoLandingDialogues.length);
    }, NEO_MAIN_DIALOGUE_AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [hasActiveWarRoomEntry, isPageVisible, prefersReducedMotion]);

  useEffect(() => {
    if (!busy) return;
    window.requestAnimationFrame(() => {
      document
        .getElementById("neo-operation-map")
        ?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
    });
  }, [busy, prefersReducedMotion]);

  useEffect(() => {
    if (!isPageVisible) return undefined;
    if (previewOperationMap) {
      const timer = window.setInterval(() => {
        setOperationStageIndex((current) => (current + 1) % operationMapStages.length);
      }, 2200);
      return () => window.clearInterval(timer);
    }
    if (flowPhase === "completed") {
      setOperationStageIndex(operationMapStages.length - 1);
      return undefined;
    }
    if (flowPhase !== "generating") {
      setOperationStageIndex(0);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setOperationStageIndex((current) => current + 1);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [flowPhase, isPageVisible, previewOperationMap]);

  function toggleNeoBgm() {
    if (!bgmEnabled || bgmStatus !== "playing") {
      setBgmEnabled(true);
      try {
        window.localStorage.setItem(NEO_WAR_ROOM_BGM_STORAGE_KEY, "on");
      } catch {
        void 0;
      }
      void playNeoBgm(true);
      return;
    }

    setBgmEnabled(false);
    try {
      window.localStorage.setItem(NEO_WAR_ROOM_BGM_STORAGE_KEY, "off");
    } catch {
      void 0;
    }
    const audio = bgmAudioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setBgmStatus("off");
  }

  function enterWarRoom() {
    setEntryRevision(NEO_OPERATION_ROOM_ENTRY_REVISION);
    setHasEnteredWarRoom(true);
    setHasCompletedPrologue(false);
    setPrologueStep(0);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  function markPrologueSeen() {
    setHasSeenPrologue(true);
    try {
      window.localStorage.setItem(NEO_STRATEGY_PROLOGUE_SEEN_KEY, "true");
    } catch {
      void 0;
    }
  }

  function revealCommandDeck() {
    markPrologueSeen();
    setEntryRevision(NEO_OPERATION_ROOM_ENTRY_REVISION);
    setHasEnteredWarRoom(true);
    setHasCompletedPrologue(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById("neo-operation-command-deck")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function advanceHeroDialogue() {
    if (isPrologueActive) {
      if (heroTypewriter.isTyping) {
        heroTypewriter.complete();
        return;
      }
      if (isLastPrologueStep) {
        return;
      }
      setPrologueStep((current) => Math.min(current + 1, neoPrologueDialogues.length - 1));
      return;
    }
    setIntroStep((current) => (current + 1) % neoLandingDialogues.length);
  }

  function replayPrologue() {
    setEntryRevision(NEO_OPERATION_ROOM_ENTRY_REVISION);
    setHasEnteredWarRoom(true);
    setHasCompletedPrologue(false);
    setPrologueStep(0);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  function scrollCommandSection(targetId: string) {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleIntroKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    advanceHeroDialogue();
  }

  function completeWithSession(session: NeoSession) {
    // 결과를 받았으면 저장된 요청키를 비운다 — 남겨 두면 같은 입력의 다음 상담이 옛 키로 나가
    // 서버가 replay 로 흡수해 "새 상담인데 옛 결과"가 된다. (실패는 비우지 않는다 — 재시도가 같은
    // 키로 나가야 이미 끝난 차감이 이중 결제가 되지 않는다.)
    if (idempotencyFingerprintRef.current) {
      clearNeoWarRoomIdempotencyKey(idempotencyFingerprintRef.current);
      idempotencyFingerprintRef.current = "";
    }
    setSessionId(session.sessionId || session.id || "");
    setBriefing(session.initialBriefing || null);
    setRefinedOrder(session.refinedOrder || null);
    setSelectedRealityChecks(session.realityCheck?.selectedChecks || []);
    setRealityFreeform(session.realityCheck?.freeform || "");
    setRefinePhase(session.refinedOrder ? "completed" : "idle");
    setRefineError("");
    setResultUrl(session.resultUrl || "");
    setFlowPhase("completed");
    setOperationReady(true);
    setStatusMessage("1차 작전 브리핑이 도착했다. 이제 현실 점검으로 넘어갈 수 있다.");
    setErrorMessage("");
  }

  function finishBriefing(session: NeoSession) {
    setOperationStageIndex(operationMapStages.length - 1);
    const isFreshBriefing = !session.refinedOrder;
    const reveal = () => {
      if (isFreshBriefing && !prefersReducedMotion) setBriefingRevealStep(0);
      completeWithSession(session);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document.getElementById("neo-briefing-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    };
    if (prefersReducedMotion || !isFreshBriefing) {
      reveal();
      return;
    }
    setStatusMessage("작전 브리핑에 사자 도장을 찍는 중이다.");
    window.setTimeout(reveal, BRIEFING_SEAL_DELAY_MS);
  }

  async function pollPendingBriefing(resultId: string, accessToken = "") {
    // 로그인 쿠키 판정이 일시적으로 흔들려도 이미 인가된 세션의 결과 조회는 이어지도록,
    // ensure-access가 발급한 네오 액세스 토큰을 폴링 헤더로 함께 보내 서버 신원 폴백을 가능케 한다.
    const pollHeaders: Record<string, string> = { Accept: "application/json" };
    if (accessToken) pollHeaders["x-neo-operation-room-access-token"] = accessToken;
    for (let attempt = 0; attempt < PENDING_RESULT_POLL_MAX_ATTEMPTS; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, PENDING_RESULT_POLL_INTERVAL_MS));
      try {
        const response = await authFetch(`${API_ENDPOINTS.result}?attemptId=${encodeURIComponent(resultId)}`, {
          headers: pollHeaders,
        });
        const data = (await response.json().catch(() => ({}))) as NeoSession & { status?: string; reason?: string };
        if (data.ok && data.initialBriefing) {
          finishBriefing(data);
          return;
        }
        // 생성 실패: 서버가 실제 원인(LLM/계산)을 reason으로 실어 409로 준다 → 정확한 코드로 던진다.
        if (response.status === 409 || toText(data.status) === "failed" || toText(data.status) === "generation_failed") {
          throw new Error(toText(data.reason) === "CALCULATION_ERROR" ? "CALCULATION_ERROR" : "LLM_ERROR");
        }
        // 일시적 DB/인증 장애(503·retryable)는 계속 폴링해 자가 복구한다(찻집과 동일 완충).
        if (isRetriableResultPollFailure(response.status, data)) continue;
        // authFetch 세션 리프레시까지 실패한 확정 401은 삼키지 말고 종료한다 — 삼키면 92%에서 무한 폴링(고착).
        if (response.status === 401) throw new Error("LOGIN_REQUIRED");
        // 그 외(202 generating 등)는 계속 폴링한다.
      } catch (caught) {
        // 위에서 던진 실패 코드는 그대로 전파하고, 일시적 네트워크 오류만 삼켜 재시도한다.
        if (caught instanceof Error && (caught.message === "LLM_ERROR" || caught.message === "CALCULATION_ERROR" || caught.message === "LOGIN_REQUIRED")) throw caught;
      }
    }
    // 폴링 예산 소진 — 생성이 아직 진행 중일 수 있으니 결과 화면에서 확인하도록 안내한다.
    throw new Error("GENERATION_PENDING");
  }

  // /refine 도 8챕터를 요청 안에서 동기로 생성한다. 엣지(100s)나 네트워크가 먼저 끊기면 서버는 계속
  // 쓰고 있는데 클라이언트만 실패로 끝나, 사용자는 "재시도를 계속해야 나온다"를 겪는다. 1차 브리핑은
  // pollPendingBriefing 이 이 구멍을 막아 왔고 2차만 단발 fetch 였다 — 같은 예산·같은 종료 조건으로 맞춘다.
  async function pollPendingRefinedOrder(resultId: string) {
    for (let attempt = 0; attempt < PENDING_RESULT_POLL_MAX_ATTEMPTS; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, PENDING_RESULT_POLL_INTERVAL_MS));
      try {
        const response = await authFetch(`${API_ENDPOINTS.result}?attemptId=${encodeURIComponent(resultId)}`, {
          headers: { Accept: "application/json" },
        });
        const data = (await response.json().catch(() => ({}))) as NeoSession & {
          refinementStatus?: string;
          refinementError?: { code?: string };
          reason?: string;
          retryable?: boolean;
        };
        if (data.ok && data.refinedOrder) {
          completeWithSession(data);
          setStatusMessage("수정 작전 명령서가 도착했다.");
          return;
        }
        // 서버가 실패를 확정해 기록했으면 더 기다릴 이유가 없다. DB 일시 장애와 LLM 실패는 구분해 안내한다.
        if (toText(data.refinementStatus) === "generation_failed") {
          throw new Error(toText(data.refinementError?.code) === "DB_DEGRADED" ? "TEMPORARY_UNAVAILABLE" : "LLM_ERROR");
        }
        if (isRetriableResultPollFailure(response.status, data)) continue;
        if (response.status === 401) throw new Error("LOGIN_REQUIRED");
        // 그 외(아직 refinedOrder 가 안 붙은 200 등)는 계속 폴링한다.
      } catch (caught) {
        if (caught instanceof Error && ["LLM_ERROR", "TEMPORARY_UNAVAILABLE", "LOGIN_REQUIRED"].includes(caught.message)) throw caught;
      }
    }
    throw new Error("GENERATION_PENDING");
  }

  async function startBriefing(idempotencyKey: string, payload: NeoWarRoomAccessPayload, access: Record<string, unknown>) {
    setFlowPhase("generating");
    setStatusMessage("운명의 작전 지도를 펼치는 중이다.");
    // ensure-access가 발급한 네오 액세스 토큰(이용권/월정석 경로에만 존재)을 폴링에도 실어 서버 신원 폴백을 돕는다.
    const pollAccessToken = toText(access.accessToken);
    // /start는 브리핑 생성을 '동기'로 마친 뒤 완료 결과(200)를 바로 돌려준다(아래 initialBriefing 처리).
    // 드물게 연결이 끊겨 postJson이 거부되거나 서버가 202를 주면, 폴백으로 폴링해 완료를 수렴시킨다.
    const started = await postJson<NeoSession | { ok?: false; reason?: string; message?: string }>(
      API_ENDPOINTS.start,
      { ...payload, ...access },
      idempotencyKey,
    ).catch(() => null);
    if (!started) {
      setStatusMessage("작전 지도가 이미 펼쳐지고 있다. 완성되는 대로 브리핑을 가져온다.");
      await pollPendingBriefing(idempotencyKey, pollAccessToken);
      return;
    }
    const { response, data } = started;
    if (data.ok && data.initialBriefing) {
      finishBriefing(data);
      return;
    }
    if (response.status === 202) {
      const pendingId = toText((data as { sessionId?: string }).sessionId) || idempotencyKey;
      setStatusMessage("작전 지도가 이미 펼쳐지고 있다. 완성되는 대로 브리핑을 가져온다.");
      await pollPendingBriefing(pendingId, pollAccessToken);
      return;
    }
    throw new Error(toText((data as { reason?: string }).reason) || "SERVER_ERROR");
  }

  async function handleRefineSubmit() {
    if (!sessionId || !briefing) {
      setRefinePhase("failed");
      setRefineError("먼저 1차 작전 브리핑을 받아라.");
      return;
    }
    if (!selectedRealityChecks.length && realityFreeform.trim().length < 4) {
      setRefinePhase("failed");
      setRefineError("체크 답변을 고르거나, 네오에게 현재 상황을 조금 더 적어라.");
      return;
    }
    setRefinePhase("generating");
    setRefineError("");
    setStatusMessage("현실 점검 답변을 반영해 수정 작전 명령서를 작성하는 중이다.");
    try {
      type RefineReply = (NeoSession | { ok?: false; message?: string }) & { reason?: string; retryable?: boolean };
      let response: Response | null = null;
      let data: RefineReply = {} as RefineReply;
      try {
        const sent = await postJson<RefineReply>(
          API_ENDPOINTS.refine,
          {
            sessionId,
            selectedChecks: selectedRealityChecks,
            freeform: realityFreeform.trim(),
          },
          idempotencyKeyRef.current || sessionId,
        );
        response = sent.response;
        data = sent.data;
      } catch {
        // 응답 자체를 못 받았다(네트워크·엣지 컷). 서버는 계속 쓰고 있을 수 있으니 폴링으로 수렴한다.
        response = null;
      }
      if (response && (data as NeoSession).ok && (data as NeoSession).refinedOrder) {
        completeWithSession(data as NeoSession);
        setStatusMessage("수정 작전 명령서가 도착했다.");
        return;
      }
      if (response?.status === 401) throw new Error("LOGIN_REQUIRED");
      // 202(이미 같은 답변으로 생성 중)와 503(일시 장애)은 결과가 나올 수 있다 → 폴링.
      // 404·422 처럼 확정된 실패만 즉시 끝낸다(폴링해도 달라지지 않는다).
      if (response && response.status !== 202 && !isRetriableResultPollFailure(response.status, data)) {
        throw new Error(toText((data as { reason?: string }).reason) || "SERVER_ERROR");
      }
      await pollPendingRefinedOrder(sessionId);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
      setRefinePhase("failed");
      setStatusMessage("");
      setRefineError(errorCopy[code] || "수정 작전 명령서 작성에 실패했다. 답변은 남아 있으니 다시 시도해라.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateNeoWarRoomInput(validationInput);
    setValidationErrors(errors);
    if (errors.length) {
      setFlowPhase("invalid");
      setOperationReady(false);
      setPendingAccess(null);
      setBriefing(null);
      setSessionId("");
      setRefinedOrder(null);
      setRefinePhase("idle");
      setRefineError("");
      setStatusMessage("");
      setErrorMessage("");
      return;
    }

    const inputFingerprint = createNeoWarRoomInputFingerprint(validationInput);
    // 🔴 마지막 폴백을 useRef 에서 sessionStorage 로 바꿨다. ref 는 새로고침에 사라지므로
    //    "결제 실패 → 새로고침 → 재시도"가 새 멱등키로 나가 **두 번째 월정석 차감**이 됐다.
    const idempotencyKey =
      pendingAccess?.inputFingerprint === inputFingerprint
        ? pendingAccess.idempotencyKey
        : idempotencyKeyRef.current || resolveNeoWarRoomIdempotencyKey(inputFingerprint);
    idempotencyKeyRef.current = idempotencyKey;
    idempotencyFingerprintRef.current = inputFingerprint;
    const payload = buildNeoWarRoomAccessPayload(validationInput, idempotencyKey);
    setPendingAccess({
      endpoint: NEO_WAR_ROOM_ACCESS_ENDPOINT,
      idempotencyKey,
      inputFingerprint,
      payload,
    });
    setBriefing(null);
    setSessionId("");
    setRefinedOrder(null);
    setSelectedRealityChecks([]);
    setRealityFreeform("");
    setRefinePhase("idle");
    setRefineError("");
    setResultUrl("");
    setErrorMessage("");
    setStatusMessage("권한과 이용권을 확인하는 중이다.");
    setFlowPhase("checking");
    setOperationReady(false);
    beginPaidFeatureGateCheck({
      featureKey: FEATURE_KEY,
      requestId: idempotencyKey,
      title: "이용권 확인",
      reason: FEATURE_TITLE,
      paymentMode: "MEMBERSHIP_PASS",
    });

    try {
      // 이용권 확인 앞단의 일시적 DB 장애(503 DB_DEGRADED 등)는 재시도로 흡수한다 — 하드 "이용권 확인 실패"로 굳지 않게.
      const { response, data } = await runAccessCheckWithTransientRetry(
        () => postJson<EnsureAccessResult>(API_ENDPOINTS.ensureAccess, payload, idempotencyKey),
        { onRetry: () => setStatusMessage("연결이 잠시 불안정하다. 이용권을 다시 확인하는 중이다.") },
      );
      if (data.ok) {
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId: idempotencyKey,
          title: "이용권 확인 완료",
          reason: FEATURE_TITLE,
          paymentMode: "MEMBERSHIP_PASS",
          message: "이용권 확인이 끝났다. 작전 지도를 펼치는 중이다.",
        });
        if (data.consultation?.initialBriefing) {
          completeWithSession(data.consultation);
          return;
        }
        await startBriefing(idempotencyKey, payload, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }
      if (data.reason === "LOGIN_REQUIRED" || response.status === 401) throw new Error("LOGIN_REQUIRED");
      if (data.reason === "INVALID_INPUT") throw new Error("INVALID_INPUT");
      // 재시도를 소진하고도 일시적 장애가 지속되면 과금 없이 소프트 종료(이용권 결함으로 오인하지 않게).
      if (isRetriableResultPollFailure(response.status, data)) throw new Error("TEMPORARY_UNAVAILABLE");
      if (data.reason !== "PAYMENT_REQUIRED") throw new Error(data.reason || "SERVER_ERROR");

      setFlowPhase("payment");
      setStatusMessage("작전실 이용권을 확인하는 중이다.");
      const paymentPayload = asRecord(data.paymentPayload);
      const runtimeGate = asRecord(paymentPayload.runtimeGate);
      const gateCoinPrice = toPositiveInteger(runtimeGate.coinPrice ?? runtimeGate.cost ?? paymentPayload.coinPrice ?? paymentPayload.cost);
      const gatePaymentAmount = toPositiveInteger(runtimeGate.paymentAmount ?? paymentPayload.paymentAmount ?? runtimeGate.totalAmount ?? paymentPayload.totalAmount);
      const gateAmountKRW = toPositiveInteger(runtimeGate.amountKRW ?? runtimeGate.amountKrw ?? paymentPayload.amountKRW ?? paymentPayload.amountKrw ?? gatePaymentAmount);
      const gateMembershipCreditCost = toPositiveInteger(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost);
      const displayAmountKRW = gateAmountKRW || gatePaymentAmount;
      if (displayAmountKRW > 0) setConsultPriceLabel(formatPaymentWon(displayAmountKRW));
      const gate = await runBillingCoinGate({
        ...runtimeGate,
        featureKey: FEATURE_KEY,
        categoryKey: toText(runtimeGate.categoryKey || paymentPayload.categoryKey || "premium-consultation"),
        subFeatureKey: toText(runtimeGate.subFeatureKey || paymentPayload.subFeatureKey || FEATURE_KEY),
        reason: toText(runtimeGate.reason || paymentPayload.reason || FEATURE_TITLE),
        requestId: idempotencyKey,
        idempotencyKey,
        cost: gateCoinPrice || undefined,
        coinPrice: gateCoinPrice || undefined,
        amountKRW: gateAmountKRW || undefined,
        amountKrw: gateAmountKRW || undefined,
        paymentAmount: gatePaymentAmount || gateAmountKRW || undefined,
        priceKRW: gateAmountKRW || gatePaymentAmount || undefined,
        membershipCreditCost: gateMembershipCreditCost || undefined,
        productId: toText(runtimeGate.productId || paymentPayload.productId || "neo-operation-room"),
        productType: toText(runtimeGate.productType || paymentPayload.productType || "neo-operation-room"),
        serviceType: toText(runtimeGate.serviceType || paymentPayload.serviceType || FEATURE_KEY),
      });
      if (!gate.ok || !gate.data) {
        const code = toText(gate.error?.code || (gate.status === 401 ? "LOGIN_REQUIRED" : "PAYMENT_VERIFY_FAILED")).toUpperCase();
        throw new Error(code === "PAYMENT_CANCELLED" ? "PAYMENT_CANCELLED" : code === "AUTH_REQUIRED" ? "LOGIN_REQUIRED" : "PAYMENT_VERIFY_FAILED");
      }
      await startBriefing(idempotencyKey, payload, extractPaymentContext(gate, idempotencyKey));
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
      const paymentCancelled = code === "PAYMENT_CANCELLED";
      // 생성 단계(LLM/계산/지연) 실패는 결제·이용권 문제가 아니므로 게이트 문구를 분리한다(오표시 방지).
      const isGenerationCode = code === "LLM_ERROR" || code === "CALCULATION_ERROR" || code === "GENERATION_PENDING";
      // 일시적 접속 장애도 이용권 결함이 아니므로 "이용권 확인 실패"로 표기하지 않는다.
      const isTransientCode = code === "TEMPORARY_UNAVAILABLE";
      // 🔴 PAYMENT_VERIFY_FAILED 는 이용권이 아니라 **결제 증빙 확인**이 안 된 것이다. 예전에는 이것까지
      //    "이용권 확인 실패"로 찍혀서, 월정석으로 결제한 사용자가 자기 이용권을 의심하게 만들었다.
      const isPaymentVerifyCode = code === "PAYMENT_VERIFY_FAILED" || code === "PAYMENT_REQUIRED";
      failPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId: idempotencyKey,
        title: isGenerationCode
          ? "작전 브리핑 생성 실패"
          : isTransientCode
            ? "잠시 후 다시 시도"
            : isPaymentVerifyCode ? "결제 확인 실패" : "이용권 확인 실패",
        reason: FEATURE_TITLE,
        paymentMode: "MEMBERSHIP_PASS",
        message: errorCopy[code] || errorCopy.SERVER_ERROR,
        cancelled: paymentCancelled,
      });
      setFlowPhase("failed");
      setOperationReady(false);
      setStatusMessage("");
      setErrorMessage(errorCopy[code] || errorCopy.SERVER_ERROR);
    }
  }

  function resetPendingFlow() {
    setOperationReady(false);
    setFlowPhase("idle");
    setValidationErrors([]);
    setPendingAccess(null);
    setBriefing(null);
    setSessionId("");
    setRefinedOrder(null);
    setSelectedRealityChecks([]);
    setRealityFreeform("");
    setRefinePhase("idle");
    setRefineError("");
    setStatusMessage("");
    setErrorMessage("");
    setResultUrl("");
    idempotencyKeyRef.current = "";
  }

  function updateBirthInput(field: keyof NeoWarRoomBirthInput, value: string | boolean) {
    resetPendingFlow();
    setLastCommandChoice(null);
    setBirthState((prev) => ({
      ...prev,
      profileMode: "manual",
      birth: {
        ...prev.birth,
        [field]: value,
        ...(field === "birthTimeUnknown" && value === true ? { birthTime: "" } : {}),
      },
    }));
  }

  function selectSavedProfile() {
    if (!birthState.hasSavedProfile) return;
    resetPendingFlow();
    setLastCommandChoice(null);
    setBirthState((prev) => ({
      ...prev,
      profileMode: "saved",
      birth: prev.savedBirth,
    }));
  }

  function selectManualProfile() {
    resetPendingFlow();
    setLastCommandChoice(null);
    setBirthState((prev) => ({
      ...prev,
      profileMode: "manual",
      birth: {
        ...prev.birth,
        birthTime: prev.birth.birthTimeUnknown ? "" : prev.birth.birthTime,
      },
    }));
  }

  return (
    <main
      className={styles.shell}
      data-entered={hasActiveWarRoomEntry ? "true" : "false"}
      data-scene={warRoomScene}
      style={backgroundStyle}
    >
      <audio ref={bgmAudioRef} className={styles.bgmAudio} preload="none" loop data-track={NEO_WAR_ROOM_BGM_TRACK.key} />
      <button type="button" className={styles.bgmToggle} data-active={bgmEnabled && bgmStatus !== "off" ? "true" : "false"} onClick={toggleNeoBgm}>
        <span aria-hidden="true" />
        <strong>BGM</strong>
        <em>{bgmStatusLabel}</em>
      </button>

      {!showCommandDeck ? (
      <section
        className={styles.heroSection}
        data-entered={hasActiveWarRoomEntry ? "true" : "false"}
        data-phase={heroScenePhase}
        data-effect={activeHeroEffect}
        aria-labelledby="neo-operation-room-title"
      >
        <div className={styles.vnStage} data-phase={heroScenePhase} data-effect={activeHeroEffect}>
          <div className={styles.vnCopy}>
            <p className={styles.eyebrow}>Lion Seal War Room</p>
            <h1 id="neo-operation-room-title" aria-label="네오의 팩폭 작전실">
              <span>네오의</span>
              <span>팩폭</span>
              <span>작전실</span>
            </h1>
            <p className={styles.subtitle}>감정의 안개를 걷고, 선택의 기준을 다시 세운다.</p>
            <div className={styles.entryBrief} aria-label="작전실 핵심 흐름">
              {entryBriefingItems.map((item) => (
                <span key={item.label}>
                  <strong>{item.label}</strong>
                  <em>{item.value}</em>
                </span>
              ))}
            </div>
          </div>

          <div className={styles.vnCharacter} data-scene={activeHeroCharacter}>
            <div
              className={styles.vnCharacterCrop}
              role="img"
              aria-label={getNeoPrologueCharacterLabel(activeHeroCharacter)}
              data-neo-asset-role={activeHeroCharacterAsset.role}
              data-sheet-crop={activeHeroUsesSheetCrop ? "true" : "false"}
              style={activeHeroCharacterStyle}
            >
              {activeHeroIsMorphing ? (
                <div className={styles.vnMorphStage} aria-hidden="true">
                  <span className={styles.vnMorphRing} />
                  <span className={styles.vnMorphSilhouette} />
                  <NeoWarRoomAssetImage
                    className={`${styles.vnCharacterAsset} ${styles.vnMorphLion}`}
                    imageClassName={styles.vnCharacterImage}
                    asset={NEO_PROLOGUE_LION}
                    alt=""
                    fallbackSrc={NEO_INTRO_PORTRAIT.src}
                    priority={false}
                    sizes="(max-width: 768px) 58vw, 28vw"
                    style={{ background: "transparent" }}
                  />
                  <NeoWarRoomAssetImage
                    className={`${styles.vnCharacterAsset} ${styles.vnMorphNeo}`}
                    imageClassName={styles.vnCharacterImage}
                    asset={NEO_INTRO_PORTRAIT}
                    alt=""
                    fallbackSrc={neoWarRoomAssets.hero.fullbody.src}
                    priority
                    sizes="(max-width: 768px) 76vw, 38vw"
                    style={{ background: "transparent" }}
                  />
                  <span className={styles.vnMorphParticles} />
                  <span className={styles.vnMorphFlash} />
                </div>
              ) : (
                <div className={styles.vnCharacterImageLayer}>
                  <NeoWarRoomAssetImage
                    className={styles.vnCharacterAsset}
                    imageClassName={styles.vnCharacterImage}
                    asset={activeHeroCharacterAsset}
                    alt=""
                    fallbackSrc={activeHeroFallbackSrc}
                    priority={activeHeroImagePriority}
                    sizes={activeHeroImageSizes}
                    style={{ background: "transparent" }}
                  />
                </div>
              )}
            </div>
          </div>

          <div
            className={styles.vnDialogueBox}
            data-speaker={activePrologueLine?.speaker || "neo"}
            data-character={activeHeroCharacter}
            data-complete={isPrologueActive && isLastPrologueStep ? "true" : "false"}
          >
            <div
              className={styles.vnDialogueContent}
              role="button"
              tabIndex={0}
              onClick={advanceHeroDialogue}
              onKeyDown={handleIntroKeyDown}
            >
              <div className={styles.vnSpeaker}>
                <span aria-hidden="true">{activeHeroSpeakerCode}</span>
                <strong>{activeHeroSpeakerLabel}</strong>
              </div>
              {activePrologueLine?.notification ? (
                <div className={styles.vnNotificationCard}>
                  <strong>{activePrologueLine.notification.title}</strong>
                  <span>{activePrologueLine.notification.body}</span>
                </div>
              ) : null}
              <p data-typing={isPrologueActive && heroTypewriter.isTyping ? "true" : "false"}>
                {isPrologueActive ? heroTypewriter.displayed : activeHeroDialogue}
              </p>
              {activePrologueLine?.cta ? (
                <small className={styles.vnCtaHelper}>{activePrologueLine.cta.helperText}</small>
              ) : null}
              <span className={styles.vnNextIndicator} aria-hidden="true">
                {heroDialogueHint}
              </span>
            </div>

            <div className={styles.vnControlRow} data-phase={heroScenePhase}>
              {isPrologueActive ? (
                <button type="button" className={styles.vnGhostButton} onClick={revealCommandDeck}>
                  스킵
                </button>
              ) : (
                <button type="button" className={styles.vnGhostButton} onClick={replayPrologue}>
                  {hasSeenPrologue ? "프롤로그 다시보기" : "프롤로그 보기"}
                </button>
              )}

              {showHeroActionButton ? (
                <button
                  type="button"
                  className={styles.vnStartButton}
                  data-phase={heroScenePhase}
                  onClick={isPrologueActive ? revealCommandDeck : enterWarRoom}
                >
                  <NeoWarRoomAssetImage
                    asset={neoWarRoomAssets.decor.asset1}
                    alt=""
                    sizes="72px"
                    resizeWidth={160}
                    className={styles.ctaOrbitFrame}
                    imageClassName={styles.ctaOrbitImage}
                  />
                  <span className={styles.ctaButtonCopy}>
                    <strong>{heroActionLabel}</strong>
                    {isPrologueActive ? null : <em>{heroActionMeta}</em>}
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {showOperationMap ? (
        <section
          id="neo-operation-map"
          className={styles.operationMapPanel}
          data-phase={flowPhase}
          aria-labelledby="neo-operation-map-title"
          aria-live="polite"
          style={{ "--operation-progress": `${operationProgress}%` } as CSSProperties}
        >
          <div className={styles.operationMapHeader}>
            <span>운명의 작전 지도</span>
            <h2 id="neo-operation-map-title">{operationStageText}</h2>
            <p>{statusMessage || "네오가 작전 브리핑을 정리하고 있다."}</p>
          </div>

          <div className={styles.operationMapBody}>
            <div className={styles.operationMapVisual} data-sprite={showOperationMapActor && !isSpriteMobile ? "true" : "false"} aria-hidden="true">
              <div className={styles.operationMapRoom}>
                <span className={styles.mapOrbit} />
                <span className={styles.mapLineOne} />
                <span className={styles.mapLineTwo} />
                <span className={styles.mapNodeOne} />
                <span className={styles.mapNodeTwo} />
                <span className={styles.mapNodeThree} />
                <span className={styles.mapNodeFour} />
              </div>
              <div className={styles.operationSeal} data-complete={flowPhase === "completed" ? "true" : "false"}>
                <NeoWarRoomAssetImage
                  src={NEO_LOADING_SEAL_SRC}
                  alt=""
                  sizes="116px"
                  className={styles.operationSealImage}
                  imageClassName={styles.loadingSealImage}
                />
              </div>
            </div>

            <div className={styles.operationMapStatus}>
              <div className={styles.operationLoadingDialogue} aria-live="polite">
                <span>NEO</span>
                <p>{flowPhase === "completed" ? "됐다. 작전 브리핑에 도장을 찍었다." : operationStageText}</p>
              </div>
              <div className={styles.operationProgressBox}>
                <div className={styles.operationProgressMeta}>
                  <span>{flowPhase === "completed" ? "완료" : `단계 ${Math.min(operationStageIndex + 1, operationMapStages.length)} / ${operationMapStages.length}`}</span>
                  <strong>{operationProgress}%</strong>
                </div>
                <div className={styles.operationProgressTrack}>
                  <span />
                </div>
                <ul className={styles.operationStageList}>
                  {operationMapStages.map((stage, index) => (
                    <li
                      key={stage}
                      data-active={flowPhase === "completed" || index <= operationStageIndex ? "true" : "false"}
                    >
                      {stage}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {showCommandDeck ? (
      <form id="neo-operation-command-deck" className={styles.commandDeck} data-entered="true" onSubmit={handleSubmit}>
        <NeoWarRoomAssetImage
          asset={neoWarRoomAssets.decor.asset1}
          alt=""
          sizes="72px"
          resizeWidth={160}
          className={`${styles.lionSealFrame} ${styles.commandDeckLionDecor}`.trim()}
          imageClassName={styles.lionSealImage}
        />
        <section className={styles.commandConversation} aria-label="네오 작전 안내">
          <div className={styles.commandProgressRail}>
            {commandFlowSteps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                data-active={step.active ? "true" : "false"}
                data-done={step.done ? "true" : "false"}
                onClick={() => scrollCommandSection(step.targetId)}
              >
                <em>{String(index + 1).padStart(2, "0")}</em>
                {step.label}
              </button>
            ))}
          </div>
          <p className={styles.commandStepHint}>{commandStepHint}</p>
        </section>
        <section className={styles.sealPerkPreview} aria-label="사자 휘장 특전 안내">
          <div className={styles.sealPerkSeal}>
            <NeoWarRoomAssetImage
              asset={neoWarRoomAssets.hero.lionSeal}
              alt="황금빛 사자 휘장"
              sizes="88px"
              className={styles.sealPerkSealFrame}
              imageClassName={styles.sealPerkSealImage}
            />
          </div>
          <div className={styles.sealPerkCopy}>
            <span className={styles.sealPerkEyebrow}>Lion Seal Reward</span>
            <strong className={styles.sealPerkTitle}>사자 휘장 5개를 모으면 잠긴 특전이 열린다</strong>
            <p className={styles.sealPerkDesc}>
              작전을 완수할수록 사자 휘장이 쌓인다. 다섯 개가 모이면 아래 특전이 결과 화면에서 해금된다.
            </p>
            <ul className={styles.sealPerkList}>
              <li>
                <em className={styles.sealPerkLock} aria-hidden="true">잠금</em>
                <span>
                  <strong>네오의 비밀 편지</strong>
                  결과에 담기지 않은 추가 해석과 당부가 열린다
                </span>
              </li>
              <li>
                <em className={styles.sealPerkLock} aria-hidden="true">잠금</em>
                <span>
                  <strong>작전 명령서 PDF 다운로드</strong>
                  전체 브리핑을 PDF로 저장해 언제든 다시 열람한다
                </span>
              </li>
            </ul>
          </div>
        </section>
        <div className={styles.commandLayout}>
          <div className={styles.commandFields}>
            <section className={styles.deckSection} aria-labelledby="neo-method-title">
              <div className={styles.sectionHead}>
                <span>01</span>
                <h2 id="neo-method-title">분석 방식 선택</h2>
              </div>
              <div className={styles.methodGrid}>
                {neoWarRoomMethodRegistry.map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    className={styles.methodCard}
                    data-active={method === item.mode ? "true" : "false"}
                    data-status={item.status}
                    aria-pressed={method === item.mode}
                    disabled={!item.enabled}
                    onClick={() => {
                      if (!item.enabled) return;
                      resetPendingFlow();
                      setMethod(item.mode);
                      setLastCommandChoice({ kind: "method", value: item.mode });
                    }}
                  >
                    <NeoWarRoomAssetImage
                      asset={item.coverAsset}
                      alt={`${item.label} 분석 방식`}
                      sizes="(max-width: 720px) 92vw, (max-width: 1200px) 44vw, 380px"
                      // 표시 폭은 데스크톱 380px / 모바일 92vw(≈390px). 실측 곡선상 760(레티나 2배)은
                      // 176KB 인데 640 은 122KB 라, 4장을 함께 받는 선택 화면에서는 640 이 균형점이다.
                      resizeWidth={640}
                      loading="lazy"
                      className={styles.methodImageFrame}
                      imageClassName={styles.methodImage}
                      style={{ "--neo-method-position": methodImagePositions[item.mode] } as CSSProperties}
                    />
                    <span className={styles.methodText}>
                      <span className={styles.methodMeta}>
                        <span>{item.label}</span>
                        <span className={styles.methodBadge}>{item.statusLabel}</span>
                      </span>
                      <strong>{item.cardEyebrow}</strong>
                      <em>{methodCardCopy[item.mode]}</em>
                      <small>{item.inputSummary}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {showTopicSelect ? (
            <section className={styles.deckSection} aria-labelledby="neo-topic-title">
              <div className={styles.sectionHead}>
                <span>02</span>
                <h2 id="neo-topic-title">상담 주제 선택</h2>
              </div>
              <div className={styles.topicGrid}>
                {topicOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={styles.choiceButton}
                    data-active={topic === item ? "true" : "false"}
                    aria-pressed={topic === item}
                    onClick={() => {
                      resetPendingFlow();
                      setTopic(item);
                      setLastCommandChoice({ kind: "topic", value: item });
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>
            ) : null}

            {showBirthInfo ? (
            <section className={styles.deckSection} aria-labelledby="neo-profile-title">
              <div className={styles.sectionHead}>
                <span>03</span>
                <h2 id="neo-profile-title">작전 대상 정보 확인</h2>
              </div>
              <p className={styles.sectionCopy}>시작할 지도를 펼치려면 기본 좌표가 필요하다. 대충 넣으면 대충 차려낸다.</p>
              <div className={styles.profileModeGrid} role="group" aria-label="출생정보 입력 방식">
                <button
                  type="button"
                  className={styles.choiceButton}
                  data-active={birthState.profileMode === "saved" ? "true" : "false"}
                  disabled={!birthState.hasSavedProfile}
                  onClick={selectSavedProfile}
                >
                  현재 프로필 사용
                </button>
                <button
                  type="button"
                  className={styles.choiceButton}
                  data-active={birthState.profileMode === "manual" ? "true" : "false"}
                  onClick={selectManualProfile}
                >
                  직접 입력
                </button>
              </div>
              <p className={styles.profileModeHint}>
                {birthState.profileMode === "saved"
                  ? "현재 프로필에서 불러온 좌표다. 다르면 직접 입력으로 바꿔라."
                  : "출생지와 시간대는 기본 기준값이 들어와 있으니 네 좌표에 맞는지 확인해라."}
              </p>
              <div className={styles.birthGrid}>
                <label className={styles.fieldLabel}>
                  이름
                  <input
                    type="text"
                    value={birthState.birth.name}
                    disabled={birthFieldsDisabled}
                    placeholder="이름 또는 별명"
                    onChange={(event) => updateBirthInput("name", event.target.value)}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  성별
                  <select
                    value={birthState.birth.gender}
                    disabled={birthFieldsDisabled}
                    onChange={(event) => updateBirthInput("gender", event.target.value as NeoWarRoomGender)}
                  >
                    <option value="">선택</option>
                    <option value="female">여성</option>
                    <option value="male">남성</option>
                    <option value="unknown">선택하지 않음</option>
                  </select>
                </label>
                <label className={styles.fieldLabel}>
                  생년월일
                  <input
                    type="date"
                    value={birthState.birth.birthDate}
                    disabled={birthFieldsDisabled}
                    onChange={(event) => updateBirthInput("birthDate", event.target.value)}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  출생시간
                  <input
                    type="time"
                    value={birthState.birth.birthTime}
                    disabled={birthFieldsDisabled || birthState.birth.birthTimeUnknown}
                    onChange={(event) => updateBirthInput("birthTime", event.target.value)}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  달력
                  <select
                    value={birthState.birth.calendarType}
                    disabled={birthFieldsDisabled}
                    onChange={(event) => updateBirthInput("calendarType", event.target.value)}
                  >
                    <option value="solar">양력</option>
                    <option value="lunar">음력</option>
                  </select>
                </label>
                <label className={styles.fieldLabel}>
                  출생지
                  <input
                    type="text"
                    value={birthState.birth.city}
                    disabled={birthFieldsDisabled}
                    data-default-value={birthState.profileMode === "manual" && birthState.birth.city === "Seoul" ? "true" : "false"}
                    placeholder="Seoul"
                    onChange={(event) => updateBirthInput("city", event.target.value)}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  시간대
                  <input
                    type="text"
                    value={birthState.birth.timezone}
                    disabled={birthFieldsDisabled}
                    data-default-value={birthState.profileMode === "manual" && birthState.birth.timezone === "Asia/Seoul" ? "true" : "false"}
                    placeholder="Asia/Seoul"
                    onChange={(event) => updateBirthInput("timezone", event.target.value)}
                  />
                </label>
                <label className={styles.checkField}>
                  <input
                    type="checkbox"
                    checked={birthState.birth.birthTimeUnknown}
                    disabled={birthFieldsDisabled}
                    onChange={(event) => updateBirthInput("birthTimeUnknown", event.target.checked)}
                  />
                  출생시간 모름
                </label>
              </div>
            </section>
            ) : null}

            {showIntensitySelect ? (
            <section className={styles.deckSection} aria-labelledby="neo-intensity-title">
              <div className={styles.sectionHead}>
                <span>04</span>
                <h2 id="neo-intensity-title">팩폭 강도 선택</h2>
              </div>
              <div className={styles.intensityGrid}>
                {intensityOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.intensityCard}
                    data-active={intensity === item.id ? "true" : "false"}
                    data-tone={item.tone}
                    aria-pressed={intensity === item.id}
                    onClick={() => {
                      resetPendingFlow();
                      setIntensity(item.id);
                      setLastCommandChoice({ kind: "intensity", value: item.id });
                    }}
                  >
                    <span
                      className={styles.intensityImageFrame}
                      aria-hidden="true"
                      style={{
                        "--neo-intensity-x": item.cropX,
                        "--neo-intensity-y": item.cropY,
                      } as CSSProperties}
                    >
                      <NeoWarRoomAssetImage
                        asset={neoWarRoomAssets.intensity.spicySheet}
                        alt=""
                        sizes="(max-width: 768px) 88vw, 220px"
                        className={styles.intensityImageAsset}
                        imageClassName={styles.intensityImage}
                      />
                    </span>
                    <span className={styles.intensityCopy}>
                      <span className={styles.intensityLabel}>{item.label}</span>
                      <strong>{item.body}</strong>
                    </span>
                  </button>
                ))}
              </div>
              {intensity === "roar" ? (
                <aside className={styles.roarWarning} role="alert">
                  <span aria-hidden="true">!</span>
                  <strong>사자 포효맛 주의</strong>
                  <p>이 강도는 위로보다 직면을 앞세운다. 마음이 예민한 날이라면 기본맛으로 낮춰도 작전은 흐려지지 않는다.</p>
                </aside>
              ) : null}
            </section>
            ) : null}

            {showQuestionInput ? (
            <section className={styles.deckSection} aria-labelledby="neo-question-title">
              <div className={styles.sectionHead}>
                <span>05</span>
                <h2 id="neo-question-title">질문 입력</h2>
              </div>
              <label className={styles.questionLabel} htmlFor="neo-operation-question">
                지금 네 선택을 흔드는 질문
              </label>
              <textarea
                id="neo-operation-question"
                className={styles.questionInput}
                value={question}
                maxLength={600}
                placeholder={"지금 네가 가장 답을 알고 싶은 문제를 적어라.\n길게 써도 된다. 변명도 포함해라.\n내가 알아서 걸러낸다."}
                onChange={(event) => {
                  resetPendingFlow();
                  setLastCommandChoice(null);
                  setQuestion(event.target.value);
                }}
              />
              <div className={styles.inputMeta}>
                <span>{question.length}/600</span>
                <span>
                  {selectedMethod?.label || "분석 방식 미선택"} · {topic || "주제 미선택"} · {selectedIntensity?.label || "강도 미선택"}
                </span>
              </div>
              {!questionReady ? (
                <p className={styles.questionHint}>작전 개시는 질문을 {questionShortfall}자 더 적으면 열린다.</p>
              ) : null}
            </section>
            ) : null}

            {validationErrors.length ? (
              <aside className={styles.errorPanel} aria-live="assertive">
                <strong>작전 정보가 부족하다</strong>
                <ul>
                  {validationErrors.map((error) => (
                    <li key={`${error.field}-${error.message}`}>{error.message}</li>
                  ))}
                </ul>
              </aside>
            ) : null}

            {errorMessage ? (
              <aside className={styles.errorPanel} aria-live="assertive">
                <strong>작전 개시 실패</strong>
                <p>{errorMessage}</p>
              </aside>
            ) : null}

            {statusMessage ? (
              <aside className={styles.statusPanel} aria-live="polite">
                <strong>{flowPhase === "completed" ? "작전 브리핑 도착" : "작전 진행 중"}</strong>
                <p>{statusMessage}</p>
              </aside>
            ) : null}

            {showLaunchConfirm ? (
            <div id="neo-operation-launch" className={styles.startRow}>
              <NeoWarRoomAssetImage
                asset={neoWarRoomAssets.decor.asset1}
                alt=""
                sizes="72px"
                resizeWidth={160}
                className={styles.lionSealFrame}
                imageClassName={styles.lionSealImage}
              />
              <div className={styles.launchSummary}>
                <strong>사자 휘장 확인</strong>
                <span>{selectedMethod?.label} · {topic} · {selectedIntensity?.label}</span>
                <span>{displayConsultPriceLabel ? `${FEATURE_TITLE} · ${displayConsultPriceLabel}` : FEATURE_TITLE}</span>
              </div>
              <button type="submit" className={styles.startButton} disabled={!canStart} aria-busy={busy}>
                <span className={styles.ctaButtonCopy}>
                  <strong>
                    {flowPhase === "payment"
                      ? "결제 확인 중"
                      : flowPhase === "generating"
                        ? "전문가 상담 생성 중"
                        : busy
                          ? "작전 지도 분석 중"
                          : "사자 휘장으로 작전 개시"}
                  </strong>
                  <em>{busy ? "Mapping Fate" : "Lion Seal Command"}</em>
                </span>
              </button>
              <p className={styles.startHint}>
                사자 휘장이 내려오면 네 질문은 작전 명령서로 정리된다.
              </p>
            </div>
            ) : null}

            {operationReady ? (
              <aside className={styles.readyPanel} aria-live="polite">
                <strong>작전 브리핑 완료</strong>
                <p>
                  {topic} 전선은 {selectedMethod?.label}로 판을 읽고, {selectedIntensity?.label}으로 핵심을 찌른다.
                  현실 점검 답변을 받으면 2차 수정 작전 명령서로 이어갈 수 있다.
                </p>
                {pendingAccess ? <span className={styles.preflightMeta}>같은 입력은 같은 작전 요청으로 이어진다.</span> : null}
              </aside>
            ) : null}

            {showBriefingPanel && displayBriefing ? (
              <section id="neo-briefing-panel" className={styles.briefingPanel} aria-labelledby="neo-briefing-title">
                <NeoWarRoomAssetImage
                  asset={neoWarRoomAssets.decor.asset1}
                  alt=""
                  sizes="72px"
                  resizeWidth={160}
                  className={`${styles.lionSealFrame} ${styles.panelLionDecor}`.trim()}
                  imageClassName={styles.lionSealImage}
                />
                <div className={styles.briefingHeader}>
                  <span>1차 작전 브리핑</span>
                  <h2 id="neo-briefing-title">{displayBriefing.operationTitle || "무명 작전"}</h2>
                  {resultUrl ? <em>결과 보관 완료</em> : null}
                  {!briefingFullyRevealed ? (
                    <button
                      type="button"
                      className={styles.briefingRevealSkip}
                      aria-label="브리핑 전체 펼치기"
                      onClick={() => setBriefingRevealStep(BRIEFING_REVEAL_STEP_COUNT)}
                    >
                      전부 펼치기
                    </button>
                  ) : null}
                </div>
                {displayBriefing.neoOpening ? <p className={`${styles.neoOpening} ${styles.revealBlock}`}>{displayBriefing.neoOpening}</p> : null}
                {briefingRevealStep >= 1 ? (
                <div className={`${styles.briefingGrid} ${styles.revealBlock}`}>
                  <article>
                    <strong>현재 운명의 전선</strong>
                    <LlmParagraphs text={displayBriefingFrontline} />
                  </article>
                  <article>
                    <strong>{displayBriefingRepeatedChoice.title || "반복되는 선택"}</strong>
                    <LlmParagraphs text={displayBriefingRepeatedChoice.description} />
                  </article>
                  {displayBriefing.innateNature?.description ? (
                    <article>
                      <strong>{displayBriefing.innateNature.title || "타고난 성향의 핵"}</strong>
                      <LlmParagraphs text={displayBriefing.innateNature.description} />
                      {displayBriefing.innateNature.keyTraits?.length ? (
                        <ul>
                          {displayBriefing.innateNature.keyTraits.map((trait) => <li key={trait}>{trait}</li>)}
                        </ul>
                      ) : null}
                    </article>
                  ) : null}
                  {displayBriefing.innateStrength?.description ? (
                    <article>
                      <strong>{displayBriefing.innateStrength.title || "타고난 강점과 약점"}</strong>
                      <LlmParagraphs text={displayBriefing.innateStrength.description} />
                      {displayBriefing.innateStrength.strongPoints?.length ? (
                        <ul>
                          {displayBriefing.innateStrength.strongPoints.map((point) => <li key={`strong-${point}`}>💪 {point}</li>)}
                        </ul>
                      ) : null}
                      {displayBriefing.innateStrength.weakPoints?.length ? (
                        <ul>
                          {displayBriefing.innateStrength.weakPoints.map((point) => <li key={`weak-${point}`}>⚠ {point}</li>)}
                        </ul>
                      ) : null}
                    </article>
                  ) : null}
                  {displayBriefing.topicStyle?.description ? (
                    <article>
                      <strong>{displayBriefing.topicStyle.title || "이 주제에서 너의 방식"}</strong>
                      <LlmParagraphs text={displayBriefing.topicStyle.description} />
                      {displayBriefing.topicStyle.keyPoints?.length ? (
                        <ul>
                          {displayBriefing.topicStyle.keyPoints.map((point) => <li key={point}>{point}</li>)}
                        </ul>
                      ) : null}
                    </article>
                  ) : null}
                  {displayBriefing.topicAreas?.length ? (
                    <article>
                      <strong>주제 영역별 심층</strong>
                      <ul>
                        {displayBriefing.topicAreas.map((item) => (
                          <li key={item.area}><strong>{item.area}</strong> — {item.reading}</li>
                        ))}
                      </ul>
                    </article>
                  ) : null}
                  {displayBriefing.topicTiming?.description ? (
                    <article>
                      <strong>{displayBriefing.topicTiming.title || "이 주제의 시기 흐름"}</strong>
                      <LlmParagraphs text={displayBriefing.topicTiming.description} />
                      {displayBriefing.topicTiming.windows?.length ? (
                        <ul>
                          {displayBriefing.topicTiming.windows.map((w) => <li key={w}>{w}</li>)}
                        </ul>
                      ) : null}
                    </article>
                  ) : null}
                  <article>
                    <strong>{displayBriefing.originalStrategy?.title || "본래 너는 이렇게 움직여야 한다"}</strong>
                    <LlmParagraphs text={displayBriefing.originalStrategy?.description} />
                    {displayBriefing.originalStrategy?.keyRules?.length ? (
                      <ul>
                        {displayBriefing.originalStrategy.keyRules.map((rule) => <li key={rule}>{rule}</li>)}
                      </ul>
                    ) : null}
                  </article>
                  <article>
                    <strong>{displayBriefingMisalignedFlow.title || "지금 흐름이 어긋난 자리"}</strong>
                    <LlmParagraphs text={displayBriefingMisalignedFlow.description} />
                  </article>
                </div>
                ) : null}
                {/* 브리핑 카드 8장이 연달아 나오는 구간 뒤에 삽화 1컷 — 시선이 쉬는 지점.
                    기존 .missionBust 크롭과 로컬 투명 스프라이트(약 65KB)를 재사용한다. 7일 작전 중간에
                    들어가는 반신상과 다른 포즈를 써서 같은 그림이 두 번 나오지 않게 한다. */}
                {briefingRevealStep >= 2 && displayBriefing.methodEvidence?.length ? (
                  <NeoWarRoomAssetImage
                    src="/neo-operation-room/sprites/transparent/neo-transparent-s3-f01.webp"
                    alt=""
                    className={`${styles.missionBust} ${styles.revealBlock}`}
                    imageClassName={styles.missionBustImg}
                    sizes="(max-width: 720px) 92vw, 640px"
                    style={{ background: "linear-gradient(180deg, rgba(19, 16, 42, 0.72), rgba(10, 8, 24, 0.86))" }}
                  />
                ) : null}
                {briefingRevealStep >= 2 && displayBriefing.methodEvidence?.length ? (
                  <div className={`${styles.evidenceList} ${styles.revealBlock}`}>
                    {displayBriefing.methodEvidence.map((item) => (
                      <article key={`${item.method}-${item.label}`}>
                        <strong>{item.label}</strong>
                        <LlmParagraphs text={item.summary} />
                      </article>
                    ))}
                  </div>
                ) : null}
                {briefingRevealStep >= 3 && displayBriefing.bluntTruth ? (
                  <NeoFactPunch
                    text={displayBriefing.bluntTruth}
                    className={styles.bluntTruthImpact}
                    intensity={displayBriefing && intensity ? intensity : "standard"}
                  />
                ) : null}
                {briefingRevealStep >= 4 && (displayBriefing.forbiddenAction?.title || displayBriefing.forbiddenAction?.reason) ? (
                  <div className={`${styles.refinedListBlock} ${styles.revealBlock}`}>
                    <strong>{displayBriefing.forbiddenAction?.title || "오늘 금지 행동"}</strong>
                    <LlmParagraphs text={displayBriefing.forbiddenAction?.reason} />
                  </div>
                ) : null}
                {briefingRevealStep >= 4 && displayBriefing.actionOrders?.length ? (
                  <div className={`${styles.refinedListBlock} ${styles.revealBlock}`}>
                    <strong>바로 해야 할 작전</strong>
                    <ul>{displayBriefing.actionOrders.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                ) : null}
                {briefingRevealStep >= 5 && displayBriefing.sevenDayMission?.length ? (
                  <NeoWarRoomAssetImage
                    asset={NEO_PROLOGUE_LION}
                    alt=""
                    className={`${styles.missionSeal} ${styles.revealBlock}`}
                    imageClassName={styles.missionSealImg}
                    sizes="148px"
                    style={{ background: "radial-gradient(circle at 50% 46%, rgba(232, 213, 163, 0.22), rgba(167, 139, 250, 0.1) 46%, transparent 68%)" }}
                  />
                ) : null}
                {briefingRevealStep >= 5 && displayBriefing.sevenDayMission?.length ? (
                  <div className={`${styles.missionGrid} ${styles.revealBlock}`}>
                    <strong>7일 작전</strong>
                    {displayBriefing.sevenDayMission.map((item, idx, arr) => (
                      <Fragment key={`${item.day}-${item.mission}`}>
                        <article>
                          <span>DAY {item.day}</span>
                          <p>{item.mission}</p>
                        </article>
                        {idx === Math.floor(arr.length / 2) - 1 ? (
                          <NeoWarRoomAssetImage
                            asset={NEO_INTRO_PORTRAIT}
                            alt=""
                            className={styles.missionBust}
                            imageClassName={styles.missionBustImg}
                            sizes="(max-width: 720px) 92vw, 640px"
                            style={{ background: "linear-gradient(180deg, rgba(19, 16, 42, 0.72), rgba(10, 8, 24, 0.86))" }}
                          />
                        ) : null}
                      </Fragment>
                    ))}
                  </div>
                ) : null}
                {briefingRevealStep >= 6 && displayBriefing.realityCheckQuestions?.length ? (
                  <div className={`${styles.realityQuestions} ${styles.revealBlock}`}>
                    <strong>현실 점검 질문</strong>
                    {displayBriefing.realityCheckQuestions.map((item) => (
                      <article key={item.question}>
                        <p>{item.question}</p>
                        <span>{item.whyItMatters}</span>
                      </article>
                    ))}
                  </div>
                ) : null}
                {briefingRevealStep >= 6 && displayBriefing.realityCheckQuestions?.length ? (
                  <NeoWarRoomAssetImage
                    asset={NEO_PROLOGUE_LION}
                    alt=""
                    className={`${styles.missionSeal} ${styles.revealBlock}`}
                    imageClassName={styles.missionSealImg}
                    sizes="148px"
                    style={{ background: "radial-gradient(circle at 50% 46%, rgba(232, 213, 163, 0.22), rgba(167, 139, 250, 0.1) 46%, transparent 68%)" }}
                  />
                ) : null}
                {briefingRevealStep >= 7 && displayBriefing.badge?.description ? (
                  <div className={`${styles.badgeAward} ${styles.revealBlock}`}>
                    <NeoTopicBadge topic={topic} asset={neoBadgeStampAsset} className={styles.badgeAwardImage} />
                    <p>{`${getNeoTopicBadge(topic).name} · ${displayBriefing.badge.description}`}</p>
                  </div>
                ) : null}
                {briefingRevealStep >= 7 && (displayBriefing.tsundereClosing || displayBriefing.nextStepPrompt) ? (
                  <p className={`${styles.nextStepPrompt} ${styles.revealBlock}`}>{displayBriefing.tsundereClosing || displayBriefing.nextStepPrompt}</p>
                ) : null}
              </section>
            ) : null}

            {showRealityPanel && displayBriefing ? (
              <section className={styles.realityCheckPanel} aria-labelledby="neo-reality-check-title">
                <NeoWarRoomAssetImage
                  asset={neoWarRoomAssets.decor.asset1}
                  alt=""
                  sizes="72px"
                  resizeWidth={160}
                  className={`${styles.lionSealFrame} ${styles.panelLionDecor}`.trim()}
                  imageClassName={styles.lionSealImage}
                />
                <div className={styles.realityCheckHeader}>
                  <span>현실 점검</span>
                  <h2 id="neo-reality-check-title">너, 진짜 그렇게 살고 있냐?</h2>
                  <p>네오의 1차 판단에 네 현실을 대입해라. 인정해도 되고, 반박해도 된다.</p>
                </div>

                <div className={styles.realityBriefGrid}>
                  <article>
                    <strong>1차 작전명</strong>
                    <p>{displayBriefing.operationTitle || "무명 작전"}</p>
                  </article>
                  <article>
                    <strong>{displayBriefing.originalStrategy?.title || "본래 너는 이렇게 움직여야 한다"}</strong>
                    <LlmParagraphs text={displayBriefing.originalStrategy?.description} />
                  </article>
                  <article>
                    <strong>{displayBriefingMisalignedFlow.title || "지금 흐름이 어긋난 자리"}</strong>
                    <LlmParagraphs text={displayBriefingMisalignedFlow.description} />
                  </article>
                </div>

                {displayBriefing.realityCheckQuestions?.length ? (
                  <div className={styles.realityQuestionDeck}>
                    <strong>네오의 현실 점검 질문</strong>
                    {displayBriefing.realityCheckQuestions.map((item) => (
                      <article key={item.question}>
                        <p>{item.question}</p>
                        <span>{item.whyItMatters}</span>
                      </article>
                    ))}
                  </div>
                ) : null}

                <div className={styles.realityAnswerGrid}>
                  {realityCheckOptions.map((item) => {
                    const active = selectedRealityChecks.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        className={styles.realityCheckChoice}
                        data-active={active ? "true" : "false"}
                        aria-pressed={active}
                        onClick={() => {
                          setRefineError("");
                          setSelectedRealityChecks((current) =>
                            current.includes(item)
                              ? current.filter((entry) => entry !== item)
                              : [...current, item],
                          );
                        }}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                <label className={styles.realityFreeformLabel} htmlFor="neo-reality-freeform">
                  네오에게 더 말할 현실
                  <textarea
                    id="neo-reality-freeform"
                    value={realityFreeform}
                    maxLength={1000}
                    placeholder={"네오에게 반박하거나, 현재 상황을 더 자세히 적어주세요.\n변명도 괜찮습니다. 네오가 알아서 걸러냅니다."}
                    onChange={(event) => {
                      setRefineError("");
                      setRealityFreeform(event.target.value);
                    }}
                  />
                </label>

                {refineError ? (
                  <aside className={styles.errorPanel} aria-live="assertive">
                    <strong>수정 작전 명령서 실패</strong>
                    <p>{refineError}</p>
                  </aside>
                ) : null}

                <button
                  type="button"
                  className={styles.refineButton}
                  disabled={refining}
                  aria-busy={refining}
                  onClick={handleRefineSubmit}
                >
                  <NeoWarRoomAssetImage
                    asset={neoWarRoomAssets.decor.asset1}
                    alt=""
                    sizes="56px"
                    resizeWidth={128}
                    className={styles.refineBadge}
                    imageClassName={styles.lionSealImage}
                  />
                  <span>{refining ? "수정 작전 작성 중" : "수정 작전 명령서 받기"}</span>
                </button>
              </section>
            ) : null}

            {showRefinedPanel && displayRefinedOrder ? (
              <section className={styles.refinedOrderPanel} aria-labelledby="neo-refined-order-title">
                <NeoWarRoomAssetImage
                  asset={neoWarRoomAssets.decor.asset1}
                  alt=""
                  sizes="72px"
                  resizeWidth={160}
                  className={`${styles.lionSealFrame} ${styles.panelLionDecor}`.trim()}
                  imageClassName={styles.lionSealImage}
                />
                <div className={styles.refinedOrderHeader}>
                  <span>2차 수정 작전 명령서</span>
                  <h2 id="neo-refined-order-title">{displayRefinedOrder.operationTitle || "수정 작전"}</h2>
                  {displayRefinedOrder.badge?.name ? <em>오늘의 사자 휘장 · {displayRefinedOrder.badge.name}</em> : null}
                </div>
                {displayRefinedOrder.neoReview ? <p className={styles.neoOpening}>{displayRefinedOrder.neoReview}</p> : null}
                {displayRefinedOrder.verdict?.statement ? (
                  <div className={styles.verdictBlock}>
                    {displayRefinedOrder.verdict.status ? (
                      <span className={`${styles.verdictChip} ${verdictChipClass(displayRefinedOrder.verdict.status, styles)}`.trim()}>
                        {displayRefinedOrder.verdict.status}
                      </span>
                    ) : null}
                    <p className={styles.verdictStatement}>{displayRefinedOrder.verdict.statement}</p>
                    {displayRefinedOrder.verdictBasis ? (
                      <p className={styles.verdictBasis}>{displayRefinedOrder.verdictBasis}</p>
                    ) : null}
                  </div>
                ) : null}
                {displayRefinedOrder.actionAlternatives?.length ? (
                  <div className={styles.alternativeGrid}>
                    <strong>구체적 실행 대안</strong>
                    {displayRefinedOrder.actionAlternatives.map((item, index) => (
                      <article key={`${item.timing}-${item.action}-${index}`}>
                        {item.timing ? <span className={styles.alternativeTiming}>{item.timing}</span> : null}
                        <p className={styles.alternativeAction}>{item.action}</p>
                        {item.rationale ? <p className={styles.alternativeRationale}>{item.rationale}</p> : null}
                      </article>
                    ))}
                  </div>
                ) : null}
                {displayRefinedOrder.peopleToMeet?.length ? (
                  <div className={styles.peopleGrid}>
                    <strong>만나야 할 사람</strong>
                    {displayRefinedOrder.peopleToMeet.map((item, index) => (
                      <article key={`${item.role}-${index}`}>
                        <p className={styles.personRole}>{item.role}</p>
                        {item.complementaryEnergy ? <p className={styles.personEnergy}>{item.complementaryEnergy}</p> : null}
                        {item.whereToFind ? <p className={styles.personWhere}>만날 곳 · {item.whereToFind}</p> : null}
                      </article>
                    ))}
                  </div>
                ) : null}
                {displayRefinedOrder.thirtyDayStrategy?.length ? (
                  <div className={styles.refinedListBlock}>
                    <strong>30일 전략</strong>
                    <ul>{displayRefinedOrder.thirtyDayStrategy.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                ) : null}
                <div className={styles.briefingGrid}>
                  <article>
                    <strong>{displayRefinedOrder.forbiddenAction?.title || "오늘 금지 행동"}</strong>
                    <LlmParagraphs text={displayRefinedOrder.forbiddenAction?.reason} />
                  </article>
                  {displayRefinedOrder.thisWeekFirstStep ? (
                    <article>
                      <strong>이번 주 첫 걸음</strong>
                      <p>{displayRefinedOrder.thisWeekFirstStep}</p>
                    </article>
                  ) : null}
                </div>
                {displayRefinedOrder.badge?.description ? (
                  <div className={styles.badgeAward}>
                    <NeoTopicBadge topic={topic} asset={neoBadgeStampAsset} className={styles.badgeAwardImage} />
                    <p>{`${getNeoTopicBadge(topic).name} · ${displayRefinedOrder.badge.description}`}</p>
                  </div>
                ) : null}
                {displayRefinedOrder.tsundereClosing ? <NeoFactPunch text={displayRefinedOrder.tsundereClosing} label="NEO · 마무리 한마디" /> : null}
              </section>
            ) : null}
          </div>

          {!showOperationMapActor ? (
            <NeoSpriteActor
              state={commandSpriteConfig.state || activeActorState}
              variant={commandActorVariant}
              size="medium"
              dialogueOverride={commandDialogueForDisplay}
              sheetFrame={commandActorSheetFrame}
              assetOverride={commandActorAsset}
              talkFrames={commandActorTalkFrames}
              talking={commandActorIsTalking}
              talkFrameIntervalMs={NEO_TRANSPARENT_TALK_INTERVAL_MS}
              className={styles.commandActor}
            />
          ) : null}
        </div>
      </form>
      ) : null}
    </main>
  );
}
