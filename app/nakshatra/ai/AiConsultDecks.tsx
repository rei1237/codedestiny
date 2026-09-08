"use client";

import AiResultProse from "@/components/fortune/AiResultProse";
import { useNakshatraCopy } from "../_lib/copy";
import styles from "./consult-decks.module.css";

export interface DeckSection {
  id: string;
  title: string;
  topic?: string;
  keyInsight?: string;
  vedicEvidence?: string;
  sukuyoEvidence?: string;
  body: string;
}

export interface Decks {
  consultation?: DeckSection[];
  sukuyo?: DeckSection[];
  vedic?: DeckSection[];
  fusion?: DeckSection[];
}

export interface NatalIdentity {
  sukuyoKo?: string;
  sukuyoHan?: string;
  sukuyoDirection?: string;
  sukuyoGuardian?: string;
  nakshatraKo?: string;
  nakshatraEn?: string;
  pada?: number | null;
  lordKo?: string;
}

interface AiConsultDecksProps {
  decks: Decks;
  natal: NatalIdentity | null;
  question?: string;
  totalChars?: number;
}

function legacySections(decks: Decks) {
  return [
    ...(Array.isArray(decks.fusion) ? decks.fusion : []),
    ...(Array.isArray(decks.vedic) ? decks.vedic : []),
    ...(Array.isArray(decks.sukuyo) ? decks.sukuyo : []),
  ];
}

function TwoStars({ natal }: { natal: NatalIdentity | null }) {
  const vedicName = natal?.nakshatraKo || "달의 나크샤트라";
  const sukuyoName = natal?.sukuyoHan ? natal.sukuyoHan + "宿" : natal?.sukuyoKo || "본명숙";
  const details = [
    natal?.pada ? "Pada " + natal.pada : "",
    natal?.lordKo ? "지배성 " + natal.lordKo : "",
    [natal?.sukuyoDirection, natal?.sukuyoGuardian].filter(Boolean).join(" · "),
  ].filter(Boolean);

  return (
    <div className={styles.twoStars} aria-label="두 개의 별 프로필">
      <div className={styles.orbit} aria-hidden="true">
        <span className={styles.orbitRingOne} />
        <span className={styles.orbitRingTwo} />
        <span className={styles.orbitVedic} />
        <span className={styles.orbitSukuyo} />
        <span className={styles.orbitCenter} />
      </div>
      <div className={styles.starNames}>
        <p className={styles.starLabel}>VEDIC · 달의 별</p>
        <p className={styles.vedicName}>{vedicName}</p>
        <span className={styles.cross}>×</span>
        <p className={styles.starLabel}>SUKUYO · 본명숙</p>
        <p className={styles.sukuyoName}>{sukuyoName}</p>
        {details.length ? <p className={styles.starDetails}>{details.join(" · ")}</p> : null}
      </div>
    </div>
  );
}

export default function AiConsultDecks({ decks, natal, question, totalChars = 0 }: AiConsultDecksProps) {
  const copy = useNakshatraCopy();
  const modernSections = Array.isArray(decks.consultation) ? decks.consultation : [];
  const sections = modernSections.length ? modernSections : legacySections(decks);
  const hero = sections[0];
  const chapters = sections.slice(1);
  const pairName = [
    natal?.nakshatraKo || natal?.nakshatraEn,
    natal?.sukuyoHan ? natal.sukuyoHan + "宿" : natal?.sukuyoKo,
  ].filter(Boolean).join(" · ");

  return (
    <main className={styles.vars}>
      <div className={styles.wrap}>
        <header className={styles.hero} data-nakai-pdf-section>
          <p className={styles.heroTitle}>하나의 별, 두 개의 언어</p>
          <TwoStars natal={natal} />
          <h1 className={styles.headline}>
            베다의 이름은 {natal?.nakshatraKo || "달의 별"},
            숙요의 이름은 {natal?.sukuyoHan ? natal.sukuyoHan + "宿" : natal?.sukuyoKo || "본명숙"}입니다.
          </h1>
          {hero?.keyInsight ? <p className={styles.keyInsight}>{hero.keyInsight}</p> : null}
          {question ? <p className={styles.question}>“{question}”</p> : null}
          {hero?.body ? <div className={styles.heroBody}><AiResultProse value={hero.body} /></div> : null}
          {totalChars > 0 ? <p className={styles.readingMeta}>{Math.round(totalChars / 100) * 100}자 통합 상담</p> : null}
        </header>

        <div className={styles.reading}>
          {chapters.map((section, index) => (
            <article
              key={section.id}
              className={section.id === "closingMessage" ? styles.closing : styles.chapter}
              data-nakai-pdf-section
            >
              <p className={styles.chapterLabel} aria-label={`상담 장 ${index + 2}`}>{String(index + 1).padStart(2, "0")}</p>
              <h2>{section.title}</h2>
              {section.keyInsight ? <p className={styles.chapterInsight}>{section.keyInsight}</p> : null}
              <div className={styles.chapterBody}><AiResultProse value={section.body} /></div>
            </article>
          ))}
        </div>

        <footer className={styles.note} data-nakai-pdf-section>
          <p className={styles.notePair}>{pairName || copy.aiDecksDefaultTitle}</p>
          <p>{copy.aiDisclaimer}</p>
        </footer>
      </div>
    </main>
  );
}
