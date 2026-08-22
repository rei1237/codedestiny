"use client";

// 나크샤트라 영구 해금 리포트 2종의 공유 조각 — 명식 바 · 잠금 화면 · 섹션 카드.
// 두 엔진(worker/lib/nakshatra-lord-report.js · nakshatra-dasha-map.js)이 같은 섹션 스키마를
// 돌려주므로 렌더러도 하나로 둔다.

import Link from "next/link";
import styles from "./premium.module.css";
import type { NatalLabel } from "./use-premium-report";
import { useNakshatraCopy } from "../_lib/copy";

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
  const copy = useNakshatraCopy();
  return (
    <div className={styles.needBirth}>
      <p style={{ margin: 0 }}>
        {copy.needBirthLine1}
        <br />
        {copy.needBirthLine2}
      </p>
      <Link href="/nakshatra" className={styles.needBirthLink}>
        {copy.needBirthLinkText}
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
  const copy = useNakshatraCopy();
  return (
    <div className={styles.gate}>
      <p className={styles.gatePrice}>{priceLabel}</p>
      <p className={styles.gateNote}>{copy.unlockGateNote}</p>
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

/**
 * 성별 보강 — 동양 대운은 성별이 있어야 순행·역행이 정해진다.
 * 무료 폼도 resolve 응답도 성별을 싣지 않으므로, 프로필 카드에도 없으면 여기서 한 번 묻는다.
 */
export function GenderPrompt({
  onPick,
  busy,
  note,
}: {
  onPick: (gender: "male" | "female") => void;
  busy: boolean;
  /** 화면마다 시점이 다르다 — 결과를 이미 보는 중(다샤)과 결제 전(VVIP)의 문장이 같을 수 없다. */
  note?: string;
}) {
  const copy = useNakshatraCopy();
  return (
    <div className={styles.genderPrompt}>
      <p className={styles.genderTitle}>{copy.genderPromptTitle}</p>
      <p className={styles.genderNote}>{note || copy.genderPromptDefaultNote}</p>
      <div className={styles.genderRow}>
        <button type="button" className={styles.genderBtn} onClick={() => onPick("male")} disabled={busy}>
          {copy.genderMaleLabel}
        </button>
        <button type="button" className={styles.genderBtn} onClick={() => onPick("female")} disabled={busy}>
          {copy.genderFemaleLabel}
        </button>
      </div>
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
