"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

const DESTINY_BIAS_PROMO_COPY = {
  ko: {
    eyebrow: "DESTINY BIAS WORLD",
    title: "심리테스트 다음, 최애운명 포토카드 스테이지",
    body:
      "내 사주와 최애 사주의 공명 점수를 계산하고, 탑꾸 스티커까지 붙인 한정판 포토카드를 받아보세요. 계산은 내부 명식 엔진이 수행하고, 해석은 AI가 맡아 감성과 신뢰를 함께 챙깁니다.",
    chipSelf: "내 사주 × 최애 사주",
    chipPhotoCard: "스티커 탑꾸 포토카드",
    cta: "최애운명 시작하기",
    imageAlt: "최애운명 서비스 배너",
    priceBadge: "✨ 1회 5,000원 · 포토카드 포함",
  },
  en: {
    eyebrow: "DESTINY BIAS WORLD",
    title: "After the psychology test, enter the Destiny Bias photocard stage",
    body:
      "Calculate the resonance score between your saju and your favorite star's saju, then receive a limited photocard with decorative stickers. The chart engine handles the calculation, while AI adds an emotional, trustworthy reading.",
    chipSelf: "My saju × favorite's saju",
    chipPhotoCard: "Sticker-decorated photocard",
    cta: "Start Destiny Bias",
    imageAlt: "Destiny Bias service banner",
    priceBadge: "✨ 5,000 KRW per reading · Photocard included",
  },
  ja: {
    eyebrow: "DESTINY BIAS WORLD",
    title: "心理テストの次は、推し運命フォトカードステージへ",
    body:
      "あなたの四柱推命と推しの四柱推命の共鳴スコアを計算し、ステッカーで飾った限定フォトカードを受け取れます。計算は内部命式エンジンが行い、解釈はAIが感性と信頼感を添えて届けます。",
    chipSelf: "私の四柱 × 推しの四柱",
    chipPhotoCard: "ステッカーデコフォトカード",
    cta: "推し運命を始める",
    imageAlt: "推し運命サービスバナー",
    priceBadge: "✨ 1回 5,000ウォン · フォトカード込み",
  },
  zh: {
    eyebrow: "DESTINY BIAS WORLD",
    title: "心理测试之后，进入本命命运拍立得舞台",
    body:
      "计算你的四柱与本命四柱的共鸣分数，并获得贴纸装饰的限定拍立得。内部命盘引擎负责计算，AI 负责带来兼具感性与可信度的解读。",
    chipSelf: "我的四柱 × 本命四柱",
    chipPhotoCard: "贴纸装饰拍立得",
    cta: "开始本命命运",
    imageAlt: "本命命运服务横幅",
    priceBadge: "✨ 每次 5,000 韩元 · 含拍立得",
  },
};

function getDestinyBiasPromoCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja") return DESTINY_BIAS_PROMO_COPY[locale];
  if (locale === "zh-CN" || locale === "zh-TW") return DESTINY_BIAS_PROMO_COPY.zh;
  return DESTINY_BIAS_PROMO_COPY.ko;
}

export default function DestinyBiasPromoSection() {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getDestinyBiasPromoCopy(locale);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("cd:locale-change", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("cd:locale-change", syncLocale);
    };
  }, []);

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
            <Image
              src="/fuctionassets/%EC%B5%9C%EC%95%A0%EC%9A%B4%EB%AA%85.webp"
              alt={copy.imageAlt}
              width={960}
              height={640}
              className="h-full w-full object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
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
