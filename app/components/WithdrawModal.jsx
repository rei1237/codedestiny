"use client";

/**
 * WithdrawModal — 회원 탈퇴 확인 UI 컴포넌트
 *
 * 사용법:
 *   <WithdrawModal
 *     isOpen={isOpen}
 *     onClose={() => setOpen(false)}
 *     hasLocalAuth={true}   // 로컬 비밀번호 계정 여부
 *   />
 *
 * 동작 흐름:
 *   1. 모달 오픈 → CSRF 토큰 GET /api/auth/withdraw
 *   2. 사용자 입력 (비밀번호/동의)
 *   3. POST /api/auth/withdraw (X-CSRF-Token 헤더 포함)
 *   4. 성공 → 로컬 스토리지/세션 초기화 → 홈으로 이동
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useT } from "../../lib/i18n/useT";
import { getApiBaseUrl } from "../_lib/api-config";
import { useBodyScrollLock } from "../_lib/body-scroll-lock";

// ─────────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────────

// 🔴 확인 문구는 로케일과 무관하게 항상 이 한국어 문자열이어야 한다 — 서버(`/api/auth/withdraw`)가
// `confirmText`를 이 리터럴로 검증한다(worker/routes/auth.js). UI 안내는 번역하되, 사용자가
// 실제로 입력해야 하는 값 자체를 바꾸려면 서버 쪽 검증도 함께 바꿔야 한다(이번 범위 밖).
const WITHDRAWAL_CONFIRM_TEXT = "회원탈퇴";

/**
 * 클라이언트 사이드 저장소 초기화
 * — JWT가 쿠키에 있어 서버에서 삭제되지만, 혹시라도 로컬 캐시가
 *   남으면 다음 요청에서 재사용될 수 있으므로 완전 초기화합니다.
 */
function clearClientStorage() {
  try {
    // localStorage: 인증 관련 키만 선택적으로 삭제 (다른 사용자 데이터 보호)
    const authKeys = [
      "fortune_auth_token",
      "fortune_user",
      "cd_user",
      "cd_points",
      "cd_unlocked_features",
      "destinyProfile",
    ];
    authKeys.forEach((k) => localStorage.removeItem(k));

    // sessionStorage 전체 초기화
    sessionStorage.clear();
  } catch (e) {
    // 저장소 접근 오류는 탈퇴 처리를 막지 않음
  }
}

// ─────────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────────

/**
 * @param {{ isOpen: boolean, onClose: () => void, hasLocalAuth?: boolean }} props
 */
