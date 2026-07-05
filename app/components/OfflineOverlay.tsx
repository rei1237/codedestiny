"use client";

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type OfflineCopy = {
  title: string;
  body: string;
  retry: string;
};

const OFFLINE_COPY: Partial<Record<LoadingLocale, OfflineCopy>> = {
  ko: {
    title: "인터넷 연결이 끊겼어요",
    body: "네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
    retry: "다시 시도",
  },
  en: {
    title: "You're offline",
    body: "Check your network connection and try again.",
    retry: "Retry",
  },
  ja: {
    title: "インターネット接続が切れました",
    body: "ネットワークの状態を確認してからもう一度お試しください。",
    retry: "再試行",
  },
  "zh-CN": {
    title: "网络连接已断开",
    body: "请检查网络状态后重试。",
    retry: "重试",
  },
};

function resolveOfflineCopy(locale: LoadingLocale) {
  return OFFLINE_COPY[locale] || OFFLINE_COPY.ko!;
}

export default function OfflineOverlay() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(typeof navigator !== "undefined" && navigator.onLine === false);

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  const copy = resolveOfflineCopy(getCurrentLoadingLocale());

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-[#070b1f]/95 px-6 text-center backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <p className="m-0 text-lg font-black text-[#fff3c4]">{copy.title}</p>
        <p className="m-0 text-sm font-semibold text-slate-300">{copy.body}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 rounded-full bg-[#f3d680] px-5 py-2 text-sm font-black text-[#111827]"
        >
          {copy.retry}
        </button>
      </div>
    </div>
  );
}
