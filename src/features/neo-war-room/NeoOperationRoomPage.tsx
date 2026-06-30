"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { openPaidFeatureGate, runBillingCoinGate } from "@/app/_lib/billing-client";
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
  NEO_WAR_ROOM_ACCESS_ENDPOINT,
  buildInitialNeoWarRoomBirthState,
  buildNeoWarRoomAccessPayload,
  createNeoWarRoomIdempotencyKey,
  createNeoWarRoomInputFingerprint,
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
  originalStrategy?: { title?: string; description?: string; keyRules?: string[] };
  misalignedFlow?: { title?: string; description?: string };
  currentProblem?: { title?: string; description?: string };
  methodEvidence?: Array<{ method?: string; label?: string; summary?: string }>;
  bluntTruth?: string;
  forbiddenAction?: { title?: string; reason?: string };
  actionOrders?: string[];
  sevenDayMission?: Array<{ day?: number; mission?: string }>;
  thirtyDayStrategy?: string[];
  realityCheckQuestions?: Array<{ question?: string; whyItMatters?: string }>;
  badge?: { name?: string; description?: string };
  tsundereClosing?: string;
  nextStepPrompt?: string;
};
type NeoRefinedOrder = {
  selectedMethod?: NeoWarRoomConsultMode;
  operationTitle?: string;
  neoReview?: string;
  actualStuckPoint?: { title?: string; description?: string };
  realBottleneck?: { title?: string; description?: string };
  updatedDiagnosis?: string;
  discardThis?: string[];
  newLifeStrategy?: { title?: string; description?: string; principles?: string[] };
  forbiddenAction?: { title?: string; reason?: string };
  sevenDayMission?: Array<{ day?: number; mission?: string }>;
  thirtyDayStrategy?: string[];
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
  | { ok: false; reason: "LOGIN_REQUIRED" | "INVALID_INPUT" | "PAYMENT_VERIFY_FAILED" | "LLM_ERROR" | "CALCULATION_ERROR" | "SERVER_ERROR"; message?: string };
type NeoCommandSpriteConfig = {
  state: NeoWarRoomEmotionState;
  variant: NeoSpriteVariant;
  asset?: NeoWarRoomAsset;
  sheetFrame?: number;
};
type NeoPrologueSpeaker = "customer" | "neo" | "narration" | "inner" | "system";
type NeoPrologueCharacter = "hidden" | "shadow" | "preTransformNeoMain" | "preTransformNeoTalk" | "transformingNeo" | "humanNeo";
type NeoPrologueEffect = "none" | "signal" | "seal" | "transform" | "arrival";
type NeoPrologueLine = {
  id: string;
  speaker: NeoPrologueSpeaker;
  speakerLabel: string;
  text: string;
  scene: "intro" | "signal" | "lionReveal" | "identityComedy" | "nameReveal" | "transformation" | "humanNeo" | "strategyRoom" | "final";
  character: NeoPrologueCharacter;
  sheetFrame?: number;
  transformFrame?: number;
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
} as const;

const NEO_WAR_ROOM_BGM_STORAGE_KEY = "code-destiny-neo-operation-room-bgm";
const NEO_WAR_ROOM_BGM_TRACK = neoWarRoomBgmTracks.moonlitWarRoom;
const NEO_OPERATION_ROOM_ENTRY_REVISION = "neo-lobby-entry-20260630";
const NEO_STRATEGY_PROLOGUE_SEEN_KEY = "neoStrategyPrologueSeen";
const NEO_TRANSFORM_FRAME_COUNT = 24;
const NEO_TRANSFORM_SHEET_COLUMNS = 6;
const NEO_TRANSFORM_SHEET_ROWS = 4;
const NEO_TRANSFORM_SHEET_CELL_PX = 256;
const NEO_TRANSFORM_FRAME_INSET_PX = 0;
const NEO_TRANSFORM_FRAME_INTERVAL_MS = 62;
const NEO_PRE_TRANSFORM_SHEET_COLUMNS = 4;
const NEO_PRE_TRANSFORM_SHEET_ROWS = 4;
const NEO_PRE_TRANSFORM_SHEET_CELL_PX = 313.5;
const NEO_PRE_TRANSFORM_FRAME_INSET_PX = 0;
const NEO_OPERATION_LOADING_SPRITE_FRAMES = [1, 3, 4, 7, 10, 15, 16] as const;
const NEO_OPERATION_LOADING_SPRITE_INTERVAL_MS = 420;
const NEO_MAIN_DIALOGUE_AUTO_ADVANCE_MS = 6200;
const METHOD_INTRO_AUTO_ADVANCE_MS = 7200;
const COMMAND_DIALOGUE_BASE_SPEED_MS = 28;
const COMMAND_DIALOGUE_MAX_DURATION_MS = 2800;
const NEO_PREVIEW_MODES = new Set<NeoPreviewMode>(["loading", "briefing", "reality", "refined"]);
const NEO_LOADING_SEAL_SRC = "/neo-operation-room/lion-seal-loading.webp";

const NEO_INTRO_PORTRAIT = neoWarRoomAssets.hero.portrait;
const NEO_PROLOGUE_SHADOW = neoWarRoomAssets.hero.blackShadow;
const NEO_PROLOGUE_PRE_TRANSFORM_MAIN = neoWarRoomAssets.hero.strategyNeoMain;
const NEO_PROLOGUE_PRE_TRANSFORM_SHEET = neoWarRoomAssets.sprites.strategyNeo;
const NEO_PROLOGUE_TRANSFORMATION = neoWarRoomAssets.hero.transformation;
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
  "왔냐. 여긴 네 마음을 달래는 방이 아니라, 네 선택을 정리하는 전략 상담실이다.",
  "문이 닫히면 핑계는 밖에 남긴다. 안쪽에는 네가 반복한 선택만 올려놓는다.",
  "오늘 볼 건 운이 좋다 나쁘다가 아니다. 네가 어디서 같은 전선을 잃는지다.",
  "사주든 별자리든 지도는 다르다. 하지만 네가 움직여야 할 방향은 하나로 모인다.",
  "겁먹을 필요 없다. 흐릿한 마음을 작전 언어로 바꾸려는 것뿐이다.",
  "네가 계속 미룬 질문이 있다면, 그게 오늘 첫 번째 보고서다.",
  "사자 휘장은 겁주는 표식이 아니다. 다시 똑바로 앉겠다는 신호다.",
  "준비됐으면 앉아라. 이제부터는 감정의 안개가 아니라 선택의 지도를 본다.",
] as const;

