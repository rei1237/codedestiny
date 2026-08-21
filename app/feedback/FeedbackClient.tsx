"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";

import { primeAuthFromCache, refreshAuth, useAuthStore } from "@/app/_lib/auth-store";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";
import CategoryGrid from "./_components/CategoryGrid";
import FeedbackForm from "./_components/FeedbackForm";
import FeedbackHero from "./_components/FeedbackHero";
import FeedbackTopNav from "./_components/FeedbackTopNav";
import LoginGate from "./_components/LoginGate";
import SuccessScreen from "./_components/SuccessScreen";
import {
  FeedbackApiError,
  submitFeedback,
  type FeedbackAttachment,
  type SubmittedFeedback,
} from "./_lib/api";
import { buildFeedbackCategories, getFeedbackCategory, type FeedbackCategoryId } from "./_lib/categories";
import { FEEDBACK_COPY_KO_CATEGORIES, useFeedbackCopy } from "./_lib/copy";
import { collectEnvironment, findEnvValue, minimalEnvironment } from "./_lib/environment";
import { clearDraft, formatSavedAt, loadDraft, saveDraft, type FeedbackDraft } from "./_lib/draft";
import { CANVAS, GLASS_CARD, GHOST_BUTTON, INK, INK_MUTED } from "./_lib/styles";

const TITLE_MAX_LENGTH = 80;
const CONTENT_MIN_LENGTH = 10;
const CONTENT_MAX_LENGTH = 2000;
const DRAFT_DEBOUNCE_MS = 800;

