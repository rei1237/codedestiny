"use client";

import { useCallback, useState } from "react";

export type CaptureShareOptions = {
  /** 캡처할 요소의 id (FortuneScroll 의 id). */
  targetId: string;
  /** 저장·공유 파일 이름(확장자 제외). */
  fileName: string;
  shareTitle: string;
  shareText: string;
};

type Busy = "save" | "share" | null;

// 캡처 바탕(두루마리 주변 여백). 기존 /today 공유 이미지와 같은 값이다.
const CAPTURE_BACKDROP = "#070A11";

/**
 * 요소를 PNG 로 만들어 저장하거나 공유한다(html2canvas, 서버·계정·LLM 호출 없음).
 * 캡처 중에는 요소에 data-capturing 을 달아 CSS 애니메이션(도장 등)을 멈춘다.
 */
export function useCaptureShare({ targetId, fileName, shareTitle, shareText }: CaptureShareOptions) {
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState("");

  const capture = useCallback(async (): Promise<Blob> => {
    const node = document.getElementById(targetId);
    if (!node) throw new Error("capture target missing");
    node.setAttribute("data-capturing", "true");
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(node, { backgroundColor: CAPTURE_BACKDROP, scale: 2, useCORS: true });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("capture failed");
      return blob;
    } finally {
      node.removeAttribute("data-capturing");
    }
  }, [targetId]);

  const download = useCallback(
    (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${fileName}.png`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    [fileName],
  );

  const save = useCallback(async () => {
    if (busy) return;
    setBusy("save");
    setNotice("");
    try {
      download(await capture());
      setNotice("이미지를 저장했어요.");
    } catch {
      setNotice("이미지를 만들지 못했어요. 잠시 뒤에 다시 눌러 주세요.");
    } finally {
      setBusy(null);
    }
  }, [busy, capture, download]);

  const share = useCallback(async () => {
    if (busy) return;
    setBusy("share");
    setNotice("");
    try {
      const blob = await capture();
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: shareTitle, text: shareText });
      } else {
        // 파일 공유를 지원하지 않는 브라우저(대부분의 데스크톱): 이미지로 저장해 직접 붙여 넣게 한다.
        download(blob);
        setNotice("이 기기에서는 이미지로 저장했어요. 원하는 곳에 붙여 주세요.");
      }
    } catch (error) {
      // 사용자가 공유 시트를 닫은 경우(AbortError)는 오류가 아니다.
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setNotice("공유 이미지를 만들지 못했어요. 잠시 뒤에 다시 눌러 주세요.");
      }
    } finally {
      setBusy(null);
    }
  }, [busy, capture, download, fileName, shareText, shareTitle]);

  return { busy, notice, save, share };
}
