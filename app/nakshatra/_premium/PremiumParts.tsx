"use client";

// 나크샤트라 영구 해금 리포트 2종의 공유 조각 — 명식 바 · 잠금 화면 · 섹션 카드.
// 두 엔진(worker/lib/nakshatra-lord-report.js · nakshatra-dasha-map.js)이 같은 섹션 스키마를
// 돌려주므로 렌더러도 하나로 둔다.

import Link from "next/link";
import styles from "./premium.module.css";
import type { NatalLabel } from "./use-premium-report";

export interface ReportSection {
  id: string;
  title: string;
  icon: string;
  keyInsight: string;
  paragraphs: string[];
  bullets?: { label: string; text: string }[];
}

export function NatalBar({ natal, meta }: { natal: NatalLabel | null; meta?: string }) {
  if (!natal || (!natal.nakshatraKo && !natal.sukuyoKo)) return null;
  return (
    <div className={styles.natal}>
      {natal.sukuyoKo && (
        <span className={styles.natalEast}>
          ☯ {natal.sukuyoKo}
          {natal.sukuyoHan ? `(${natal.sukuyoHan})` : ""}
        </span>
      )}
      {natal.nakshatraKo && <span className={styles.natalIndia}>🕉 {natal.nakshatraKo}</span>}
      {meta && <span className={styles.natalMeta}>{meta}</span>}
    </div>
  );
}

export function NeedBirth() {
  return (
    <div className={styles.needBirth}>
      <p style={{ margin: 0 }}>
        리포트를 열려면 먼저 별자리를 계산해야 해요.
        <br />
        생년월일과 태어난 시각을 넣으면 바로 이어집니다.
      </p>
      <Link href="/nakshatra" className={styles.needBirthLink}>
        별자리 계산하러 가기 →
      </Link>
    </div>
  );
}

export function UnlockGate({
  priceLabel,
  bullets,
  onUnlock,
  disabled,
  buttonLabel,
}: {
  priceLabel: string;
  bullets: string[];
  onUnlock: () => void;
  disabled: boolean;
  buttonLabel: string;
}) {
  return (
    <div className={styles.gate}>
      <p className={styles.gatePrice}>{priceLabel}</p>
      <p className={styles.gateNote}>한 번 열면 계속 다시 볼 수 있어요. 이용권이 있으면 무료로 열립니다.</p>
      <ul className={styles.bullets}>
        {bullets.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <button type="button" className={styles.cta} onClick={onUnlock} disabled={disabled}>
        {buttonLabel}
      </button>
    </div>
  );
}

export function SectionCards({ sections }: { sections: ReportSection[] }) {
  return (
    <>
      {sections.map((section, index) => (
        <details key={section.id} className={styles.card} open={index < 2}>
          <summary className={styles.summary}>
            <span className={styles.icon} aria-hidden="true">
              {section.icon}
            </span>
            <span className={styles.summaryText}>
              <span className={styles.cardTitle}>{section.title}</span>
              {section.keyInsight && <span className={styles.keyInsight}>{section.keyInsight}</span>}
            </span>
          </summary>
          <div className={styles.body}>
            {section.paragraphs.map((paragraph, position) => (
              <p key={`${section.id}-${position}`}>{paragraph}</p>
            ))}
            {section.bullets && section.bullets.length > 0 && (
              <ul className={styles.practice}>
                {section.bullets.map((bullet) => (
                  <li key={bullet.label}>
                    <span className={styles.practiceLabel}>{bullet.label}</span>
                    <span>{bullet.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      ))}
    </>
  );
}

export function CrossSell({ href, title, text, cta }: { href: string; title: string; text: string; cta: string }) {
  return (
    <aside className={styles.crossSell}>
      <p className={styles.crossTitle}>{title}</p>
      <p className={styles.crossText}>{text}</p>
      <Link href={href} className={styles.crossLink}>
        {cta} →
      </Link>
    </aside>
  );
}