export default function FeedbackClient() {
  const { isAuthenticated, authReady } = useAuthStore();
  const copy = useFeedbackCopy();
  const categories = useMemo(() => buildFeedbackCategories(copy.categories), [copy]);
  // 관리자 화면은 details[].label 을 그대로 보여준다 — 제출 payload 의 라벨은 화면 표시와
  // 별개로 항상 한국어를 쓴다(위 FEEDBACK_COPY_KO_CATEGORIES 주석 참고).
  const koCategories = useMemo(() => buildFeedbackCategories(FEEDBACK_COPY_KO_CATEGORIES), []);

  const [category, setCategory] = useState<FeedbackCategoryId | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [urlAutoFilled, setUrlAutoFilled] = useState(true);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>([]);
  const [sendEnvironment, setSendEnvironment] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<SubmittedFeedback | null>(null);

  const [pastedFiles, setPastedFiles] = useState<File[]>([]);
  const [pendingDraft, setPendingDraft] = useState<FeedbackDraft | null>(null);
  const [savedAtLabel, setSavedAtLabel] = useState("");
  const draftTimerRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);

  const selectedCategory = useMemo(() => getFeedbackCategory(category, categories), [category, categories]);

  // 🔴 이 페이지는 몰입형(CHROMELESS_ROUTES)이라 GlobalHeader → AuthWidget 이 렌더되지 않는다.
  //    평소 authReady 를 true 로 올리는 건 그 AuthWidget 의 refreshAuth 호출이므로,
  //    여기서 직접 부트스트랩하지 않으면 로그인 상태와 무관하게 authReady 가 영원히 false 다.
  useEffect(() => {
    primeAuthFromCache();
    refreshAuth({ force: false, silent: true }).catch(() => {
      // best-effort — 실패해도 폼은 계속 쓸 수 있어야 한다.
    });
  }, []);

  // 제보 대상 URL 자동 입력: ?from= → 동일 출처 referrer → 빈 값.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromParam = new URLSearchParams(window.location.search).get("from");
    if (fromParam) {
      setUrl(fromParam.slice(0, 1000));
      return;
    }
    try {
      const referrer = document.referrer;
      if (referrer && new URL(referrer).origin === window.location.origin) {
        setUrl(referrer.slice(0, 1000));
      }
    } catch {
      // referrer 파싱 실패는 무시한다.
    }
  }, []);

  // 🔴 초안은 조용히 복원하지 않는다 — 다른 탭에서 이미 제출한 사람을 놀라게 한다.
  useEffect(() => {
    const draft = loadDraft();
    if (draft) setPendingDraft(draft);
    hydratedRef.current = true;
  }, []);

  const environment = useMemo(
    () => (sendEnvironment ? collectEnvironment(url) : minimalEnvironment(url)),
    [url, sendEnvironment],
  );

  // 자동 수집값으로 채우는 읽기 전용 필드(모바일 브라우저·네트워크 종류)를 동기화한다.
  useEffect(() => {
    if (!selectedCategory) return;
    const autoFields = selectedCategory.fields.filter((field) => field.autoFillFrom);
    if (!autoFields.length) return;

    const full = collectEnvironment(url);
    setDetails((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const field of autoFields) {
        const value = findEnvValue(full, field.autoFillFrom as string);
        if (value && next[field.key] !== value) {
          next[field.key] = value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedCategory, url]);

  // 800ms 디바운스 자동 저장.
  useEffect(() => {
    if (!hydratedRef.current || submitted) return;
    if (!title.trim() && !content.trim() && !attachments.length) return;

    if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    draftTimerRef.current = window.setTimeout(() => {
      saveDraft({ category: category || "", title, content, url, details, attachments, sendEnvironment });
      setSavedAtLabel(formatSavedAt(Date.now(), getCurrentLoadingLocale()));
    }, DRAFT_DEBOUNCE_MS);

    return () => {
      if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    };
  }, [category, title, content, url, details, attachments, sendEnvironment, submitted]);

  const restoreDraft = () => {
    if (!pendingDraft) return;
    setCategory((pendingDraft.category as FeedbackCategoryId) || null);
    setTitle(pendingDraft.title || "");
    setContent(pendingDraft.content || "");
    if (pendingDraft.url) {
      setUrl(pendingDraft.url);
      setUrlAutoFilled(false);
    }
    setDetails(pendingDraft.details || {});
    setAttachments(pendingDraft.attachments || []);
    setSendEnvironment(pendingDraft.sendEnvironment !== false);
    setPendingDraft(null);
  };

  const discardDraft = () => {
    clearDraft();
    setPendingDraft(null);
    setSavedAtLabel("");
  };

  // 드롭존 effect 의 의존성이라 반드시 안정적인 참조여야 한다(매 렌더 새 함수면 재실행된다).
  const emptyPastedFiles = useCallback(() => setPastedFiles([]), []);

  const persistDraftNow = useCallback(() => {
    saveDraft({ category: category || "", title, content, url, details, attachments, sendEnvironment });
  }, [category, title, content, url, details, attachments, sendEnvironment]);

  // 미로그인 상태에서 제출을 누른 경우. 초안을 먼저 확정 저장하고 로그인으로 보낸다.
  const goToLogin = useCallback(() => {
    persistDraftNow();
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/login?next=${encodeURIComponent(next)}`);
  }, [persistDraftNow]);

  const handleSubmit = async () => {
    if (!selectedCategory) return;
    setSubmitting(true);
    setError("");

    try {
      const koFields = getFeedbackCategory(selectedCategory.id, koCategories)?.fields || [];
      const result = await submitFeedback({
        category: selectedCategory.id,
        title: title.trim(),
        content: content.trim(),
        url: url.trim(),
        details: selectedCategory.fields
          .map((field) => ({
            key: field.key,
            label: koFields.find((koField) => koField.key === field.key)?.label || field.label,
            value: (details[field.key] || "").trim(),
          }))
          .filter((entry) => entry.value),
        environment,
        attachments: attachments.map((file) => file.key),
      }, copy);

      clearDraft();
      setSubmitted(result);
    } catch (submitError) {
      if (submitError instanceof FeedbackApiError && submitError.status === 401) {
        // 세션이 끊긴 경우. 초안은 남겨두고 로그인 게이트가 다시 뜨게 한다.
        persistDraftNow();
        const { handleSessionInvalidated } = await import("@/app/_lib/auth-store");
        handleSessionInvalidated();
      }
      setError(submitError instanceof Error ? submitError.message : copy.submitErrorFallback);
    } finally {
      setSubmitting(false);
    }
  };

  const writeAnother = () => {
    setSubmitted(null);
    setTitle("");
    setContent("");
    setDetails({});
    setAttachments([]);
    setError("");
    setSavedAtLabel("");
  };

  return (
    <main className={`${CANVAS} px-4 py-10 sm:py-14`}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <FeedbackTopNav />
        <FeedbackHero />

        <AnimatePresence mode="wait">
          {submitted ? (
            <m.div
              key="success"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <SuccessScreen submitted={submitted} onWriteAnother={writeAnother} />
            </m.div>
          ) : (
            <m.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-6"
            >
              {pendingDraft && (
                <div className="flex flex-col gap-3 rounded-2xl border border-[rgba(234,208,137,0.6)] bg-[#fffaf0] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#5a4a2a] dark:bg-[#211a10]">
                  <p className={`text-[13px] ${INK}`}>
                    {copy.draftBannerText} · <span className={INK_MUTED}>{formatSavedAt(pendingDraft.savedAt, getCurrentLoadingLocale())}</span>
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={restoreDraft} className={GHOST_BUTTON}>{copy.draftContinue}</button>
                    <button type="button" onClick={discardDraft} className={GHOST_BUTTON}>{copy.draftRestart}</button>
                  </div>
                </div>
              )}

              <section aria-labelledby="cd-feedback-category-heading">
                <h2 id="cd-feedback-category-heading" className={`mb-3 text-sm font-bold ${INK}`}>
                  {copy.categoryHeading}
                </h2>
                <CategoryGrid selected={category} onSelect={setCategory} />
              </section>

              {selectedCategory && (
                <section className={`${GLASS_CARD} p-5 sm:p-7`}>
                  {/* 미로그인이어도 히어로·카테고리는 계속 보이고 조작 가능하다 — 무엇을 하는
                      화면인지 먼저 보여준 뒤에 로그인을 요청한다. */}
                  {authReady && !isAuthenticated && (
                    <div className="mb-6">
                      <LoginGate onBeforeNavigate={persistDraftNow} />
                    </div>
                  )}

                  <FeedbackForm
                    category={selectedCategory}
                    title={title}
                    content={content}
                    url={url}
                    details={details}
                    attachments={attachments}
                    environment={environment}
                    sendEnvironment={sendEnvironment}
                    urlAutoFilled={urlAutoFilled}
                    isAuthenticated={isAuthenticated}
                    submitting={submitting}
                    uploading={uploading}
                    error={error}
                    savedAtLabel={savedAtLabel}
                    titleMaxLength={TITLE_MAX_LENGTH}
                    contentMinLength={CONTENT_MIN_LENGTH}
                    contentMaxLength={CONTENT_MAX_LENGTH}
                    onTitleChange={setTitle}
                    onContentChange={setContent}
                    onUrlChange={(value) => { setUrl(value); setUrlAutoFilled(false); }}
                    onDetailChange={(key, value) => setDetails((prev) => ({ ...prev, [key]: value }))}
                    onAttachmentsChange={setAttachments}
                    onUploadingChange={setUploading}
                    onSendEnvironmentChange={setSendEnvironment}
                    onPasteImages={setPastedFiles}
                    pastedFiles={pastedFiles}
                    onPastedConsumed={emptyPastedFiles}
                    onSubmit={() => { void handleSubmit(); }}
                    onRequireLogin={goToLogin}
                  />
                </section>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
