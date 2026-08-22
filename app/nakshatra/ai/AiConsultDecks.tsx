"use client";

import AiResultProse from "@/components/fortune/AiResultProse";
import { useNakshatraCopy } from "../_lib/copy";
import styles from "./consult-decks.module.css";

export interface DeckSection {
  id: string;
  title: string;
  /** 한 줄 핵심 결론 — 아코디언이 접혀 있어도 항상 노출된다. 구버전(11섹션) 문서에는 없다. */
  keyInsight?: string;
  body: string;
}

export interface Decks {
  sukuyo: DeckSection[];
  vedic: DeckSection[];
  /** 융합 해석 — 두 대가의 결과를 실제로 대조한 덱. 구버전 문서에는 없어 옵셔널이다. */
  fusion?: DeckSection[];
}

export interface NatalIdentity {
  sukuyoKo?: string;
  sukuyoHan?: string;
  nakshatraKo?: string;
  nakshatraEn?: string;
}

export interface TopInsight {
  title: string;
  detail?: string;
}

interface AiConsultDecksProps {
  decks: Decks;
  natal: NatalIdentity | null;
  question?: string;
  topInsights?: TopInsight[];
  totalChars?: number;
}

/** 섹션 하나 = 접히는 아코디언. 첫 항목만 펼친 채 시작해 장문의 진입 장벽을 낮춘다. */
function SectionItem({ section, index, variant }: { section: DeckSection; index: number; variant: "column" | "card" }) {
  return (
    <details className={variant === "card" ? styles.itemCard : styles.item} open={index === 0}>
      <summary className={styles.head}>
        <span className={styles.headText}>
          <span className={styles.headTitle}>{section.title}</span>
          {section.keyInsight ? <span className={styles.headInsight}>{section.keyInsight}</span> : null}
        </span>
        <span className={styles.chevron} aria-hidden="true">▶</span>
      </summary>
      <div className={styles.body}>
        <AiResultProse value={section.body} />
      </div>
    </details>
  );
}

function DeckColumn({
  sections,
  name,
  sub,
  glyph,
  tone,
}: {
  sections: DeckSection[];
  name: string;
  sub: string;
  glyph: string;
  tone: "vedic" | "sukuyo";
}) {
  if (!sections.length) return null;
  return (
    <section className={`${styles.column} ${tone === "vedic" ? styles.columnVedic : styles.columnSukuyo}`} aria-label={name}>
      <div className={styles.columnHead}>
        <span className={styles.sectionGlyph} aria-hidden="true">{glyph}</span>
        <h3 className={styles.columnName}>{name}</h3>
        <span className={styles.columnSub}>{sub}</span>
      </div>
      {sections.map((section, index) => (
        <SectionItem key={section.id} section={section} index={index} variant="column" />
      ))}
    </section>
  );
}

export default function AiConsultDecks({ decks, natal, question, topInsights = [], totalChars = 0 }: AiConsultDecksProps) {
  const copy = useNakshatraCopy();
  const fusion = Array.isArray(decks.fusion) ? decks.fusion : [];
  const sectionCount = decks.sukuyo.length + decks.vedic.length + fusion.length;
  const hasNatal = Boolean(natal?.sukuyoHan || natal?.nakshatraKo);

  return (
    <div className={`${styles.vars} ${styles.wrap}`}>
      {/* 어디를 읽든 내 명식과 분량이 보이도록 상단에 고정한다(2만자 장문의 길잡이). */}
      <header className={styles.summary}>
        <div className={styles.summaryRow}>
          <h1 className={styles.natal}>
            {hasNatal ? (
              <>
                {natal?.sukuyoHan ? <span className={styles.natalHan}>{natal.sukuyoHan}宿</span> : null}
                {natal?.sukuyoHan && natal?.nakshatraKo ? <span aria-hidden="true"> · </span> : null}
                {natal?.nakshatraKo ? <span className={styles.natalNak}>{natal.nakshatraKo}</span> : null}
              </>
            ) : (
              copy.aiDecksDefaultTitle
            )}
          </h1>
          <span className={styles.scale}>
            {copy.aiDecksScale(sectionCount, totalChars)}
          </span>
        </div>
        {question ? <p className={styles.question}>“{question}”</p> : null}
      </header>

      {/* 같은 하늘을 두 언어로 — 데스크톱은 나란히, 모바일은 위아래로 읽는다. */}
      <div className={styles.sectionHead}>
        <span className={styles.sectionGlyph} aria-hidden="true">⟡</span>
        <h2 className={styles.sectionTitle}>{copy.aiDecksSectionTitle}</h2>
        <span className={styles.sectionRule} aria-hidden="true" />
      </div>
      <div className={styles.split}>
        <DeckColumn sections={decks.vedic} name={copy.aiVedicDeckName} sub={copy.aiVedicDeckSub} glyph="🕉" tone="vedic" />
        <DeckColumn sections={decks.sukuyo} name={copy.aiSukuyoDeckName} sub={copy.aiSukuyoDeckSub} glyph="☯" tone="sukuyo" />
      </div>

      {fusion.length > 0 ? (
        <>
          <div className={styles.sectionHead}>
            <span className={styles.sectionGlyph} aria-hidden="true">✦</span>
            <h2 className={styles.sectionTitle}>{copy.aiFusionSectionTitle}</h2>
            <span className={styles.sectionRule} aria-hidden="true" />
          </div>
          <div className={styles.fusionList}>
            {fusion.map((section, index) => (
              <SectionItem key={section.id} section={section} index={index} variant="card" />
            ))}
          </div>
        </>
      ) : null}

      {topInsights.length > 0 ? (
        <>
          <div className={styles.sectionHead}>
            <span className={styles.sectionGlyph} aria-hidden="true">◆</span>
            <h2 className={styles.sectionTitle}>{copy.aiTopInsightsTitle}</h2>
            <span className={styles.sectionRule} aria-hidden="true" />
          </div>
          <ol className={styles.insights}>
            {topInsights.slice(0, 3).map((insight, index) => (
              <li key={insight.title} className={styles.insight}>
                <span className={styles.insightNo} aria-hidden="true">{index + 1}</span>
                <p className={styles.insightTitle}>{insight.title}</p>
                {insight.detail ? <p className={styles.insightDetail}>{insight.detail}</p> : null}
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <p className={styles.note}>
        {copy.aiDisclaimer}
      </p>
    </div>
  );
}
