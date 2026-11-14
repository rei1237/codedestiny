"use client";

// 유료 상담 생성 대기 화면(공용).
//
// 🔴 가짜 퍼센트를 만들지 않는다. 막대는 서버가 돌려준 실제 완성 수(completed/total)가 있을
//    때만 그 비율로 칠하고 "N / M" 을 말한다. 실제 수가 없으면 끝을 모르는 막대(흐르는 빛)만
//    보여 준다. 시간으로 숫자를 키우거나, 천천히 다가가는 숫자를 만들지 않는다.
// 🔴 화면 읽기 프로그램에는 상태 문장과 완성 수가 바뀔 때만 알린다. 1초마다 바뀌는 경과
//    시간은 알림 영역 밖에 둔다. 알림 영역의 조상에 aria-busy 를 걸지 않는다 — 걸면 알림이
//    끝날 때까지 미뤄진다.
// 🔴 "보통 N~M분" 은 실측·서버 계약 근거가 있는 상품만 넘긴다. 근거가 없으면 넘기지 않는다.
// 🔴 떠나도 안전하다는 안내(LEAVE_SAFE_NOTICE)는 상품마다 사실 확인 뒤에 쓴다. 클라이언트
//    이어쓰기와 worker/lib/consultation-recovery-task.js 크론이 둘 다 그 상품을 덮을 때만 맞다.
//    한쪽이라도 아니면 호출하는 쪽이 사실에 맞는 문장을 넘기거나 null 로 숨긴다.
//    시간 약속("N분 안에")은 쓰지 않는다.
// 🔴 상담사 그림은 이미 있는 에셋만 쓴다. 호출하는 쪽이 그 상품의 마스터 초상을 넘긴다.
// 🔴 움직임은 CSS 로만, prefers-reduced-motion 이면 멈춘다. 색은 --cd-* 토큰을 --gp-* 로
//    옮겨 쓰고 새 색값을 만들지 않는다. 연이(분홍)·네오(달빛)는 페이지 모드와 상관없이 고정이다.

import type { CSSProperties } from "react";
import { formatElapsed, useElapsed } from "./useElapsed";
import styles from "./GenerationProgress.module.css";

export { formatElapsed } from "./useElapsed";

/** 떠나도 안전하다는 안내 원문. 바꾸려면 상품마다 사실 확인을 다시 한다. */
export const LEAVE_SAFE_NOTICE =
  "화면을 닫아도 결제한 상담은 사라지지 않아요. 다시 열면 이어서 쓰고, 오래 비워 두면 서버가 마저 완성해 기록함에 저장해요.";

export type GenerationStepState = "done" | "current" | "pending";

export type GenerationStep = {
  key?: string;
  label: string;
  state: GenerationStepState;
};

export type GenerationCount = { completed: number; total: number };

/**
 * 실제 완성 수가 있을 때만 막대를 채운다.
 * total 이 0 보다 큰 유한수이고 completed 가 0 이상의 유한수일 때만 값을 돌려준다.
 * completed 는 0~total 사이로 자른다(서버가 total 보다 큰 수를 줘도 막대가 넘치지 않게).
 */
export function resolveGenerationCount(completed?: number | null, total?: number | null): GenerationCount | null {
  if (typeof total !== "number" || !Number.isFinite(total) || total <= 0) return null;
  if (typeof completed !== "number" || !Number.isFinite(completed) || completed < 0) return null;
  const whole = Math.floor(total);
  if (whole <= 0) return null;
  return { completed: Math.min(whole, Math.floor(completed)), total: whole };
}

const DEFAULT_STEP_STATE_LABELS: Record<GenerationStepState, string> = {
  done: "완료",
  current: "진행 중",
  pending: "대기",
};

