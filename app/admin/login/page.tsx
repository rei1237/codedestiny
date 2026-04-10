"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password) {
      setError("비밀번호를 입력하세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/entry/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) {
        setError("비밀번호가 올바르지 않습니다.");
        return;
      }
      // API가 Set-Cookie로 flower_admin_token을 이미 세팅; sessionStorage에도 저장
      if (data?.adminToken) {
        try { sessionStorage.setItem("flower_admin_token", String(data.adminToken)); } catch {}
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🌸</div>
          <h1 className="text-xl font-bold text-white">CODE DESTINY</h1>
          <p className="text-sm text-slate-500 mt-1">관리자 콘솔</p>
        </div>

        {/* Card */}
        <div className="bg-[#13131f] border border-[#2a2a3e] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-base font-semibold text-white mb-6">관리자 로그인</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="관리자 비밀번호 입력"
                autoFocus
                className="w-full bg-[#1e1e2e] border border-[#313145] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? "확인 중..." : "입장"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          관리자 권한이 필요합니다
        </p>
      </div>
    </div>
  );
}
