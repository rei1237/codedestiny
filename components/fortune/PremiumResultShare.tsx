"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Download, Share2 } from "lucide-react";
import styles from "./PremiumResultShare.module.css";

type Choice = { id: string; label: string; text: string };
type Props = {
  kind: "book" | "letter";
  title: string;
  ownerName: string;
  choices: Choice[];
  publicPath: "/life-book-ai/" | "/love-secret-ai/";
};

export default function PremiumResultShare({ kind, title, ownerName, choices, publicPath }: Props) {
  const [selected, setSelected] = useState(choices[0]?.id || "");
  const [text, setText] = useState(choices[0]?.text.slice(0, 90) || "");
  const [showName, setShowName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const card = useRef<HTMLDivElement>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const url = `https://code-destiny.com${publicPath}`;
  const [korean, setKorean] = useState(true);

  useEffect(() => { setKorean(document.documentElement.lang.startsWith("ko")); }, []);

  useEffect(() => {
    const open = () => { if (details.current) details.current.open = true; };
    window.addEventListener(`premium-share-open:${kind}`, open);
    return () => window.removeEventListener(`premium-share-open:${kind}`, open);
  }, [kind]);

  if (!choices.length) return null;

  async function imageBlob() {
    if (!card.current) throw new Error("share card unavailable");
    await document.fonts?.ready;
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(card.current, { pixelRatio: 3, cacheBust: true });
    if (!blob) throw new Error("share image unavailable");
    return blob;
  }

  async function save() {
    if (!text.trim() || busy) return;
    setBusy(true); setNotice("");
    try {
      const blob = await imageBlob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl; link.download = `${kind}-share.png`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setNotice(korean ? "미리 본 이미지를 저장했어요." : "Preview image saved.");
    } catch { setNotice(korean ? "이미지를 만들지 못했어요. 문구 복사로 다시 시도해 주세요." : "Could not create the image. Try copying the text."); }
    finally { setBusy(false); }
  }

  async function share() {
    if (!text.trim() || busy) return;
    setBusy(true); setNotice("");
    try {
      const blob = await imageBlob();
      const file = new File([blob], `${kind}-share.png`, { type: "image/png" });
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text: text.trim(), url });
        setNotice(korean ? "공유 창에서 선택한 동작을 마쳤어요." : "Sharing action completed.");
      } else {
        setNotice(korean ? "이미지 공유를 지원하지 않아요. 이미지 저장이나 문구 복사를 이용해 주세요." : "Image sharing is unavailable. Save the image or copy the text.");
      }
    } catch (error) {
      setNotice(error instanceof Error && error.name === "AbortError"
        ? (korean ? "공유를 취소했어요." : "Sharing cancelled.")
        : (korean ? "공유 창을 열지 못했어요. 문구 복사로 다시 시도해 주세요." : "Could not open sharing. Try copying the text."));
    } finally { setBusy(false); }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${text.trim()}\n\n${url}`);
      setNotice(korean ? "문구와 공개 상담 링크를 복사했어요." : "Text and public consultation link copied.");
    } catch { setNotice(korean ? "복사하지 못했어요. 문구를 선택해 직접 복사해 주세요." : "Copy failed. Select the text manually."); }
  }

  return <details ref={details} id={`${kind}-share-editor`} className={styles.root} data-premium-share={kind}>
    <summary><Share2 size={19} aria-hidden="true" />{korean ? "공유할 한 장 만들기" : "Create a share card"}</summary>
    <div className={styles.layout}>
      <div className={styles.controls}>
        <p>{korean ? "저장된 결과에서 나눌 문장을 고르고, 보내기 전에 내용을 확인해 주세요. 내 결과 주소와 출생정보는 첨부하지 않아요." : "Choose a sentence from your saved result and review it before sharing. Your private result URL and birth details are excluded."}</p>
        <label htmlFor={`${kind}-share-choice`}>{korean ? "문장 선택" : "Choose a sentence"}</label>
        <select id={`${kind}-share-choice`} value={selected} onChange={event => {
          setSelected(event.target.value);
          setText((choices.find(choice => choice.id === event.target.value)?.text || "").slice(0, 90));
        }}>{choices.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select>
        <label htmlFor={`${kind}-share-text`}>{korean ? "공유할 문구" : "Share text"}</label>
        <textarea id={`${kind}-share-text`} rows={4} maxLength={90} value={text} onChange={event => setText(event.target.value)} />
        <small>{Array.from(text).length}/90 · {korean ? "문장에 개인정보가 있는지 확인해 주세요." : "Check the text for personal details."}</small>
        <label className={styles.nameToggle}><input type="checkbox" checked={showName} onChange={event => setShowName(event.target.checked)} />{korean ? "카드에 내 이름 표시" : "Show my name on the card"}</label>
        <div className={styles.actions}>
          <button type="button" disabled={busy || !text.trim()} onClick={() => void share()}><Share2 size={18} aria-hidden="true" />{korean ? "이미지 공유" : "Share image"}</button>
          <button type="button" disabled={busy || !text.trim()} onClick={() => void save()}><Download size={18} aria-hidden="true" />{korean ? "이미지 저장" : "Save image"}</button>
          <button type="button" disabled={busy || !text.trim()} onClick={() => void copy()}><Copy size={18} aria-hidden="true" />{korean ? "문구 복사" : "Copy text"}</button>
        </div>
        <p role="status" aria-live="polite">{notice}</p>
      </div>
      <figure className={styles.preview}>
        <div ref={card} className={`${styles.card} ${kind === "book" ? styles.book : styles.letter}`}>
          <h3>{title}</h3>
          <p className={styles.quote}>{text.trim()}</p>
          <p className={styles.signature}>{showName && ownerName.trim() ? `${ownerName.trim()} · ` : ""}Code Destiny</p>
          <p className={styles.address}>code-destiny.com{publicPath}</p>
        </div>
        <figcaption>{korean ? "전송 전 카드 미리보기 · 친구에게는 공개 상담 링크만 전달됩니다." : "Preview before sending · Only the public consultation link is included."}</figcaption>
      </figure>
    </div>
  </details>;
}
