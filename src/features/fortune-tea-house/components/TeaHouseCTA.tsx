import { fortuneTeaHouseAssets } from "../data/assets";
import { teaHouseCtaCopy } from "../data/story";
import AssetImage from "./AssetImage";
import TeaHouseButton from "./TeaHouseButton";
import styles from "../styles/fortune-tea-house.module.css";

type TeaHouseCTAProps = {
  onReady: () => void;
  onRestart: () => void;
};

export default function TeaHouseCTA({ onReady, onRestart }: TeaHouseCTAProps) {
  return (
    <section className={styles.ctaScene} aria-labelledby="teaHouseCtaTitle">
      <div className={styles.ctaPortrait}>
        <AssetImage
          className={styles.ctaYeoni}
          src={fortuneTeaHouseAssets.yeoni.transparent.bust}
          alt="찻잔 상담을 준비하는 연이"
          priority
        />
      </div>
      <div className={styles.ctaPanel}>
        <p className={styles.sceneEyebrow}>연이가 찻물을 데우는 밤</p>
        <h2 id="teaHouseCtaTitle">{teaHouseCtaCopy.title}</h2>
        <p>{teaHouseCtaCopy.text}</p>
        <div className={styles.ctaActions}>
          <TeaHouseButton onClick={onReady}>{teaHouseCtaCopy.cta}</TeaHouseButton>
          <TeaHouseButton variant="ghost" onClick={onRestart}>
            {teaHouseCtaCopy.reset}
          </TeaHouseButton>
        </div>
      </div>
    </section>
  );
}
