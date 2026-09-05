"use client";

import { useEffect, useState } from "react";
import { SystemNotice } from "../components/SystemNotice";
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
    <SystemNotice
      title={copy.title}
      eyebrow="PALM DESTINY"
      description={copy.description}
      actions={
        <>
          <button type="button" onClick={reset} className="policy-btn policy-btn--primary">
            {copy.retry}
          </button>
          <a href="/" className="policy-btn policy-btn--ghost">
            {copy.home}
          </a>
        </>
      }
    />
  );
}
