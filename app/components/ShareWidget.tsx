"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getShareMetadata, trackShareEvent, type ShareMetadataV2 } from "../../lib/share.v2";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type ShareWidgetProps = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  contentType?: "website" | "article" | "collection" | "software" | "result";
  contentId?: string;
};

const SHARE_WIDGET_COPY: Record<LoadingLocale, {
  sectionLabel: string;
  share: string;
  copyLink: string;
  copyLinkLabel: string;
  channels: string;
  copied: string;
  copyFailed: string;
  shareCompleted: string;
  shareCancelled: string;
}> = {
  ko: { sectionLabel: "공유하기", share: "공유", copyLink: "링크 복사", copyLinkLabel: "공유 링크 복사", channels: "채널", copied: "링크를 복사했습니다.", copyFailed: "복사에 실패했습니다.", shareCompleted: "공유를 완료했습니다.", shareCancelled: "공유를 취소했습니다." },
  en: { sectionLabel: "Share", share: "Share", copyLink: "Copy link", copyLinkLabel: "Copy share link", channels: "Channels", copied: "Link copied.", copyFailed: "Could not copy the link.", shareCompleted: "Sharing is complete.", shareCancelled: "Sharing was cancelled." },
  ja: { sectionLabel: "共有", share: "共有", copyLink: "リンクをコピー", copyLinkLabel: "共有リンクをコピー", channels: "チャンネル", copied: "リンクをコピーしました。", copyFailed: "コピーできませんでした。", shareCompleted: "共有が完了しました。", shareCancelled: "共有をキャンセルしました。" },
  "zh-CN": { sectionLabel: "分享", share: "分享", copyLink: "复制链接", copyLinkLabel: "复制分享链接", channels: "渠道", copied: "链接已复制。", copyFailed: "复制失败。", shareCompleted: "分享已完成。", shareCancelled: "分享已取消。" },
  "zh-TW": { sectionLabel: "分享", share: "分享", copyLink: "複製連結", copyLinkLabel: "複製分享連結", channels: "渠道", copied: "連結已複製。", copyFailed: "複製失敗。", shareCompleted: "分享已完成。", shareCancelled: "分享已取消。" },
  vi: { sectionLabel: "Chia sẻ", share: "Chia sẻ", copyLink: "Sao chép liên kết", copyLinkLabel: "Sao chép liên kết chia sẻ", channels: "Kênh", copied: "Đã sao chép liên kết.", copyFailed: "Không thể sao chép liên kết.", shareCompleted: "Đã chia sẻ xong.", shareCancelled: "Đã hủy chia sẻ." },
  hi: { sectionLabel: "साझा करें", share: "साझा करें", copyLink: "लिंक कॉपी करें", copyLinkLabel: "साझा लिंक कॉपी करें", channels: "चैनल", copied: "लिंक कॉपी हो गया.", copyFailed: "लिंक कॉपी नहीं हो सका.", shareCompleted: "साझा करना पूरा हुआ.", shareCancelled: "साझा करना रद्द हुआ." },
  es: { sectionLabel: "Compartir", share: "Compartir", copyLink: "Copiar enlace", copyLinkLabel: "Copiar enlace para compartir", channels: "Canales", copied: "Enlace copiado.", copyFailed: "No se pudo copiar el enlace.", shareCompleted: "Se ha compartido.", shareCancelled: "Compartir fue cancelado." },
  fr: { sectionLabel: "Partager", share: "Partager", copyLink: "Copier le lien", copyLinkLabel: "Copier le lien de partage", channels: "Canaux", copied: "Lien copié.", copyFailed: "Impossible de copier le lien.", shareCompleted: "Partage terminé.", shareCancelled: "Partage annulé." },
  de: { sectionLabel: "Teilen", share: "Teilen", copyLink: "Link kopieren", copyLinkLabel: "Teilen-Link kopieren", channels: "Kanäle", copied: "Link kopiert.", copyFailed: "Link konnte nicht kopiert werden.", shareCompleted: "Teilen abgeschlossen.", shareCancelled: "Teilen abgebrochen." },
  nl: { sectionLabel: "Delen", share: "Delen", copyLink: "Link kopiëren", copyLinkLabel: "Deellink kopiëren", channels: "Kanalen", copied: "Link gekopieerd.", copyFailed: "Link kon niet worden gekopieerd.", shareCompleted: "Delen voltooid.", shareCancelled: "Delen geannuleerd." },
  ms: { sectionLabel: "Kongsi", share: "Kongsi", copyLink: "Salin pautan", copyLinkLabel: "Salin pautan kongsi", channels: "Saluran", copied: "Pautan disalin.", copyFailed: "Pautan tidak dapat disalin.", shareCompleted: "Perkongsian selesai.", shareCancelled: "Perkongsian dibatalkan." },
};

