"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { openPaidFeatureGate, runBillingCoinGate } from "@/app/_lib/billing-client";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import type { SajuEngineResult } from "@/app/saju/animal-destiny/lib/types";
import DestinyMeetingPlaceHero from "./DestinyMeetingPlaceHero";
import DestinyMeetingPlaceLoading from "./DestinyMeetingPlaceLoading";
import DestinyMeetingPlaceResult from "./DestinyMeetingPlaceResult";
import { generateDestinyMeetingPlaceResult } from "./destinyMeetingPlaceEngine";
import type { DestinyMeetingPlaceResult as MeetingResult } from "./destinyMeetingPlaceTypes";

const FEATURE_KEY = "destiny_meeting_place";
const FEATURE_COST = 100;
const FEATURE_MEMBERSHIP_CREDIT_COST = FEATURE_COST * 10;
const FEATURE_PRICE_LABEL = `${(FEATURE_COST * 100).toLocaleString("ko-KR")}원`;
const HERO_IMAGE = "/fuctionassets/%EC%82%AC%EC%A3%BC%EB%A1%9C%EB%B3%B4%EB%8A%94%20%EC%9D%B8%EC%97%B0%EC%9D%98%20%EC%9E%A5%EC%86%8C.webp";

const DESTINY_MEETING_PLACE_FEATURE_TEXT_TRANSLATIONS = {
  ko: {
    featureReason: "사주로 보는 인연의 장소 1회 분석",
    previewEmpty: "출생 정보를 입력하면 인연이 열리는 장소와 시기를 바로 분석할 수 있습니다.",
    previewStem: "{stem} 일간의 감정 리듬으로 인연 좌표를 정밀 추천합니다.",
    previewDefault: "사주 에너지 기반으로 인연이 열리는 장소와 시기를 추천합니다.",
    noSaju: "먼저 십이운성 동물 테스트 분석을 완료해 주세요.",
    gateMessage: "이용권 확인 중",
    paidRequired: "유료 결제가 필요합니다. 결제 페이지에서 상품을 선택해 주세요.",
    authRequired: "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.",
    paymentFailed: "결제 확인에 실패했습니다.",
    success: "인연의 장소 리포트가 열렸습니다.",
    eyebrow: "재밌는 사주 콘텐츠 확장",
    title: "사주로 보는 인연의 장소",
    description: "운명의 만남이 시작될 장소, 국가, 시기, 아이템을 사주 데이터로 추천합니다.",
    heroAlt: "사주로 보는 인연의 장소 이미지",
    priceBadge: "1회 {price}",
    passBadge: "이용권 확인 후 단건/월정석 결제 지원",
    cta: "인연의 장소 찾기",
    modalEyebrow: "Meeting Place Oracle",
    modalDescription: "운명의 만남이 시작될 곳을 찾아보세요.",
    close: "닫기",
    rerun: "{price}으로 다시 분석하기",
  },
  en: {
    featureReason: "One Destiny Meeting Place analysis",
    previewEmpty: "Enter birth details to analyze where and when your destined connection may open.",
    previewStem: "We recommend destiny coordinates through the emotional rhythm of your {stem} day master.",
    previewDefault: "We recommend the places and timing where connection opens through your Saju energy.",
    noSaju: "Please complete the twelve-stage animal test analysis first.",
    gateMessage: "Checking pass access",
    paidRequired: "Paid access is required. Please choose a product on the payment page.",
    authRequired: "Your login session has expired. Please log in again.",
    paymentFailed: "Payment verification failed.",
    success: "Your destiny meeting place report is open.",
    eyebrow: "Playful Saju Content Extension",
    title: "Destiny Meeting Place by Saju",
    description: "Saju data recommends the places, countries, timing, and items where a destined meeting may begin.",
    heroAlt: "Destiny meeting place image based on Saju",
    priceBadge: "1 reading {price}",
    passBadge: "Single payment and membership access supported after pass check",
    cta: "Find My Meeting Place",
    modalEyebrow: "Meeting Place Oracle",
    modalDescription: "Find where your destined meeting may begin.",
    close: "Close",
    rerun: "Analyze again for {price}",
  },
  ja: {
    featureReason: "四柱で見る縁の場所 1回分析",
    previewEmpty: "出生情報を入力すると、縁が開く場所と時期をすぐに分析できます。",
    previewStem: "{stem}日干の感情リズムから、縁の座標を精密におすすめします。",
    previewDefault: "四柱のエネルギーをもとに、縁が開く場所と時期をおすすめします。",
    noSaju: "先に十二運星動物テスト分析を完了してください。",
    gateMessage: "利用券を確認中",
    paidRequired: "有料決済が必要です。決済ページで商品を選択してください。",
    authRequired: "ログインセッションが期限切れです。もう一度ログインしてください。",
    paymentFailed: "決済確認に失敗しました。",
    success: "縁の場所レポートが開きました。",
    eyebrow: "楽しい四柱コンテンツ拡張",
    title: "四柱で見る縁の場所",
    description: "運命の出会いが始まる場所、国、時期、アイテムを四柱データでおすすめします。",
    heroAlt: "四柱で見る縁の場所画像",
    priceBadge: "1回 {price}",
    passBadge: "利用券確認後、単件/月額決済に対応",
    cta: "縁の場所を探す",
    modalEyebrow: "Meeting Place Oracle",
    modalDescription: "運命の出会いが始まる場所を探してみましょう。",
    close: "閉じる",
    rerun: "{price}で再分析する",
  },
  "zh-CN": {
    featureReason: "四柱缘分地点单次分析",
    previewEmpty: "输入出生信息后，可立即分析缘分开启的地点与时机。",
    previewStem: "将根据{stem}日干的情绪节奏，精确推荐缘分坐标。",
    previewDefault: "将根据四柱能量推荐缘分开启的地点与时机。",
    noSaju: "请先完成十二运星动物测试分析。",
    gateMessage: "正在确认使用券",
    paidRequired: "需要付费。请在支付页面选择商品。",
    authRequired: "登录会话已过期。请重新登录。",
    paymentFailed: "支付确认失败。",
    success: "缘分地点报告已开启。",
    eyebrow: "有趣的四柱内容扩展",
    title: "四柱中的缘分地点",
    description: "根据四柱数据推荐命运相遇开始的地点、国家、时机与物品。",
    heroAlt: "四柱缘分地点图片",
    priceBadge: "1次 {price}",
    passBadge: "确认使用券后支持单次/月费支付",
    cta: "寻找缘分地点",
    modalEyebrow: "Meeting Place Oracle",
    modalDescription: "找出命运相遇可能开始的地方。",
    close: "关闭",
    rerun: "用 {price} 再次分析",
  },
  "zh-TW": {
    featureReason: "四柱緣分地點單次分析",
    previewEmpty: "輸入出生資訊後，可立即分析緣分開啟的地點與時機。",
    previewStem: "將根據{stem}日干的情緒節奏，精準推薦緣分座標。",
    previewDefault: "將根據四柱能量推薦緣分開啟的地點與時機。",
    noSaju: "請先完成十二運星動物測試分析。",
    gateMessage: "正在確認使用券",
    paidRequired: "需要付費。請在支付頁面選擇商品。",
    authRequired: "登入工作階段已過期。請重新登入。",
    paymentFailed: "付款確認失敗。",
    success: "緣分地點報告已開啟。",
    eyebrow: "有趣的四柱內容擴充",
    title: "四柱中的緣分地點",
    description: "根據四柱資料推薦命運相遇開始的地點、國家、時機與物品。",
    heroAlt: "四柱緣分地點圖片",
    priceBadge: "1次 {price}",
    passBadge: "確認使用券後支援單次/月費付款",
    cta: "尋找緣分地點",
    modalEyebrow: "Meeting Place Oracle",
    modalDescription: "找出命運相遇可能開始的地方。",
    close: "關閉",
    rerun: "用 {price} 再次分析",
  },
} as const;

