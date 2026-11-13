import styles from './page-reader.module.css';

export type WebtoonPage = { n: number; alt: string };

const SIZES = '(max-width:720px) 100vw, 720px';
const pad = (n: number) => String(n).padStart(2, '0');

/** 대사가 그림에 들어 있는 완성 원고용 리더. 쪽을 틈 없이 세로로 이어 붙인다.
 *  JS 없이도 모든 쪽이 보이고, PageReaderChrome이 그 위에 진행·메뉴·이어 보기를 얹는다. */
export default function PageReader({ pages, dir, widths, w, h, eager = 2 }: {
  pages: WebtoonPage[]; dir: string; widths: number[]; w: number; h: number; eager?: number;
}) {
  const fallback = widths[0];
  return <ol className={styles.pages} data-webtoon-pages="">
    {pages.map((page, index) => {
      const base = `${dir}/${pad(page.n)}`;
      const set = (ext: string) => widths.map(width => `${base}-${width}.${ext} ${width}w`).join(', ');
      return <li key={page.n} id={`p-${pad(page.n)}`} data-page={page.n}>
        <picture>
          <source type="image/avif" srcSet={set('avif')} sizes={SIZES} />
          <source type="image/webp" srcSet={set('webp')} sizes={SIZES} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${base}-${fallback}.webp`} width={w} height={h} alt={`${page.n}쪽. ${page.alt}`}
            loading={index < eager ? 'eager' : 'lazy'} decoding="async"
            {...(index === 0 ? { fetchPriority: 'high' as const } : {})} />
        </picture>
      </li>;
    })}
  </ol>;
}
