"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { openPaidFeatureGate, runBillingCoinGate } from "@/app/_lib/billing-client";
import type { SajuEngineResult } from "@/app/saju/animal-destiny/lib/types";
import DestinyMeetingPlaceHero from "./DestinyMeetingPlaceHero";
import DestinyMeetingPlaceLoading from "./DestinyMeetingPlaceLoading";
import DestinyMeetingPlaceResult from "./DestinyMeetingPlaceResult";
import { generateDestinyMeetingPlaceResult } from "./destinyMeetingPlaceEngine";
import type { DestinyMeetingPlaceResult as MeetingResult } from "./destinyMeetingPlaceTypes";

const FEATURE_KEY = "destiny_meeting_place";
const FEATURE_REASON = "사주로 보는 인연의 장소 1회 분석";
const FEATURE_COST = 100;
const FEATURE_MEMBERSHIP_CREDIT_COST = FEATURE_COST * 10;
const FEATURE_PRICE_LABEL = `${(FEATURE_COST * 100).toLocaleString("ko-KR")}원`;
const HERO_IMAGE = "/fuctionassets/%EC%82%AC%EC%A3%BC%EB%A1%9C%EB%B3%B4%EB%8A%94%20%EC%9D%B8%EC%97%B0%EC%9D%98%20%EC%9E%A5%EC%86%8C.webp";

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
  const hasSajuResult = Boolean(sajuResult);

  const previewLine = useMemo(() => {
    if (!hasSajuResult) {
      return "출생 정보를 입력하면 인연이 열리는 장소와 시기를 바로 분석할 수 있습니다.";
    }
    const stem = String((sajuResult as Record<string, unknown>)?.dayStem || "").trim();
    if (stem) return `${stem} 일간의 감정 리듬으로 인연 좌표를 정밀 추천합니다.`;
    return "사주 에너지 기반으로 인연이 열리는 장소와 시기를 추천합니다.";
  }, [hasSajuResult, sajuResult]);

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
      toast.error("먼저 십이운성 동물 테스트 분석을 완료해 주세요.");
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
        message: "이용권 확인 중",
      });

      const gate = await runBillingCoinGate({
        featureKey: FEATURE_KEY,
        reason: FEATURE_REASON,
        forceDeduct: true,
        requestId,
        cost: FEATURE_COST,
        coinPrice: FEATURE_COST,
        membershipCreditCost: FEATURE_MEMBERSHIP_CREDIT_COST,
      });

      if (!gate.ok) {
        const code = String(gate.error?.code || "").toUpperCase();
        if (code === "INSUFFICIENT_COINS") {
          toast.error("유료 결제가 필요합니다. 결제 페이지에서 상품을 선택해 주세요.");
          return;
        }
        if (code === "AUTH_REQUIRED") {
          toast.error("로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");
          return;
        }
        toast.error(gate.error?.message || "결제 확인에 실패했습니다.");
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
      toast.success("인연의 장소 리포트가 열렸습니다.");
    } finally {
      setIsCharging(false);
      setIsLoading(false);
    }
  }, [isCharging, isLoading, sajuResult]);

  return (
    <>
      <section id="destiny-meeting-place-entry" className="mt-10 rounded-3xl border border-[#e6cfa0] bg-[linear-gradient(140deg,#fff8eb,#f5f6ff)] p-5 shadow-[0_20px_40px_rgba(27,44,77,0.15)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7d5b12]">재밌는 사주 콘텐츠 확장</p>
        <h3 className="mt-2 text-2xl font-black text-[#163758]">사주로 보는 인연의 장소</h3>
        <p className="mt-2 text-sm text-[#355274]">운명의 만남이 시작될 장소, 국가, 시기, 아이템을 사주 데이터로 추천합니다.</p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-[#e4d3b0] bg-white/70">
          <img
            src={HERO_IMAGE}
            alt="사주로 보는 인연의 장소 이미지"
            loading="lazy"
            decoding="async"
            className="h-[150px] w-full object-cover sm:h-[190px]"
          />
        </div>
        <p className="mt-2 text-xs text-[#5f6f84]">{previewLine}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-[#fff0cf] px-3 py-1 font-black text-[#8b6116]">1회 {FEATURE_PRICE_LABEL}</span>
          <span className="rounded-full bg-[#e6f0ff] px-3 py-1 font-bold text-[#214a77]">이용권 확인 후 단건/월정석 결제 지원</span>
        </div>
        <button
          type="button"
          onClick={handleOpen}
          className="mt-4 rounded-2xl bg-[linear-gradient(90deg,#8b5cf6,#ff8bd8)] px-5 py-3 text-sm font-black text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-95"
        >
          인연의 장소 찾기
        </button>
      </section>

      {open ? (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#090614]/95 p-4 md:p-6">
          <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-gradient-to-b from-[#120724] via-[#24104a] to-[#070812] p-4 text-white shadow-2xl md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffd36e]">Meeting Place Oracle</p>
                <h2 className="text-2xl font-black">사주로 보는 인연의 장소</h2>
                <p className="text-sm text-[#e5ddff]">운명의 만남이 시작될 곳을 찾아보세요.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="닫기"
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
                  {FEATURE_PRICE_LABEL}으로 다시 분석하기
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-bold text-white/90"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
