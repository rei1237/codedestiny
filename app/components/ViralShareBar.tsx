"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { shareThrough, socialIntentUrl } from "@/js/share-service.mjs";
import { useAnalytics } from "@/app/hooks/useAnalytics";

/**
 * 결과 공유 바: X · 스레드 · 링크 복사 · 이미지 저장.
 *
 * - 운명의 꽃 / 최애 운명 / `/saju/free` 랜딩이 같이 쓴다(설계 docs/superpowers/specs/2026-11-08-free-viral-funnel-design.md §1).
 * - 버튼을 누른 채널마다 trackShare({ feature, channel }) 를 쏘고, 동작이 끝나면 onShared(channel) 를 부른다.
 *   `/saju/free` 의 "재물 시크릿 키워드" 해제는 이 콜백에 건다(사용자 결정 "버튼 누르면 해제").
 * - 카카오는 일부러 넣지 않는다. 카카오 공유에는 해제 조건을 붙이지 않는다는 결정 때문이다.
 * - 공유 강요 팝업이 아니라 결과 안 인라인 바다.
 */

export type ViralShareChannel = "x" | "threads" | "link" | "download";

export type ViralShareBarProps = {
  /** 공유할 공개 주소. 경로("/saju/free/")면 현재 origin 기준으로 푼다. 생일 등 개인정보를 넣지 않는다. */
  url: string;
  /** X·스레드 글 본문, 이미지 공유 문구. */
  text: string;
  /** trackShare 의 feature 값(예: "free-saju"). */
  feature: string;
  /** navigator.share 제목. */
  title?: string;
  /** 이미지로 저장할 노드. getImageNode 가 있으면 그쪽을 쓴다. 둘 다 없으면 이미지 버튼을 숨긴다. */
  imageRef?: RefObject<HTMLElement | null>;
  getImageNode?: () => HTMLElement | null;
  /** 저장 파일 이름(확장자 제외). */
  imageFileName?: string;
  /** toPng 출력 크기(CSS px). 없으면 노드 크기 그대로. */
  imageWidth?: number;
  imageHeight?: number;
  /** 채널 동작이 끝난 뒤(창 열기·복사·저장·공유) 한 번 부른다. 취소·실패 때는 부르지 않는다. */
  onShared?: (channel: ViralShareChannel) => void;
  className?: string;
};

type Status = { tone: "ok" | "warn"; text: string } | null;

function resolveUrl(url: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://code-destiny.com";
  return new URL(url, origin).toString();
}