const neoPrologueDialogues: readonly NeoPrologueLine[] = [
  {
    id: "customer-arrival",
    speaker: "customer",
    speakerLabel: "고객",
    text: "잠깐. 상담 받으러 왔는데 왜 조명이 작전실 분위기야?\n나 혹시 잘못 눌렀나?",
    scene: "intro",
    character: "shadow",
    effect: "signal",
  },
  {
    id: "inner-shadow-check",
    speaker: "inner",
    speakerLabel: "내면의 목소리",
    text: "저 검은 그림자... 설마 나인가?\n요즘 선택을 미루다 보니 실루엣까지 흐릿해진 건가.",
    scene: "signal",
    character: "hidden",
    effect: "signal",
  },
  {
    id: "neo-war-room-welcome",
    speaker: "neo",
    speakerLabel: "네오",
    text: "잘못 누른 건 아니다.\n여긴 위로 상담소가 아니라, 네 선택 패턴을 작전처럼 해독하는 방이다.",
    scene: "lionReveal",
    character: "preTransformNeoMain",
    effect: "seal",
  },
  {
    id: "customer-cat-misread",
    speaker: "customer",
    speakerLabel: "고객",
    text: "선택 패턴까지는 알겠는데...\n혹시 진행자는 고양이야?",
    scene: "identityComedy",
    character: "shadow",
    effect: "seal",
  },
  {
    id: "neo-not-cat",
    speaker: "neo",
    speakerLabel: "네오",
    text: "사자다.\n그리고 그냥 사자가 아니라 전략가 네오다. 발음 조심해라.",
    scene: "identityComedy",
    character: "preTransformNeoMain",
    effect: "seal",
  },
  {
    id: "customer-problem",
    speaker: "customer",
    speakerLabel: "고객",
    text: "그래, 전략가 사자.\n근데 나는 그냥 요즘 선택이 자꾸 꼬여서 온 거야. 큰일 난 건 아니고.",
    scene: "signal",
    character: "shadow",
    effect: "signal",
  },
  {
    id: "neo-denial-detected",
    speaker: "neo",
    speakerLabel: "네오",
    text: "방금 그 '큰일 난 건 아니고'가 첫 번째 단서다.\n사람은 진짜 급한 문제일수록 말끝을 흐린다.",
    scene: "nameReveal",
    character: "preTransformNeoMain",
    effect: "seal",
  },
  {
    id: "customer-many-maps",
    speaker: "customer",
    speakerLabel: "고객",
    text: "그럼 여기서는 뭘 보는 건데?\n사주, 별자리, 자미두수, 베다점... 이름만 들어도 머리가 복잡한데.",
    scene: "nameReveal",
    character: "shadow",
    effect: "signal",
  },
  {
    id: "neo-method-briefing",
    speaker: "neo",
    speakerLabel: "네오",
    text: "지도는 넷이지만 목적은 하나다.\n사주는 기본 전투 방식, 자미두수는 인생의 배치도, 베다는 반복 흐름, 점성술은 마음의 궤도를 본다.",
    scene: "strategyRoom",
    character: "preTransformNeoMain",
    effect: "seal",
  },
  {
    id: "neo-topic-briefing",
    speaker: "neo",
    speakerLabel: "네오",
    text: "그리고 주제를 골라야 한다.\n연애인지, 일인지, 돈인지, 인간관계인지. 전선을 흐리면 작전도 흐려진다.",
    scene: "strategyRoom",
    character: "preTransformNeoMain",
    effect: "seal",
  },
  {
    id: "customer-birth-coordinates",
    speaker: "customer",
    speakerLabel: "고객",
    text: "출생 정보까지 넣는 이유는?\n그냥 요즘 고민만 말하면 안 돼?",
    scene: "strategyRoom",
    character: "shadow",
    effect: "signal",
  },
  {
    id: "neo-coordinate-briefing",
    speaker: "neo",
    speakerLabel: "네오",
    text: "고민은 현재 위치고, 출생 좌표는 네가 들고 태어난 지도다.\n둘을 같이 봐야 길이 막힌 건지, 네가 같은 벽에 계속 박는 건지 구분된다.",
    scene: "strategyRoom",
    character: "preTransformNeoMain",
    effect: "seal",
  },
  {
    id: "customer-roar-question",
    speaker: "customer",
    speakerLabel: "고객",
    text: "팩폭 강도도 있네.\n사자 포효맛은 이름부터 좀 위험해 보이는데?",
    scene: "strategyRoom",
    character: "shadow",
    effect: "signal",
  },
  {
    id: "neo-roar-warning",
    speaker: "neo",
    speakerLabel: "네오",
    text: "멋으로 고르는 맛은 아니다.\n순한맛은 숨 쉴 틈을 남기고, 기본맛은 핵심을 찌르고, 포효맛은 변명부터 내려놓게 만든다.",
    scene: "identityComedy",
    character: "preTransformNeoMain",
    effect: "seal",
  },
  {
    id: "neo-transform-ready",
    speaker: "neo",
    speakerLabel: "네오",
    text: "겁먹을 필요는 없다.\n도망치지만 않으면, 감정의 안개는 작전 명령서로 바뀐다.",
    scene: "transformation",
    character: "preTransformNeoMain",
    effect: "seal",
  },
  {
    id: "transform-flare",
    speaker: "narration",
    speakerLabel: "내레이션",
    text: "사자 휘장이 빛을 토해 내자, 네오의 윤곽이 도시의 별빛과 겹쳐진다.\n흩어져 있던 고민들이 하나의 작전판 위로 정렬된다.",
    scene: "transformation",
    character: "transformingNeo",
    transformFrame: 1,
    effect: "transform",
  },
  {
    id: "customer-style-change",
    speaker: "customer",
    speakerLabel: "고객",
    text: "잠깐, 방금 변신했지?\n상담보다 스케일이 큰데?",
    scene: "humanNeo",
    character: "shadow",
    effect: "arrival",
  },
  {
    id: "neo-final-briefing",
    speaker: "neo",
    speakerLabel: "네오",
    text: "이제 들어와라.\n네 고민은 감상문이 아니라 브리핑으로 정리하고, 네 회피는 현실 점검에서 다시 확인한다.",
    scene: "final",
    character: "humanNeo",
    effect: "arrival",
    notification: {
      title: "작전실 연결 완료",
      body: "분석 방식, 상담 주제, 출생 좌표, 팩폭 강도가 작전판에 올라간다.",
    },
    cta: {
      label: "운명 전략실 입장하기",
      helperText: "첫 작전 브리핑을 시작한다.",
    },
  },
] as const;

