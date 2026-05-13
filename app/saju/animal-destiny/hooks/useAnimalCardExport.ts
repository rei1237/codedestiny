"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { toPng } from "html-to-image";

export function useAnimalCardExport() {
  const [isExporting, setIsExporting] = useState(false);

  const makeCardDataUrl = useCallback(async (element: HTMLElement | null) => {
    if (!element) {
      toast.error("공유 카드 영역을 찾지 못했어요.");
      return null;
    }

    return toPng(element, {
      pixelRatio: 2,
      cacheBust: true,
      width: 1080,
      height: 1920,
      style: {
        transform: "scale(1)",
        transformOrigin: "top left",
      },
    });
  }, []);

  const exportCard = useCallback(async (element: HTMLElement | null, filename: string) => {
    try {
      setIsExporting(true);
      const dataUrl = await makeCardDataUrl(element);
      if (!dataUrl) return;

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${filename}.png`;
      link.click();
      toast.success("카드를 저장했어요. 인스타 스토리에 업로드해 보세요.");
    } catch {
      toast.error("카드 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsExporting(false);
    }
  }, [makeCardDataUrl]);

  const shareCard = useCallback(async (element: HTMLElement | null, filename: string) => {
    try {
      setIsExporting(true);
      const dataUrl = await makeCardDataUrl(element);
      if (!dataUrl) return;

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `${filename}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Code:Destiny 십이운성 동물점",
          text: "내 사주 동물점 결과 카드야!",
          files: [file],
        });
        toast.success("공유를 완료했어요.");
        return;
      }

      const fallbackUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = fallbackUrl;
      link.download = `${filename}.png`;
      link.click();
      URL.revokeObjectURL(fallbackUrl);
      toast.message("이 환경은 직접 공유를 지원하지 않아 파일 저장으로 대체했어요.");
    } catch {
      toast.error("공유 준비 중 문제가 생겼어요. 저장 후 직접 공유해 주세요.");
    } finally {
      setIsExporting(false);
    }
  }, [makeCardDataUrl]);

  return {
    isExporting,
    exportCard,
    shareCard,
  };
}
