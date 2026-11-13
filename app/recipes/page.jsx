import Link from 'next/link';
import styles from './recipe-comic.module.css';
import { BRAND_FACTS } from '../../lib/brand/brand-facts.mjs';
import Image from 'next/image';
import { buildSeoMetadata } from '../../lib/seo';
import { siteSeo } from '../../lib/seo/siteSeo';
import { RECIPES, recipePath, recipeImage } from '../../lib/lifestyle/recipes.mjs';
import ReadingLayout, { JsonLd, YeoniTip, sectionClass, headingClass, linkClass } from './ReadingLayout';

export const metadata = buildSeoMetadata({ path: '/recipes/', title: `사주 요리법 | 연이와 영냥이의 오행 요리 웹툰 - ${BRAND_FACTS.service.name}`, description: '로그인·결제 없이 읽는 사주 요리법. 연이와 영냥이의 2D 웹툰으로 만나는 오행 요리. 샐러드·리조또·국수·토스트·오트밀·주먹밥의 2인분 재료, 조리 과정과 실패 보완법을 소개합니다.', ogImage: '/images/five-elements/recipe-entry-2d.webp' });

const flavours = [ ['목(木)', '신맛'], ['화(火)', '쓴맛'], ['토(土)', '단맛'], ['금(金)', '매운맛'], ['수(水)', '짠맛'] ];

export default function RecipesPage() {
  return <ReadingLayout illustrated title="사주 요리법" description="앞치마를 두르고, 오늘 먹고 싶은 맛부터 골라요. 연이와 영냥이의 말풍선을 따라 웹툰처럼 읽는 요리 교실. 아침부터 따뜻한 저녁까지 한 단계씩 함께 만들어요." image="/images/five-elements/recipe-entry-2d.webp" imageAlt="다섯 가지 요리를 차리고 초대하는 요리사 연이">
    <JsonLd value={{ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: RECIPES.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: `${siteSeo.siteUrl}${recipePath(r)}`, name: r.name })) }} />
    <section className={sectionClass}><span className={styles.chapter}>전체 {RECIPES.length}편 · 무료 공개</span><h2 className={headingClass}>오늘 먹고 싶은 맛부터 골라요</h2><p>모든 요리법을 로그인이나 결제 없이 볼 수 있어요. 재료를 준비하고 조리 장면을 한 컷씩 따라가 보세요.</p>
      <p>오행의 오미는 목의 신맛, 화의 쓴맛, 토의 단맛, 금의 매운맛, 수의 짠맛을 연결하는 전통적인 분류입니다. 이곳에서는 그 관계를 메뉴를 떠올리는 출발점으로 씁니다. 사주의 특정 오행이 적다고 어떤 음식을 더 먹어야 한다는 처방은 아닙니다.</p>
      <p>‘건강 요리’는 특정 질환에 효과가 있다는 뜻이 아니라, 재료를 알고 간과 양을 스스로 조절하며 한 끼를 준비하자는 취지입니다. 단맛은 단호박의 맛으로, 매운맛은 생강의 향으로, 짠맛은 적은 양의 간을 확인하는 과정으로 풀었어요. 기호와 식사 제한이 오행 테마보다 우선입니다.</p>
      <YeoniTip introduction>불 없이 만드는 샐러드, 바삭한 토스트, 따뜻한 국수까지 준비했어요. 각 레시피의 재료와 조리 시간을 먼저 살펴보고, 오늘의 여유에 맞춰 골라 보세요.</YeoniTip>
      <a className={linkClass} href="#recipes">레시피 고르기</a>
    </section>
    <section id="recipes" className="mt-14 scroll-mt-6" aria-labelledby="recipe-list"><h2 id="recipe-list" className={headingClass}>오행 요리 웹툰 모아보기</h2>
      <nav aria-label="오행의 맛별 레시피" className="mt-4 flex flex-wrap gap-x-6">{flavours.map(([element, taste], i) => <a key={element} className={linkClass} href={`#flavour-${i}`}>{element} · {taste}</a>)}</nav>
      {flavours.map(([element, taste], i) => <section key={element} id={`flavour-${i}`} className="mt-10 scroll-mt-6" aria-labelledby={`flavour-title-${i}`}><h3 id={`flavour-title-${i}`} className="text-2xl font-semibold text-[var(--ia-ink)]">{element} · {taste}을 즐기는 다양한 방법</h3><div className={styles.shelf}>{RECIPES.filter((r) => r.element === element).map((r) => <article key={r.slug} className={styles.cover}>
        <Link prefetch={false} href={recipePath(r)} aria-label={`${r.name} 레시피 보기`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ia-accent)]"><Image src={recipeImage(r)} alt={`${r.host ?? '연이'}의 ${r.name} 요리 장면 일러스트`} width={720} height={480} loading="lazy" sizes="(min-width:640px) 420px, 100vw" className="aspect-[3/2] w-full rounded-xl object-cover" /></Link>
        <div className={styles.coverCopy}><h4 className="text-2xl font-semibold text-[var(--ia-ink)]"><Link prefetch={false} className={linkClass} href={recipePath(r)}>{r.name}</Link></h4><p className="mt-1 text-sm text-[var(--ia-muted)]">{r.category} · 2인분 · 예상 {r.prep + r.cook}분</p><p className="mt-4 max-w-[55ch] leading-8">{r.description}</p></div>
      </article>)}</div></section>)}
    </section>
    <section className={sectionClass}><h2 className={headingClass}>레시피를 읽는 순서</h2><p>먼저 재료 목록에서 알레르기와 대체 가능한 재료를 확인하세요. 밥과 반찬을 함께 준비한다면 완성 시점이 맞도록 조리 순서를 정합니다. 손질을 마친 뒤 불을 켜면 뜨거운 팬을 두고 재료를 찾느라 서두르지 않아도 됩니다.</p><p>시간은 시작점이고 상태가 판단 기준입니다. 양파가 투명해졌는지, 쌀에 딱딱한 심이 남았는지, 두부 표면이 자연스럽게 팬에서 떨어지는지를 살피세요. 닭고기처럼 식품 안전과 관련된 익힘은 색이나 감이 아닌 중심 온도로 확인합니다. 각 글의 실패 보완법은 다음 한 번을 더 수월하게 만드는 작은 메모입니다.</p></section>
    <p className={sectionClass}>맛으로 살펴본 오행을 색으로도 만나 보세요. <Link className={linkClass} href="/saju/crystals/">오행별 천연석과 사주 원석 추천</Link></p>
  </ReadingLayout>;
}
