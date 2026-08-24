"use client";

import type { AnalysisBasis, BasisGroup, BasisItem } from "@/lib/fortune/analysis-basis";
import GlossaryTerm from "./GlossaryTerm";
import styles from "./analysis-basis.module.css";
import { currentFortuneSharedCopy } from "./_lib/fortune-shared-copy";

const COPY = currentFortuneSharedCopy();

interface AnalysisBasisPanelProps {
  basis: AnalysisBasis | null;
  /** 패널 제목. 기본값은 결과 화면의 ① 자리에 맞춘 문구. */
  title?: string;
  /** 제목 옆 보조 문구. 빈 문자열을 주면 감춘다. */
  note?: string;
  /** 표면색·글자색을 입히는 caller 클래스. 색은 전부 여기서 내려온 currentColor로 파생된다. */
  className?: string;
  /** 넓은 화면에서 2열로 펼칠지. 사이드바처럼 좁은 자리에서는 false. */
  multiColumn?: boolean;
}

/**
 * ① 분석 데이터 — 서버가 확정한 계산값을 그대로 보여 준다.
 * LLM은 이 패널을 만들지 않는다. 여기 없는 수치가 본문에 나오면 그건 근거 없는 문장이라는 뜻이다.
 */
export default function AnalysisBasisPanel({
  basis,
  title = COPY.basisTitle,
  note = COPY.basisNote,
  className = "",
  multiColumn = true,
}: AnalysisBasisPanelProps) {
  const groups = basis?.groups || [];
  if (!groups.length) return null;

  return (
    <section className={`${styles.panel} ${className}`.trim()} aria-label={title}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>{title}</h2>
        {note && <p className={styles.panelNote}>{note}</p>}
      </div>
      <div className={styles.groups} data-columns={multiColumn ? "multi" : "single"}>
        {groups.map((group) => (
          <BasisGroupCard key={group.key} group={group} />
        ))}
      </div>
    </section>
  );
}

function BasisGroupCard({ group }: { group: BasisGroup }) {
  return (
    <div className={styles.group}>
      <h3 className={styles.groupTitle}>{group.title}</h3>
      {group.hint && <p className={styles.groupHint}>{group.hint}</p>}
      <dl className={styles.items}>
        {group.items.map((item, index) => (
          <BasisItemRow key={`${group.key}-${item.label}-${index}`} item={item} />
        ))}
      </dl>
    </div>
  );
}

export function BasisItemRow({ item }: { item: BasisItem }) {
  return (
    <div className={styles.item} data-tone={item.tone || "neutral"}>
      <dt className={styles.itemLabel}>
        <GlossaryTerm hint={item.termHint} detail={item.termDetail}>
          {item.label}
        </GlossaryTerm>
      </dt>
      <dd className={styles.itemValue}>{item.value}</dd>
    </div>
  );
}
