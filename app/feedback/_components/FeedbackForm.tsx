"use client";

import { AnimatePresence, m } from "framer-motion";
import { AlertTriangle, Gift, LogIn, Send } from "lucide-react";

import type { FeedbackAttachment } from "../_lib/api";
import type { FeedbackCategory } from "../_lib/categories";
import { useFeedbackCopy } from "../_lib/copy";
import type { EnvEntry } from "../_lib/environment";
import {
  CTA_BUTTON,
  FIELD_INPUT,
  FIELD_LABEL,
  INK,
  INK_MUTED,
} from "../_lib/styles";
import AttachmentDropzone from "./AttachmentDropzone";
import EnvironmentPanel from "./EnvironmentPanel";

interface FeedbackFormProps {
  category: FeedbackCategory;
  title: string;
  content: string;
  url: string;
  details: Record<string, string>;
  attachments: FeedbackAttachment[];
  environment: EnvEntry[];
  sendEnvironment: boolean;
  urlAutoFilled: boolean;
  isAuthenticated: boolean;
  submitting: boolean;
  uploading: boolean;
  error: string;
  savedAtLabel: string;
  titleMaxLength: number;
  contentMinLength: number;
  contentMaxLength: number;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onDetailChange: (key: string, value: string) => void;
  onAttachmentsChange: (next: FeedbackAttachment[]) => void;
  onUploadingChange: (uploading: boolean) => void;
  onSendEnvironmentChange: (next: boolean) => void;
  onPasteImages: (files: File[]) => void;
  pastedFiles: File[];
  onPastedConsumed: () => void;
  onSubmit: () => void;
  /** 미로그인 상태에서 제출을 누르면 초안을 저장하고 로그인으로 보낸다. */
  onRequireLogin: () => void;
}

