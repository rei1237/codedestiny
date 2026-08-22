"use client";

import { LogIn } from "lucide-react";

import { useFeedbackCopy } from "../_lib/copy";
import { CTA_BUTTON, INK, INK_MUTED } from "../_lib/styles";

interface LoginGateProps {
  /** 로그인으로 떠나기 직전에 초안을 저장한다. */
  onBeforeNavigate: () => void;
}

export default function LoginGate({ onBeforeNavigate }: LoginGateProps) {
  const copy = useFeedbackCopy();
  const goToLogin = () => {
    onBeforeNavigate();
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/login?next=${encodeURIComponent(next)}`);
  };

  return (
    // 차단이 아니라 안내다 — 폼은 그대로 쓸 수 있고 로그인은 제출 시점에만 필요하다.
    <div className="flex flex-col gap-3 rounded-2xl border border-[rgba(216,63,120,0.2)] bg-white/70 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between dark:border-white/12 dark:bg-white/[0.06]">
      <div>
        <p className={`text-[14px] font-bold ${INK}`}>{copy.loginGateTitle}</p>
        <p className={`mt-1 max-w-[46ch] text-[13px] leading-relaxed ${INK_MUTED}`}>
          {copy.loginGateBody}
        </p>
      </div>
      <button type="button" onClick={goToLogin} className={`${CTA_BUTTON} shrink-0`}>
        <LogIn aria-hidden="true" className="h-4 w-4" />
        {copy.loginGateButton}
      </button>
    </div>
  );
}
