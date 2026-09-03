"use client";

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

const PALM_READING_ERROR_TEXT_TRANSLATIONS = {
  ko: {
    title: "손금 화면을 불러오는 중 오류가 발생했습니다.",
    description: "일시적인 브라우저 상태나 이미지 처리 오류일 수 있습니다. 다시 시도하면 대부분 정상 복구됩니다.",
    retry: "다시 시도",
    home: "메인으로 이동",
  },
  en: {
    title: "An error occurred while loading the palm reading screen.",
    description: "This may be a temporary browser issue or an image processing error. Retrying usually resolves it.",
    retry: "Try again",
    home: "Go to main",
  },
  ja: {
    title: "手相画面の読み込み中にエラーが発生しました。",
    description: "一時的なブラウザの状態や画像処理エラーの可能性があります。再試行するとほとんどの場合正常に戻ります。",
    retry: "再試行",
    home: "メインへ移動",
  },
  "zh-CN": {
    title: "加载手相画面时发生了错误。",
    description: "可能是暂时的浏览器状态或图片处理错误。重试后大多可以恢复正常。",
    retry: "重试",
    home: "前往首页",
  },
  "zh-TW": {
    title: "載入手相畫面時發生了錯誤。",
    description: "可能是暫時的瀏覽器狀態或圖片處理錯誤。重試後大多可以恢復正常。",
    retry: "重試",
    home: "前往首頁",
  },
} as const;

function getPalmReadingErrorCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja" || locale === "zh-CN" || locale === "zh-TW") {
    return PALM_READING_ERROR_TEXT_TRANSLATIONS[locale];
  }
  return PALM_READING_ERROR_TEXT_TRANSLATIONS.ko;
}

export default function PalmReadingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getPalmReadingErrorCopy(locale);

  useEffect(() => {
    console.error("[PalmReadingError]", error);
  }, [error]);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
    };
  }, []);

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-10">
      <div className="w-full rounded-2xl border border-[#c8a84b]/45 bg-[#0d0808]/92 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.55)] md:p-8">
        <p className="text-xs font-black tracking-[0.2em] text-[#d4b45c]">PALM DESTINY</p>
        <h2 className="mt-3 text-xl font-black text-[#f5d987] md:text-2xl">{copy.title}</h2>
        <p className="mt-3 text-sm leading-7 text-[#ead7b6]/88 md:text-base">
          {copy.description}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="min-h-[44px] rounded-lg border border-[#d4af37]/70 bg-[linear-gradient(140deg,#8b0000_0%,#6b1a0a_35%,#5a1200_65%,#7a1800_100%)] px-4 py-2 text-sm font-bold text-[#fff8e0]"
          >
            {copy.retry}
          </button>
          <a
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#c8a84b]/45 bg-[#0b0606] px-4 py-2 text-sm font-bold text-[#f3dca0]"
          >
            {copy.home}
          </a>
        </div>
      </div>
    </section>
  );
}