function buildChannelUrl(channel: string, share: ShareMetadataV2) {
  const encodedUrl = encodeURIComponent(share.url);
  const encodedTitle = encodeURIComponent(share.title);
  const encodedText = encodeURIComponent(share.text);

  if (channel === "x") return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
  if (channel === "facebook") return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  if (channel === "linkedin") return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  return `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`;
}

export default function ShareWidget({
  title,
  description,
  path,
  image,
  contentType = "website",
  contentId,
}: ShareWidgetProps) {
  const pathname = usePathname() || "/";
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const copy = SHARE_WIDGET_COPY[locale] || SHARE_WIDGET_COPY.ko;

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  const share = useMemo(
    () =>
      getShareMetadata({
        path: path || pathname,
        title,
        description,
        image,
        contentType,
        contentId,
      }),
    [contentId, contentType, description, image, path, pathname, title],
  );

  if (!share.shareable) return null;

  const payload = {
    contentType: share.contentType,
    contentId: share.contentId,
    title: share.title,
    url: share.canonicalUrl,
    pagePath: path || pathname,
    source: "share_widget_v2",
    timestamp: new Date().toISOString(),
  };

  async function copyLink() {
    trackShareEvent("copy_link_clicked", { ...payload, shareChannel: "copy" });
    try {
      await navigator.clipboard.writeText(share.url);
      setStatus(copy.copied);
      trackShareEvent("share_completed", { ...payload, shareChannel: "copy" });
    } catch {
      setStatus(copy.copyFailed);
      trackShareEvent("share_failed", { ...payload, shareChannel: "copy" });
    }
  }

  async function nativeShare() {
    trackShareEvent("share_clicked", { ...payload, shareChannel: "native" });
    if (!navigator.share) {
      setOpen((value) => !value);
      return;
    }

    try {
      trackShareEvent("native_share_opened", { ...payload, shareChannel: "native" });
      await navigator.share({ title: share.title, text: share.text, url: share.url });
      setStatus(copy.shareCompleted);
      trackShareEvent("share_completed", { ...payload, shareChannel: "native" });
    } catch {
      setStatus(copy.shareCancelled);
      trackShareEvent("share_failed", { ...payload, shareChannel: "native" });
    }
  }

  function socialShare(channel: string) {
    trackShareEvent("social_share_clicked", { ...payload, shareChannel: channel });
    window.open(buildChannelUrl(channel, share), "_blank", "noopener,noreferrer,width=720,height=640");
  }

  return (
    <section aria-label={copy.sectionLabel} style={{ marginTop: 24 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        <button type="button" onClick={nativeShare} aria-label={copy.sectionLabel} style={buttonStyle}>
          {copy.share}
        </button>
        <button type="button" onClick={copyLink} aria-label={copy.copyLinkLabel} style={buttonStyle}>
          {copy.copyLink}
        </button>
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} style={buttonStyle}>
          {copy.channels}
        </button>
      </div>

      {open ? (
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {[
            ["x", "X"],
            ["facebook", "Facebook"],
            ["linkedin", "LinkedIn"],
            ["email", "Email"],
          ].map(([channel, label]) => (
            <button key={channel} type="button" onClick={() => socialShare(channel)} style={channelButtonStyle}>
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {status ? (
        <p role="status" aria-live="polite" style={{ margin: "10px 0 0", textAlign: "center", fontSize: 12, color: "rgba(226,232,240,0.82)" }}>
          {status}
        </p>
      ) : null}
    </section>
  );
}

const buttonStyle = {
  border: "1px solid rgba(226,232,240,0.28)",
  background: "rgba(15,23,42,0.72)",
  color: "#f8fafc",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
} as const;

const channelButtonStyle = {
  ...buttonStyle,
  background: "rgba(30,41,59,0.82)",
  fontSize: 12,
  padding: "8px 12px",
} as const;
