"use client";

import React, { useState } from "react";

interface EmailSubscriptionSectionProps {
  birthYear?: number;
}

export default function EmailSubscriptionSection({ birthYear }: EmailSubscriptionSectionProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setStatus("idle");

    try {
      const response = await fetch("/api/subscriptions/daily-fortune", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          birthYear,
          source: "kkulkkul-main",
          subDaily: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage("구독 신청이 완료되었습니다! 내일부터 맞춤 운세를 보내드릴게요.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.message || "구독 신청 중 오류가 발생했습니다.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-8 rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-sm">
      <div className="flex flex-col items-center text-center md:flex-row md:text-left md:justify-between gap-6">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            매일 오전 7시 배달
          </div>
          <h2 className="text-2xl font-black text-indigo-900 leading-tight">
            내 운명을 바꾸는 <br className="md:hidden" />
            <span className="text-purple-600">오늘의 맞춤 운세 레터</span>
          </h2>
          <p className="mt-2 text-sm text-indigo-700/80 font-medium">
            매일 아침, 당신만을 위한 행운 가이드를 이메일로 보내드립니다.
          </p>
        </div>

        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="email"
                placeholder="운세를 받을 이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || status === "success"}
                className="w-full rounded-2xl border-2 border-indigo-100 bg-white px-5 py-4 text-sm font-medium focus:border-indigo-500 focus:outline-none disabled:bg-indigo-50/50"
              />
              <button
                type="submit"
                disabled={loading || status === "success"}
                className="absolute right-2 top-2 bottom-2 rounded-xl bg-indigo-600 px-6 text-sm font-black text-white transition-all hover:bg-indigo-700 disabled:bg-neutral-300"
              >
                {loading ? "신청 중..." : "구독하기"}
              </button>
            </div>
            {status === "success" && (
              <p className="text-center text-xs font-bold text-emerald-600 animate-pulse">
                ✓ {message}
              </p>
            )}
            {status === "error" && (
              <p className="text-center text-xs font-bold text-rose-500">
                ⚠ {message}
              </p>
            )}
            <p className="text-center text-[10px] text-indigo-400">
              * 구독 해지는 언제든 가능하며, 개인정보는 운세 발송용으로만 사용됩니다.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
