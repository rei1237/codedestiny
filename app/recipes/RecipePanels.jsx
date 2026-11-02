import Image from 'next/image';
import styles from './recipe-comic.module.css';

export default function RecipePanels({ recipe }) {
  return <ol className={styles.panels} aria-label="웹툰으로 따라 만드는 조리 순서">
    {recipe.steps.map(([title, text], i) => <li id={`step-${i + 1}`} key={title} className={styles.panel}>
      <span className={styles.panelNumber}>장면 {String(i + 1).padStart(2, '0')} / {recipe.steps.length}</span>
      <h3>{title}</h3>
      <div className={styles.scene}>
        <Image src={`/images/five-elements/yeoni-${recipe.stages[i]}-2d.webp`} alt="요리를 안내하는 연이" width={120} height={120} sizes="120px" />
        <p className={styles.bubble}>{recipe.tips[i]}</p>
      </div>
      <p className={styles.caption}>{text}</p>
    </li>)}
  </ol>;
}
