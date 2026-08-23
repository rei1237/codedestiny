import { fortuneTeaHouseAssets } from "../data/assets";
import { teaHouseCtaCopy, teaHouseCtaCopyDefault } from "../data/story";
import AssetImage from "./AssetImage";
import TeaHouseButton from "./TeaHouseButton";
import styles from "../styles/fortune-tea-house.module.css";
import { useLocale } from "@/lib/i18n/useT";
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
  // 🔴 이 문구는 CMS(빌드타임)와 사전(런타임) 두 층을 갖는다. cmsText 는 빌드 시점에 이미
  // 문자열로 굳으므로 런타임에는 오버라이드 여부를 알 수 없다. CMS 편집은 한국어 운영자가
  // 하는 것이니 ko 는 CMS 결과를 그대로 쓰고, 나머지 로케일만 사전을 태운다.
  const locale = useLocale();
  const localized = useTeaHouseCopy("ctaCopy", teaHouseCtaCopyDefault);
  const ctaCopy = locale === "ko" ? teaHouseCtaCopy : localized;
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
        <h2 id="teaHouseCtaTitle">{ctaCopy.title}</h2>
        <p>{ctaCopy.text}</p>
        <div className={styles.ctaActions}>
          <TeaHouseButton onClick={onReady}>{ctaCopy.cta}</TeaHouseButton>
          <TeaHouseButton variant="ghost" onClick={onRestart}>
            {ctaCopy.reset}
          </TeaHouseButton>
        </div>
      </div>
    </section>
  );
}
