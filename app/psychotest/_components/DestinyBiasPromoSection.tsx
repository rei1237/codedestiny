"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface DestinyBiasPromoCopy {
  eyebrow: string;
  title: string;
  body: string;
  chipSelf: string;
  chipPhotoCard: string;
  cta: string;
  imageAlt: string;
  priceBadge: string;
}

const DESTINY_BIAS_PROMO_EN: DestinyBiasPromoCopy = {
  eyebrow: "DESTINY BIAS WORLD",
  title: "After the psychology test, enter the Destiny Bias photocard stage",
  body: "Calculate the resonance score between your saju and your favorite star's saju, then receive a limited photocard with decorative stickers. The chart engine handles the calculation, while AI adds an emotional, trustworthy reading.",
  chipSelf: "My saju × favorite's saju",
  chipPhotoCard: "Sticker-decorated photocard",
  cta: "Start Destiny Bias",
  imageAlt: "Destiny Bias service banner",
  priceBadge: "✨ Free · Photocard included",
};

const DESTINY_BIAS_PROMO_COPY: Partial<Record<LoadingLocale, DestinyBiasPromoCopy>> = {
  ko: {
    eyebrow: "DESTINY BIAS WORLD",
    title: "심리테스트 다음, 최애운명 포토카드 스테이지",
    body: "내 사주와 최애 사주의 공명 점수를 계산하고, 탑꾸 스티커까지 붙인 한정판 포토카드를 받아보세요. 계산은 내부 명식 엔진이 수행하고, 해석은 전문가가 맡아 감성과 신뢰를 함께 챙깁니다.",
    chipSelf: "내 사주 × 최애 사주",
    chipPhotoCard: "스티커 탑꾸 포토카드",
    cta: "최애운명 시작하기",
    imageAlt: "최애운명 서비스 배너",
    priceBadge: "✨ 무료 · 포토카드 포함",
  },
  ja: {
    eyebrow: "DESTINY BIAS WORLD",
    title: "心理テストの次は、推し運命フォトカードステージへ",
    body: "あなたの四柱推命と推しの四柱推命の共鳴スコアを計算し、ステッカーで飾った限定フォトカードを受け取れます。計算は内部命式エンジンが行い、解釈はAIが感性と信頼感を添えて届けます。",
    chipSelf: "私の四柱 × 推しの四柱",
    chipPhotoCard: "ステッカーデコフォトカード",
    cta: "推し運命を始める",
    imageAlt: "推し運命サービスバナー",
    priceBadge: "✨ 無料 · フォトカード込み",
  },
  "zh-CN": {
    eyebrow: "DESTINY BIAS WORLD",
    title: "心理测试之后，进入本命命运拍立得舞台",
    body: "计算你的四柱与本命四柱的共鸣分数，并获得贴纸装饰的限定拍立得。内部命盘引擎负责计算，AI 负责带来兼具感性与可信度的解读。",
    chipSelf: "我的四柱 × 本命四柱",
    chipPhotoCard: "贴纸装饰拍立得",
    cta: "开始本命命运",
    imageAlt: "本命命运服务横幅",
    priceBadge: "✨ 免费 · 含拍立得",
  },
  "zh-TW": {
    eyebrow: "DESTINY BIAS WORLD",
    title: "心理測試之後，進入本命命運拍立得舞台",
    body: "計算你的四柱與本命四柱的共鳴分數，並獲得貼紙裝飾的限定拍立得。內部命盤引擎負責計算，AI 負責帶來兼具感性與可信度的解讀。",
    chipSelf: "我的四柱 × 本命四柱",
    chipPhotoCard: "貼紙裝飾拍立得",
    cta: "開始本命命運",
    imageAlt: "本命命運服務橫幅",
    priceBadge: "✨ 免費 · 含拍立得",
  },
  vi: {
    eyebrow: "DESTINY BIAS WORLD",
    title: "Sau bài trắc nghiệm tâm lý, bước vào sân khấu photocard Vận Mệnh Thần Tượng",
    body: "Tính điểm cộng hưởng giữa Saju của bạn và Saju của thần tượng yêu thích, rồi nhận một photocard giới hạn được trang trí sticker. Bộ máy lá số đảm nhận phần tính toán, còn AI mang đến phần diễn giải giàu cảm xúc và đáng tin cậy.",
    chipSelf: "Saju của tôi × Saju thần tượng",
    chipPhotoCard: "Photocard trang trí sticker",
    cta: "Bắt đầu Vận Mệnh Thần Tượng",
    imageAlt: "Banner dịch vụ Vận Mệnh Thần Tượng",
    priceBadge: "✨ Miễn phí · Kèm photocard",
  },
  hi: {
    eyebrow: "DESTINY BIAS WORLD",
    title: "मनोवैज्ञानिक परीक्षण के बाद, डेस्टिनी बायस फोटोकार्ड स्टेज में प्रवेश करें",
    body: "अपने साजू और अपने पसंदीदा स्टार के साजू के बीच अनुनाद स्कोर की गणना करें, फिर सजावटी स्टिकर वाला सीमित फोटोकार्ड प्राप्त करें। गणना चार्ट इंजन करता है, जबकि AI एक भावनात्मक, भरोसेमंद व्याख्या जोड़ता है।",
    chipSelf: "मेरा साजू × पसंदीदा का साजू",
    chipPhotoCard: "स्टिकर-सजाया फोटोकार्ड",
    cta: "डेस्टिनी बायस शुरू करें",
    imageAlt: "डेस्टिनी बायस सेवा बैनर",
    priceBadge: "✨ मुफ्त · फोटोकार्ड शामिल",
  },
  es: {
    eyebrow: "DESTINY BIAS WORLD",
    title: "Después del test psicológico, entra en el escenario de fotocartas Destiny Bias",
    body: "Calcula la puntuación de resonancia entre tu Saju y el Saju de tu estrella favorita, y recibe una fotocarta limitada con pegatinas decorativas. El motor de la carta se encarga del cálculo, mientras la IA aporta una lectura emotiva y confiable.",
    chipSelf: "Mi Saju × Saju del favorito",
    chipPhotoCard: "Fotocarta decorada con pegatinas",
    cta: "Empezar Destiny Bias",
    imageAlt: "Banner del servicio Destiny Bias",
    priceBadge: "✨ Gratis · Fotocarta incluida",
  },
  fr: {
    eyebrow: "DESTINY BIAS WORLD",
    title: "Après le test psychologique, entrez dans la scène des photocartes Destiny Bias",
    body: "Calculez le score de résonance entre votre Saju et celui de votre star préférée, puis recevez une photocarte limitée ornée d'autocollants. Le moteur de thème s'occupe du calcul, tandis que l'IA apporte une lecture émotive et fiable.",
    chipSelf: "Mon Saju × Saju du favori",
    chipPhotoCard: "Photocarte décorée d'autocollants",
    cta: "Démarrer Destiny Bias",
    imageAlt: "Bannière du service Destiny Bias",
    priceBadge: "✨ Gratuit · Photocarte incluse",
  },
  de: {
    eyebrow: "DESTINY BIAS WORLD",
    title: "Nach dem Psychotest geht es weiter zur Destiny-Bias-Fotokarten-Bühne",
    body: "Berechne den Resonanzwert zwischen deinem Saju und dem Saju deines Lieblingsstars und erhalte eine limitierte Fotokarte mit dekorativen Stickern. Die Chart-Engine übernimmt die Berechnung, während die KI eine emotionale, vertrauenswürdige Deutung liefert.",
    chipSelf: "Mein Saju × Saju des Favoriten",
    chipPhotoCard: "Mit Stickern verzierte Fotokarte",
    cta: "Destiny Bias starten",
    imageAlt: "Destiny-Bias-Service-Banner",
    priceBadge: "✨ Kostenlos · Fotokarte inklusive",
  },
  nl: {
    eyebrow: "DESTINY BIAS WORLD",
    title: "Na de psychologische test, betreed het Destiny Bias-fotokaartpodium",
    body: "Bereken de resonantiescore tussen jouw Saju en de Saju van je favoriete ster, en ontvang een gelimiteerde fotokaart met decoratieve stickers. De chartengine doet de berekening, terwijl AI een emotionele, betrouwbare duiding toevoegt.",
    chipSelf: "Mijn Saju × Saju van favoriet",
    chipPhotoCard: "Met stickers versierde fotokaart",
    cta: "Start Destiny Bias",
    imageAlt: "Destiny Bias-servicebanner",
    priceBadge: "✨ Gratis · Fotokaart inbegrepen",
  },
  ms: {
    eyebrow: "DESTINY BIAS WORLD",
    title: "Selepas ujian psikologi, masuk ke pentas kad foto Destiny Bias",
    body: "Kira skor resonans antara Saju anda dan Saju bintang kegemaran anda, kemudian terima kad foto edisi terhad berhias pelekat. Enjin carta mengendalikan pengiraan, manakala AI menambah tafsiran yang emosional dan boleh dipercayai.",
    chipSelf: "Saju saya × Saju kegemaran",
    chipPhotoCard: "Kad foto berhias pelekat",
    cta: "Mulakan Destiny Bias",
    imageAlt: "Sepanduk perkhidmatan Destiny Bias",
    priceBadge: "✨ Percuma · Termasuk kad foto",
  },
};

