"use client";

/**
 * 프리미엄 상품 카드 — 개인 리딩 / 궁합 리딩 두 SKU 를 나란히 세운다.
 *
 * 이 기능은 가격이 두 개다. 첫 화면에 한쪽 금액만 크게 박으면 다른 쪽 사용자에게
 * 거짓 가격이 되므로 두 상품을 함께 보여 준다.
 *
 * 🔴 금액은 PriceBadge(서버 조회)로만 그린다 — 리터럴을 박으면 가격이 바뀌는 순간
 *    화면이 거짓말을 한다. 여기서는 .priceDisplay 로 크게 렌더할 뿐이다.
 */

import { Check } from "lucide-react";
import { PriceBadge } from "@/app/components/PriceBadge";
import { CODEX_PLAN_BENEFITS } from "../data/premium";
import {
  MASTER_LOVE_CODEX_TOTAL_CHAPTERS,
  masterLoveCodexBilling,
  type MasterLoveCodexMode,
} from "../constants";
import { useMasterLoveCodexCopy, useMasterLoveCodexLocale } from "../_lib/copy";
import { useCodexContentCopy } from "../_lib/contentCopy";
import styles from "../styles/codex.module.css";

interface CodexPremiumCardProps {
  mode: MasterLoveCodexMode;
  /** 추천 배지 + 강조 테두리 */
  featured?: boolean;
  onSelect: (mode: MasterLoveCodexMode) => void;
}

export default function CodexPremiumCard({ mode, featured = false, onSelect }: CodexPremiumCardProps) {
  const locale = useMasterLoveCodexLocale();
  const codexCopy = useMasterLoveCodexCopy();
  const billing = masterLoveCodexBilling(mode, locale);
  const headline = mode === "compat"
    ? { eyebrow: codexCopy.compatEyebrow, title: codexCopy.compatTitle, note: codexCopy.compatNote }
    : { eyebrow: codexCopy.personalEyebrow, title: codexCopy.personalTitle, note: codexCopy.personalNote };
  const benefits = useCodexContentCopy("planBenefits", CODEX_PLAN_BENEFITS)[mode];

  return (
    <article className={`${styles.premiumCard} ${featured ? styles.premiumCardFeatured : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <p
          className={`${styles.numeral} text-[0.6875rem]`}
          style={{ letterSpacing: "0.24em", color: "var(--codex-gold-dim)" }}
        >
          {headline.eyebrow}
        </p>
        {featured ? (
          <span
            className={`${styles.numeral} shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem]`}
            style={{
              letterSpacing: "0.14em",
              color: "var(--codex-ink)",
              background: "var(--codex-gold)",
            }}
          >
            {codexCopy.recommendedBadge}
          </span>
        ) : null}
      </div>

      <h3 className={`${styles.chapterTitle} mt-4`} style={{ fontSize: "clamp(1.375rem, 4.5vw, 1.75rem)" }}>
        {headline.title}
      </h3>
      <p className="mt-2 leading-7" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-silver)" }}>
        {headline.note}
      </p>

      <div className="mt-7">
        <PriceBadge
          featureKey={billing.featureKey}
          fallbackCoins={billing.cost}
          className={styles.priceDisplay}
        />
        <p className="mt-3 leading-7" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-silver)" }}>
          {codexCopy.paymentDisclosure}
        </p>
      </div>

      <hr className={`${styles.rule} mt-7`} />

      <ul className="mt-7 space-y-3.5">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex gap-3">
            <Check className="mt-1 h-4 w-4 shrink-0" style={{ color: "var(--codex-gold)" }} aria-hidden="true" />
            <span className="leading-7" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text)" }}>
              {benefit}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-9 flex flex-col items-start gap-3">
        <button type="button" onClick={() => onSelect(mode)} className={`${styles.cta} w-full`}>
          <PriceBadge featureKey={billing.featureKey} fallbackCoins={billing.cost} className="font-bold" />
          <span aria-hidden="true">·</span>
          {codexCopy.startConsultButton}
        </button>
        <p className={`${styles.numeral} text-[0.75rem]`} style={{ letterSpacing: "0.14em", color: "var(--codex-gold-dim)" }}>
          {codexCopy.chaptersActsSuffix(MASTER_LOVE_CODEX_TOTAL_CHAPTERS)}
        </p>
      </div>
    </article>
  );
}
