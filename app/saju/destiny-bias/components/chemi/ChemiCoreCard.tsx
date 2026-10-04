"use client";

import { forwardRef, useCallback, useRef, useState, type PointerEvent } from "react";
import { useReducedMotion } from "framer-motion";
import type { ChemiReport } from "../../engine/chemiReportBridge";
import { typeSymbolSrc } from "./chemiAssets";
import { PHOTOCARD_THEMES, PhotocardBack, PhotocardFront, type PhotocardView } from "./PhotocardFace";
import styles from "../../photocard.module.css";

type Props = {
  report: ChemiReport;
  themeKey: string;
  photoUrl?: string | null;
  nickname?: string;
};

/** 리포트 → 카드 표시용 문자열. 날짜 입력값은 리포트에도 없으므로 여기로 올 수 없다. */
export function toPhotocardView(report: ChemiReport, options: { themeKey: string; nickname?: string }): PhotocardView {
  const { result, copy, vm } = report;
  const theme = PHOTOCARD_THEMES.find((item) => item.key === options.themeKey) || PHOTOCARD_THEMES[0];
  return {
    me: options.nickname?.trim() || "나",
    partnerName: result.partner.displayName,
    groupLabel: result.partner.groupLabel || "",
    typeName: result.chemiTypeNameKo,
    typeShort: result.chemiTypeShortKo,
    symbolSrc: typeSymbolSrc(result.chemiTypeId),
    oneLiner: copy.oneLiner,
    total: report.totalScore,
    grade: report.grade,
    gradeTitle: report.gradeTitle,
    edition: `${theme.label} EDITION`.toUpperCase(),
    aura: vm.auraType,
    keywords: (vm.moodKeywords || []).slice(0, 3),
    serial: report.serial,
    issuedAt: report.issuedAt,
    gauges: report.subScores,
    modeLabel: report.minorMode ? "우정·팀워크 모드" : "덕심 모드",
    themeKey: theme.key,
  };
}

const TILT_MAX = 11;

/** 결과 핵심 카드(홀로 포토카드). 마우스로 기울이고, 누르면 뒷면(세부 점수)으로 뒤집힌다. */
const ChemiCoreCard = forwardRef<HTMLDivElement, Props>(function ChemiCoreCard({ report, themeKey, photoUrl, nickname }, ref) {
  const reduceMotion = useReducedMotion();
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [tilting, setTilting] = useState(false);
  const view = toPhotocardView(report, { themeKey, nickname });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      sceneRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || event.pointerType !== "mouse") return;
    const node = sceneRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    node.style.setProperty("--ry", `${((x - 0.5) * 2 * TILT_MAX).toFixed(2)}deg`);
    node.style.setProperty("--rx", `${((0.5 - y) * 2 * TILT_MAX).toFixed(2)}deg`);
    node.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    node.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    if (!tilting) setTilting(true);
  };

  const onPointerLeave = () => {
    const node = sceneRef.current;
    if (node) for (const name of ["--rx", "--ry", "--mx", "--my"]) node.style.removeProperty(name);
    setTilting(false);
  };

  return (
    <>
      <div
        ref={setRefs}
        className={styles.pcScene}
        data-flipped={flipped}
        data-tilting={tilting}
        tabIndex={-1}
        aria-live="polite"
        aria-atomic="true"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <div className={styles.pcInner} onClick={() => setFlipped((value) => !value)}>
          <PhotocardFront view={view} photoUrl={photoUrl} hidden={flipped} />
          <PhotocardBack view={view} hidden={!flipped} />
        </div>
      </div>
      <div className={styles.pcFlip}>
        <button type="button" className={styles.pcFlipButton} aria-pressed={flipped} onClick={() => setFlipped((value) => !value)}>
          {flipped ? "FRONT · 앞면 보기" : "FLIP · 세부 점수 보기"}
        </button>
      </div>
    </>
  );
});

export default ChemiCoreCard;
