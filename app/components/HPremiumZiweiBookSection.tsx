"use client";
/**
 * [프리미엄 자미두수 PDF 기능]
 * - 13개 챕터의 정밀 리포트를 PDF 파일로 생성하여 제공하는 서비스입니다.
 * - public/js/ziwei-book.js 및 전역 window 함수를 사용하여 동작합니다.
 * - '자미두수 심화 기능' 웹 리포트와는 별개의 독립적인 PDF 전용 서비스입니다.
 */
import { useEffect, useCallback } from "react";
import PremiumBlurGate from "./PremiumBlurGate";

interface HPremiumZiweiBookSectionProps {
  showIntro?: boolean;
  onStartGeneration?: () => void;
  generationLoading?: boolean;
  isUnlocked?: boolean;
}

export default function HPremiumZiweiBookSection({
  showIntro = false,
  onStartGeneration,
  generationLoading = false,
  isUnlocked = false,
}: HPremiumZiweiBookSectionProps) {
  // Ensure ziwei-book.js is loaded
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).generateZiweiBook) {
      const script = document.createElement("script");
      script.src = "/js/ziwei-book.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleOpenModal = useCallback(() => {
    if (typeof (window as any).openZiweiBookModal === "function") {
      (window as any).openZiweiBookModal();
    } else {
      alert("프리미엄 자미두수 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
    }
  }, []);

  if (showIntro) {
    return (
      <div className="p-8 bg-gradient-to-br from-[#050510] via-[#1a0b3a] to-[#050510] rounded-[2.5rem] border border-purple-500/20 shadow-[0_0_50px_rgba(139,92,246,0.15)] relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-2xl text-white">🌌</span>
            </div>
            <div>
              <span className="text-[10px] font-black tracking-[0.4em] text-purple-400 uppercase">Premium Service</span>
              <h3 className="text-2xl font-black text-white leading-none mt-1">자미두수 인생 총람 PDF</h3>
            </div>
          </div>
          <div className="space-y-4 mb-8">
            <p className="text-purple-100/80 text-sm leading-relaxed">
              13개의 챕터로 구성된 당신만의 <span className="text-purple-300 font-bold">초정밀 자미두수 리포트</span>를 PDF로 다운로드하세요.
            </p>
          </div>
          <button
            onClick={() => onStartGeneration?.()}
            disabled={generationLoading}
            className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-[#1a1200] font-black rounded-2xl shadow-[0_10px_30px_rgba(245,158,11,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>👑 인생 총람 PDF 생성하기</span>
            <span className="text-[10px] px-2 py-0.5 bg-black/10 rounded-full font-bold">590코인</span>
          </button>
        </div>
      </div>
    );
  }

  // 해금 전 상태
  if (!isUnlocked) {
    return (
      <div className="relative min-h-[400px]">
        <PremiumBlurGate
          lockedTitle="자미두수 인생 총람 PDF"
          subDesc="전문가급 심화 분석 리포트 해금"
          onUnlock={() => onStartGeneration?.()}
          previewContent={
            <div className="text-purple-300/50 text-center italic mb-8">
              13챕터로 구성된 당신의 인생 총람 PDF 리포트를 생성할 수 있습니다.
            </div>
          }
          lockedItems={[
            "자미두수 심층 리포트 PDF 다운로드",
            "타고난 운명적 반복 패턴 분석",
            "성공을 위한 전문가 개운법 조언",
            "시점별 변화 정밀 산출 데이터"
          ]}
        />
      </div>
    );
  }

  // 해금 후 상태 - 모달 오픈 버튼 제공
  return (
    <div className="p-8 bg-white/5 border border-white/10 rounded-3xl text-center space-y-6">
      <h3 className="text-2xl font-black text-white">결제가 완료되었습니다.</h3>
      <p className="text-gray-400 text-sm">아래 버튼을 눌러 인생 총람 생성을 시작하세요.</p>
      <button 
        onClick={handleOpenModal}
        className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl transition-all shadow-lg"
      >
        PDF 리포트 생성기 열기
      </button>
    </div>
  );
}
