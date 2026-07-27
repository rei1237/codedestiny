"use client";

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type OfflineCopy = {
  title: string;
  body: string;
  retry: string;
};

// Partial 을 벗겨 **타입이 로케일 누락을 잡게** 한다. 새 로케일이 늘면 컴파일이 막는다.
const OFFLINE_COPY: Record<LoadingLocale, OfflineCopy> = {
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
  "zh-TW": {
    title: "網路連線已中斷",
    body: "請檢查網路狀態後重試。",
    retry: "重試",
  },
  vi: {
    title: "Bạn đang ngoại tuyến",
    body: "Hãy kiểm tra kết nối mạng rồi thử lại.",
    retry: "Thử lại",
  },
  hi: {
    title: "आप ऑफ़लाइन हैं",
    body: "अपना नेटवर्क कनेक्शन जाँचकर फिर से कोशिश करें।",
    retry: "पुनः प्रयास",
  },
  es: {
    title: "Estás sin conexión",
    body: "Comprueba tu conexión de red e inténtalo de nuevo.",
    retry: "Reintentar",
  },
  fr: {
    title: "Vous êtes hors ligne",
    body: "Vérifiez votre connexion réseau puis réessayez.",
    retry: "Réessayer",
  },
  de: {
    title: "Sie sind offline",
    body: "Prüfen Sie Ihre Netzwerkverbindung und versuchen Sie es erneut.",
    retry: "Erneut versuchen",
  },
  nl: {
    title: "Je bent offline",
    body: "Controleer je netwerkverbinding en probeer het opnieuw.",
    retry: "Opnieuw",
  },
  ms: {
    title: "Anda di luar talian",
    body: "Semak sambungan rangkaian anda dan cuba lagi.",
    retry: "Cuba lagi",
  },
};

function resolveOfflineCopy(locale: LoadingLocale) {
  return OFFLINE_COPY[locale];
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
