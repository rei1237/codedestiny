import Image from 'next/image';
import type { LoadingLocale } from '@/constants/loadingMessages';
import { localizedTier } from '@/app/yeongnyangi/_lib/consultation-locale-copy';
import { SERVICE_PACK_IMAGES } from './service-pack-images';
import styles from './service-pack-showcase.module.css';

const COPY: Record<LoadingLocale, readonly [string, string, string]> = {
  "ko": [
    "영냥이 세트 준비 중",
    "고등어부터 참치까지, 연이와 영냥이가 생선 꾸러미를 준비하고 있어요.",
    "{fish} 세트"
  ],
  "en": [
    "Yeongnyangi sets in preparation",
    "From mackerel to tuna, Yeoni and Yeongnyangi are preparing little fish bundles.",
    "{fish} set"
  ],
  "ja": [
    "ヨンニャンイセットを準備中",
    "サバからマグロまで、ヨニとヨンニャンイがお魚の包みを準備しています。",
    "{fish}セット"
  ],
  "zh-CN": [
    "灵喵套餐准备中",
    "从青花鱼到金枪鱼，妍伊和灵喵正在准备小鱼礼包。",
    "{fish}套餐"
  ],
  "zh-TW": [
    "靈喵套餐準備中",
    "從青花魚到鮪魚，妍伊和靈喵正在準備小魚禮包。",
    "{fish}套餐"
  ],
  "vi": [
    "Các bộ Yeongnyangi đang được chuẩn bị",
    "Từ cá thu đến cá ngừ, Yeoni và Yeongnyangi đang chuẩn bị những gói cá nhỏ.",
    "Bộ {fish}"
  ],
  "hi": [
    "योंगन्यांगी सेट तैयार हो रहे हैं",
    "मैकेरल से टूना तक, योनी और योंगन्यांगी मछली के छोटे पैकेट तैयार कर रहे हैं।",
    "{fish} सेट"
  ],
  "es": [
    "Lotes de Yeongnyangi en preparación",
    "De caballa a atún, Yeoni y Yeongnyangi preparan pequeños paquetes de pescado.",
    "Lote {fish}"
  ],
  "fr": [
    "Les lots Yeongnyangi se préparent",
    "Du maquereau au thon, Yeoni et Yeongnyangi préparent de petits assortiments de poissons.",
    "Lot {fish}"
  ],
  "de": [
    "Yeongnyangi-Sets in Vorbereitung",
    "Von Makrele bis Thunfisch: Yeoni und Yeongnyangi bereiten kleine Fischpakete vor.",
    "{fish}-Set"
  ],
  "nl": [
    "Yeongnyangi-sets in voorbereiding",
    "Van makreel tot tonijn: Yeoni en Yeongnyangi bereiden kleine vispakketjes voor.",
    "{fish}-set"
  ],
  "ms": [
    "Set Yeongnyangi sedang disediakan",
    "Daripada makerel hingga tuna, Yeoni dan Yeongnyangi sedang menyediakan bungkusan ikan kecil.",
    "Set {fish}"
  ]
};

export default function ServicePackShowcase({ locale }: { locale: LoadingLocale }) {
  const [title, description, label] = COPY[locale] || COPY.en;

  return (
    <section
      className={styles.section}
      aria-labelledby="yeongnyangi-set-preview-title"
      data-yeongnyangi-set-showcase
    >
      <h2 id="yeongnyangi-set-preview-title">{title}</h2>
      <p>{description}</p>
      <ul className={styles.sets}>
        {Object.entries(SERVICE_PACK_IMAGES).map(([fishId, src]) => (
          <li key={fishId}>
            <Image
              src={src}
              alt=""
              width={256}
              height={256}
              sizes="(max-width:640px) 42vw, 220px"
              loading="lazy"
            />
            <h3>{label.replace('{fish}', localizedTier(fishId, locale))}</h3>
          </li>
        ))}
      </ul>
    </section>
  );
}
