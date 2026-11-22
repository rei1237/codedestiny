import {RECIPES, recipeImage} from '../../../lib/lifestyle/recipes.mjs';
import RecipeArticle from '../../../app/recipes/RecipeArticle';
import './recipe-reader.css';

const pathFor = recipe => '/recipes/?dish=' + encodeURIComponent(recipe.slug);
const imageSource = path => (import.meta.env.MODE === 'private-simulation' ? '/__recipe-art' : 'https://code-destiny.com') + path;

export default function RecipeReader() {
  const slug = new URLSearchParams(window.location.search).get('dish');
  const recipe = RECIPES.find(item => item.slug === slug);
  if (slug && !recipe) return <section className="paper"><h1>요리법을 찾을 수 없어요</h1><a href="/recipes/">요리 목록 보기</a></section>;
  if (recipe) return <article className="recipe-mobile paper">
    <a href="/recipes/">전체 요리법 보기</a>
    <h1>{recipe.name}</h1><p>{recipe.description}</p>
    <img className="recipe-cover" src={imageSource(recipeImage(recipe))} alt={recipe.name + ' 완성 모습'}/>
    <RecipeArticle recipe={recipe} pathFor={pathFor} imageSource={imageSource}/>
  </article>;
  return <section className="recipe-mobile paper">
    <h1>사주 요리 웹툰</h1>
    <p>오늘 먹고 싶은 맛을 고르세요. 연이와 영냥이가 재료 손질부터 한 접시를 완성하는 순간까지 함께해요.</p>
    {[...new Set(RECIPES.map(item => item.element))].map(element => {
      const dishes = RECIPES.filter(item => item.element === element);
      return <details key={element}><summary>{element} · {dishes[0].taste}</summary>
        <ul>{dishes.map(dish => <li key={dish.slug}><a href={pathFor(dish)}>{dish.name}<small>{dish.category} · 2인분 · 약 {dish.prep + dish.cook}분</small></a></li>)}</ul>
      </details>;
    })}
  </section>;
}
