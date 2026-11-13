import Link from 'next/link';
import RecipePanels from '../RecipePanels';
import { BRAND_FACTS } from '../../../lib/brand/brand-facts.mjs';
import { notFound } from 'next/navigation';
import { buildSeoMetadata } from '../../../lib/seo';
import { siteSeo } from '../../../lib/seo/siteSeo';
import { RECIPES, recipePath, recipeImage, recipeJsonLd } from '../../../lib/lifestyle/recipes.mjs';
import ReadingLayout, { JsonLd, sectionClass, headingClass, linkClass } from '../ReadingLayout';

export const dynamicParams = false;
export function generateStaticParams() { return RECIPES.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const recipe = RECIPES.find((r) => r.slug === slug);
  if (!recipe) return {};
  return buildSeoMetadata({ path: recipePath(recipe), title: `${recipe.name} 레시피 | ${BRAND_FACTS.service.name}`, description: recipe.description, ogImage: recipeImage(recipe), ogType: 'article' });
}
export default async function RecipePage({ params }) {
  const { slug } = await params;
  const recipe = RECIPES.find((r) => r.slug === slug);
  if (!recipe) notFound();
  return <ReadingLayout illustrated title={recipe.name} description={recipe.description} image={recipeImage(recipe)} imageAlt={`${recipe.host ?? '연이'}의 ${recipe.name} 2D 일러스트`}>
    <JsonLd value={recipeJsonLd(recipe, siteSeo.siteUrl)} />
    <section className={sectionClass}><h2 className={headingClass}>{recipe.element}의 {recipe.taste}, 이렇게 담았어요</h2><p>{recipe.story}</p><p className="font-semibold">무료 공개 · 2인분 · 준비 약 {recipe.prep}분 · 조리 약 {recipe.cook}분 · 총 약 {recipe.prep + recipe.cook}분</p><a className={linkClass} href="#ingredients">재료부터 확인하기</a><a className={`${linkClass} ml-6`} href="#method">만드는 법으로 이동</a></section>
    <section id="ingredients" className={sectionClass}><h2 className={headingClass}>재료 · 2인분</h2><p>1작은술은 5mL 기준입니다. 무게는 손질한 재료 기준이며 간은 제품의 염도와 기호에 맞게 조절하세요.</p><ul className="list-disc space-y-2 pl-5">{recipe.ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}</ul></section>
    <section id="method" className={sectionClass}><h2 className={headingClass}>{recipe.host ?? '연이'}의 요리 웹툰</h2><p> 한 단계씩 읽고, 음식의 상태를 확인하며 천천히 따라오세요.</p><RecipePanels recipe={recipe} /></section>
    {[['맛을 살리는 조리 포인트', recipe.technique], ['뜻대로 되지 않았을 때', recipe.rescue], ['대체 재료와 알레르기', recipe.swap], ['한 끼에 곁들이는 이야기', recipe.pairing]].map(([title, text]) => <section className={sectionClass} key={title}><h2 className={headingClass}>{title}</h2><p>{text}</p></section>)}
    <section className={sectionClass}><h2 className={headingClass}>남은 음식은 이렇게 보관하세요</h2><p>먹을 만큼 덜어내고 남은 음식은 얕은 용기에 나누어 조리 후 2시간 이내 냉장하세요. 실내외 온도가 약 32°C를 넘는 더운 환경에서는 1시간 이내 보관합니다. 냉장고는 4°C 이하로 유지하고, 안전하게 취급한 남은 음식도 보통 3~4일 이내 먹는 기준을 참고하세요. 재료의 소비기한이 더 짧다면 그 기준을 먼저 따릅니다.</p><p>가열해서 먹는 남은 음식은 중심까지 74°C에 도달하도록 다시 데우세요. 차갑게 먹는 샐러드는 깨끗한 도구로 덜고 냉장 상태를 유지합니다. 상온에 오래 놓였거나 보관 상태가 불확실한 음식은 냄새만으로 안전하다고 판단하지 마세요.</p><a className={linkClass} href="https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures">FoodSafety.gov 익힘 온도 기준</a><br /><a className={linkClass} href="https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety">USDA 남은 음식 보관 기준</a></section>
    <section className={sectionClass}><h2 className={headingClass}>다른 맛의 한 접시</h2><ul>{RECIPES.filter((r) => r.slug !== slug).map((r) => <li key={r.slug}><Link prefetch={false} className={linkClass} href={recipePath(r)}>{r.element} · {r.name}</Link></li>)}</ul></section>
  </ReadingLayout>;
}
