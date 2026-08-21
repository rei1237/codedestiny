"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Camera, X, Loader2 } from "lucide-react";

import type { FeedbackAttachment } from "../_lib/api";
import {
  MAX_ATTACHMENTS,
  MAX_UPLOAD_SIZE,
  formatBytes,
  pickImageFiles,
  uploadFeedbackAttachment,
} from "../_lib/attachmentUpload";
import { useFeedbackCopy } from "../_lib/copy";
import { ACCENT, GHOST_BUTTON, INK, INK_MUTED } from "../_lib/styles";

interface AttachmentDropzoneProps {
  attachments: FeedbackAttachment[];
  onChange: (next: FeedbackAttachment[]) => void;
  onUploadingChange: (uploading: boolean) => void;
  emphasize?: boolean;
  /** 본문에서 붙여넣은 이미지. 업로드 경로를 여기 한 곳으로 모아 미리보기 처리를 일치시킨다. */
  pastedFiles?: File[];
  onPastedConsumed?: () => void;
  /** 업로드가 서버 인증을 요구하므로 미로그인 시 막는다. */
  disabled?: boolean;
  disabledNote?: string;
}

export default function AttachmentDropzone({
  attachments,
  onChange,
  onUploadingChange,
  emphasize = false,
  pastedFiles,
  onPastedConsumed,
  disabled = false,
  disabledNote = "",
}: AttachmentDropzoneProps) {
  const copy = useFeedbackCopy();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  // 방금 올린 파일의 로컬 미리보기(R2 키 → blob URL).
  // 서버 첨부 URL 은 인증이 필요한데 이미지 태그는 커스텀 헤더를 못 싣는다 — 같은 출처에서는
  // 쿠키로 통하지만 Capacitor 앱은 교차 출처라 쿠키가 빠져 썸네일이 깨진다. 로컬 blob 이면
  // 왕복도 없고 어디서나 뜬다. 초안 복원처럼 blob 이 없을 때만 서버 URL 로 폴백한다.
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => () => {
    Object.values(previews).forEach((url) => URL.revokeObjectURL(url));
    // 언마운트 시 1회만 정리한다. previews 를 의존성에 넣으면 갱신마다 살아있는 URL 을 폐기한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remainingSlots = MAX_ATTACHMENTS - attachments.length;

  // 선택 즉시 업로드한다 — 제출 시 한꺼번에 올리면 제출 클릭이 몇 초씩 멎는다.
  const handleFiles = useCallback(async (files: FileList | File[] | null) => {
    if (disabled) return;
    const picked = pickImageFiles(files, MAX_ATTACHMENTS - attachments.length);
    if (!picked.length) return;

    setError("");
    setUploadingCount((count) => count + picked.length);
    onUploadingChange(true);

    const uploaded: FeedbackAttachment[] = [];
    for (const file of picked) {
      try {
        const attachment = await uploadFeedbackAttachment(file, copy);
        uploaded.push(attachment);
        if (attachment.key) {
          setPreviews((prev) => ({ ...prev, [attachment.key]: URL.createObjectURL(file) }));
        }
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : copy.uploadErrorGeneric);
      } finally {
        setUploadingCount((count) => Math.max(0, count - 1));
      }
    }

    onUploadingChange(false);
    if (uploaded.length) onChange([...attachments, ...uploaded].slice(0, MAX_ATTACHMENTS));
  }, [attachments, onChange, onUploadingChange, disabled, copy]);

  // 🔴 배열 인스턴스 단위로 1회만 올린다. handleFiles 는 attachments 가 바뀌면 새 함수가 되어
  //    effect 가 다시 도는데, 그 시점에 pastedFiles 가 아직 비워지기 전이면 같은 파일을 두 번 올린다.
  const consumedPasteRef = useRef<File[] | null>(null);
  useEffect(() => {
    if (!pastedFiles?.length) return;
    if (consumedPasteRef.current === pastedFiles) return;
    consumedPasteRef.current = pastedFiles;
    void handleFiles(pastedFiles).then(() => onPastedConsumed?.());
  }, [pastedFiles, handleFiles, onPastedConsumed]);

  const remove = (key: string) => {
    onChange(attachments.filter((file) => file.key !== key));
    setPreviews((prev) => {
      if (!prev[key]) return prev;
      URL.revokeObjectURL(prev[key]);
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className={`text-sm font-bold ${INK}`}>
          {copy.attachmentLabel}
          {emphasize && <span className={`ml-1.5 text-[11px] font-bold ${ACCENT}`}>{copy.attachmentEmphasizeNote}</span>}
        </span>
        <span className={`text-[12px] ${INK_MUTED}`}>
          {attachments.length}/{MAX_ATTACHMENTS} · {copy.attachmentCountSuffix} {formatBytes(MAX_UPLOAD_SIZE)}
        </span>
      </div>

      {disabled && disabledNote && (
        <p className={`mt-2 rounded-xl border border-dashed border-[rgba(216,63,120,0.24)] bg-white/40 p-3 text-[12px] ${INK_MUTED} dark:border-white/14 dark:bg-white/[0.03]`}>
          {disabledNote}
        </p>
      )}

      {!disabled && remainingSlots > 0 && (
        <div
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            void handleFiles(event.dataTransfer?.files || null);
          }}
          className={`mt-2 rounded-2xl border border-dashed p-4 transition-colors ${
            isDragging
              ? "border-[#b31955] bg-[#b31955]/[0.06] dark:border-[#c4b5fd] dark:bg-[#c4b5fd]/[0.08]"
              : "border-[rgba(216,63,120,0.24)] bg-white/40 dark:border-white/14 dark:bg-white/[0.03]"
          }`}
        >
          {/* 터치 기기에는 드롭 타깃이 무의미하므로 버튼 두 개를 전폭으로 편다. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
            <button type="button" onClick={() => fileInputRef.current?.click()} className={`${GHOST_BUTTON} w-full sm:w-auto`}>
              <ImagePlus aria-hidden="true" className="h-4 w-4" />
              {copy.attachmentPickButton}
            </button>
            <button type="button" onClick={() => cameraInputRef.current?.click()} className={`${GHOST_BUTTON} w-full sm:hidden`}>
              <Camera aria-hidden="true" className="h-4 w-4" />
              {copy.attachmentCameraButton}
            </button>
            <span className={`hidden text-[12px] sm:inline ${INK_MUTED}`}>
              {copy.attachmentDropHint}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      )}

      {uploadingCount > 0 && (
        <p className={`mt-2 flex items-center gap-1.5 text-[12px] ${INK_MUTED}`} role="status">
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
          {copy.attachmentUploadingTemplate.replace("{n}", String(uploadingCount))}
        </p>
      )}

      {error && (
        <p className="mt-2 text-[12px] font-bold text-[#b31955] dark:text-[#ffb4d0]" role="alert">{error}</p>
      )}

      {attachments.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {attachments.map((file) => (
            <li key={file.key} className="relative overflow-hidden rounded-xl border border-[rgba(216,63,120,0.16)] bg-white/60 dark:border-white/10 dark:bg-white/[0.04]">
              {/* 로컬 blob 우선, 없으면(초안 복원) 인증 경유 R2 URL. next/image 최적화 대상이 아니다. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previews[file.key] || file.url} alt={copy.attachmentPreviewAlt} className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(file.key)}
                aria-label={copy.attachmentRemoveAria}
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className={`mt-2 text-[12px] ${INK_MUTED}`}>
        {copy.attachmentPrivacyNote}
      </p>
    </div>
  );
}
