"use client";

import { useState } from "react";
import type { RefObject } from "react";

type Props = {
  storyRef: RefObject<HTMLDivElement>;
  squareRef: RefObject<HTMLDivElement>;
  baseFileName?: string;
};

async function exportNodeAsPng(target: HTMLDivElement, fileName: string) {
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(target, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#101429",
  });

  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function YeonCardDownloadButton({
  storyRef,
  squareRef,
  baseFileName = "yeon-star-hug",
}: Props) {
  const [busy, setBusy] = useState<null | "story" | "square">(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleDownload(mode: "story" | "square") {
    setErrorMsg("");
    setBusy(mode);
    try {
      const target = mode === "story" ? storyRef.current : squareRef.current;
      if (!target) throw new Error("card not ready");
      await exportNodeAsPng(target, `${baseFileName}-${mode}.png`);
    } catch (err) {
      setErrorMsg("카드 저장이 막혔어요. 길게 눌러 이미지 저장으로 시도해줘요.");
      console.error("[YeonCardDownloadButton]", err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleDownload("story")}
          disabled={busy !== null}
          className="min-h-11 rounded-full border border-white/50 bg-white/25 px-4 text-sm font-semibold text-white"
        >
          {busy === "story" ? "스토리 카드 생성 중..." : "스토리 카드 저장 (1080x1920)"}
        </button>
        <button
          type="button"
          onClick={() => handleDownload("square")}
          disabled={busy !== null}
          className="min-h-11 rounded-full border border-white/50 bg-white/25 px-4 text-sm font-semibold text-white"
        >
          {busy === "square" ? "정사각 카드 생성 중..." : "정사각 카드 저장 (1080x1080)"}
        </button>
      </div>
      {errorMsg ? <p className="text-xs text-rose-100">{errorMsg}</p> : null}
    </div>
  );
}