export type GenerationProgressProps = {
  /** 화면 제목. */
  title: string;
  /** 지금 상태 한 문장. 바뀔 때 화면 읽기 프로그램에 알린다. */
  status: string;
  /** 제목 아래 설명(선택). */
  description?: string;
  /** 서버가 돌려준 실제 완성 수. total 과 함께 있을 때만 막대를 채운다. */
  completed?: number | null;
  total?: number | null;
  /** "2 / 7 완성" 의 "완성". 비우면 숫자만. */
  countUnit?: string;
  /** 단계 목록(선택). 상태는 호출하는 쪽이 사실대로 칠한다. */
  steps?: GenerationStep[];
  stepStateLabels?: Partial<Record<GenerationStepState, string>>;
  /** true 인 동안 경과 시간을 센다. false 면 경과 시간을 숨긴다. */
  timing?: boolean;
  elapsedLabel?: string;
  /** "보통 1~2분". 근거가 없으면 넘기지 않는다. */
  typicalRange?: string;
  /** 떠나도 안전하다는 안내. 기본은 LEAVE_SAFE_NOTICE, null 이면 숨긴다. */
  leaveNotice?: string | null;
  /** 막대의 접근성 이름. */
  progressLabel?: string;
  persona?: "yeoni" | "neo";
  /** 상담사 그림(장식). 이미 있는 에셋만. */
  counselor?: { src: string; srcSet?: string };
  className?: string;
};

export default function GenerationProgress({
  title,
  status,
  description,
  completed,
  total,
  countUnit,
  steps,
  stepStateLabels,
  timing = false,
  elapsedLabel = "경과",
  typicalRange,
  leaveNotice = LEAVE_SAFE_NOTICE,
  progressLabel,
  persona = "yeoni",
  counselor,
  className,
}: GenerationProgressProps) {
  const elapsed = useElapsed(timing);
  const count = resolveGenerationCount(completed, total);
  const countText = count
    ? `${count.completed} / ${count.total}${countUnit ? ` ${countUnit}` : ""}`
    : "";
  const stateLabels = { ...DEFAULT_STEP_STATE_LABELS, ...stepStateLabels };
  const ratioStyle = count
    ? ({ ["--gp-ratio" as string]: String(count.completed / count.total) } as CSSProperties)
    : undefined;
  const rootClass = [styles.root, className].filter(Boolean).join(" ");

  return (
    <section className={rootClass} data-persona={persona} data-gp-mode={count ? "determinate" : "indeterminate"}>
      {counselor ? (
        <div className={styles.scene} aria-hidden="true">
          <span className={styles.halo} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.counselor}
            src={counselor.src}
            srcSet={counselor.srcSet}
            sizes="(max-width: 640px) 88px, 112px"
            alt=""
            width={600}
            height={720}
            decoding="async"
          />
        </div>
      ) : null}

      <div className={styles.body}>
        <h2 className={styles.title}>{title}</h2>
        {description ? <p className={styles.description}>{description}</p> : null}

        <div className={styles.live} aria-live="polite" aria-atomic="true" data-gp-live="">
          <p className={styles.status}>{status}</p>
          {count ? <p className={styles.count}>{countText}</p> : null}
        </div>

        {count ? (
          <div
            className={styles.track}
            role="progressbar"
            aria-label={progressLabel}
            aria-valuemin={0}
            aria-valuemax={count.total}
            aria-valuenow={count.completed}
            aria-valuetext={countText}
            style={ratioStyle}
          >
            <span className={styles.fill} />
          </div>
        ) : (
          <div className={`${styles.track} ${styles.indeterminate}`} aria-hidden="true">
            <span className={styles.sweep} />
          </div>
        )}

        {timing || typicalRange ? (
          <p className={styles.meta}>
            {timing ? (
              <span className={styles.elapsed}>
                {elapsedLabel} <time dateTime={`PT${Math.floor(elapsed / 1000)}S`}>{formatElapsed(elapsed)}</time>
              </span>
            ) : null}
            {typicalRange ? <span className={styles.typical}>{typicalRange}</span> : null}
          </p>
        ) : null}

        {steps && steps.length > 0 ? (
          <ol className={styles.steps}>
            {steps.map((step, index) => (
              <li
                key={step.key ?? `${index}-${step.label}`}
                className={styles.step}
                data-state={step.state}
                aria-current={step.state === "current" ? "step" : undefined}
              >
                <span className={styles.marker} aria-hidden="true" />
                <span className={styles.stepLabel}>{step.label}</span>
                <span className={styles.srOnly}>{stateLabels[step.state]}</span>
              </li>
            ))}
          </ol>
        ) : null}

        {leaveNotice ? <p className={styles.leave}>{leaveNotice}</p> : null}
      </div>
    </section>
  );
}
