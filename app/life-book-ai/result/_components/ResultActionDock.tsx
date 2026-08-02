"use client";

import { Bookmark, Download, ImageDown, Loader2, RefreshCw, Share2 } from "lucide-react";
import { useCallback, useState } from "react";
import styles from "./result-action-dock.module.css";

type ResultActionDockProps = {
  pdfLoading: boolean;
  onDownloadPdf: () => void;
  /** 공유·이미지 저장 대상. 본문 전체가 아니라 표지 카드만 캡처한다(생년월일이 SNS로 나가지 않게). */
  shareCardId: string;
  fileName: string;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onRegenerate: () => void;
};

async function captureShareCard(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("share card not found");
  const { toPng } = await import("html-to-image");
  return toPng(element, { pixelRatio: 2, cacheBust: true, backgroundColor: "#0a0f24" });
}

export default function ResultActionDock({
  pdfLoading,
  onDownloadPdf,
  shareCardId,
  fileName,
  bookmarked,
  onToggleBookmark,
  onRegenerate,
}: ResultActionDockProps) {
  const [busy, setBusy] = useState<"" | "image" | "share">("");
  const [message, setMessage] = useState("");

  const saveImage = useCallback(async () => {
    setBusy("image");
    setMessage("");
    try {
      const dataUrl = await captureShareCard(shareCardId);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fileName}.png`;
      link.click();
      setMessage("표지를 이미지로 간직했습니다.");
    } catch {
      setMessage("이미지로 담지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy("");
    }
  }, [fileName, shareCardId]);

  const shareImage = useCallback(async () => {
    setBusy("share");
    setMessage("");
    try {
      const dataUrl = await captureShareCard(shareCardId);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "인생의 책", text: "내 인생의 책 표지를 나눕니다.", files: [file] });
        setMessage("표지를 나눴습니다.");
        return;
      }
      const fallbackUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = fallbackUrl;
      link.download = `${fileName}.png`;
      link.click();
      URL.revokeObjectURL(fallbackUrl);
      setMessage("공유를 지원하지 않아 이미지로 저장했습니다.");
    } catch {
      setMessage("표지를 나누지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy("");
    }
  }, [fileName, shareCardId]);

  return (
    <>
      {/* data-export 캡처 중에는 독을 숨긴다 — 안 그러면 PDF 마지막 장에 버튼이 찍힌다. */}
      <div className={styles.dock} data-life-book-dock role="group" aria-label="인생의 책 저장과 공유">
        <button type="button" onClick={onDownloadPdf} disabled={pdfLoading} aria-label="PDF로 저장" className={styles.action}>
          {pdfLoading ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="h-5 w-5" aria-hidden="true" />}
          <span className={styles.label}>PDF</span>
        </button>
        <button type="button" onClick={() => void saveImage()} disabled={busy !== ""} aria-label="표지를 이미지로 저장" className={styles.action}>
          {busy === "image" ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ImageDown className="h-5 w-5" aria-hidden="true" />}
          <span className={styles.label}>이미지</span>
        </button>
        <button type="button" onClick={() => void shareImage()} disabled={busy !== ""} aria-label="표지 공유하기" className={styles.action}>
          {busy === "share" ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Share2 className="h-5 w-5" aria-hidden="true" />}
          <span className={styles.label}>공유</span>
        </button>
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? "이 장의 책갈피 빼기" : "이 장에 책갈피 꽂기"}
          className={styles.action}
          data-active={bookmarked ? "true" : "false"}
        >
          <Bookmark className="h-5 w-5" aria-hidden="true" fill={bookmarked ? "currentColor" : "none"} />
          <span className={styles.label}>책갈피</span>
        </button>
        <button type="button" onClick={onRegenerate} aria-label="새로운 인생의 책 만들기" className={styles.action}>
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          <span className={styles.label}>다시</span>
        </button>
      </div>
      {message && (
        <p className={styles.dockMessage} role="status" aria-live="polite">{message}</p>
      )}
    </>
  );
}
