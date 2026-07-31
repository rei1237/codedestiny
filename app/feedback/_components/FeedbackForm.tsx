"use client";

import { AnimatePresence, m } from "framer-motion";
import { AlertTriangle, Send } from "lucide-react";

import type { FeedbackAttachment } from "../_lib/api";
import type { FeedbackCategory } from "../_lib/categories";
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
  disabled: boolean;
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
  onSubmit: () => void;
}

export default function FeedbackForm(props: FeedbackFormProps) {
  const {
    category, title, content, url, details, attachments, environment, sendEnvironment,
    urlAutoFilled, disabled, submitting, uploading, error, savedAtLabel,
    titleMaxLength, contentMinLength, contentMaxLength,
    onTitleChange, onContentChange, onUrlChange, onDetailChange,
    onAttachmentsChange, onUploadingChange, onSendEnvironmentChange, onPasteImages, onSubmit,
  } = props;

  const canSubmit = !disabled
    && !submitting
    && !uploading
    && Boolean(title.trim())
    && content.trim().length >= contentMinLength;

  return (
    <form
      noValidate
      onSubmit={(event) => { event.preventDefault(); if (canSubmit) onSubmit(); }}
      onKeyDown={(event) => {
        // Ctrl/⌘+Enter 제출. canSubmit 으로 가드해 업로드 중에는 발사되지 않는다.
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          if (canSubmit) onSubmit();
        }
      }}
      className="space-y-5"
    >
      <fieldset disabled={disabled} className="space-y-5 disabled:opacity-60">
        {category.warning && (
          <p
            className="flex items-start gap-2 rounded-xl border border-[#e5a3b8] bg-[#fff1f5] p-3 text-[13px] font-bold leading-relaxed text-[#8e1240] dark:border-[#7c3350] dark:bg-[#2a0d1c] dark:text-[#ffc4de]"
            role="note"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {category.warning}
          </p>
        )}

        <div>
          <label htmlFor="cd-feedback-title" className={FIELD_LABEL}>
            제목 <span aria-hidden="true" className="text-[#b31955] dark:text-[#c4b5fd]">*</span>
          </label>
          <input
            id="cd-feedback-title"
            type="text"
            value={title}
            maxLength={titleMaxLength}
            required
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="한 줄로 요약해 주세요"
            className={`${FIELD_INPUT} mt-2`}
            aria-describedby="cd-feedback-title-count"
          />
          <p id="cd-feedback-title-count" className={`mt-1 text-right text-[12px] ${INK_MUTED}`}>
            {title.length}/{titleMaxLength}
          </p>
        </div>

        <div>
          <label htmlFor="cd-feedback-content" className={FIELD_LABEL}>
            내용 <span aria-hidden="true" className="text-[#b31955] dark:text-[#c4b5fd]">*</span>
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
            placeholder="어떤 상황에서 무엇이 이상했는지 편하게 적어주세요. 스크린샷은 여기에 바로 붙여넣어도 됩니다."
            className={`${FIELD_INPUT} mt-2 resize-y`}
            aria-describedby="cd-feedback-content-count"
          />
          <p id="cd-feedback-content-count" className={`mt-1 text-right text-[12px] ${INK_MUTED}`}>
            {content.length}/{contentMaxLength}
            {content.trim().length > 0 && content.trim().length < contentMinLength
              ? ` · ${contentMinLength}자 이상 입력해 주세요`
              : ""}
          </p>
        </div>

        <div>
          <label htmlFor="cd-feedback-url" className={FIELD_LABEL}>
            제보 대상 페이지
            {category.requireUrl && <span aria-hidden="true" className="ml-1 text-[#b31955] dark:text-[#c4b5fd]">*</span>}
            {urlAutoFilled && url && (
              <span className={`ml-2 rounded-full bg-[#b31955]/10 px-2 py-0.5 text-[11px] font-bold ${INK_MUTED} dark:bg-[#c4b5fd]/15`}>
                자동 입력됨
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

        <AttachmentDropzone
          attachments={attachments}
          onChange={onAttachmentsChange}
          onUploadingChange={onUploadingChange}
          emphasize={category.emphasizeAttachment}
        />

        <EnvironmentPanel entries={environment} enabled={sendEnvironment} onToggle={onSendEnvironmentChange} />
      </fieldset>

      {error && (
        <p className="rounded-xl border border-[#e5a3b8] bg-[#fff1f5] p-3 text-[13px] font-bold text-[#8e1240] dark:border-[#7c3350] dark:bg-[#2a0d1c] dark:text-[#ffc4de]" role="alert">
          {error}
        </p>
      )}

      {/* 제출 행은 fixed 로 만들지 않는다 — MobileBottomNav·FeatureBackHomeNav 와 겹친다. */}
      <div className="flex flex-col-reverse items-center gap-3 pt-1 sm:flex-row sm:justify-between">
        <p className={`text-[12px] ${INK_MUTED}`}>
          {savedAtLabel ? `임시 저장됨 ${savedAtLabel}` : "작성 중인 내용은 자동으로 저장됩니다"}
        </p>
        <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
          <span className={`hidden text-[12px] sm:inline ${INK_MUTED}`}>
            <kbd className={`rounded border border-current px-1.5 py-0.5 text-[11px] ${INK}`}>Ctrl</kbd>
            {" + "}
            <kbd className={`rounded border border-current px-1.5 py-0.5 text-[11px] ${INK}`}>Enter</kbd>
          </span>
          <button type="submit" disabled={!canSubmit} className={`${CTA_BUTTON} w-full sm:w-auto`}>
            <Send aria-hidden="true" className="h-4 w-4" />
            {submitting ? "보내는 중…" : uploading ? "이미지 올리는 중…" : "의견 보내기"}
          </button>
        </div>
      </div>
    </form>
  );
}
