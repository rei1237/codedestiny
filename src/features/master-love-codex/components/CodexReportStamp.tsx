"use client";

/**
 * 리포트 등급 표식 — 표지와 마무리 카드가 공유한다.
 *
 * 🔴 금액은 accessType 으로 갈라 준다. 이용권·월정석으로 무료 통과한 사용자에게 정가를
 *    띄우면 결제하지 않은 금액을 청구받은 것처럼 보인다(판정 정본: data/premium.ts).
 * 🔴 PDF: 이 컴포넌트는 캡처 대상 안에 들어간다 — box-shadow·backdrop-filter 는
 *    html2canvas 에 렌더되지 않으므로 가독성을 테두리와 텍스트 색으로만 만든다.
 */

import { PriceBadge } from "@/app/components/PriceBadge";
import { codexAccessLabel } from "../data/premium";
import { masterLoveCodexBilling, type MasterLoveCodexMode } from "../constants";
import { useMasterLoveCodexCopy, useMasterLoveCodexLocale } from "../_lib/copy";
import styles from "../styles/codex.module.css";

interface CodexReportStampProps {
  mode: MasterLoveCodexMode;
  accessType: string;
  className?: string;
}

export default function CodexReportStamp({ mode, accessType, className = "" }: CodexReportStampProps) {
  const locale = useMasterLoveCodexLocale();
  const copy = useMasterLoveCodexCopy();
  const billing = masterLoveCodexBilling(mode, locale);
  const { showPrice, note: accessNote } = codexAccessLabel(accessType);
  const note = accessNote === "이용권 포함" ? copy.passIncludedNote
    : accessNote === "월정석 사용" ? copy.monthlyCreditUsedNote
    : accessNote;

  return (
    <p className={`${styles.badge} ${className}`}>
      {mode === "compat" ? copy.reportStampCompat : copy.reportStampSolo}
      {showPrice ? (
        <>
          <span aria-hidden="true">·</span>
          <PriceBadge featureKey={billing.featureKey} fallbackCoins={billing.cost} className="font-bold" />
        </>
      ) : null}
      {note ? (
        <>
          <span aria-hidden="true">·</span>
          {note}
        </>
      ) : null}
    </p>
  );
}