export default function WithdrawModal({ isOpen, onClose, hasLocalAuth = true }) {
  const t = useT();
  const apiBase = getApiBaseUrl();
  useBodyScrollLock(Boolean(isOpen));
  // 입력 상태
  const [password, setPassword]         = useState("");
  const [confirmText, setConfirmText]   = useState("");
  const [agreeIrreversible, setAgreeIrreversible] = useState(false);
  const [agreeDataDeletion, setAgreeDataDeletion] = useState(false);

  // 처리 상태
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState("");
  const [step, setStep]                 = useState("form"); // "form" | "success"

  // CSRF 토큰 (GET 요청으로 발급)
  const csrfTokenRef = useRef("");

  // 포커스 관리 (접근성)
  const firstInputRef  = useRef(null);
  const closeButtonRef = useRef(null);

  // ── CSRF 토큰 발급 ─────────────────────────────────────────────
  const fetchCsrfToken = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/auth/withdraw`, { method: "GET" });
      if (!res.ok) throw new Error("CSRF 토큰 발급 실패");
      const data = await res.json();
      csrfTokenRef.current = data.csrfToken || "";
    } catch (e) {
      setError(t("withdrawModal.csrfFetchError"));
    }
  }, [apiBase, t]);

  // 모달 오픈 시 상태 초기화 + CSRF 토큰 발급
  useEffect(() => {
    if (!isOpen) return;

    // 입력값 초기화
    setPassword("");
    setConfirmText("");
    setAgreeIrreversible(false);
    setAgreeDataDeletion(false);
    setError("");
    setStep("form");
    csrfTokenRef.current = "";

    // CSRF 토큰 발급 요청
    fetchCsrfToken();

    // 첫 번째 입력 필드에 포커스
    const timer = setTimeout(() => firstInputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [isOpen, fetchCsrfToken]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, isSubmitting, onClose]);

  // ── 제출 핸들러 ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 클라이언트 사전 검증
    if (!agreeIrreversible || !agreeDataDeletion) {
      setError(t("withdrawModal.consentRequired"));
      return;
    }
    if (confirmText.trim() !== WITHDRAWAL_CONFIRM_TEXT) {
      setError(t("withdrawModal.confirmMismatch"));
      return;
    }
    if (hasLocalAuth && password.length < 8) {
      setError(t("withdrawModal.passwordTooShort"));
      return;
    }
    if (!csrfTokenRef.current) {
      setError(t("withdrawModal.csrfMissing"));
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${apiBase}/api/auth/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          // CSRF 토큰을 헤더에 포함 (Double-Submit Cookie 패턴)
          "X-CSRF-Token":  csrfTokenRef.current,
        },
        body: JSON.stringify({
          password:          hasLocalAuth ? password : undefined,
          confirmText:       confirmText.trim(),
          agreeIrreversible: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || t("withdrawModal.genericError"));
        // 401/403은 보안 이슈 — CSRF 토큰 재발급
        if (res.status === 401 || res.status === 403) {
          csrfTokenRef.current = "";
          await fetchCsrfToken();
        }
        return;
      }

      // ── 탈퇴 성공 처리 ─────────────────────────────────────────
      // 클라이언트 저장소 초기화 (서버 쿠키는 응답으로 이미 만료됨)
      clearClientStorage();

      if (data.partialFailure) {
        // 부분 실패: 처리는 완료되었으나 일부 단계 오류 발생
        console.warn("[withdraw] 일부 단계에서 오류가 발생했습니다. 운영팀이 수동으로 처리합니다.");
      }

      setStep("success");

      // 3초 후 홈으로 리다이렉트
      setTimeout(() => {
        window.location.replace("/");
      }, 3000);
    } catch (err) {
      setError(t("withdrawModal.networkError"));
      console.error("[WithdrawModal] 제출 오류:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 렌더링 ─────────────────────────────────────────────────────
  if (!isOpen) return null;

  return (
    // 모달 배경 오버레이
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-modal-title"
      onClick={(e) => {
        // 배경 클릭 시 닫기 (처리 중 제외)
        if (!isSubmitting && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">

        {/* ── 헤더 ── */}
        <div className="bg-red-600 dark:bg-red-800 px-6 py-4 flex items-center justify-between">
          <h2
            id="withdraw-modal-title"
            className="text-white font-bold text-lg flex items-center gap-2"
          >
            {/* 경고 아이콘 */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5 flex-shrink-0"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                clipRule="evenodd"
              />
            </svg>
            {t("withdrawModal.title")}
          </h2>
          {!isSubmitting && (
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
              aria-label={t("withdrawModal.closeAriaLabel")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ── 콘텐츠 ── */}
        <div className="px-6 py-5">

          {/* ── 성공 화면 ── */}
          {step === "success" ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth={2} stroke="currentColor"
                  className="w-8 h-8 text-green-600 dark:text-green-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t("withdrawModal.successTitle")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t("withdrawModal.successThanks")}
                <br />{t("withdrawModal.successErased")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {t("withdrawModal.successRedirect")}
              </p>
            </div>

          ) : (

            /* ── 탈퇴 폼 ── */
            <form onSubmit={handleSubmit} noValidate className="space-y-5">

              {/* 경고 안내 박스 */}
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-1.5">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {t("withdrawModal.warningHeading")}
                </p>
                <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 list-disc list-inside">
                  <li>{t("withdrawModal.warningPointsPrefix")} <strong>{t("withdrawModal.warningPointsStrong")}</strong>{t("withdrawModal.warningPointsSuffix")}</li>
                  <li>{t("withdrawModal.warningRejoinPrefix")} <strong>{t("withdrawModal.warningRejoinStrong")}</strong>{t("withdrawModal.warningRejoinSuffix")}</li>
                  <li>{t("withdrawModal.warningRetention")}</li>
                </ul>
              </div>

              {/* 비밀번호 재확인 (로컬 계정만) */}
              {hasLocalAuth && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="withdraw-password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {t("withdrawModal.passwordLabel")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="withdraw-password"
                    ref={firstInputRef}
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("withdrawModal.passwordPlaceholder")}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                    required
                  />
                </div>
              )}

              {/* 탈퇴 의사 확인 텍스트 */}
              <div className="space-y-1.5">
                <label
                  htmlFor="withdraw-confirm-text"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t("withdrawModal.confirmLabel")} <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("withdrawModal.confirmHintPrefix")}<strong className="text-red-600 dark:text-red-400">{WITHDRAWAL_CONFIRM_TEXT}</strong>{t("withdrawModal.confirmHintSuffix")}
                </p>
                <input
                  id="withdraw-confirm-text"
                  ref={!hasLocalAuth ? firstInputRef : undefined}
                  type="text"
                  autoComplete="off"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={WITHDRAWAL_CONFIRM_TEXT}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  required
                />
              </div>

              {/* 동의 체크박스 */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreeIrreversible}
                    onChange={(e) => setAgreeIrreversible(e.target.checked)}
                    disabled={isSubmitting}
                    className="mt-0.5 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {t("withdrawModal.agreeIrreversible")}
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreeDataDeletion}
                    onChange={(e) => setAgreeDataDeletion(e.target.checked)}
                    disabled={isSubmitting}
                    className="mt-0.5 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {t("withdrawModal.agreeDataRetention")}
                  </span>
                </label>
              </div>

              {/* 오류 메시지 */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                    className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true">
                    <path fillRule="evenodd"
                      d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                      clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {t("withdrawModal.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !agreeIrreversible || !agreeDataDeletion}
                  className="flex-1 py-2.5 px-4 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-900 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      {/* 스피너 */}
                      <svg
                        className="animate-spin w-4 h-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t("withdrawModal.submitting")}
                    </>
                  ) : (
                    t("withdrawModal.submit")
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
