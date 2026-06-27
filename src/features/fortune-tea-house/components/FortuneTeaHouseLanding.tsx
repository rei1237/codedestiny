import { teaHouseLandingCopy } from "../data/story";
import { fortuneTeaHouseAssets } from "../data/assets";
import AssetImage from "./AssetImage";
import TeaHouseButton from "./TeaHouseButton";
import styles from "../styles/fortune-tea-house.module.css";

type FortuneTeaHouseLandingProps = {
  onEnter: () => void;
};

export default function FortuneTeaHouseLanding({ onEnter }: FortuneTeaHouseLandingProps) {
  return (
    <section className={styles.landingScene} aria-labelledby="fortuneTeaHouseTitle">
      <div className={styles.landingCopy}>
        <p className={styles.sceneEyebrow}>{teaHouseLandingCopy.eyebrow}</p>
        <h1 id="fortuneTeaHouseTitle">{teaHouseLandingCopy.title}</h1>
        <p>{teaHouseLandingCopy.lead}</p>
        <TeaHouseButton onClick={onEnter}>{teaHouseLandingCopy.cta}</TeaHouseButton>
        <div className={styles.landingPrologue} aria-label="운명의 찻집 프롤로그">
          {teaHouseLandingCopy.prologue.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
      <div className={styles.landingVisual}>
        <AssetImage
          className={styles.landingSceneCard}
          src={fortuneTeaHouseAssets.backgrounds.loadingScene}
          alt="달빛 찻잔이 빛나는 운명의 찻집 장면"
          priority
        />
        <span className={styles.moonPlate} aria-hidden />
        <AssetImage
          className={styles.landingPigMascot}
          src={fortuneTeaHouseAssets.pig.base1}
          alt="문 앞에서 손님을 기다리는 꽃돼지?"
          priority
        />
        <span className={styles.gateSign}>운명의 찻집</span>
      </div>
    </section>
  );
}
