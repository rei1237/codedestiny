import styles from './cut-reader.module.css';

/** 표정 세트(docs/context/narrator-webtoon-result-spec.md §3). */
export type WebtoonExpression = 'smile' | 'explain' | 'worry' | 'cheer' | 'serious' | 'greet' | 'think' | 'surprise';

/** note: optional small aside under a bubble (e.g. a term gloss).
 *  source(명세 §8): 'engine' 엔진 해석 원문, 'narrator' 화자 대사, 'disclaimer' 고정 면책. 없으면 기존 동작.
 *  label: engine 줄 머리(예: "현재 · 마법사"). */
export type WebtoonLine = {
  speaker: string; text: string; note?: string;
  source?: 'engine' | 'narrator' | 'disclaimer';
  label?: string;
};
/** 단일 파일 그림(화자 표정·카드). src 가 실패하면 fallbacks 를 차례로 쓴다(클라이언트 래퍼가 처리). */
export type WebtoonArt = { src: string; w: number; h: number; alt: string; role: 'narrator' | 'card'; fallbacks?: string[] };
export type WebtoonCut = {
  src: string; widths: number[]; fallback: number; w: number; h: number;
  alt: string; kind: string; cover?: boolean; lines: WebtoonLine[];
  /** 컷 그림 대신 쓰는 단일 파일 그림들(화자 패널). src 가 비어 있을 때만 그린다. */
  art?: WebtoonArt[];
  expression?: WebtoonExpression;
  card?: { id: string; reversed: boolean; position?: string };
};

const SIZES = '(max-width:680px) 100vw, 680px';

function Line({ line, index }: { line: WebtoonLine; index: number }) {
  const data = { 'data-source': line.source, 'data-line': index };
  if (line.source === 'engine' || line.source === 'disclaimer') {
    return <p className={line.source === 'engine' ? styles.engine : styles.disclaimer} {...data}>
      {line.label && <b className={styles.label}>{line.label}</b>}{line.text}
    </p>;
  }
  return line.speaker
    ? <p className={styles.bubble} {...data}><b>{line.speaker}</b>{line.text}{line.note && <small className={styles.note}>{line.note}</small>}</p>
    : <p className={styles.narration} {...data}>{line.text}</p>;
}

/** One painted cut per figure; every line of dialogue stays selectable HTML below the art.
 *  An empty `src` renders the dialogue alone (art not delivered yet) instead of a broken image.
 *  서버 컴포넌트로도 쓰인다(DailyFortuneWebtoon) — 훅·'use client' 를 넣지 않는다. 연출은 NarratorWebtoon 이 맡는다. */
export default function CutReader({ cuts, eager = 2, tone = 'paper', label }: { cuts: WebtoonCut[]; eager?: number; tone?: 'paper' | 'night' | 'yehwa' | 'lantern' | 'guided'; label?: string }) {
  return <ol className={`${styles.reader} ${styles[tone]}`} aria-label={label}>
    {/* 키는 위치를 함께 쓴다: 그림 없는 컷이나 같은 문장이 반복돼도 겹치지 않는다. */}
    {cuts.map((cut, index) => <li key={`${index}-${cut.src}`} className={styles.cut} data-kind={cut.kind} data-cut-index={index}
      data-expression={cut.expression} data-art={cut.src || cut.art?.length ? undefined : 'pending'}>
      <figure>
        {cut.src && <picture>
          <source type="image/avif" srcSet={cut.widths.map(w => `${cut.src}-${w}.avif ${w}w`).join(', ')} sizes={SIZES} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${cut.src}-${cut.fallback}.webp`} width={cut.w} height={cut.h} alt={cut.alt}
            loading={index < eager ? 'eager' : 'lazy'} decoding="async" {...(index === 0 && eager > 0 ? { fetchPriority: 'high' as const } : {})} />
        </picture>}
        {!cut.src && cut.art && cut.art.length > 0 && <div className={styles.panel} data-art-panel="">
          {cut.art.map((art, artIndex) => <span key={`${artIndex}-${art.src}`} className={styles.art} data-role={art.role}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art.src} width={art.w} height={art.h} alt={art.alt} loading={index < eager ? 'eager' : 'lazy'} decoding="async"
              data-fallbacks={art.fallbacks?.length ? art.fallbacks.join(' ') : undefined} />
          </span>)}
        </div>}
        {cut.lines.length > 0 && <figcaption>{cut.lines.map((line, lineIndex) => <Line key={lineIndex} line={line} index={lineIndex} />)}</figcaption>}
      </figure>
    </li>)}
  </ol>;
}
