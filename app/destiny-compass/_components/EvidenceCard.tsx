"use client";
/**
 * 근거 카드 — "왜 이 결론인가"를 결론 바로 아래에 붙인다.
 *
 * 공용 AnalysisBasisPanel 을 쓰지 않는 이유 3가지:
 *  ① 그 컴포넌트는 서버 근거 계약(fetchAnalysisBasis 엔드포인트)을 요구한다.
 *  ② BasisItem 에는 ★평점 자리가 없다(요구사항의 핵심).
 *  ③ 배치가 "결과 상단 한 덩어리"인데 여기는 "각 결론 아래"다.
 * 대신 원용어 풀이는 공용 GlossaryTerm 을 그대로 재사용한다(재구현 금지).
 *
 * 🔴 stars 는 서버가 결정론으로 계산해 내려준다. 없으면 별을 아예 그리지 않는다(기본값 3 금지).
 * 🔴 term 이 없으면 용어 칩을 그리지 않는다 — 지어내지 않는다.
 */
import GlossaryTerm from "@/components/fortune/GlossaryTerm";
import { useDestinyCompassCopy } from "../_lib/copy";
import styles from "./map.module.css";

export interface EvidenceGround {
  evidenceId: string;
  label: string;
  detail?: string;
  system: string;
  systemLabel: string;
  stars?: number | null;
  /** 서버가 이 근거로부터 끌어낸 한 줄 설명(없으면 detail 을 쓴다) */
  grounding?: string;
}

function starsText(stars: number): string {
  const n = Math.max(0, Math.min(5, Math.round(stars)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export function EvidenceCard({ ground }: { ground: EvidenceGround }) {
  const copy = useDestinyCompassCopy();
  // grounding(서버가 이 근거에서 끌어낸 문장)이 있으면 그것을 본문에, 원 계산값(detail)은 용어 풀이에 둔다.
  // grounding 이 없으면 detail 을 본문으로 올리고 풀이는 비운다 — 같은 문장을 두 번 보여주지 않는다.
  const text = ground.grounding || ground.detail || "";
  const hint = ground.grounding ? ground.detail : undefined;
  const hasStars = typeof ground.stars === "number" && ground.stars > 0;

  return (
    <figure className={styles.evidenceCard}>
      <div className={styles.evidenceHead}>
        <span className={styles.evidenceChip}>{ground.systemLabel}</span>
        {hasStars && (
          <span
            className={styles.evidenceStars}
            role="img"
            aria-label={copy.evidenceStarsAriaLabelShort(ground.systemLabel, Math.round(ground.stars as number))}
          >
            <span aria-hidden="true">{starsText(ground.stars as number)}</span>
          </span>
        )}
        {ground.label && (
          <span className={styles.evidenceTerm}>
            <GlossaryTerm hint={hint}>{ground.label}</GlossaryTerm>
          </span>
        )}
      </div>
      {text && <figcaption className={styles.evidenceText}>{text}</figcaption>}
    </figure>
  );
}

/** 결론당 2장까지 펼쳐 두고, 나머지는 네이티브 details 로 접는다(키보드·스크린리더 무료). */
export function EvidenceList({ grounds }: { grounds: EvidenceGround[] }) {
  const copy = useDestinyCompassCopy();
  if (!grounds?.length) return null;
  const head = grounds.slice(0, 2);
  const rest = grounds.slice(2);
  return (
    <div className={styles.evidenceRow}>
      {head.map((g) => (
        <EvidenceCard key={g.evidenceId} ground={g} />
      ))}
      {rest.length > 0 && (
        <details className={styles.evidenceMore}>
          <summary>{copy.moreGroundsSummary(rest.length)}</summary>
          <div className={styles.evidenceRow}>
            {rest.map((g) => (
              <EvidenceCard key={g.evidenceId} ground={g} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
