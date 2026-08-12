"use client";

/**
 * 초융합 상담 대화의 표현 계층 — 오브·말풍선·아바타·진행 점.
 *
 * 상태나 통신을 모른다. 여기 있는 것은 "여섯 전문가가 차례로 말하는 대화"라는 형식뿐이고,
 * 생성 화면과 결과 화면(FusionResultThread)이 같은 형식을 공유하기 위해 분리했다.
 */

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { FUSION_CORE_ORB, FUSION_ORB_BY_KEY, type FusionSystemKey } from "./fusionOrbs";
import type { FusionVisualizationData } from "./FusionVisualization";
import styles from "./fusion-fortune.module.css";

export type Section = { title: string; content: string; keyPoints: string[] };
export type VerdictStance = "agree" | "conditional" | "caution";
export type FinalVerdict = {
  headline: string;
  confidence: number;
  systemVerdicts: { key: FusionSystemKey; label: string; stance: VerdictStance; note: string }[];
  rationale: string;
  doNow: string[];
  avoid: string[];
};
export type Result = Record<"sajuSection" | "ziweiSection" | "vedicSection" | "sukuyoSection" | "astrologySection" | "tarotSection" | "integratedReading", Section> & {
  title: string;
  openingMessage: string;
  executiveSummary: string;
  timingAndAction: { title: string; content: string; luckyActions: string[]; cautionPatterns: string[] };
  /** 서버가 항상 채워 보낸다(worker/lib/fusion-fortune-visual.js). 그래도 옛 저장본을 위해 관용한다. */
  visualization?: FusionVisualizationData;
  /** 여섯 체계를 각각 판정한 뒤 하나로 수렴시킨 마지막 답. 옛 저장본에는 없다. */
  finalVerdict?: FinalVerdict;
  closingMessage: string;
  shareText?: string;
};

export type FusionStageKey = "saju" | "ziwei" | "sukuyo" | "vedic" | "astrology" | "tarot" | "fusion";
export type FusionStageState = "pending" | "active" | "completed";

/** 입장 라벨은 화면에서만 쓰는 표기다 — 판정 자체는 서버가 한다. */
export const STANCE_LABEL: Record<VerdictStance, string> = {
  agree: "같은 방향",
  conditional: "조건부",
  caution: "속도 조절",
};
/** 입장별 색은 기존 판정 패널과 같은 값을 유지한다 — 색이 바뀌면 같은 판정이 다르게 읽힌다. */
export const STANCE_CLASS: Record<VerdictStance, string> = {
  agree: "bg-[rgba(134,220,184,0.18)] text-[#a8e8cb]",
  conditional: "bg-[rgba(232,213,163,0.18)] text-[#f0dda8]",
  caution: "bg-[rgba(244,190,209,0.18)] text-[#f6cadb]",
};

export const SECTION_KEYS = ["sajuSection", "ziweiSection", "vedicSection", "sukuyoSection", "astrologySection", "tarotSection", "integratedReading"] as const;
/** 섹션 순서와 같은 체계 키 — 결과 헤더에 그 체계의 오브를 띄운다. */
export const SECTION_SYSTEM_KEYS: (FusionSystemKey | "fusion")[] = ["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot", "fusion"];

/** `done` 은 완료된 단계가 대화에 남길 말이다 — 진행 중 문장을 그대로 두면 끝난 말풍선이 어색하다. */
export const FUSION_STAGES: { key: FusionStageKey; label: string; message: string; done: string }[] = [
  { key: "saju", label: "사주", message: "사주의 계절과 기질을 읽고 있어요.", done: "타고난 계절과 기질을 다 읽었어요." },
  { key: "ziwei", label: "자미두수", message: "자미두수의 주제 흐름을 연결하고 있어요.", done: "명반의 주제 흐름을 연결했어요." },
  { key: "sukuyo", label: "숙요", message: "숙요의 관계 리듬을 살피고 있어요.", done: "관계가 움직이는 리듬을 잡았어요." },
  { key: "vedic", label: "베다", message: "베다점의 시기 흐름을 살피고 있어요.", done: "다샤가 그리는 시기 흐름을 정리했어요." },
  { key: "astrology", label: "점성술", message: "점성술의 표현과 선택 패턴을 정리하고 있어요.", done: "표현과 선택의 패턴을 정리했어요." },
  { key: "tarot", label: "타로", message: "질문에 맞는 타로 스프레드를 연결하고 있어요.", done: "질문에 맞는 여섯 장을 펼쳤어요." },
  { key: "fusion", label: "Fusion", message: "모든 흐름을 하나의 읽기로 융합하고 있어요.", done: "여섯 흐름을 하나의 읽기로 묶었어요." },
];

