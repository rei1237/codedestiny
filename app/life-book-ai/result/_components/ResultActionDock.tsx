"use client";

import { Bookmark, Download, ImageDown, Loader2, RefreshCw, Share2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import styles from "./result-action-dock.module.css";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type ResultActionDockCopy = {
  dockAria: string;
  pdfSaveAria: string;
  imageLabel: string;
  imageSaveAria: string;
  shareLabel: string;
  shareAria: string;
  bookmarkLabel: string;
  bookmarkRemoveAria: string;
  bookmarkAddAria: string;
  regenerateLabel: string;
  regenerateAria: string;
  saveImageSuccess: string;
  saveImageError: string;
  shareTitle: string;
  shareText: string;
  shareSuccess: string;
  shareFallbackSuccess: string;
  shareError: string;
};

const RESULT_ACTION_DOCK_EN: ResultActionDockCopy = {
  dockAria: "Save and share your Life Book",
  pdfSaveAria: "Save as PDF",
  imageLabel: "Image",
  imageSaveAria: "Save the cover as an image",
  shareLabel: "Share",
  shareAria: "Share the cover",
  bookmarkLabel: "Bookmark",
  bookmarkRemoveAria: "Remove bookmark from this chapter",
  bookmarkAddAria: "Bookmark this chapter",
  regenerateLabel: "Retry",
  regenerateAria: "Create a new Life Book",
  saveImageSuccess: "Saved the cover as an image.",
  saveImageError: "Couldn't save the image. Please try again shortly.",
  shareTitle: "My Life Book",
  shareText: "Sharing the cover of my Life Book.",
  shareSuccess: "Shared the cover.",
  shareFallbackSuccess: "Sharing isn't supported, so it was saved as an image instead.",
  shareError: "Couldn't share the cover. Please try again shortly.",
};

const RESULT_ACTION_DOCK_COPY: Partial<Record<LoadingLocale, ResultActionDockCopy>> = {
  ko: {
    dockAria: "인생의 책 저장과 공유",
    pdfSaveAria: "PDF로 저장",
    imageLabel: "이미지",
    imageSaveAria: "표지를 이미지로 저장",
    shareLabel: "공유",
    shareAria: "표지 공유하기",
    bookmarkLabel: "책갈피",
    bookmarkRemoveAria: "이 장의 책갈피 빼기",
    bookmarkAddAria: "이 장에 책갈피 꽂기",
    regenerateLabel: "다시",
    regenerateAria: "새로운 인생의 책 만들기",
    saveImageSuccess: "표지를 이미지로 간직했습니다.",
    saveImageError: "이미지로 담지 못했습니다. 잠시 후 다시 시도해 주세요.",
    shareTitle: "인생의 책",
    shareText: "내 인생의 책 표지를 나눕니다.",
    shareSuccess: "표지를 나눴습니다.",
    shareFallbackSuccess: "공유를 지원하지 않아 이미지로 저장했습니다.",
    shareError: "표지를 나누지 못했습니다. 잠시 후 다시 시도해 주세요.",
  },
  en: RESULT_ACTION_DOCK_EN,
  ja: {
    dockAria: "人生の本を保存・共有",
    pdfSaveAria: "PDFで保存",
    imageLabel: "画像",
    imageSaveAria: "表紙を画像として保存",
    shareLabel: "共有",
    shareAria: "表紙を共有する",
    bookmarkLabel: "しおり",
    bookmarkRemoveAria: "この章のしおりを外す",
    bookmarkAddAria: "この章にしおりを挟む",
    regenerateLabel: "もう一度",
    regenerateAria: "新しい人生の本を作る",
    saveImageSuccess: "表紙を画像として保存しました。",
    saveImageError: "画像として保存できませんでした。しばらくしてからもう一度お試しください。",
    shareTitle: "人生の本",
    shareText: "私の人生の本の表紙をシェアします。",
    shareSuccess: "表紙を共有しました。",
    shareFallbackSuccess: "共有に対応していないため、画像として保存しました。",
    shareError: "表紙を共有できませんでした。しばらくしてからもう一度お試しください。",
  },
  "zh-CN": {
    dockAria: "保存与分享人生之书",
    pdfSaveAria: "保存为PDF",
    imageLabel: "图片",
    imageSaveAria: "将封面保存为图片",
    shareLabel: "分享",
    shareAria: "分享封面",
    bookmarkLabel: "书签",
    bookmarkRemoveAria: "移除本章书签",
    bookmarkAddAria: "为本章添加书签",
    regenerateLabel: "重新生成",
    regenerateAria: "制作新的人生之书",
    saveImageSuccess: "已将封面保存为图片。",
    saveImageError: "无法保存为图片，请稍后重试。",
    shareTitle: "人生之书",
    shareText: "分享我的人生之书封面。",
    shareSuccess: "已分享封面。",
    shareFallbackSuccess: "不支持分享，已改为保存为图片。",
    shareError: "无法分享封面，请稍后重试。",
  },
  "zh-TW": {
    dockAria: "保存與分享人生之書",
    pdfSaveAria: "保存為PDF",
    imageLabel: "圖片",
    imageSaveAria: "將封面保存為圖片",
    shareLabel: "分享",
    shareAria: "分享封面",
    bookmarkLabel: "書籤",
    bookmarkRemoveAria: "移除本章書籤",
    bookmarkAddAria: "為本章新增書籤",
    regenerateLabel: "重新生成",
    regenerateAria: "製作新的人生之書",
    saveImageSuccess: "已將封面保存為圖片。",
    saveImageError: "無法保存為圖片，請稍後重試。",
    shareTitle: "人生之書",
    shareText: "分享我的人生之書封面。",
    shareSuccess: "已分享封面。",
    shareFallbackSuccess: "不支援分享，已改為保存為圖片。",
    shareError: "無法分享封面，請稍後重試。",
  },
  vi: {
    dockAria: "Lưu và chia sẻ Cuốn Sách Cuộc Đời",
    pdfSaveAria: "Lưu dưới dạng PDF",
    imageLabel: "Hình ảnh",
    imageSaveAria: "Lưu bìa sách dưới dạng hình ảnh",
    shareLabel: "Chia sẻ",
    shareAria: "Chia sẻ bìa sách",
    bookmarkLabel: "Đánh dấu trang",
    bookmarkRemoveAria: "Bỏ đánh dấu trang này",
    bookmarkAddAria: "Đánh dấu trang này",
    regenerateLabel: "Thử lại",
    regenerateAria: "Tạo Cuốn Sách Cuộc Đời mới",
    saveImageSuccess: "Đã lưu bìa sách dưới dạng hình ảnh.",
    saveImageError: "Không thể lưu hình ảnh. Vui lòng thử lại sau.",
    shareTitle: "Cuốn Sách Cuộc Đời của tôi",
    shareText: "Chia sẻ bìa Cuốn Sách Cuộc Đời của tôi.",
    shareSuccess: "Đã chia sẻ bìa sách.",
    shareFallbackSuccess: "Không hỗ trợ chia sẻ nên đã lưu dưới dạng hình ảnh.",
    shareError: "Không thể chia sẻ bìa sách. Vui lòng thử lại sau.",
  },
  hi: {
    dockAria: "जीवन की पुस्तक सहेजें और साझा करें",
    pdfSaveAria: "PDF के रूप में सहेजें",
    imageLabel: "छवि",
    imageSaveAria: "कवर को छवि के रूप में सहेजें",
    shareLabel: "साझा करें",
    shareAria: "कवर साझा करें",
    bookmarkLabel: "बुकमार्क",
    bookmarkRemoveAria: "इस अध्याय से बुकमार्क हटाएं",
    bookmarkAddAria: "इस अध्याय पर बुकमार्क लगाएं",
    regenerateLabel: "फिर से बनाएं",
    regenerateAria: "नई जीवन की पुस्तक बनाएं",
    saveImageSuccess: "कवर को छवि के रूप में सहेजा गया।",
    saveImageError: "छवि सहेजी नहीं जा सकी। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    shareTitle: "मेरी जीवन की पुस्तक",
    shareText: "मेरी जीवन की पुस्तक का कवर साझा कर रहा हूं।",
    shareSuccess: "कवर साझा किया गया।",
    shareFallbackSuccess: "साझाकरण समर्थित नहीं है, इसलिए छवि के रूप में सहेजा गया।",
    shareError: "कवर साझा नहीं किया जा सका। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
  },
  es: {
    dockAria: "Guardar y compartir tu Libro de la Vida",
    pdfSaveAria: "Guardar como PDF",
    imageLabel: "Imagen",
    imageSaveAria: "Guardar la portada como imagen",
    shareLabel: "Compartir",
    shareAria: "Compartir la portada",
    bookmarkLabel: "Marcador",
    bookmarkRemoveAria: "Quitar el marcador de este capítulo",
    bookmarkAddAria: "Marcar este capítulo",
    regenerateLabel: "Reintentar",
    regenerateAria: "Crear un nuevo Libro de la Vida",
    saveImageSuccess: "Portada guardada como imagen.",
    saveImageError: "No se pudo guardar la imagen. Inténtalo de nuevo en unos momentos.",
    shareTitle: "Mi Libro de la Vida",
    shareText: "Compartiendo la portada de mi Libro de la Vida.",
    shareSuccess: "Portada compartida.",
    shareFallbackSuccess: "No se admite compartir, así que se guardó como imagen.",
    shareError: "No se pudo compartir la portada. Inténtalo de nuevo en unos momentos.",
  },
  fr: {
    dockAria: "Enregistrer et partager votre Livre de Vie",
    pdfSaveAria: "Enregistrer en PDF",
    imageLabel: "Image",
    imageSaveAria: "Enregistrer la couverture en image",
    shareLabel: "Partager",
    shareAria: "Partager la couverture",
    bookmarkLabel: "Signet",
    bookmarkRemoveAria: "Retirer le signet de ce chapitre",
    bookmarkAddAria: "Ajouter un signet à ce chapitre",
    regenerateLabel: "Réessayer",
    regenerateAria: "Créer un nouveau Livre de Vie",
    saveImageSuccess: "Couverture enregistrée en image.",
    saveImageError: "Impossible d'enregistrer l'image. Veuillez réessayer dans un instant.",
    shareTitle: "Mon Livre de Vie",
    shareText: "Partage de la couverture de mon Livre de Vie.",
    shareSuccess: "Couverture partagée.",
    shareFallbackSuccess: "Le partage n'est pas pris en charge, elle a donc été enregistrée en image.",
    shareError: "Impossible de partager la couverture. Veuillez réessayer dans un instant.",
  },
  de: {
    dockAria: "Lebensbuch speichern und teilen",
    pdfSaveAria: "Als PDF speichern",
    imageLabel: "Bild",
    imageSaveAria: "Cover als Bild speichern",
    shareLabel: "Teilen",
    shareAria: "Cover teilen",
    bookmarkLabel: "Lesezeichen",
    bookmarkRemoveAria: "Lesezeichen für dieses Kapitel entfernen",
    bookmarkAddAria: "Lesezeichen für dieses Kapitel setzen",
    regenerateLabel: "Erneut versuchen",
    regenerateAria: "Neues Lebensbuch erstellen",
    saveImageSuccess: "Cover als Bild gespeichert.",
    saveImageError: "Bild konnte nicht gespeichert werden. Bitte versuchen Sie es später erneut.",
    shareTitle: "Mein Lebensbuch",
    shareText: "Teile das Cover meines Lebensbuchs.",
    shareSuccess: "Cover geteilt.",
    shareFallbackSuccess: "Teilen wird nicht unterstützt, daher wurde es als Bild gespeichert.",
    shareError: "Cover konnte nicht geteilt werden. Bitte versuchen Sie es später erneut.",
  },
  nl: {
    dockAria: "Levensboek opslaan en delen",
    pdfSaveAria: "Opslaan als PDF",
    imageLabel: "Afbeelding",
    imageSaveAria: "Omslag opslaan als afbeelding",
    shareLabel: "Delen",
    shareAria: "Omslag delen",
    bookmarkLabel: "Bladwijzer",
    bookmarkRemoveAria: "Bladwijzer voor dit hoofdstuk verwijderen",
    bookmarkAddAria: "Bladwijzer voor dit hoofdstuk toevoegen",
    regenerateLabel: "Opnieuw proberen",
    regenerateAria: "Nieuw levensboek maken",
    saveImageSuccess: "Omslag opgeslagen als afbeelding.",
    saveImageError: "Kon de afbeelding niet opslaan. Probeer het later opnieuw.",
    shareTitle: "Mijn levensboek",
    shareText: "Deel de omslag van mijn levensboek.",
    shareSuccess: "Omslag gedeeld.",
    shareFallbackSuccess: "Delen wordt niet ondersteund, dus opgeslagen als afbeelding.",
    shareError: "Kon de omslag niet delen. Probeer het later opnieuw.",
  },
  ms: {
    dockAria: "Simpan dan kongsi Buku Kehidupan anda",
    pdfSaveAria: "Simpan sebagai PDF",
    imageLabel: "Imej",
    imageSaveAria: "Simpan kulit sebagai imej",
    shareLabel: "Kongsi",
    shareAria: "Kongsi kulit",
    bookmarkLabel: "Penanda buku",
    bookmarkRemoveAria: "Alih keluar penanda buku bab ini",
    bookmarkAddAria: "Tambah penanda buku pada bab ini",
    regenerateLabel: "Cuba lagi",
    regenerateAria: "Cipta Buku Kehidupan baharu",
    saveImageSuccess: "Kulit disimpan sebagai imej.",
    saveImageError: "Tidak dapat menyimpan imej. Sila cuba lagi sebentar lagi.",
    shareTitle: "Buku Kehidupan saya",
    shareText: "Berkongsi kulit Buku Kehidupan saya.",
    shareSuccess: "Kulit dikongsi.",
    shareFallbackSuccess: "Perkongsian tidak disokong, jadi disimpan sebagai imej.",
    shareError: "Tidak dapat berkongsi kulit. Sila cuba lagi sebentar lagi.",
  },
};

function getResultActionDockCopy(locale: LoadingLocale): ResultActionDockCopy {
  return RESULT_ACTION_DOCK_COPY[locale] || RESULT_ACTION_DOCK_EN;
}

function useResultActionDockCopy(): ResultActionDockCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return getResultActionDockCopy(locale);
}

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
  const copy = useResultActionDockCopy();
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
      setMessage(copy.saveImageSuccess);
    } catch {
      setMessage(copy.saveImageError);
    } finally {
      setBusy("");
    }
  }, [fileName, shareCardId, copy]);

  const shareImage = useCallback(async () => {
    setBusy("share");
    setMessage("");
    try {
      const dataUrl = await captureShareCard(shareCardId);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: copy.shareTitle, text: copy.shareText, files: [file] });
        setMessage(copy.shareSuccess);
        return;
      }
      const fallbackUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = fallbackUrl;
      link.download = `${fileName}.png`;
      link.click();
      URL.revokeObjectURL(fallbackUrl);
      setMessage(copy.shareFallbackSuccess);
    } catch {
      setMessage(copy.shareError);
    } finally {
      setBusy("");
    }
  }, [fileName, shareCardId, copy]);

  return (
    <>
      {/* data-export 캡처 중에는 독을 숨긴다 — 안 그러면 PDF 마지막 장에 버튼이 찍힌다. */}
      <div className={styles.dock} data-life-book-dock role="group" aria-label={copy.dockAria}>
        <button type="button" onClick={onDownloadPdf} disabled={pdfLoading} aria-label={copy.pdfSaveAria} className={styles.action}>
          {pdfLoading ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="h-5 w-5" aria-hidden="true" />}
          <span className={styles.label}>PDF</span>
        </button>
        <button type="button" onClick={() => void saveImage()} disabled={busy !== ""} aria-label={copy.imageSaveAria} className={styles.action}>
          {busy === "image" ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ImageDown className="h-5 w-5" aria-hidden="true" />}
          <span className={styles.label}>{copy.imageLabel}</span>
        </button>
        <button type="button" onClick={() => void shareImage()} disabled={busy !== ""} aria-label={copy.shareAria} className={styles.action}>
          {busy === "share" ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Share2 className="h-5 w-5" aria-hidden="true" />}
          <span className={styles.label}>{copy.shareLabel}</span>
        </button>
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? copy.bookmarkRemoveAria : copy.bookmarkAddAria}
          className={styles.action}
          data-active={bookmarked ? "true" : "false"}
        >
          <Bookmark className="h-5 w-5" aria-hidden="true" fill={bookmarked ? "currentColor" : "none"} />
          <span className={styles.label}>{copy.bookmarkLabel}</span>
        </button>
        <button type="button" onClick={onRegenerate} aria-label={copy.regenerateAria} className={styles.action}>
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          <span className={styles.label}>{copy.regenerateLabel}</span>
        </button>
      </div>
      {message && (
        <p className={styles.dockMessage} role="status" aria-live="polite">{message}</p>
      )}
    </>
  );
}
