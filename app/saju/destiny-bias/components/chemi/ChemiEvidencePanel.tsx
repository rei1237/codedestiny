"use client";

import type { ChemiPillars, ChemiResult, ElementKey } from "@/lib/idol-chemi";
import styles from "../../destiny-bias.module.css";

const ELEMENT_KO: Record<ElementKey, string> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
const TONE_KO = { harmony: "조화", friction: "마찰", neutral: "중립" } as const;

function PillarTable({ label, pillars }: { label: string; pillars: ChemiPillars }) {
  return (
    <table className={styles.pillarTable}>
      <caption>{label}</caption>
      <thead>
        <tr>
          <th scope="col">연주</th>
          <th scope="col">월주</th>
          <th scope="col">일주</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          {(["year", "month", "day"] as const).map((k) => (
            <td key={k}>
              <strong>{pillars[k].ganji}</strong>
              <small>{pillars[k].ganjiHanja}</small>
            </td>
          ))}
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3}>
            오행 {(["wood", "fire", "earth", "metal", "water"] as ElementKey[]).map((e) => `${ELEMENT_KO[e]}${pillars.elementCounts[e]}`).join(" · ")} · 가장 많음 {ELEMENT_KO[pillars.strongest]} · 가장 적음 {ELEMENT_KO[pillars.weakest]}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

type Props = {
  result: ChemiResult;
};

/** 「근거 펼쳐보기」: 양쪽 명식표(연·월·일주)와 신호 목록. 생년월일은 표시하지 않는다. */
export default function ChemiEvidencePanel({ result }: Props) {
  const matched = new Set(result.matchedSignalKeys);
  return (
    <details className={styles.evidence}>
      <summary className={styles.evidenceSummary}>근거 펼쳐보기</summary>
      <div className={styles.evidenceBody}>
        <p className={styles.helpText}>
          유형 규칙: {result.chemiTypeRuleKo}. 시주(時柱)는 양쪽 모두 제외했어요.
        </p>
        <div className={styles.pillarGrid}>
          <PillarTable label="나" pillars={result.pillars.user} />
          <PillarTable label={result.partner.displayName} pillars={result.pillars.partner} />
        </div>
        <ul className={styles.signalList} aria-label="신호 목록">
          {result.signals.map((s) => (
            <li key={s.key} className={styles.signalItem} data-tone={s.tone} data-matched={matched.has(s.key) ? "true" : "false"}>
              <span className={styles.signalTone}>{TONE_KO[s.tone]}</span>
              <span className={styles.signalEvidence}>{s.evidenceKo}</span>
              {matched.has(s.key) ? <span className={styles.signalMatched}>유형 판정</span> : null}
            </li>
          ))}
        </ul>
        <p className={styles.versionLine}>
          엔진 {result.engineVersion} · 규칙 {result.rulesVersion} · 로스터 {result.rosterVersion} · 입력 해시 {result.inputHash}
        </p>
      </div>
    </details>
  );
}