function downloadDataUrl(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

const buttonBase =
  "inline-flex min-h-[44px] items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cd-accent";
const ghostButton = `${buttonBase} border-cd-border bg-cd-surface text-cd-text hover:bg-cd-surface-2`;
const primaryButton = `${buttonBase} border-transparent bg-cd-accent text-cd-cta-text hover:opacity-90`;

export default function ViralShareBar({
  url,
  text,
  feature,
  title,
  imageRef,
  getImageNode,
  imageFileName = "code-destiny-card",
  imageWidth,
  imageHeight,
  onShared,
  className = "",
}: ViralShareBarProps) {
  const { trackShare } = useAnalytics();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [manualUrl, setManualUrl] = useState("");
  const busyRef = useRef(false);
  const canSaveImage = Boolean(imageRef || getImageNode);

  const openIntent = useCallback(
    (channel: "x" | "threads") => {
      trackShare({ feature, channel });
      let intent: string;
      try {
        intent = socialIntentUrl(channel, { text, url: resolveUrl(url) });
      } catch {
        setStatus({ tone: "warn", text: "공유 주소를 만들지 못했어요. 링크 복사를 이용해 주세요." });
        return;
      }
      // 팝업 차단을 피하려고 클릭 안에서 창을 동기로 연다. "noopener" 를 주면 항상 null 이 와서
      // 차단 여부를 알 수 없으므로, 최애 운명처럼 빈 창을 열고 opener 를 끊은 뒤 주소를 넣는다.
      const popup = window.open("about:blank", "_blank");
      if (popup) {
        popup.opener = null;
        popup.location.href = intent;
      } else {
        window.location.href = intent;
      }
      setStatus({ tone: "ok", text: channel === "x" ? "X 글쓰기 창을 열었어요." : "스레드 글쓰기 창을 열었어요." });
      onShared?.(channel);
    },
    [feature, onShared, text, trackShare, url],
  );

  const copyLink = useCallback(async () => {
    if (busyRef.current) return;
    trackShare({ feature, channel: "link" });
    let shareUrl: string;
    try {
      shareUrl = resolveUrl(url);
    } catch {
      setStatus({ tone: "warn", text: "공유 주소를 만들지 못했어요." });
      return;
    }
    const outcome = await shareThrough("copy", { title: title || "꿀꿀운세", text, url: shareUrl });
    if (outcome.status === "copied") {
      setManualUrl("");
      setStatus({ tone: "ok", text: "링크를 복사했어요." });
    } else {
      // 클립보드가 막힌 환경: 직접 복사할 수 있게 주소를 보여 준다. 버튼을 눌렀으니 공유 동작으로 본다.
      setManualUrl(shareUrl);
      setStatus({ tone: "warn", text: "자동 복사가 막혀 있어요. 아래 주소를 길게 눌러 복사해 주세요." });
    }
    onShared?.("link");
  }, [feature, onShared, text, title, trackShare, url]);

  const saveImage = useCallback(async () => {
    if (busyRef.current) return;
    const node = getImageNode ? getImageNode() : imageRef?.current ?? null;
    if (!node) {
      setStatus({ tone: "warn", text: "카드 영역을 찾지 못했어요. 화면을 캡처해 주세요." });
      return;
    }
    busyRef.current = true;
    setBusy(true);
    trackShare({ feature, channel: "download" });
    const filename = `${imageFileName}.png`;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        // 크기를 정해 주면 그 크기 그대로(1080×1350 등), 아니면 선명하게 2배로 뽑는다.
        pixelRatio: imageWidth ? 1 : 2,
        cacheBust: true,
        ...(imageWidth ? { width: imageWidth } : {}),
        ...(imageHeight ? { height: imageHeight } : {}),
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: title || undefined, text });
          setStatus({ tone: "ok", text: "카드를 공유했어요." });
          onShared?.("download");
          return;
        } catch (error) {
          if ((error as { name?: string })?.name === "AbortError") {
            setStatus({ tone: "warn", text: "공유를 취소했어요." });
            return;
          }
          // 공유 시트가 실패하면 파일 저장으로 넘어간다.
        }
      }
      downloadDataUrl(dataUrl, filename);
      setStatus({ tone: "ok", text: "카드를 저장했어요. 카드에는 생일이 들어가지 않아요." });
      onShared?.("download");
    } catch {
      setStatus({ tone: "warn", text: "이미지를 만들지 못했어요. 화면을 캡처해 주세요." });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [feature, getImageNode, imageFileName, imageHeight, imageRef, imageWidth, onShared, text, title, trackShare]);

  return (
    <div className={`w-full ${className}`} data-viral-share-bar={feature}>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={ghostButton} onClick={() => openIntent("x")} disabled={busy}>
          X에 올리기
        </button>
        <button type="button" className={ghostButton} onClick={() => openIntent("threads")} disabled={busy}>
          스레드에 올리기
        </button>
        <button type="button" className={ghostButton} onClick={() => void copyLink()} disabled={busy}>
          링크 복사
        </button>
        {canSaveImage ? (
          <button type="button" className={primaryButton} onClick={() => void saveImage()} disabled={busy} aria-busy={busy}>
            {busy ? "카드 만드는 중…" : "이미지 저장"}
          </button>
        ) : null}
      </div>
      {manualUrl ? (
        <input
          readOnly
          value={manualUrl}
          aria-label="공유 링크"
          onFocus={(event) => event.currentTarget.select()}
          className="mt-2 w-full rounded-lg border border-cd-border bg-cd-surface-2 px-3 py-2 text-xs text-cd-text"
        />
      ) : null}
      <p
        className={`mt-2 min-h-[1.25rem] text-center text-xs ${status?.tone === "warn" ? "text-cd-gold" : "text-cd-muted"}`}
        role="status"
        aria-live="polite"
      >
        {status?.text || ""}
      </p>
    </div>
  );
}