const getNeoPrologueCharacterAsset = (character: NeoPrologueCharacter): NeoWarRoomAsset => {
  if (character === "shadow") return NEO_PROLOGUE_SHADOW;
  if (character === "preTransformNeoMain") return NEO_PROLOGUE_PRE_TRANSFORM_MAIN;
  if (character === "preTransformNeoTalk") return NEO_PROLOGUE_PRE_TRANSFORM_SHEET;
  if (character === "transformingNeo") return NEO_PROLOGUE_TRANSFORMATION;
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

const getNeoPrologueSheetStyle = (line: NeoPrologueLine | null, transformFrame: number) => {
  const isTransforming = line?.character === "transformingNeo";
  const columns = isTransforming ? NEO_TRANSFORM_SHEET_COLUMNS : NEO_PRE_TRANSFORM_SHEET_COLUMNS;
  const rows = isTransforming ? NEO_TRANSFORM_SHEET_ROWS : NEO_PRE_TRANSFORM_SHEET_ROWS;
  const cellPx = isTransforming ? NEO_TRANSFORM_SHEET_CELL_PX : NEO_PRE_TRANSFORM_SHEET_CELL_PX;
  const insetPx = isTransforming ? NEO_TRANSFORM_FRAME_INSET_PX : NEO_PRE_TRANSFORM_FRAME_INSET_PX;
  const requestedFrame = isTransforming ? transformFrame : line?.sheetFrame;
  if (!requestedFrame || (line?.character !== "preTransformNeoTalk" && !isTransforming)) return {};
  return getNeoSheetCropStyle(
    Math.min(isTransforming ? NEO_TRANSFORM_FRAME_COUNT : columns * rows, requestedFrame),
    columns,
    rows,
    cellPx,
    insetPx,
  );
};

function NeoInnerVoiceAvatar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="neoInnerVoiceGlow" cx="50%" cy="44%" r="64%">
          <stop offset="0%" stopColor="#f8e7b0" stopOpacity="0.95" />
          <stop offset="48%" stopColor="#96b8ff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#131a33" stopOpacity="0.08" />
        </radialGradient>
        <linearGradient id="neoInnerVoiceBody" x1="22" y1="10" x2="78" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff6d9" stopOpacity="0.96" />
          <stop offset="0.54" stopColor="#9fbaff" stopOpacity="0.78" />
          <stop offset="1" stopColor="#4b5f9e" stopOpacity="0.42" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="43" fill="url(#neoInnerVoiceGlow)" />
      <path d="M48 12c15 0 28 14 28 31 0 22-17 38-28 44-11-6-28-22-28-44 0-17 13-31 28-31Z" fill="url(#neoInnerVoiceBody)" stroke="rgba(255,246,210,.72)" strokeWidth="2" />
      <path d="M35 51c4 6 9 9 13 9s9-3 13-9" fill="none" stroke="#192441" strokeWidth="3" strokeLinecap="round" opacity="0.72" />
      <circle cx="36" cy="42" r="4" fill="#1a2340" opacity="0.82" />
      <circle cx="60" cy="42" r="4" fill="#1a2340" opacity="0.82" />
      <path d="M48 38c-5-7-15-1-10 7 3 4 10 9 10 9s7-5 10-9c5-8-5-14-10-7Z" fill="#f7d989" opacity="0.9" />
      <path d="M20 23l4 8 8 4-8 4-4 8-4-8-8-4 8-4 4-8Zm60 7 3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Z" fill="#f5d487" opacity="0.86" />
    </svg>
  );
}