function formatDestinyMeetingPlaceFeatureText(value: string, vars?: Record<string, string>) {
  return Object.entries(vars || {}).reduce((text, [key, replacement]) => text.replace(new RegExp(`\\{${key}\\}`, "g"), replacement), value);
}

function getDestinyMeetingPlaceFeatureCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja" || locale === "zh-CN" || locale === "zh-TW") {
    return DESTINY_MEETING_PLACE_FEATURE_TEXT_TRANSLATIONS[locale];
  }
  return DESTINY_MEETING_PLACE_FEATURE_TEXT_TRANSLATIONS.ko;
}

type Props = {
  sajuResult?: SajuEngineResult | null;
};

export default function DestinyMeetingPlaceFeature({ sajuResult }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [chargedCoins, setChargedCoins] = useState(100);
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const hasSajuResult = Boolean(sajuResult);
  const copy = getDestinyMeetingPlaceFeatureCopy(locale);

  const previewLine = useMemo(() => {
    if (!hasSajuResult) {
      return copy.previewEmpty;
    }
    const stem = String((sajuResult as Record<string, unknown>)?.dayStem || "").trim();
    if (stem) return formatDestinyMeetingPlaceFeatureText(copy.previewStem, { stem });
    return copy.previewDefault;
  }, [copy, hasSajuResult, sajuResult]);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    return () => window.removeEventListener("cd:locale-ready", syncLocale);
  }, []);

  const handleOpen = useCallback(() => {
    if (!hasSajuResult) {
      router.push("/saju/destiny-meeting-place");
      return;
    }
    setOpen(true);
  }, [hasSajuResult, router]);

  const runAnalysis = useCallback(async () => {
    if (isLoading || isCharging) return;
    if (!sajuResult) {
      toast.error(copy.noSaju);
      return;
    }

    setIsCharging(true);
    try {
      const requestId = `destiny-meeting-place:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      openPaidFeatureGate({
        featureKey: FEATURE_KEY,
        requestId,
        cost: FEATURE_COST,
        paymentMode: "pass",
        message: copy.gateMessage,
      });

      const gate = await runBillingCoinGate({
        featureKey: FEATURE_KEY,
        reason: copy.featureReason,
        forceDeduct: true,
        requestId,
        cost: FEATURE_COST,
        coinPrice: FEATURE_COST,
        membershipCreditCost: FEATURE_MEMBERSHIP_CREDIT_COST,
      });

      if (!gate.ok) {
        const code = String(gate.error?.code || "").toUpperCase();
        if (code === "INSUFFICIENT_COINS") {
          toast.error(copy.paidRequired);
          return;
        }
        if (code === "AUTH_REQUIRED") {
          toast.error(copy.authRequired);
          return;
        }
        toast.error(gate.error?.message || copy.paymentFailed);
        return;
      }

      const consume = gate.data?.consume as Record<string, unknown> | undefined;
      const pricingCost = Number(gate.data?.pricing?.coinPrice ?? gate.data?.pricing?.cost ?? FEATURE_COST);
      const charged = Number(consume?.chargedCoins ?? consume?.cost ?? consume?.coinPrice ?? pricingCost);
      setChargedCoins(Number.isFinite(charged) && charged > 0 ? charged : pricingCost);

      setIsLoading(true);
      const next = generateDestinyMeetingPlaceResult(sajuResult);
      await new Promise((resolve) => setTimeout(resolve, 1150));
      setResult(next);
      toast.success(copy.success);
    } finally {
      setIsCharging(false);
      setIsLoading(false);
    }
  }, [copy, isCharging, isLoading, sajuResult]);

  return (
    <>
      <section id="destiny-meeting-place-entry" className="mt-10 rounded-3xl border border-[#e6cfa0] bg-[linear-gradient(140deg,#fff8eb,#f5f6ff)] p-5 shadow-[0_20px_40px_rgba(27,44,77,0.15)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7d5b12]">{copy.eyebrow}</p>
        <h3 className="mt-2 text-2xl font-black text-[#163758]">{copy.title}</h3>
        <p className="mt-2 text-sm text-[#355274]">{copy.description}</p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-[#e4d3b0] bg-white/70">
          <img
            src={HERO_IMAGE}
            alt={copy.heroAlt}
            loading="lazy"
            decoding="async"
            className="h-[150px] w-full object-cover sm:h-[190px]"
          />
        </div>
        <p className="mt-2 text-xs text-[#5f6f84]">{previewLine}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-[#fff0cf] px-3 py-1 font-black text-[#8b6116]">{formatDestinyMeetingPlaceFeatureText(copy.priceBadge, { price: FEATURE_PRICE_LABEL })}</span>
          <span className="rounded-full bg-[#e6f0ff] px-3 py-1 font-bold text-[#214a77]">{copy.passBadge}</span>
        </div>
        <button
          type="button"
          onClick={handleOpen}
          className="mt-4 rounded-2xl bg-[linear-gradient(90deg,#8b5cf6,#ff8bd8)] px-5 py-3 text-sm font-black text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-95"
        >
          {copy.cta}
        </button>
      </section>

      {open ? (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#090614]/95 p-4 md:p-6">
          <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-gradient-to-b from-[#120724] via-[#24104a] to-[#070812] p-4 text-white shadow-2xl md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffd36e]">{copy.modalEyebrow}</p>
                <h2 className="text-2xl font-black">{copy.title}</h2>
                <p className="text-sm text-[#e5ddff]">{copy.modalDescription}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label={copy.close}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <DestinyMeetingPlaceHero onStart={runAnalysis} disabled={isCharging || isLoading} />

              {isLoading ? <DestinyMeetingPlaceLoading /> : null}

              {result ? <DestinyMeetingPlaceResult result={result} chargedCoins={chargedCoins} /> : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={runAnalysis}
                  disabled={isCharging || isLoading}
                  className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {formatDestinyMeetingPlaceFeatureText(copy.rerun, { price: FEATURE_PRICE_LABEL })}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-bold text-white/90"
                >
                  {copy.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
