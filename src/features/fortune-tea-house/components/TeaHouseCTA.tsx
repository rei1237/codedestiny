import { fortuneTeaHouseAssets } from "../data/assets";
import { teaHouseCtaCopy } from "../data/story";
import AssetImage from "./AssetImage";
import TeaHouseButton from "./TeaHouseButton";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type TeaHouseCTAProps = {
  onReady: () => void;
  onRestart: () => void;
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    키는 문구의 결정론적 해시라 같은 문구가 자동으로 한 키로 합쳐진다(정적 셸의 마커 도구와 같은 방식). */
const KO = {
  ktg9i3ix: "찻잔 상담을 준비하는 연이",
  kxau4l8n: "연이가 찻물을 데우는 밤",
};

export default function TeaHouseCTA({ onReady, onRestart }: TeaHouseCTAProps) {
  const copy = useTeaHouseCopy("teaHouseCTA", KO);
  return (
    <section className={styles.ctaScene} aria-labelledby="teaHouseCtaTitle">
      <div className={styles.ctaPortrait}>
        <AssetImage
          className={styles.ctaYeoni}
          src={fortuneTeaHouseAssets.yeoni.transparent.bust}
          alt={copy.ktg9i3ix}
          priority
        />
      </div>
      <div className={styles.ctaPanel}>
        <p className={styles.sceneEyebrow}>{copy.kxau4l8n}</p>
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