function getDestinyBiasPromoCopy(locale: LoadingLocale): DestinyBiasPromoCopy {
  return DESTINY_BIAS_PROMO_COPY[locale] || DESTINY_BIAS_PROMO_EN;
}

function useDestinyBiasPromoCopy(): DestinyBiasPromoCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return getDestinyBiasPromoCopy(locale);
}

export default function DestinyBiasPromoSection() {
  const copy = useDestinyBiasPromoCopy();

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-fuchsia-200/45 bg-[radial-gradient(circle_at_14%_16%,rgba(255,79,216,0.28),transparent_34%),radial-gradient(circle_at_84%_20%,rgba(34,211,238,0.2),transparent_34%),linear-gradient(155deg,#120626,#180a34_50%,#0a112b)] p-5 shadow-[0_22px_55px_rgba(12,7,32,0.5)] md:p-7">
      <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-cyan-200">{copy.eyebrow}</p>
          <h2 className="mt-2 text-xl font-black leading-tight text-white md:text-2xl">
            {copy.title}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-100/90">
            {copy.body}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-100/90">
            <span className="rounded-full border border-cyan-200/40 bg-cyan-200/10 px-3 py-1">{copy.chipSelf}</span>
            <span className="rounded-full border border-fuchsia-200/45 bg-fuchsia-300/15 px-3 py-1">{copy.chipPhotoCard}</span>
          </div>
          <Link
            href="/saju/destiny-bias"
            className="mt-5 inline-flex items-center rounded-xl border border-fuchsia-200/60 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 px-4 py-2.5 text-sm font-black text-white transition hover:brightness-110"
          >
            {copy.cta}
          </Link>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-fuchsia-300/30 blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-black/20">
            <img
              src="/fuctionassets/%EC%B5%9C%EC%95%A0%EC%9A%B4%EB%AA%85.webp"
              alt={copy.imageAlt}
              width={960}
              height={640}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl border border-white/25 bg-black/40 px-3 py-2 text-[11px] font-semibold text-cyan-100/90 backdrop-blur-md">
              {copy.priceBadge}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
