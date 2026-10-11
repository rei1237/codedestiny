import Link from 'next/link';
import Image from 'next/image';
import { buildSeoMetadata } from '../../lib/seo';
import { siteSeo } from '../../lib/seo/siteSeo';
import { RECIPES, recipePath, recipeImage } from '../../lib/lifestyle/recipes.mjs';
import ReadingLayout, { JsonLd, sectionClass, headingClass, linkClass } from './ReadingLayout';

export const metadata = buildSeoMetadata({ path: '/recipes/', title: '오행 건강 요리 레시피, 다섯 가지 맛의 식탁 | 꿀꿀 사주', description: '목·화·토·금·수의 맛을 요리로 만나보세요. 2인분 재료와 불 조절, 실패 보완법까지 담은 레시피 다섯 가지를 소개합니다.', ogImage: '/images/five-elements/earth.webp' });

export default function RecipesPage() {
  return <ReadingLayout title="오행의 맛을 담은, 오늘의 한 끼" description="산뜻하게, 쌉싸래하게, 부드럽게. 다섯 가지 맛에서 출발해 재료를 손질하고 한 접시를 완성하는 오행 건강 요리 레시피입니다." image="/images/five-elements/earth.webp" imageAlt="구운 버섯과 단호박을 올린 리조또">
    <JsonLd value={{ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: RECIPES.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: `${siteSeo.siteUrl}${recipePath(r)}`, name: r.name })) }} />
    <section className={sectionClass}><h2 className={headingClass}>부족한 기운보다, 오늘 먹고 싶은 맛부터</h2>
      <p>오행의 오미는 목의 신맛, 화의 쓴맛, 토의 단맛, 금의 매운맛, 수의 짠맛을 연결하는 전통적인 분류입니다. 이곳에서는 그 관계를 메뉴를 떠올리는 출발점으로 씁니다. 사주의 특정 오행이 적다고 어떤 음식을 더 먹어야 한다는 처방은 아닙니다.</p>
      <p>‘건강 요리’는 특정 질환에 효과가 있다는 뜻이 아니라, 재료를 알고 간과 양을 스스로 조절하며 한 끼를 준비하자는 취지입니다. 단맛은 단호박의 맛으로, 매운맛은 생강의 향으로, 짠맛은 적은 양의 간을 확인하는 과정으로 풀었어요. 기호와 식사 제한이 오행 테마보다 우선입니다.</p>
      <a className={linkClass} href="#recipes">다섯 가지 레시피 고르기</a>
    </section>
    <section id="recipes" className="mt-14 scroll-mt-6" aria-labelledby="recipe-list"><h2 id="recipe-list" className={headingClass}>어떤 맛으로 시작할까요?</h2>
      <div className="mt-6 divide-y divide-[var(--ia-line)]">{RECIPES.map((r) => <article key={r.slug} className="grid gap-6 py-8 sm:grid-cols-[240px_1fr]">
        <Link prefetch={false} href={recipePath(r)} aria-label={`${r.name} 레시피 보기`} className="rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ia-accent)]"><Image src={recipeImage(r)} alt={r.name} width={720} height={480} loading="lazy" sizes="(min-width:640px) 240px, 100vw" className="aspect-[3/2] w-full rounded-xl object-cover" /></Link>
        <div><h3 className="text-2xl font-semibold text-[var(--ia-ink)]"><Link prefetch={false} className={linkClass} href={recipePath(r)}>{r.name}</Link></h3><p className="mt-1 text-sm text-[var(--ia-muted)]">{r.element} · {r.taste} · 2인분 · 예상 {r.prep + r.cook}분</p><p className="mt-4 max-w-[55ch] leading-8">{r.description}</p></div>
      </article>)}</div>
    </section>
    <section className={sectionClass}><h2 className={headingClass}>레시피를 읽는 순서</h2><p>먼저 재료 목록에서 알레르기와 대체 가능한 재료를 확인하세요. 밥과 반찬을 함께 준비한다면 완성 시점이 맞도록 조리 순서를 정합니다. 손질을 마친 뒤 불을 켜면 뜨거운 팬을 두고 재료를 찾느라 서두르지 않아도 됩니다.</p><p>시간은 시작점이고 상태가 판단 기준입니다. 양파가 투명해졌는지, 쌀에 딱딱한 심이 남았는지, 두부 표면이 자연스럽게 팬에서 떨어지는지를 살피세요. 닭고기처럼 식품 안전과 관련된 익힘은 색이나 감이 아닌 중심 온도로 확인합니다. 각 글의 실패 보완법은 다음 한 번을 더 수월하게 만드는 작은 메모입니다.</p></section>
    <section className={sectionClass}><h2 className={headingClass}>공부하는 날, 새해를 준비하는 날</h2><p>학업운이 궁금한 날에도 성적을 바꾸는 음식이나 돌이 정해져 있는 것은 아닙니다. 공부 계획에는 식사와 쉬는 시간을 함께 적고, 오래 걸리는 메뉴는 쉬는 날에 손질해 두세요. 익숙한 한 끼를 준비하는 것만으로도 일정을 구체적으로 나눌 수 있습니다.</p><p>신년운세를 읽으며 세운 계획은 ‘이번 주 한 번 직접 요리하기’처럼 작은 행동으로 옮겨 보세요. 내일의 운세는 내일 할 일과 준비할 것을 돌아보는 읽을거리로, 건강 이야기는 생활 습관을 살피는 질문으로 이용할 수 있습니다. 운세와 식단이 시험 결과나 건강 상태를 예측하지는 않습니다.</p><div className="flex flex-wrap gap-x-6"><Link prefetch={false} className={linkClass} href="/fortune/tomorrow/">내일의 운세 보기</Link><Link prefetch={false} className={linkClass} href="/tarot/year/">신년 타로 살펴보기</Link><Link prefetch={false} className={linkClass} href="/health-report/guide/">건강 운세 해석의 범위</Link><Link prefetch={false} className={linkClass} href="/crystals/">오행과 천연석 읽기</Link></div></section>
  </ReadingLayout>;
}
