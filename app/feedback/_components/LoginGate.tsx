"use client";

import { LogIn } from "lucide-react";

import { CTA_BUTTON, INK, INK_MUTED } from "../_lib/styles";

interface LoginGateProps {
  /** 로그인으로 떠나기 직전에 초안을 저장한다. */
  onBeforeNavigate: () => void;
}

export default function LoginGate({ onBeforeNavigate }: LoginGateProps) {
  const goToLogin = () => {
    onBeforeNavigate();
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/login?next=${encodeURIComponent(next)}`);
  };

  return (
    <div className="rounded-2xl border border-[rgba(216,63,120,0.2)] bg-white/70 p-5 text-center backdrop-blur-xl dark:border-white/12 dark:bg-white/[0.06]">
      <p className={`text-[15px] font-bold ${INK}`}>제보하려면 로그인이 필요해요</p>
      <p className={`mx-auto mt-2 max-w-[42ch] text-[13px] leading-relaxed ${INK_MUTED}`}>
        확인 결과를 회신드리기 위해서예요. 지금 쓰신 내용은 그대로 저장해 두었다가
        돌아오시면 이어서 쓸 수 있게 해드릴게요.
      </p>
      <button type="button" onClick={goToLogin} className={`${CTA_BUTTON} mt-4`}>
        <LogIn aria-hidden="true" className="h-4 w-4" />
        로그인하고 제보하기
      </button>
    </div>
  );
}
