"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";

const ANIMAL_CARD_EXPORT_TEXT_TRANSLATIONS = {
  ko: {
    missingElement: "공유 카드 영역을 찾지 못했어요.",
    saveSuccess: "카드를 저장했어요. 인스타 스토리에 업로드해 보세요.",
    saveError: "카드 저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
    shareTitle: "Code:Destiny 십이운성 동물점",
    shareText: "내 사주 동물점 결과 카드야!",
    shareSuccess: "공유를 완료했어요.",
    fallbackSaved: "이 환경은 직접 공유를 지원하지 않아 파일 저장으로 대체했어요.",
    shareError: "공유 준비 중 문제가 생겼어요. 저장 후 직접 공유해 주세요.",
  },
  en: {
    missingElement: "We could not find the share card area.",
    saveSuccess: "Your card has been saved. Try uploading it to your story.",
    saveError: "The card could not be saved. Please try again in a moment.",
    shareTitle: "Code:Destiny Twelve-Stage Animal Fortune",
    shareText: "This is my Saju animal fortune result card!",
    shareSuccess: "Sharing is complete.",
    fallbackSaved: "Direct sharing is not supported here, so the card was saved instead.",
    shareError: "Something went wrong while preparing to share. Please save it and share manually.",
  },
  ja: {
    missingElement: "共有カードの領域が見つかりませんでした。",
    saveSuccess: "カードを保存しました。ストーリーにアップロードしてみてください。",
    saveError: "カードの保存に失敗しました。少し後でもう一度お試しください。",
    shareTitle: "Code:Destiny 十二運星動物占い",
    shareText: "私の四柱動物占い結果カードです！",
    shareSuccess: "共有が完了しました。",
    fallbackSaved: "この環境では直接共有できないため、ファイル保存に切り替えました。",
    shareError: "共有の準備中に問題が起きました。保存してから直接共有してください。",
  },
  "zh-CN": {
    missingElement: "找不到分享卡片区域。",
    saveSuccess: "卡片已保存。可以上传到动态试试看。",
    saveError: "卡片保存失败。请稍后再试。",
    shareTitle: "Code:Destiny 十二运星动物占",
    shareText: "这是我的四柱动物占结果卡！",
    shareSuccess: "分享已完成。",
    fallbackSaved: "当前环境不支持直接分享，已改为保存文件。",
    shareError: "准备分享时出现问题。请保存后手动分享。",
  },
  "zh-TW": {
    missingElement: "找不到分享卡片區域。",
    saveSuccess: "卡片已儲存。可以上傳到限時動態試試看。",
    saveError: "卡片儲存失敗。請稍後再試。",
    shareTitle: "Code:Destiny 十二運星動物占",
    shareText: "這是我的四柱動物占結果卡！",
    shareSuccess: "分享已完成。",
    fallbackSaved: "目前環境不支援直接分享，已改為儲存檔案。",
    shareError: "準備分享時出現問題。請儲存後手動分享。",
  },
} as const;

function animalCardExportText(key: keyof typeof ANIMAL_CARD_EXPORT_TEXT_TRANSLATIONS.ko) {
  const locale = getCurrentLoadingLocale();
  if (locale === "en" || locale === "ja" || locale === "zh-CN" || locale === "zh-TW") {
    return ANIMAL_CARD_EXPORT_TEXT_TRANSLATIONS[locale][key];
  }
  return ANIMAL_CARD_EXPORT_TEXT_TRANSLATIONS.ko[key];
}

export function useAnimalCardExport() {
  const [isExporting, setIsExporting] = useState(false);

  const makeCardDataUrl = useCallback(async (element: HTMLElement | null) => {
    if (!element) {
      toast.error(animalCardExportText("missingElement"));
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
      toast.success(animalCardExportText("saveSuccess"));
    } catch (e) {
      toast.error(animalCardExportText("saveError"));
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
          title: animalCardExportText("shareTitle"),
          text: animalCardExportText("shareText"),
          files: [file],
        });
        toast.success(animalCardExportText("shareSuccess"));
        return;
      }

      const fallbackUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = fallbackUrl;
      link.download = `${filename}.png`;
      link.click();
      URL.revokeObjectURL(fallbackUrl);
      toast.message(animalCardExportText("fallbackSaved"));
    } catch (e) {
      toast.error(animalCardExportText("shareError"));
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
