"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { useBodyScrollLock } from "@/app/_lib/body-scroll-lock";

export type PromptHubGateCopy = {
  title: string;
  lead: string;
  benefits: string[];
  signup: string;
  login: string;
  dismiss: string;
  closeAria: string;
  note: string;
};

type PromptHubLoginGateModalProps = {
  open: boolean;
  copy: PromptHubGateCopy;
  signupHref: string;
  loginHref: string;
  onDismiss: () => void;
  /** 이탈 직전에 입력값 스냅샷을 저장한다. Link 의 onClick 은 이동보다 먼저 실행된다. */
  onNavigate: () => void;
};

// 모바일 시트는 하단 정렬이라 화면 상단이 전부 백드롭이다. 게이트를 띄운 그 탭이
// 그대로 백드롭에 떨어져 모달이 즉시 닫히는 것을 막는다.
const BACKDROP_CLOSE_GUARD_MS = 400;

export function PromptHubLoginGateModal({
  open,
  copy,
  signupHref,
  loginHref,
  onDismiss,
  onNavigate,
}: PromptHubLoginGateModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const primaryRef = useRef<HTMLAnchorElement | null>(null);
  const openedAtRef = useRef(0);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    openedAtRef.current = Date.now();
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    primaryRef.current?.focus();
    return () => {
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
        return;
      }
      if (event.key !== "Tab") return;
      // 포커스 가능한 요소가 넷뿐이라 첫↔끝 순환만 직접 돌린다. 배경으로 탭이 새면
      // 게이트가 열려 있는데도 뒤쪽 폼을 계속 조작할 수 있어 게이트가 무의미해진다.
      const focusables = cardRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onDismiss]);

  const closeFromBackdrop = useCallback(() => {
    if (Date.now() - openedAtRef.current < BACKDROP_CLOSE_GUARD_MS) return;
    onDismiss();
  }, [onDismiss]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/72 px-3 py-4 backdrop-blur-[2px] sm:items-center"
      role="presentation"
      onClick={closeFromBackdrop}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promptHubGateTitle"
        aria-describedby="promptHubGateLead"
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-[color:var(--hairline)] bg-[color:var(--surface-1)] p-5 shadow-[0_28px_80px_-30px_rgba(58,14,40,0.55)] sm:p-6"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(closest-side,rgba(255,248,220,0.55),rgba(244,190,209,0.22)_48%,transparent_74%)] blur-[4px]"
        />
        <button
          type="button"
          onClick={onDismiss}
          aria-label={copy.closeAria}
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-[color:var(--ink-3)] transition hover:bg-[color:var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
        >
          <X size={18} />
        </button>

        <div className="relative">
          <h2 id="promptHubGateTitle" className="pr-10 text-xl font-black leading-snug text-[color:var(--ink-1)]">
            {copy.title}
          </h2>
          <p id="promptHubGateLead" className="mt-2 text-sm font-semibold leading-6 text-[color:var(--ink-3)]">
            {copy.lead}
          </p>

          <ul className="mt-4 space-y-2">
            {copy.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm font-bold leading-6 text-[color:var(--ink-2)]">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color:var(--tool-accent-soft)] text-[color:var(--tool-ink)]">
                  <Check size={13} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="mt-5 grid gap-2">
            <Link
              ref={primaryRef}
              href={signupHref}
              onClick={onNavigate}
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-[color:var(--tool-accent-strong)] px-5 text-sm font-black text-[color:var(--on-accent-strong)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)] motion-reduce:hover:translate-y-0"
            >
              {copy.signup}
            </Link>
            <Link
              href={loginHref}
              onClick={onNavigate}
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-[color:var(--tool-accent)] px-5 text-sm font-black text-[color:var(--tool-accent-strong)] transition hover:bg-[color:var(--tool-accent-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
            >
              {copy.login}
            </Link>
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl px-5 text-sm font-bold text-[color:var(--ink-3)] transition hover:text-[color:var(--ink-2)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
            >
              {copy.dismiss}
            </button>
          </div>

          <p className="mt-3 text-xs font-medium leading-5 text-[color:var(--ink-3)]">{copy.note}</p>
        </div>
      </div>
    </div>
  );
}
