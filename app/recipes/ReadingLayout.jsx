import Link from 'next/link';
import { BRAND_FACTS } from '../../lib/brand/brand-facts.mjs';
import Image from 'next/image';
import readingStyles from '../insights/insight-article.module.css';

export const sectionClass = 'mt-12 max-w-[70ch] space-y-4 text-base leading-8';
export const headingClass = 'text-2xl font-bold leading-snug text-[var(--ia-ink)]';
export const linkClass = 'inline-flex min-h-11 items-center py-2 text-[var(--ia-accent)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4';

export function JsonLd({ value }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export function EditorialNote() {
  return <section className={sectionClass} aria-label="제작 기준">
    <h2 className={headingClass}>이 글을 만든 기준</h2>
    <p>CODE DESTINY가 AI의 도움을 받아 구성한 생활문화 콘텐츠입니다. 전문 셰프의 실명 감수나 조리 실험을 거쳤다고 주장하지 않습니다. 조리 시간은 예상치이며 재료의 상태와 조리 도구에 따라 달라집니다. 요리는 캐릭터와 함께 그린 2D 일러스트입니다. 실제 조리 결과나 판매 상품의 사진이 아닙니다.</p>
    <p>오행과 맛의 연결은 전통적인 상징을 일상에서 즐기는 관점입니다. 건강 진단, 질병 치료, 성적 향상이나 개운 효과를 보장하지 않습니다. 본인의 알레르기와 식사 제한, 의료진의 안내를 먼저 고려해 주세요.</p>
    <div className="flex flex-wrap gap-x-6"><Link prefetch={false} className={linkClass} href="/editorial-policy/">콘텐츠 편집 기준</Link><Link prefetch={false} className={linkClass} href="/methodology/">해석 방법론</Link></div>
  </section>;
}

export function YeoniTip({ children, introduction = false, stage = 'chef' }) {
  return <aside className="my-5 flex items-start gap-4 rounded-2xl bg-[var(--ia-soft)] p-4 sm:items-center" aria-label={introduction ? '연이의 요리 교실' : '연이의 조리 메모'}>
    <Image src={`/images/five-elements/yeoni-${stage}-2d.webp`} alt="" width={96} height={96} sizes="80px" className="h-20 w-20 shrink-0 rounded-xl object-contain" />
    <div className="min-w-0"><p className="font-semibold text-[var(--ia-ink)]">{introduction ? '연이와 함께, 한 단계씩' : '연이의 조리 메모'}</p><p className="mt-1 text-base leading-7">{children}</p></div>
  </aside>;
}

export default function ReadingLayout({ title, description, image, imageAlt, children, illustrated = false }) {
  return <main className={`${readingStyles.page} min-h-screen selection:bg-[var(--ia-soft-strong)] selection:text-[var(--ia-ink)]`} data-publisher-content>
    <article className="mx-auto max-w-4xl px-5 pb-20 pt-6 sm:px-8">
      <nav aria-label="콘텐츠 탐색" className="mb-10 flex flex-wrap gap-x-6 text-sm">
        <a href="/ggulggul/" className={linkClass}>{BRAND_FACTS.service.name}</a>
        <Link prefetch={false} href="/recipes/" className={linkClass}>사주 요리법 모아보기</Link>
        <Link prefetch={false} href="/insights/" className={linkClass}>운세 인사이트</Link>
      </nav>
      <header className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
        <div><h1 className="max-w-[14ch] text-balance break-keep font-[var(--font-display)] text-4xl font-bold leading-tight text-[var(--ia-ink)] sm:text-5xl">{title}</h1>
          <p className="mt-6 max-w-[44ch] text-lg leading-8">{description}</p>
        </div>
        <figure><Image src={image} alt={imageAlt} width={1536} height={1024} priority sizes="(min-width:768px) 550px, 100vw" className="aspect-[3/2] w-full rounded-2xl object-cover" />
          <figcaption className="mt-2 text-sm leading-6 text-[var(--ia-muted)]">{illustrated ? '연이의 요리 장면을 담은 AI 2D 일러스트' : 'AI로 제작한 연출 이미지'}</figcaption>
        </figure>
      </header>
      {children}
      <EditorialNote />
    </article>
  </main>;
}