export function initialStageStates(): Record<FusionStageKey, FusionStageState> {
  return FUSION_STAGES.reduce((states, stage) => ({ ...states, [stage.key]: "pending" }), {} as Record<FusionStageKey, FusionStageState>);
}

/**
 * 오브 tint(hex)에서 반투명 파생색을 만든다. Tailwind 임의값은 `var(--tint)` 에 알파를 씌우지
 * 못하므로, 링·베일에 쓸 색을 미리 계산해 CSS 변수로 함께 넘긴다.
 */
export function withAlpha(hex: string, alpha: number) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((char) => `${char}${char}`).join("") : raw;
  const value = Number.parseInt(full, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

export function tintVars(systemKey?: FusionSystemKey | "fusion") {
  const tint = (systemKey && systemKey !== "fusion" ? FUSION_ORB_BY_KEY[systemKey]?.tint : "") || "#e8d5a3";
  return { "--tint": tint, "--tint-ring": withAlpha(tint, 0.42), "--tint-veil": withAlpha(tint, 0.14) } as CSSProperties;
}

/**
 * 여섯 체계가 도는 융합 코어. 원본 오브 이미지를 쓰고 궤도는 CSS 로 돈다
 * (scripts/build-fusion-orb-assets.mjs 산출물).
 */
export function FusionOrb({ stageStates }: { stageStates?: Record<FusionStageKey, FusionStageState> }) {
  return (
    <div className={styles.orbStage}>
      <Image className={styles.orbCore} src={FUSION_CORE_ORB} alt="여섯 운세 체계가 하나로 모인 초융합 코어" width={512} height={512} priority />
      <div className={styles.orbRing} aria-hidden>
        {FUSION_STAGES.filter((stage) => stage.key !== "fusion").map((stage, index, all) => {
          const orb = FUSION_ORB_BY_KEY[stage.key as FusionSystemKey];
          const angle = (index / all.length) * 360;
          const state = stageStates?.[stage.key] || "pending";
          return (
            <span
              key={stage.key}
              className={styles.orbSatellite}
              data-state={state}
              style={{ "--angle": `${angle}deg`, "--tint": orb?.tint } as CSSProperties}
            >
              {orb?.image
                ? <Image src={orb.image} alt="" width={320} height={320} />
                : <em />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 대화의 화자 아바타. 오브 이미지를 그대로 쓰고, 이미지가 없는 타로만 CSS 구체로 대신한다.
 * 🔴 글리프 문자를 넣지 않는다 — ◇ 같은 기호는 폰트 폴백에 없으면 두부(□)로 깨진다
 * (fusion-fortune.module.css 의 .orbSatellite > em 주석과 같은 이유).
 */
export function ThreadAvatar({ systemKey, dimmed = false }: { systemKey?: FusionSystemKey | "fusion"; dimmed?: boolean }) {
  const orb = systemKey && systemKey !== "fusion" ? FUSION_ORB_BY_KEY[systemKey] : null;
  const core = !systemKey || systemKey === "fusion";
  return (
    <span
      aria-hidden
      style={tintVars(systemKey)}
      className={`relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#0d0a1c] ring-1 ring-[color:var(--tint-ring)] ${dimmed ? "opacity-40 grayscale" : "shadow-[0_0_20px_-7px_var(--tint)]"}`}
    >
      {core || orb?.image
        ? <Image src={core ? FUSION_CORE_ORB : (orb?.image as string)} alt="" width={320} height={320} className="size-full object-cover" />
        : <em className="size-[62%] rounded-full bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,0.82),transparent_42%),radial-gradient(circle_at_50%_50%,var(--tint-veil),rgba(12,8,30,0.96)_78%)] shadow-[inset_0_0_0_1px_var(--tint-ring)]" />}
    </span>
  );
}

/**
 * 대화 한 줄. 왼쪽 아바타 열은 고정폭이라 세로 실선(척추)이 아바타 중심을 지나간다 —
 * 카드 목록이 아니라 대화로 읽히게 만드는 건 그 실선이다.
 *
 * 🔴 `exporting` 은 PDF 캡처용이다. html2canvas 클론에서는 진입 애니메이션이 돌지 않아
 * `opacity-0` 이 그대로 캡처되고, 그러면 PDF 가 백지로 나온다. 캡처 중에는 애니메이션을 뺀다.
 */
export function ThreadRow({ systemKey, dimmed, index = 0, dataState, exporting = false, pdfSection = false, children, className = "" }: {
  systemKey?: FusionSystemKey | "fusion";
  dimmed?: boolean;
  index?: number;
  dataState?: FusionStageState;
  exporting?: boolean;
  pdfSection?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      data-state={dataState}
      {...(pdfSection ? { "data-fusion-pdf-section": "true" } : {})}
      className={`grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-x-3.5 ${exporting ? "" : "animate-fade-in-up opacity-0 motion-reduce:animate-none motion-reduce:opacity-100"} ${className}`}
      style={exporting ? undefined : { animationDelay: `${Math.min(index, 14) * 60}ms` }}
    >
      <ThreadAvatar systemKey={systemKey} dimmed={dimmed} />
      {children}
    </li>
  );
}

/** 아직 말하는 중이라는 신호. 진행률을 지어내지 않고 "쓰는 중"만 보여 준다. */
export function TypingDots() {
  return (
    <span aria-hidden className="inline-flex items-center gap-1 align-middle">
      {[0, 1, 2].map((dot) => (
        <i
          key={dot}
          className="size-1.5 animate-pulse rounded-full bg-[color:var(--tint)] motion-reduce:animate-none"
          style={{ animationDelay: `${dot * 180}ms`, animationDuration: "1.15s" }}
        />
      ))}
    </span>
  );
}

/**
 * 말풍선. 위쪽 헤어라인만 체계 색으로 물들여 화자를 구분한다(그림자 대신 글로우).
 *
 * 🔴 `exporting` 중에는 content-visibility 를 끈다. 화면 밖 콘텐츠를 건너뛰는 최적화라
 * html2canvas 클론에서 빈 상자로 남는다.
 */
export function ThreadBubble({ systemKey, tone = "plain", deferRender = false, exporting = false, className = "", children }: {
  systemKey?: FusionSystemKey | "fusion";
  tone?: "plain" | "gold";
  deferRender?: boolean;
  exporting?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={tintVars(systemKey)}
      className={`relative min-w-0 overflow-hidden rounded-[1.375rem] rounded-tl-md border px-5 py-4 sm:px-6 sm:py-5 ${
        tone === "gold"
          ? "border-[rgba(232,213,163,0.28)] bg-[linear-gradient(150deg,rgba(232,213,163,0.11),rgba(255,255,255,0.03))]"
          : "border-white/[0.09] bg-white/[0.035]"
      } ${deferRender && !exporting ? "[contain-intrinsic-size:420px] [content-visibility:auto]" : ""} ${className}`}
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--tint),transparent)] opacity-70" />
      {children}
    </div>
  );
}

/** 화자 이름표. 대화의 "누가 말하는가"를 한 줄로 못 박는다. */
export function ThreadSpeaker({ label, note }: { label: string; note?: ReactNode }) {
  return (
    <p className="m-0 mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-display text-[0.82rem] tracking-wide text-[color:var(--tint)]">
      {label}
      {note}
    </p>
  );
}
