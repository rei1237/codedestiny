"use client";

import { useEffect } from "react";
import { SystemNotice } from "./components/SystemNotice";
import { useTPick } from "../lib/i18n/useT";

// 에러 화면은 사전을 받기 전에도(또는 사전 요청이 실패한 채로) 뜬다. useT 는 그때 자리표시
// 문구("번역을 준비 중입니다")만 내므로, 한국어 원문을 두고 사전에 값이 있을 때만 바꾼다.
const KO = {
  title: "화면을 불러오는 중 문제가 생겼어요.",
  description: "일시적인 오류일 수 있어요. 다시 시도하면 대부분 정상적으로 돌아옵니다.",
  retry: "다시 시도",
  goHome: "메인으로 이동",
} as const;

export default function RootRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pick = useTPick(undefined, "ko");
  const t = (key: `errorBoundary.${keyof typeof KO}`) =>
    pick(key, KO[key.slice("errorBoundary.".length) as keyof typeof KO]) as string;
  useEffect(() => {
    console.error("[RootRouteError]", error);
    // 배포 전환 순간 이전 HTML이 사라진 청크를 요청하면 ChunkLoadError로 떨어진다.
    // 새 HTML을 받으면 해결되므로 경로당 1회만 자동 새로고침한다(무한 루프 방지).
    const chunkFailed =
      error?.name === "ChunkLoadError" || /Loading chunk \S+ failed/i.test(String(error?.message || ""));
    if (!chunkFailed || typeof window === "undefined") return;
    const reloadKey = `cd:chunk-reload:${window.location.pathname}`;
    try {
      if (window.sessionStorage.getItem(reloadKey)) return;
      window.sessionStorage.setItem(reloadKey, String(Date.now()));
    } catch {
      return;
    }
    window.location.reload();
  }, [error]);

  return (
    <SystemNotice
      title={t("errorBoundary.title")}
      eyebrow="꿀꿀운세"
      description={t("errorBoundary.description")}
      actions={
        <>
          <button
            type="button"
            onClick={reset}
            className="policy-btn policy-btn--primary"
            aria-label={t("errorBoundary.retry")}
          >
            {t("errorBoundary.retry")}
          </button>
          <a href="/" className="policy-btn policy-btn--ghost">
            {t("errorBoundary.goHome")}
          </a>
        </>
      }
    />
  );
}
