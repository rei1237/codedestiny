import RecipeArticle from '../RecipeArticle';
import { BRAND_FACTS } from '../../../lib/brand/brand-facts.mjs';
import { notFound } from 'next/navigation';
import { buildSeoMetadata } from '../../../lib/seo';
import { siteSeo } from '../../../lib/seo/siteSeo';
import { RECIPES, recipePath, recipeImage, recipeJsonLd } from '../../../lib/lifestyle/recipes.mjs';
import ReadingLayout, { JsonLd } from '../ReadingLayout';

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
  return <ReadingLayout illustrated title={recipe.name} description={recipe.description} image={recipeImage(recipe)} imageAlt={recipe.ingredientTheme ? `${recipe.name} 완성 요리 일러스트` : `${recipe.host ?? '연이'}의 ${recipe.name} 2D 일러스트`}>
    <JsonLd value={recipeJsonLd(recipe, siteSeo.siteUrl)} />
    <RecipeArticle recipe={recipe} />
  </ReadingLayout>;
}
