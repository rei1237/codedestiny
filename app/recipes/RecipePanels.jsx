import { recipeStageImage } from '../../lib/lifestyle/recipes.mjs';
import Image from 'next/image';
import styles from './recipe-comic.module.css';

export default function RecipePanels({ recipe }) {
  return <ol className={styles.panels} aria-label="웹툰으로 따라 만드는 조리 순서">
    {recipe.steps.map(([title, text], i) => <li id={`step-${i + 1}`} key={title} className={styles.panel}>
      <span className={styles.panelNumber}>장면 {String(i + 1).padStart(2, '0')} / {recipe.steps.length}</span>
      <h3>{title}</h3>
      <div className={recipe.host ? `${styles.scene} ${styles.illustratedScene}` : styles.scene}>
        <Image src={recipeStageImage(recipe, i)} alt={`${recipe.host ?? '연이'}의 ${title} 장면`} width={120} height={120} sizes="120px" />
        <p className={styles.bubble}>{recipe.tips[i]}</p>
      </div>
      <p className={styles.caption}>{text}</p>
    </li>)}
  </ol>;
}
