"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getShareMetadata, trackShareEvent, type ShareMetadataV2 } from "../../lib/share.v2";

type ShareWidgetProps = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  contentType?: "website" | "article" | "collection" | "software" | "result";
  contentId?: string;
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
      setStatus("링크를 복사했습니다.");
      trackShareEvent("share_completed", { ...payload, shareChannel: "copy" });
    } catch {
      setStatus("복사에 실패했습니다.");
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
      setStatus("공유를 완료했습니다.");
      trackShareEvent("share_completed", { ...payload, shareChannel: "native" });
    } catch {
      setStatus("공유를 취소했습니다.");
      trackShareEvent("share_failed", { ...payload, shareChannel: "native" });
    }
  }

  function socialShare(channel: string) {
    trackShareEvent("social_share_clicked", { ...payload, shareChannel: channel });
    window.open(buildChannelUrl(channel, share), "_blank", "noopener,noreferrer,width=720,height=640");
  }

  return (
    <section aria-label="공유하기" style={{ marginTop: 24 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        <button type="button" onClick={nativeShare} aria-label="공유하기" style={buttonStyle}>
          공유
        </button>
        <button type="button" onClick={copyLink} aria-label="공유 링크 복사" style={buttonStyle}>
          링크 복사
        </button>
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} style={buttonStyle}>
          채널
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