const getNeoPrologueCharacterLabel = (character: NeoPrologueCharacter) => {
  if (character === "hidden") return "화면 밖에서 들리는 목소리";
  if (character === "shadow") return "전략실에 나타난 검은 그림자";
  if (character === "preTransformNeoMain") return "전략실 변신 전 네오";
  if (character === "preTransformNeoTalk") return "전략실에서 말하는 변신 전 네오";
  if (character === "transformingNeo") return "전략가로 변신하는 네오";
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
  thirtyDayStrategy: ["1주차: 선택 기록", "2주차: 관계 반응과 내 기준 분리", "3주차: 반복되는 불안 이름 붙이기", "4주차: 남는 기준만 유지"],
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
  actualStuckPoint: {
    title: "실제로 흔들리던 지점",
    description: "결정하기 전에는 완벽한 확신을 기다리고, 결정한 뒤에는 남의 반응으로 다시 흔들린다.",
  },
  realBottleneck: {
    title: "실제로 흔들리던 지점",
    description: "결정하기 전에는 완벽한 확신을 기다리고, 결정한 뒤에는 남의 반응으로 다시 흔들린다.",
  },
  updatedDiagnosis: "지금은 큰 결심보다 작은 실행 기준이 먼저다. 기준이 생기면 운의 흐름도 훨씬 덜 새어 나간다.",
  discardThis: ["모두가 납득할 때까지 기다리기", "마음이 완전히 편해질 때까지 미루기", "괜찮은 척하며 같은 자리로 돌아가기"],
  newLifeStrategy: {
    title: "새 작전 기준",
    description: "하루 안에 확인 가능한 행동으로 전선을 좁혀라. 작게 움직이면 판단이 다시 선명해진다.",
    principles: ["감정이 거센 날에는 결론 대신 자료만 모은다", "결정은 세 문장으로 적는다", "반복되는 회피는 바로 기록한다"],
  },
  forbiddenAction: {
    title: "오늘 금지 행동",
    reason: "상대 반응을 핑계로 내 결정을 다시 무르는 것.",
  },
  sevenDayMission: [
    { day: 1, mission: "가장 미룬 질문 하나를 적어라." },
    { day: 2, mission: "선택 기준 세 가지를 정리해라." },
    { day: 3, mission: "기준에 맞지 않는 선택지를 하나 버려라." },
    { day: 4, mission: "마음이 흔들린 순간과 이유를 한 줄로 남겨라." },
    { day: 5, mission: "남의 반응을 확인하기 전에 네 기준을 먼저 읽어라." },
    { day: 6, mission: "버릴 선택지 하나를 조용히 지워라." },
    { day: 7, mission: "일주일 뒤에도 남는 기준만 작전표에 남겨라." },
  ],
  thirtyDayStrategy: ["주 2회 선택 기록", "관계 반응과 내 기준 분리", "반복되는 불안을 한 줄로 명명", "한 달 뒤에도 유효한 기준만 유지"],
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
  INVALID_INPUT: "작전 정보가 부족하다. 입력값을 다시 확인해라.",
  CALCULATION_ERROR: "운명의 계산 지도를 펼치는 중 문제가 생겼다. 출생정보를 다시 확인해라.",
  LLM_ERROR: "작전 브리핑 작성에 실패했다. 이용권이나 결제 권한은 보존되니 다시 시도해라.",
  SERVER_ERROR: "작전실 연결에 문제가 생겼다. 잠시 후 다시 시도해라.",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toText(value: unknown) {
  return String(value || "").trim();
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

function getRefinedStuckPoint(refined?: NeoRefinedOrder | null) {
  return refined?.actualStuckPoint || refined?.realBottleneck || {};
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

export default function NeoOperationRoomPage() {
  const [birthState, setBirthState] = useState(() => buildInitialNeoWarRoomBirthState());
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
  const [resultUrl, setResultUrl] = useState("");
  const [operationStageIndex, setOperationStageIndex] = useState(0);
  const [introStep, setIntroStep] = useState(0);
  const [prologueStep, setPrologueStep] = useState(0);
  const [transformFrame, setTransformFrame] = useState(1);
  const [operationMapSpriteFrame, setOperationMapSpriteFrame] = useState<number>(NEO_OPERATION_LOADING_SPRITE_FRAMES[0]);
  const [methodIntroStep, setMethodIntroStep] = useState(0);
  const [hasEnteredWarRoom, setHasEnteredWarRoom] = useState(false);
  const [hasCompletedPrologue, setHasCompletedPrologue] = useState(false);
  const [hasSeenPrologue, setHasSeenPrologue] = useState(false);
  const [entryRevision, setEntryRevision] = useState("");
  const [displayedCommandDialogue, setDisplayedCommandDialogue] = useState("");
  const [isCommandTyping, setIsCommandTyping] = useState(false);
  const [localPreviewMode, setLocalPreviewMode] = useState<NeoPreviewMode>("");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [bgmStatus, setBgmStatus] = useState<"idle" | "playing" | "blocked" | "off">("idle");
  const [isBgmPreferenceReady, setIsBgmPreferenceReady] = useState(false);
  const idempotencyKeyRef = useRef("");
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const localPreviewEnabled = process.env.NODE_ENV !== "production";

  const selectedMethod = useMemo(
    () => neoWarRoomMethodRegistry.find((item) => item.mode === method) ?? null,
    [method],
  );
  const selectedIntensity = intensityOptions.find((item) => item.id === intensity) ?? null;
  const trimmedQuestion = question.trim();
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
  const displayRefinedStuckPoint = getRefinedStuckPoint(displayRefinedOrder);
  const showBriefingPanel = Boolean(displayBriefing);
  const showRealityPanel = Boolean(briefing || localPreviewMode === "reality" || localPreviewMode === "refined");
  const showRefinedPanel = Boolean(displayRefinedOrder);
  const previewOperationMap = localPreviewMode === "loading";
  const showOperationMap = busy || flowPhase === "completed" || previewOperationMap;
  const showOperationMapActor = busy || previewOperationMap;
  const operationStageText =
    previewOperationMap
      ? operationMapStages[operationStageIndex]
      : refining
      ? "현실 답변을 반영해 수정 작전 명령서를 쓰는 중..."
      : flowPhase === "checking"
      ? "사자 휘장 권한을 확인하는 중..."
      : flowPhase === "payment"
        ? "이용권과 결제 신호를 대조하는 중..."
        : flowPhase === "completed"
          ? "작전 브리핑 도장을 찍는 중..."
          : operationMapStages[operationStageIndex];
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
          : Math.min(92, 34 + operationStageIndex * 10);
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
  const lastChoiceDialogue = useMemo(() => {
    if (lastCommandChoice?.kind === "method" && method === lastCommandChoice.value) return getNeoMethodDialogue(method);
    if (lastCommandChoice?.kind === "topic" && topic === lastCommandChoice.value) return getNeoTopicDialogue(topic);
    if (lastCommandChoice?.kind === "intensity" && intensity === lastCommandChoice.value) return getNeoIntensityDialogue(intensity);
    return null;
  }, [intensity, lastCommandChoice, method, topic]);
  const activeCommandDialogue = useMemo(() => {
    if (validationErrors.length) return neoOperationDialogues.error.missingInput[0];
    if (errorMessage) return neoOperationDialogues.error.generatingFailed[0];
    if (busy || previewOperationMap) return getNeoLoadingDialogue(method, operationStageIndex);
    if (displayRefinedOrder) return neoOperationDialogues.refinedResult[0];
    if (displayBriefing) return neoOperationDialogues.initialResult[0];
    if (lastChoiceDialogue) return lastChoiceDialogue;
    if (!method) return methodIntroDialogues[methodIntroStep % methodIntroDialogues.length];
    if (!topic) return getNeoTopicDialogue("");
    if (!hasBirthCoordinates) return pickNeoDialogue(neoOperationDialogues.birthCheck);
    if (!intensity) return getNeoIntensityDialogue("");
    if (!trimmedQuestion) return pickNeoDialogue(neoOperationDialogues.questionInput);
    return pickNeoDialogue(neoOperationDialogues.badge);
  }, [
    validationErrors.length,
    errorMessage,
    busy,
    previewOperationMap,
    method,
    methodIntroStep,
    operationStageIndex,
    displayRefinedOrder,
    displayBriefing,
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
  const activeHeroSpeakerLabel = activePrologueLine?.speakerLabel || "네오";
  const activeHeroSpeakerCode =
    activePrologueLine?.speaker === "customer"
      ? "CLIENT"
      : activePrologueLine?.speaker === "inner"
        ? "VOICE"
        : activePrologueLine?.speaker === "narration"
          ? "STORY"
          : "NEO";
  const activeHeroCharacter = activePrologueLine?.character || "humanNeo";
  const activeHeroCharacterAsset = activePrologueLine
    ? getNeoPrologueCharacterAsset(activeHeroCharacter)
    : NEO_INTRO_PORTRAIT;
  const activeHeroIsTransforming = activeHeroCharacter === "transformingNeo";
  const activeHeroUsesSheetCrop = activeHeroCharacter === "preTransformNeoTalk" || activeHeroIsTransforming;
  const activeHeroImageSizes = activeHeroCharacter === "preTransformNeoMain" || activeHeroCharacter === "preTransformNeoTalk"
    ? "(max-width: 768px) 46vw, 28vw"
    : activeHeroIsTransforming
      ? "(max-width: 768px) 76vw, 46vw"
      : "(max-width: 768px) 82vw, 42vw";
  const activeHeroImagePriority = activeHeroCharacter !== "preTransformNeoTalk" && !activeHeroIsTransforming;
  const transformProgress = activeHeroIsTransforming ? Math.round((transformFrame / NEO_TRANSFORM_FRAME_COUNT) * 100) : 0;
  const activeHeroCharacterStyle = {
    "--neo-vn-object-position": activeHeroUsesSheetCrop ? "center center" : "center bottom",
    "--neo-transform-progress": `${transformProgress}%`,
    ...getNeoPrologueSheetStyle(activePrologueLine, transformFrame),
  } as unknown as CSSProperties;
  const activeHeroFallbackSrc = activeHeroCharacter === "shadow"
    ? undefined
    : activeHeroCharacter === "preTransformNeoTalk" || activeHeroIsTransforming
      ? NEO_PROLOGUE_PRE_TRANSFORM_MAIN.src
      : neoWarRoomAssets.hero.fullbody.src;
  const activeHeroEffect = activePrologueLine?.effect || "none";
  const heroScenePhase = isPrologueActive ? "prologue" : "landing";
  const warRoomScene = showCommandDeck ? "command" : heroScenePhase;
  const heroActionLabel = activePrologueLine?.cta?.label || "작전실 입장하기";
  const heroActionMeta = activePrologueLine?.cta?.helperText || (hasSeenPrologue ? "Prologue Cleared" : "Operation Entry");
  const heroDialogueHint = activeHeroIsTransforming && transformFrame < NEO_TRANSFORM_FRAME_COUNT
    ? "변신 중"
    : isPrologueActive && isLastPrologueStep
      ? "입장 준비 완료"
      : "다음";
  const showHeroActionButton = !isPrologueActive || isLastPrologueStep;
  const showTopicSelect = Boolean(method);
  const showBirthInfo = Boolean(method && topic);
  const showIntensitySelect = Boolean(method && topic && hasBirthCoordinates);
  const showQuestionInput = Boolean(method && topic && hasBirthCoordinates && intensity);
  const showLaunchConfirm = Boolean(method && topic && hasBirthCoordinates && intensity && trimmedQuestion.length >= 8);
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
      const loadingAsset = neoWarRoomAssets.sprites.withBackground[operationStageIndex % neoWarRoomAssets.sprites.withBackground.length] || neoCommandSpriteMap.analyzing.asset;
      return {
        ...neoCommandSpriteMap.analyzing,
        asset: loadingAsset,
        sheetFrame: (operationStageIndex % 7) + 1,
      };
    }
    if (displayRefinedOrder) return neoCommandSpriteMap.result_complete;
    if (displayBriefing) return neoCommandSpriteMap.reality_check;
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
  const commandFlowSteps = [
    { id: "method", label: "분석 방식", done: Boolean(method), active: !method },
    { id: "topic", label: "상담 전선", done: Boolean(topic), active: Boolean(method) && !topic },
    { id: "birth", label: "좌표 확인", done: hasBirthCoordinates, active: Boolean(method && topic) && !hasBirthCoordinates },
    { id: "intensity", label: "팩폭 강도", done: Boolean(intensity), active: Boolean(method && topic && hasBirthCoordinates) && !intensity },
    { id: "question", label: "질문 입력", done: trimmedQuestion.length >= 8, active: Boolean(method && topic && hasBirthCoordinates && intensity) && trimmedQuestion.length < 8 },
    { id: "launch", label: "작전 개시", done: operationReady, active: Boolean(method && topic && hasBirthCoordinates && intensity && trimmedQuestion.length >= 8) },
  ];
  const bgmStatusLabel =
    bgmStatus === "playing"
      ? "ON"
      : bgmStatus === "blocked"
        ? "CLICK"
        : bgmStatus === "off"
          ? "OFF"
          : "READY";

  const backgroundStyle = {
    "--neo-bg-desktop": `url("${neoWarRoomAssets.backgrounds.desktop.src}")`,
    "--neo-bg-mobile": `url("${neoWarRoomAssets.backgrounds.mobile.src}")`,
    "--neo-prologue-bg": `url("${neoWarRoomAssets.backgrounds.strategyCity.src}")`,
  } as CSSProperties;
  const operationMapSpriteStyle = getNeoSheetCropStyle(
    operationMapSpriteFrame,
    NEO_PRE_TRANSFORM_SHEET_COLUMNS,
    NEO_PRE_TRANSFORM_SHEET_ROWS,
    NEO_PRE_TRANSFORM_SHEET_CELL_PX,
    NEO_PRE_TRANSFORM_FRAME_INSET_PX,
  ) as unknown as CSSProperties;

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
      shouldOpenPrologue = forceReplay;
    } catch {
      shouldOpenPrologue = false;
    }
    setEntryRevision(shouldOpenPrologue ? NEO_OPERATION_ROOM_ENTRY_REVISION : "");
    setHasEnteredWarRoom(shouldOpenPrologue);
    setHasCompletedPrologue(false);
    setPrologueStep(0);
    setTransformFrame(1);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (audio) audio.volume = NEO_WAR_ROOM_BGM_TRACK.volume;
    try {
      const savedPreference = window.localStorage.getItem(NEO_WAR_ROOM_BGM_STORAGE_KEY);
      if (savedPreference === "off") setBgmEnabled(false);
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
    if (!isPrologueActive || activePrologueLine?.character !== "transformingNeo") {
      setTransformFrame(1);
      return undefined;
    }
    if (prefersReducedMotion) {
      setTransformFrame(NEO_TRANSFORM_FRAME_COUNT);
      return undefined;
    }
    setTransformFrame(1);
    const timer = window.setInterval(() => {
      setTransformFrame((current) => {
        if (current >= NEO_TRANSFORM_FRAME_COUNT) {
          window.clearInterval(timer);
          return NEO_TRANSFORM_FRAME_COUNT;
        }
        return current + 1;
      });
    }, NEO_TRANSFORM_FRAME_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [activePrologueLine?.character, activePrologueLine?.id, isPrologueActive, prefersReducedMotion]);

  useEffect(() => {
    const text = activeCommandDialogue.text;
    if (!showCommandDeck) {
      setDisplayedCommandDialogue("");
      setIsCommandTyping(false);
      return undefined;
    }
    if (!text || prefersReducedMotion) {
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
  }, [activeCommandDialogue.text, prefersReducedMotion, showCommandDeck]);

  useEffect(() => {
    if (!methodIntroActive || prefersReducedMotion) return undefined;
    const timer = window.setInterval(() => {
      setMethodIntroStep((current) => (current + 1) % methodIntroDialogues.length);
    }, METHOD_INTRO_AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [methodIntroActive, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || hasActiveWarRoomEntry) return undefined;
    const timer = window.setInterval(() => {
      setIntroStep((current) => (current + 1) % neoLandingDialogues.length);
    }, NEO_MAIN_DIALOGUE_AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [hasActiveWarRoomEntry, prefersReducedMotion]);

  useEffect(() => {
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
      setOperationStageIndex((current) => (current + 1) % operationMapStages.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [flowPhase, previewOperationMap]);

  useEffect(() => {
    if (!showOperationMapActor || prefersReducedMotion) {
      setOperationMapSpriteFrame(NEO_OPERATION_LOADING_SPRITE_FRAMES[0]);
      return undefined;
    }
    let frameIndex = 0;
    const timer = window.setInterval(() => {
      frameIndex = (frameIndex + 1) % NEO_OPERATION_LOADING_SPRITE_FRAMES.length;
      setOperationMapSpriteFrame(NEO_OPERATION_LOADING_SPRITE_FRAMES[frameIndex] ?? NEO_OPERATION_LOADING_SPRITE_FRAMES[0]);
    }, NEO_OPERATION_LOADING_SPRITE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [prefersReducedMotion, showOperationMapActor]);

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
    setHasCompletedPrologue(hasSeenPrologue);
    setPrologueStep(0);
    setTransformFrame(1);
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
    setTransformFrame(1);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById("neo-operation-command-deck")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function advanceHeroDialogue() {
    if (isPrologueActive) {
      if (activeHeroIsTransforming && transformFrame < NEO_TRANSFORM_FRAME_COUNT) {
        setTransformFrame(NEO_TRANSFORM_FRAME_COUNT);
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
    setTransformFrame(1);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  function handleIntroKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    advanceHeroDialogue();
  }

  function completeWithSession(session: NeoSession) {
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

  async function startBriefing(idempotencyKey: string, payload: NeoWarRoomAccessPayload, access: Record<string, unknown>) {
    setFlowPhase("generating");
    setStatusMessage("운명의 작전 지도를 펼치는 중이다.");
    const { response, data } = await postJson<NeoSession | { ok?: false; reason?: string; message?: string }>(
      API_ENDPOINTS.start,
      { ...payload, ...access },
      idempotencyKey,
    );
    if (response.status === 202) {
      setFlowPhase("idle");
      setStatusMessage("이미 같은 작전이 생성 중이다. 잠시 후 다시 눌러 확인해라.");
      return;
    }
    if (data.ok && data.initialBriefing) {
      completeWithSession(data);
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
      const { response, data } = await postJson<NeoSession | { ok?: false; reason?: string; message?: string }>(
        API_ENDPOINTS.refine,
        {
          sessionId,
          selectedChecks: selectedRealityChecks,
          freeform: realityFreeform.trim(),
        },
        idempotencyKeyRef.current || sessionId,
      );
      if (data.ok && data.refinedOrder) {
        completeWithSession(data);
        setStatusMessage("수정 작전 명령서가 도착했다.");
        return;
      }
      if (response.status === 401) throw new Error("LOGIN_REQUIRED");
      throw new Error(toText((data as { reason?: string }).reason) || "SERVER_ERROR");
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
    const idempotencyKey =
      pendingAccess?.inputFingerprint === inputFingerprint
        ? pendingAccess.idempotencyKey
        : idempotencyKeyRef.current || createNeoWarRoomIdempotencyKey();
    idempotencyKeyRef.current = idempotencyKey;
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

    try {
      const { response, data } = await postJson<EnsureAccessResult>(API_ENDPOINTS.ensureAccess, payload, idempotencyKey);
      if (data.ok) {
        if (data.consultation?.initialBriefing) {
          completeWithSession(data.consultation);
          return;
        }
        await startBriefing(idempotencyKey, payload, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }
      if (data.reason === "LOGIN_REQUIRED" || response.status === 401) throw new Error("LOGIN_REQUIRED");
      if (data.reason === "INVALID_INPUT") throw new Error("INVALID_INPUT");
      if (data.reason !== "PAYMENT_REQUIRED") throw new Error(data.reason || "SERVER_ERROR");

      setFlowPhase("payment");
      setStatusMessage("작전실 이용권을 확인하는 중이다.");
      const paymentPayload = asRecord(data.paymentPayload);
      const runtimeGate = asRecord(paymentPayload.runtimeGate);
      const gateCoinPrice = toPositiveInteger(runtimeGate.coinPrice ?? runtimeGate.cost ?? paymentPayload.coinPrice ?? paymentPayload.cost);
      const gatePaymentAmount = toPositiveInteger(runtimeGate.paymentAmount ?? paymentPayload.paymentAmount ?? runtimeGate.totalAmount ?? paymentPayload.totalAmount);
      const gateAmountKRW = toPositiveInteger(runtimeGate.amountKRW ?? runtimeGate.amountKrw ?? paymentPayload.amountKRW ?? paymentPayload.amountKrw ?? gatePaymentAmount);
      const gateMembershipCreditCost = toPositiveInteger(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost);
      openPaidFeatureGate({
        featureKey: FEATURE_KEY,
        requestId: idempotencyKey,
        title: toText(runtimeGate.title || paymentPayload.title || FEATURE_TITLE),
        reason: toText(runtimeGate.reason || paymentPayload.reason || FEATURE_TITLE),
        cost: gateCoinPrice || undefined,
        status: "loadingProducts",
        paymentMode: "pass",
        message: "이용권, 월정석, 단건 결제 가능 상태를 확인하는 중이다.",
      });
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
        forceDeduct: true,
      });
      if (!gate.ok || !gate.data) {
        const code = toText(gate.error?.code || (gate.status === 401 ? "LOGIN_REQUIRED" : "PAYMENT_VERIFY_FAILED")).toUpperCase();
        throw new Error(code === "AUTH_REQUIRED" ? "LOGIN_REQUIRED" : "PAYMENT_VERIFY_FAILED");
      }
      await startBriefing(idempotencyKey, payload, extractPaymentContext(gate, idempotencyKey));
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
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
            <p className={styles.subtitle}>위로보다 진단, 감정보다 작전.</p>
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
            </div>
          </div>

          {activeHeroIsTransforming ? (
            <div className={styles.vnTransformHud} style={activeHeroCharacterStyle} aria-hidden="true">
              <span>변신 동기화</span>
              <strong>{String(transformFrame).padStart(2, "0")}/{NEO_TRANSFORM_FRAME_COUNT}</strong>
              <i />
            </div>
          ) : null}

          <div
            className={styles.vnDialogueBox}
            role="button"
            tabIndex={0}
            data-speaker={activePrologueLine?.speaker || "neo"}
            data-character={activeHeroCharacter}
            data-complete={isPrologueActive && isLastPrologueStep ? "true" : "false"}
            onClick={advanceHeroDialogue}
            onKeyDown={handleIntroKeyDown}
          >
            {activePrologueLine?.speaker === "inner" ? <NeoInnerVoiceAvatar className={styles.vnInnerVoiceAvatar} /> : null}
            <div className={styles.vnDialogueContent}>
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
              <p>{activeHeroDialogue}</p>
              {activePrologueLine?.cta ? (
                <small className={styles.vnCtaHelper}>{activePrologueLine.cta.helperText}</small>
              ) : null}
              <span className={styles.vnNextIndicator} aria-hidden="true">
                {heroDialogueHint}
              </span>
            </div>
          </div>

          <div className={styles.vnControlRow} data-phase={heroScenePhase}>
            {isPrologueActive ? (
              <button type="button" className={styles.vnGhostButton} onClick={revealCommandDeck}>
                스킵
              </button>
            ) : hasSeenPrologue ? (
              <button type="button" className={styles.vnGhostButton} onClick={replayPrologue}>
                프롤로그 다시보기
              </button>
            ) : null}

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
                  className={styles.ctaOrbitFrame}
                  imageClassName={styles.ctaOrbitImage}
                />
                <span className={styles.ctaButtonCopy}>
                  <strong>{heroActionLabel}</strong>
                  <em>{heroActionMeta}</em>
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </section>
      ) : null}

      {showOperationMap ? (
        <section
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
            <div className={styles.operationMapVisual} data-sprite={showOperationMapActor ? "true" : "false"} aria-hidden="true">
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
              {showOperationMapActor ? (
                <div className={styles.operationSheetActor}>
                  <NeoWarRoomAssetImage
                    asset={NEO_PROLOGUE_PRE_TRANSFORM_SHEET}
                    alt=""
                    sizes="(max-width: 768px) 140px, 210px"
                    className={styles.operationSheetFrame}
                    imageClassName={styles.operationSheetImage}
                    style={operationMapSpriteStyle}
                  />
                </div>
              ) : null}
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
          className={`${styles.lionSealFrame} ${styles.commandDeckLionDecor}`.trim()}
          imageClassName={styles.lionSealImage}
        />
        <section className={styles.commandConversation} aria-label="네오 작전 안내">
          <div className={styles.commandProgressRail}>
            {commandFlowSteps.map((step, index) => (
              <span key={step.id} data-active={step.active ? "true" : "false"} data-done={step.done ? "true" : "false"}>
                <em>{String(index + 1).padStart(2, "0")}</em>
                {step.label}
              </span>
            ))}
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
            <div className={styles.startRow}>
              <NeoWarRoomAssetImage
                asset={neoWarRoomAssets.decor.asset1}
                alt=""
                sizes="72px"
                className={styles.lionSealFrame}
                imageClassName={styles.lionSealImage}
              />
              <div className={styles.launchSummary}>
                <strong>사자 휘장 확인</strong>
                <span>{selectedMethod?.label} · {topic} · {selectedIntensity?.label}</span>
              </div>
              <button type="submit" className={styles.startButton} disabled={!canStart} aria-busy={busy}>
                <span className={styles.ctaButtonCopy}>
                  <strong>{busy ? "작전 지도 분석 중" : "사자 휘장으로 작전 개시"}</strong>
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
              <section className={styles.briefingPanel} aria-labelledby="neo-briefing-title">
                <NeoWarRoomAssetImage
                  asset={neoWarRoomAssets.decor.asset1}
                  alt=""
                  sizes="72px"
                  className={`${styles.lionSealFrame} ${styles.panelLionDecor}`.trim()}
                  imageClassName={styles.lionSealImage}
                />
                <div className={styles.briefingHeader}>
                  <span>1차 작전 브리핑</span>
                  <h2 id="neo-briefing-title">{displayBriefing.operationTitle || "무명 작전"}</h2>
                  {resultUrl ? <em>결과 보관 완료</em> : null}
                </div>
                {displayBriefing.neoOpening ? <p className={styles.neoOpening}>{displayBriefing.neoOpening}</p> : null}
                <div className={styles.briefingGrid}>
                  <article>
                    <strong>현재 운명의 전선</strong>
                    <p>{displayBriefingFrontline}</p>
                  </article>
                  <article>
                    <strong>{displayBriefingRepeatedChoice.title || "반복되는 선택"}</strong>
                    <p>{displayBriefingRepeatedChoice.description}</p>
                  </article>
                  <article>
                    <strong>{displayBriefing.originalStrategy?.title || "본래 너는 이렇게 움직여야 한다"}</strong>
                    <p>{displayBriefing.originalStrategy?.description}</p>
                    {displayBriefing.originalStrategy?.keyRules?.length ? (
                      <ul>
                        {displayBriefing.originalStrategy.keyRules.map((rule) => <li key={rule}>{rule}</li>)}
                      </ul>
                    ) : null}
                  </article>
                  <article>
                    <strong>{displayBriefingMisalignedFlow.title || "지금 흐름이 어긋난 자리"}</strong>
                    <p>{displayBriefingMisalignedFlow.description}</p>
                  </article>
                </div>
                {displayBriefing.methodEvidence?.length ? (
                  <div className={styles.evidenceList}>
                    {displayBriefing.methodEvidence.map((item) => (
                      <article key={`${item.method}-${item.label}`}>
                        <strong>{item.label}</strong>
                        <p>{item.summary}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
                {displayBriefing.bluntTruth ? (
                  <blockquote className={styles.bluntTruth}>{displayBriefing.bluntTruth}</blockquote>
                ) : null}
                {displayBriefing.forbiddenAction?.title || displayBriefing.forbiddenAction?.reason ? (
                  <div className={styles.refinedListBlock}>
                    <strong>{displayBriefing.forbiddenAction?.title || "오늘 금지 행동"}</strong>
                    <p>{displayBriefing.forbiddenAction?.reason}</p>
                  </div>
                ) : null}
                {displayBriefing.actionOrders?.length ? (
                  <div className={styles.refinedListBlock}>
                    <strong>바로 해야 할 작전</strong>
                    <ul>{displayBriefing.actionOrders.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                ) : null}
                {displayBriefing.sevenDayMission?.length ? (
                  <div className={styles.missionGrid}>
                    <strong>7일 작전</strong>
                    {displayBriefing.sevenDayMission.map((item) => (
                      <article key={`${item.day}-${item.mission}`}>
                        <span>DAY {item.day}</span>
                        <p>{item.mission}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
                {displayBriefing.thirtyDayStrategy?.length ? (
                  <div className={styles.refinedListBlock}>
                    <strong>30일 전략</strong>
                    <ul>{displayBriefing.thirtyDayStrategy.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                ) : null}
                {displayBriefing.realityCheckQuestions?.length ? (
                  <div className={styles.realityQuestions}>
                    <strong>현실 점검 질문</strong>
                    {displayBriefing.realityCheckQuestions.map((item) => (
                      <article key={item.question}>
                        <p>{item.question}</p>
                        <span>{item.whyItMatters}</span>
                      </article>
                    ))}
                  </div>
                ) : null}
                {displayBriefing.badge?.description ? (
                  <div className={styles.badgeAward}>
                    <NeoWarRoomAssetImage
                      asset={neoWarRoomAssets.badges.grades}
                      alt=""
                      sizes="86px"
                      className={styles.badgeAwardImage}
                      imageClassName={styles.badgeImage}
                    />
                    <p>{displayBriefing.badge.name ? `${displayBriefing.badge.name} · ${displayBriefing.badge.description}` : displayBriefing.badge.description}</p>
                  </div>
                ) : null}
                {displayBriefing.tsundereClosing || displayBriefing.nextStepPrompt ? (
                  <p className={styles.nextStepPrompt}>{displayBriefing.tsundereClosing || displayBriefing.nextStepPrompt}</p>
                ) : null}
              </section>
            ) : null}

            {showRealityPanel && displayBriefing ? (
              <section className={styles.realityCheckPanel} aria-labelledby="neo-reality-check-title">
                <NeoWarRoomAssetImage
                  asset={neoWarRoomAssets.decor.asset1}
                  alt=""
                  sizes="72px"
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
                    <p>{displayBriefing.originalStrategy?.description}</p>
                  </article>
                  <article>
                    <strong>{displayBriefingMisalignedFlow.title || "지금 흐름이 어긋난 자리"}</strong>
                    <p>{displayBriefingMisalignedFlow.description}</p>
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
                  className={`${styles.lionSealFrame} ${styles.panelLionDecor}`.trim()}
                  imageClassName={styles.lionSealImage}
                />
                <div className={styles.refinedOrderHeader}>
                  <span>2차 수정 작전 명령서</span>
                  <h2 id="neo-refined-order-title">{displayRefinedOrder.operationTitle || "수정 작전"}</h2>
                  {displayRefinedOrder.badge?.name ? <em>오늘의 사자 휘장 · {displayRefinedOrder.badge.name}</em> : null}
                </div>
                {displayRefinedOrder.neoReview ? <p className={styles.neoOpening}>{displayRefinedOrder.neoReview}</p> : null}
                <div className={styles.briefingGrid}>
                  <article>
                    <strong>{displayRefinedStuckPoint.title || "실제로 흔들리던 지점"}</strong>
                    <p>{displayRefinedStuckPoint.description}</p>
                  </article>
                  <article>
                    <strong>수정된 진단</strong>
                    <p>{displayRefinedOrder.updatedDiagnosis}</p>
                  </article>
                  <article>
                    <strong>{displayRefinedOrder.newLifeStrategy?.title || "새 인생 전략"}</strong>
                    <p>{displayRefinedOrder.newLifeStrategy?.description}</p>
                    {displayRefinedOrder.newLifeStrategy?.principles?.length ? (
                      <ul>
                        {displayRefinedOrder.newLifeStrategy.principles.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : null}
                  </article>
                  <article>
                    <strong>{displayRefinedOrder.forbiddenAction?.title || "오늘 금지 행동"}</strong>
                    <p>{displayRefinedOrder.forbiddenAction?.reason}</p>
                  </article>
                </div>
                {displayRefinedOrder.discardThis?.length ? (
                  <div className={styles.refinedListBlock}>
                    <strong>버려야 할 방식</strong>
                    <ul>{displayRefinedOrder.discardThis.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                ) : null}
                {displayRefinedOrder.sevenDayMission?.length ? (
                  <div className={styles.missionGrid}>
                    <strong>7일 작전</strong>
                    {displayRefinedOrder.sevenDayMission.map((item) => (
                      <article key={`${item.day}-${item.mission}`}>
                        <span>DAY {item.day}</span>
                        <p>{item.mission}</p>
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
                {displayRefinedOrder.badge?.description ? (
                  <div className={styles.badgeAward}>
                    <NeoWarRoomAssetImage
                      asset={neoWarRoomAssets.badges.grades}
                      alt=""
                      sizes="86px"
                      className={styles.badgeAwardImage}
                      imageClassName={styles.badgeImage}
                    />
                    <p>{displayRefinedOrder.badge.description}</p>
                  </div>
                ) : null}
                {displayRefinedOrder.tsundereClosing ? <blockquote className={styles.bluntTruth}>{displayRefinedOrder.tsundereClosing}</blockquote> : null}
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
