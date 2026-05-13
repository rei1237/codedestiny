"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { toPng } from "html-to-image";

export function useAnimalCardExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportCard = useCallback(async (element: HTMLElement | null, filename: string) => {
    if (!element) {
      toast.error("공유 카드 영역을 찾지 못했어요.");
      return;
    }

    try {
      setIsExporting(true);
      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        cacheBust: true,
        width: 1080,
        height: 1920,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${filename}.png`;
      link.click();
      toast.success("카드를 저장했어요.");
    } catch {
      toast.error("카드 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    isExporting,
    exportCard,
  };
}
