import styles from './cut-reader.module.css';

export type WebtoonLine = { speaker: string; text: string };
export type WebtoonCut = {
  src: string; widths: number[]; fallback: number; w: number; h: number;
  alt: string; kind: string; cover?: boolean; lines: WebtoonLine[];
};

const SIZES = '(max-width:680px) 100vw, 680px';

/** One painted cut per figure; every line of dialogue stays selectable HTML below the art. */
export default function CutReader({ cuts, eager = 2, tone = 'paper' }: { cuts: WebtoonCut[]; eager?: number; tone?: 'paper' | 'night' | 'yehwa' }) {
  return <ol className={`${styles.reader} ${styles[tone]}`}>
    {cuts.map((cut, index) => <li key={cut.src} className={styles.cut} data-kind={cut.kind}>
      <figure>
        <picture>
          <source type="image/avif" srcSet={cut.widths.map(w => `${cut.src}-${w}.avif ${w}w`).join(', ')} sizes={SIZES} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${cut.src}-${cut.fallback}.webp`} width={cut.w} height={cut.h} alt={cut.alt}
            loading={index < eager ? 'eager' : 'lazy'} decoding="async" {...(index === 0 ? { fetchPriority: 'high' as const } : {})} />
        </picture>
        {cut.lines.length > 0 && <figcaption>{cut.lines.map(line => line.speaker
          ? <p key={line.text} className={styles.bubble}><b>{line.speaker}</b>{line.text}</p>
          : <p key={line.text} className={styles.narration}>{line.text}</p>)}</figcaption>}
      </figure>
    </li>)}
  </ol>;
}
