"use client";
import { useEffect, useState } from "react";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";
import { getTarotCardByAnyId, buildImageCandidates } from "@/lib/tarot/tarot-cards.mjs";
import { getFusionExpertCopy } from "./_lib/expert-labels";
import { useFusionSharedCopy, type FusionSystemKeyLabel } from "./_lib/copy";
import styles from "./fusion-fortune.module.css";

export function useFusionExpertCopy() {
  const [locale, setLocale] = useState(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync); window.addEventListener("cd:locale-ready", sync);
    return () => { window.removeEventListener("languagechange", sync); window.removeEventListener("cd:locale-ready", sync); };
  }, []);
  return getFusionExpertCopy(locale);
}
export type FusionTarotCard = { cardId: string; name: string; orientation: string; positionKey: string; meaningSummary: string };
export type FusionEvidenceComparison = { domain: "timing" | "relationship" | "psychology" | "work"; period: string; systems: FusionSystemKeyLabel[]; preferredSystems: FusionSystemKeyLabel[]; positions: { system: FusionSystemKeyLabel; summary: string; evidenceKeys: string[] }[] };
export type FusionCrossCheck = { aligned: FusionEvidenceComparison[]; divergent: FusionEvidenceComparison[] };

export function ExpertEvidence({ cards, crossCheck, exporting }: { cards?: FusionTarotCard[]; crossCheck?: FusionCrossCheck; exporting: boolean }) {
  const copy = useFusionExpertCopy(); const shared = useFusionSharedCopy();
  const [revealed, setRevealed] = useState<string[]>([]);
  const cardSignature = cards?.map((card) => `${card.cardId}:${card.orientation}`).join("|");
  useEffect(() => setRevealed([]), [cardSignature]);
  return <>
    {cards?.length === 6 && <li data-fusion-pdf-section="true" className={styles.expertEvidence}>
      <h3>{copy.tarot}</h3><div className={styles.tarotGrid}>{cards.map((card) => {
        const registered = getTarotCardByAnyId(card.cardId);
        const src = registered ? buildImageCandidates(registered.code)[0] : undefined;
        const open = exporting || revealed.includes(card.cardId);
        const position = copy.positions[card.positionKey as keyof typeof copy.positions] || card.positionKey;
        return <div key={card.cardId}><button type="button" className={styles.tarotCard} aria-label={`${position}: ${open ? card.name : copy.reveal}`} aria-pressed={open} onClick={() => setRevealed((previous) => previous.includes(card.cardId) ? previous : [...previous, card.cardId])}>
          <span className={styles.tarotCardInner} data-revealed={open} aria-hidden="true">
            <span className={styles.tarotCardBack}>{copy.reveal}</span>
            <span className={styles.tarotCardFront}>{src && <img src={src} alt="" width={160} height={260} loading="lazy" decoding="async" style={{ transform: card.orientation === "reversed" ? "rotate(180deg)" : undefined }} />}</span>
          </span>
        </button><p>{position}</p>{open && <p>{card.name} · {card.orientation === "reversed" ? copy.reversed : copy.upright}</p>}</div>;
      })}</div>
    </li>}
    {crossCheck && <li data-fusion-pdf-section="true" className={styles.expertEvidence}><h3>{copy.cross}</h3>
      {(["aligned", "divergent"] as const).map((kind) => crossCheck[kind].length > 0 && <section key={kind}><h4>{copy[kind]}</h4>{crossCheck[kind].map((entry) => <div key={`${entry.domain}:${entry.period}`} className={styles.evidenceComparison}>
        <p><strong>{copy.domains[entry.domain]}</strong> · {entry.period === "current" ? copy.current : entry.period}</p>
        {entry.positions.map((position) => <p key={position.system}><a href={`#fusion-toc-${position.system}`}>{shared.systemLabels[position.system]}</a> — {position.summary}</p>)}
        <p>{copy.preferred}: {entry.preferredSystems.map((system) => shared.systemLabels[system]).join(" · ")}</p>
      </div>)}</section>)}
      {!crossCheck.aligned.length && !crossCheck.divergent.length && <p>{copy.noCross}</p>}
    </li>}
  </>;
}