export default function FeedbackForm(props: FeedbackFormProps) {
  const copy = useFeedbackCopy();
  const {
    category, title, content, url, details, attachments, environment, sendEnvironment,
    urlAutoFilled, isAuthenticated, submitting, uploading, error, savedAtLabel,
    titleMaxLength, contentMinLength, contentMaxLength,
    onTitleChange, onContentChange, onUrlChange, onDetailChange,
    onAttachmentsChange, onUploadingChange, onSendEnvironmentChange, onPasteImages,
    pastedFiles, onPastedConsumed, onSubmit, onRequireLogin,
  } = props;

  // 🔴 입력은 로그인과 무관하게 항상 열어 둔다. 초안이 로그인 왕복에서 살아남는 설계인데
  //    폼을 잠가 두면 저장할 내용 자체를 쓸 수 없어 앞뒤가 맞지 않는다.
  //    로그인은 "제출" 시점에만 요구한다.
  const contentReady = Boolean(title.trim()) && content.trim().length >= contentMinLength;
  const canSubmit = contentReady && !submitting && !uploading;

  const submitNow = () => {
    if (!canSubmit) return;
    if (!isAuthenticated) { onRequireLogin(); return; }
    onSubmit();
  };

  return (
    <form
      noValidate
      onSubmit={(event) => { event.preventDefault(); submitNow(); }}
      onKeyDown={(event) => {
        // Ctrl/⌘+Enter 제출. canSubmit 으로 가드해 업로드 중에는 발사되지 않는다.
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          submitNow();
        }
      }}
      className="space-y-5"
    >
      <div className="space-y-5">
        {category.warning && (
          <p
            className="flex items-start gap-2 rounded-xl border border-[#e5a3b8] bg-[#fff1f5] p-3 text-[13px] font-bold leading-relaxed text-[#8e1240] dark:border-[#7c3350] dark:bg-[#2a0d1c] dark:text-[#ffc4de]"
            role="note"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {category.warning}
          </p>
        )}

        {category.rewardNote && (
          <p
            className="flex items-start gap-2 rounded-xl border border-[#ead089] bg-[#fff9ea] p-3 text-[13px] font-bold leading-relaxed text-[#6b4a12] dark:border-[#8a6d2f] dark:bg-[#2a2210] dark:text-[#ead089]"
            role="note"
          >
            <Gift aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {category.rewardNote}
          </p>
        )}

        <div>
          <label htmlFor="cd-feedback-title" className={FIELD_LABEL}>
            {copy.titleFieldLabel} <span aria-hidden="true" className="text-[#b31955] dark:text-[#c4b5fd]">*</span>
          </label>
          <input
            id="cd-feedback-title"
            type="text"
            value={title}
            maxLength={titleMaxLength}
            required
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={copy.titlePlaceholder}
            className={`${FIELD_INPUT} mt-2`}
            aria-describedby="cd-feedback-title-count"
          />
          <p id="cd-feedback-title-count" className={`mt-1 text-right text-[12px] ${INK_MUTED}`}>
            {title.length}/{titleMaxLength}
          </p>
        </div>

        <div>
          <label htmlFor="cd-feedback-content" className={FIELD_LABEL}>
            {copy.contentFieldLabel} <span aria-hidden="true" className="text-[#b31955] dark:text-[#c4b5fd]">*</span>
          </label>
          <textarea
            id="cd-feedback-content"
            value={content}
            rows={7}
            maxLength={contentMaxLength}
            required
            onChange={(event) => onContentChange(event.target.value)}
            onPaste={(event) => {
              // 스크린샷을 바로 붙여넣는 경로. 버그 제보자에게 가장 자연스러운 동작이다.
              const files = Array.from(event.clipboardData?.files || []).filter((file) => file.type.startsWith("image/"));
              if (files.length) {
                event.preventDefault();
                onPasteImages(files);
              }
            }}
            placeholder={copy.contentPlaceholder}
            className={`${FIELD_INPUT} mt-2 resize-y`}
            aria-describedby="cd-feedback-content-count"
          />
          <p id="cd-feedback-content-count" className={`mt-1 text-right text-[12px] ${INK_MUTED}`}>
            {content.length}/{contentMaxLength}
            {content.trim().length > 0 && content.trim().length < contentMinLength
              ? ` · ${contentMinLength}${copy.contentMinLengthSuffix}`
              : ""}
          </p>
        </div>

        <div>
          <label htmlFor="cd-feedback-url" className={FIELD_LABEL}>
            {copy.urlFieldLabel}
            {category.requireUrl && <span aria-hidden="true" className="ml-1 text-[#b31955] dark:text-[#c4b5fd]">*</span>}
            {urlAutoFilled && url && (
              <span className={`ml-2 rounded-full bg-[#b31955]/10 px-2 py-0.5 text-[11px] font-bold ${INK_MUTED} dark:bg-[#c4b5fd]/15`}>
                {copy.urlAutoFilledBadge}
              </span>
            )}
          </label>
          <input
            id="cd-feedback-url"
            type="text"
            inputMode="url"
            value={url}
            maxLength={1000}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://code-destiny.com/..."
            className={`${FIELD_INPUT} mt-2`}
          />
        </div>

        {/* 카테고리 전환 시 조건부 필드가 높이 트윈으로 열린다. overflow-hidden 없으면 필드가 넘쳐 보인다. */}
        <AnimatePresence initial={false} mode="popLayout">
          {category.fields.map((field) => (
            <m.div
              key={`${category.id}-${field.key}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <label htmlFor={`cd-feedback-${field.key}`} className={FIELD_LABEL}>
                {field.label}
                {field.required && <span aria-hidden="true" className="ml-1 text-[#b31955] dark:text-[#c4b5fd]">*</span>}
              </label>

              {field.options ? (
                <select
                  id={`cd-feedback-${field.key}`}
                  value={details[field.key] || ""}
                  onChange={(event) => onDetailChange(field.key, event.target.value)}
                  className={`${FIELD_INPUT} mt-2`}
                >
                  <option value="">{field.placeholder}</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : field.multiline ? (
                <textarea
                  id={`cd-feedback-${field.key}`}
                  value={details[field.key] || ""}
                  rows={4}
                  maxLength={1000}
                  onChange={(event) => onDetailChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className={`${FIELD_INPUT} mt-2 resize-y`}
                />
              ) : (
                <input
                  id={`cd-feedback-${field.key}`}
                  type="text"
                  value={details[field.key] || ""}
                  maxLength={1000}
                  readOnly={Boolean(field.autoFillFrom)}
                  onChange={(event) => onDetailChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className={`${FIELD_INPUT} mt-2 ${field.autoFillFrom ? "cursor-default opacity-70" : ""}`}
                />
              )}
            </m.div>
          ))}
        </AnimatePresence>

        {/* 첨부는 업로드가 서버 인증을 요구하므로 로그인 전에는 막고 이유를 알린다. */}
        <AttachmentDropzone
          attachments={attachments}
          onChange={onAttachmentsChange}
          onUploadingChange={onUploadingChange}
          emphasize={category.emphasizeAttachment}
          pastedFiles={pastedFiles}
          onPastedConsumed={onPastedConsumed}
          disabled={!isAuthenticated}
          disabledNote={copy.attachmentDisabledNote}
        />

        <EnvironmentPanel entries={environment} enabled={sendEnvironment} onToggle={onSendEnvironmentChange} />
      </div>

      {error && (
        <p className="rounded-xl border border-[#e5a3b8] bg-[#fff1f5] p-3 text-[13px] font-bold text-[#8e1240] dark:border-[#7c3350] dark:bg-[#2a0d1c] dark:text-[#ffc4de]" role="alert">
          {error}
        </p>
      )}

      {/* 제출 행은 fixed 로 만들지 않는다 — MobileBottomNav·FeatureBackHomeNav 와 겹친다. */}
      <div className="flex flex-col-reverse items-center gap-3 pt-1 sm:flex-row sm:justify-between">
        <p className={`text-[12px] ${INK_MUTED}`}>
          {savedAtLabel ? `${copy.savedAtPrefix} ${savedAtLabel}` : copy.autoSaveNote}
        </p>
        <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
          <span className={`hidden text-[12px] sm:inline ${INK_MUTED}`}>
            <kbd className={`rounded border border-current px-1.5 py-0.5 text-[11px] ${INK}`}>Ctrl</kbd>
            {" + "}
            <kbd className={`rounded border border-current px-1.5 py-0.5 text-[11px] ${INK}`}>Enter</kbd>
          </span>
          <button type="submit" disabled={!canSubmit} className={`${CTA_BUTTON} w-full sm:w-auto`}>
            {isAuthenticated
              ? <Send aria-hidden="true" className="h-4 w-4" />
              : <LogIn aria-hidden="true" className="h-4 w-4" />}
            {submitting
              ? copy.submitSending
              : uploading
                ? copy.submitUploading
                : isAuthenticated
                  ? copy.submitSend
                  : copy.submitLoginAndSend}
          </button>
        </div>
      </div>
    </form>
  );
}
