"use client";
// 액땜 카드(2026-11-27 R1). 저장된 computeRemedyCases 결과를 buildRemedyCardModel 로 바꿔 화자 그림·말풍선과 함께 그린다.
// ko 로케일에서만 보인다. 서버·첫 렌더는 비워 두어 하이드레이션 불일치가 없다(YeoniSay 와 같은 방식).
// 모델이 null 이거나 그리다 예외가 나면 아무것도 그리지 않는다 — 결과 본문·결제와 무관한 덧붙임이라 본문을 막지 않는다.
// 그림은 고정 비율 상자 + width·height + 즉시 로딩이다: 늦게 와도 자리가 밀리지 않고, 캡처(useCaptureShare)가 빈 그림을 찍지 않는다.
// 앞의 visible 장만 펼치고, 나머지는 aria-expanded 버튼 뒤에 접는다. 접힌 장은 hidden 이라 캡처에도 빠진다.
import { Component, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";
import { buildRemedyCardModel } from "@/lib/saju/remedy/index.mjs";
import { remedyImageFrame } from "@/lib/saju/remedy/frames.mjs";
import styles from "./remedy-case-cards.module.css";

export type RemedyNarrator = "yeoni" | "yeoni-saju" | "yeongnyangi" | "neo" | "musung";
export type RemedyTone = "auto" | "caution" | "explain";
export type RemedyTheme = "light" | "dark";

type RemedyMethod = { id: string; kind: string; title: string; text: string };
type RemedyCard = {
  caseId: string;
  variant: string;
  system: "saju" | "ziwei";
  title: string;
  period: { kind: string; label: string };
  evidenceLine: string;
  methods: readonly RemedyMethod[];
  custom: { label: string; id: string; title: string; text: string };
  line: string;
  tone: "caution" | "explain";
  image: { src: string; alt: string };
};
export type RemedyCardModel = {
  version: string;
  narrator: RemedyNarrator;
  narratorName: string;
  tone: RemedyTone;
  intro: string;
  disclaimer: string;
  customLabel: string;
  cards: readonly RemedyCard[];
  visible: number;
  more: number;
  moreLabel: string;
};

type HeadingLevel = 2 | 3 | 4;

class RemedyBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[remedy] 액땜 카드를 그리지 못해 건너뜁니다.", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function RemedyCardItem({ card, narrator, narratorName, disclaimer, headingLevel }: {
  card: RemedyCard;
  narrator: RemedyNarrator;
  narratorName: string;
  disclaimer: string;
  headingLevel: HeadingLevel;
}) {
  const Heading = `h${headingLevel}` as "h3";
  const frame = remedyImageFrame(narrator);
  return (
    <li className={styles.item}>
      <article className={styles.card} data-remedy-case={card.caseId} data-tone={card.tone}>
        <header className={styles.head}>
          {card.period.label ? <span className={styles.period}>{card.period.label}</span> : null}
          <Heading className={styles.title}>{card.title}</Heading>
        </header>
        {card.evidenceLine ? <p className={styles.evidence}>{card.evidenceLine}</p> : null}
        <div className={styles.say} data-fit={frame.fit}>
          <span className={styles.frame} style={{ aspectRatio: `${frame.width} / ${frame.height}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 캡처(html2canvas)가 next/image 지연 로딩을 놓친다 */}
            <img src={card.image.src} alt={card.image.alt} width={frame.width} height={frame.height} loading="eager" decoding="async" />
          </span>
          {card.line ? (
            <p className={styles.bubble}>
              <b>{narratorName}</b>
              {card.line}
            </p>
          ) : null}
        </div>
        <ul className={styles.methods}>
          {card.methods.map((m) => (
            <li key={m.id}>
              <strong>{m.title}</strong> {m.text}
            </li>
          ))}
        </ul>
        <div className={styles.custom}>
          <span className={styles.customLabel}>{card.custom.label}</span>
          <p>
            <strong>{card.custom.title}</strong> {card.custom.text}
          </p>
        </div>
        <p className={styles.disclaimer}>{disclaimer}</p>
      </article>
    </li>
  );
}

/** 모델을 그대로 그리는 순수 화면. 로케일 판단 없음(테스트·미리보기용). */
export function RemedyCaseCardsView({ model, theme = "light", headingLevel = 3, className }: {
  model: RemedyCardModel;
  theme?: RemedyTheme;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const restId = useId();
  const head = model.cards.slice(0, model.visible);
  const rest = model.cards.slice(model.visible);
  const item = (card: RemedyCard) => (
    <RemedyCardItem
      key={card.caseId}
      card={card}
      narrator={model.narrator}
      narratorName={model.narratorName}
      disclaimer={model.disclaimer}
      headingLevel={headingLevel}
    />
  );
  const rootClass = [styles.root, theme === "dark" ? styles.dark : styles.light, className].filter(Boolean).join(" ");
  return (
    <section className={rootClass} aria-label="액땜 방법" data-remedy-cards="" data-narrator={model.narrator} data-theme={theme}>
      <p className={styles.intro}>{model.intro}</p>
      <ol className={styles.list}>{head.map(item)}</ol>
      {rest.length ? (
        <>
          <ol id={restId} className={styles.list} hidden={!open} start={model.visible + 1}>
            {rest.map(item)}
          </ol>
          <button
            type="button"
            className={styles.more}
            aria-expanded={open}
            aria-controls={restId}
            onClick={() => setOpen((v) => !v)}
            data-html2canvas-ignore="true"
          >
            {open ? "접기" : model.moreLabel}
          </button>
        </>
      ) : null}
    </section>
  );
}

/**
 * 액땜 카드. remedyCases 는 저장된 computeRemedyCases 결과 그대로다.
 * theme 'dark' 는 예화 밤 토큰을 쓴다(연이 화면은 자두색, neo-mode·흑월은 보랏빛 먹으로 함께 바뀐다).
 */
export default function RemedyCaseCards({
  remedyCases,
  narrator = "yeoni",
  tone = "auto",
  theme = "light",
  headingLevel = 3,
  className,
}: {
  remedyCases: unknown;
  narrator?: RemedyNarrator;
  tone?: RemedyTone;
  theme?: RemedyTheme;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const [isKo, setIsKo] = useState(false);
  useEffect(() => {
    const sync = () => setIsKo(getCurrentLoadingLocale() === "ko");
    sync();
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  const model = useMemo(
    () => buildRemedyCardModel(remedyCases as never, { narrator, tone }) as unknown as RemedyCardModel | null,
    [remedyCases, narrator, tone],
  );
  if (!isKo || !model) return null;
  return (
    <RemedyBoundary>
      <RemedyCaseCardsView model={model} theme={theme} headingLevel={headingLevel} className={className} />
    </RemedyBoundary>
  );
}
