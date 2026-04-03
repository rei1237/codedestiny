"use client";

import { useCallback, useEffect, useState } from "react";

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  birthDate: string;
  joinedAt: string;
  role: "user" | "admin";
  points: number;
};

type AdminUsersResponse = {
  totalCount?: number;
  count?: number;
  users?: AdminUser[];
  message?: string;
};

type CoinGrantState = {
  user: AdminUser | null;
  amount: string;
  reason: string;
  loading: boolean;
  error: string;
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const FLOWER_TOKEN_KEY = "flower_admin_token";

function getStoredToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(FLOWER_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [isBooting, setIsBooting] = useState(true);

  // 비밀번호 입력 폼 (토큰이 없을 때)
  const [pwInput, setPwInput] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const [totalCount, setTotalCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);

  const [coinGrant, setCoinGrant] = useState<CoinGrantState>({
    user: null,
    amount: "",
    reason: "관리자 황금 돼지 코인 지급",
    loading: false,
    error: "",
  });

  // 부팅 시 sessionStorage에서 토큰 복원
  useEffect(() => {
    const stored = getStoredToken();
    setToken(stored || "");
    setIsBooting(false);
  }, []);

  // 비밀번호 제출 → 토큰 발급
  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const pw = pwInput.trim();
      if (!pw) {
        setPwError("비밀번호를 입력해 주세요.");
        return;
      }
      setPwLoading(true);
      setPwError("");
      try {
        const res = await fetch("/api/admin/entry/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: pw }),
        });
        if (!res.ok) {
          setPwError("비밀번호가 일치하지 않습니다.");
          return;
        }
        const payload = await res.json() as { ok?: boolean; adminToken?: string };
        const adminToken = payload.adminToken || "";
        if (!adminToken) {
          setPwError("토큰을 받지 못했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }
        try {
          sessionStorage.setItem(FLOWER_TOKEN_KEY, adminToken);
        } catch (_) {}
        setToken(adminToken);
        setPwInput("");
      } catch {
        setPwError("요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setPwLoading(false);
      }
    },
    [pwInput],
  );

  // 회원 목록 조회 — 상대경로 /api/admin/members 사용 (Express 백엔드 불필요)
  const fetchUsers = useCallback(
    async (keyword: string, currentToken: string) => {
      if (!currentToken) return;
      setLoading(true);
      setError("");
      try {
        const query = keyword ? `?search=${encodeURIComponent(keyword)}` : "";
        const response = await fetch(`/api/admin/members${query}`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });

        const payload = (await response.json()) as AdminUsersResponse;

        if (response.status === 401) {
          // 토큰 만료 or 위변조
          try { sessionStorage.removeItem(FLOWER_TOKEN_KEY); } catch (_) {}
          setToken("");
          return;
        }

        if (!response.ok) {
          setError(payload.message || "회원 목록을 불러오지 못했습니다.");
          return;
        }

        const nextUsers = Array.isArray(payload.users) ? payload.users : [];
        setUsers(nextUsers);
        setVisibleCount(nextUsers.length);
        setTotalCount(Number(payload.totalCount ?? nextUsers.length));
      } catch {
        setError("관리자 API에 연결하지 못했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isBooting && token) {
      fetchUsers(searchKeyword, token);
    }
  }, [fetchUsers, isBooting, searchKeyword, token]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchKeyword(searchInput.trim());
  };

  const handleDelete = async (user: AdminUser) => {
    const shouldDelete = window.confirm(`${user.name} (${user.email}) 회원을 삭제할까요?`);
    if (!shouldDelete) return;
    try {
      const response = await fetch(`/api/admin/members/${encodeURIComponent(user._id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message || "회원 삭제에 실패했습니다.");
        return;
      }
      await fetchUsers(searchKeyword, token);
    } catch {
      setError("회원 삭제 요청 중 오류가 발생했습니다.");
    }
  };

  const handleGrantCoinSubmit = async () => {
    const { user, amount, reason } = coinGrant;
    if (!user) return;

    const delta = Number(amount);
    if (!Number.isFinite(delta) || delta === 0) {
      setCoinGrant((prev) => ({ ...prev, error: "유효한 코인 수량을 입력해 주세요." }));
      return;
    }

    setCoinGrant((prev) => ({ ...prev, loading: true, error: "" }));

    try {
      const response = await fetch("/api/admin/members/points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user._id, delta, reason }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string; user?: { points: number } };

      if (!response.ok) {
        setCoinGrant((prev) => ({ ...prev, error: payload.message || "코인 지급에 실패했습니다.", loading: false }));
        return;
      }

      // 로컬 상태 업데이트
      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id
            ? { ...u, points: payload.user?.points ?? u.points }
            : u,
        ),
      );
      setCoinGrant({ user: null, amount: "", reason: "관리자 황금 돼지 코인 지급", loading: false, error: "" });
    } catch {
      setCoinGrant((prev) => ({ ...prev, error: "요청 중 오류가 발생했습니다.", loading: false }));
    }
  };

  if (isBooting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-200">
        로딩 중...
      </main>
    );
  }

  // 토큰 없음 → 인라인 비밀번호 입력 폼
  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#070b18] via-[#0d1325] to-[#141130] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-violet-400/30 bg-slate-950/80 p-8 shadow-[0_0_0_1px_rgba(109,40,217,.18),0_20px_50px_rgba(0,0,0,.7)] backdrop-blur-md">
          <div className="mb-6 text-center">
            <span className="text-4xl">🌸</span>
            <h1 className="mt-3 text-xl font-bold text-white">관리자 인증</h1>
            <p className="mt-1 text-sm text-slate-400">관리자 비밀번호를 입력해 주세요.</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value)}
              placeholder="비밀번호"
              autoFocus
              className="w-full rounded-xl border border-violet-300/30 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-300/70 focus:ring-2 focus:ring-violet-400/40"
            />
            {pwError ? (
              <div className="rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {pwError}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={pwLoading}
              className="w-full rounded-xl border border-violet-400/50 bg-violet-600/70 py-3 text-sm font-bold text-white hover:bg-violet-500/80 disabled:opacity-50"
            >
              {pwLoading ? "확인 중..." : "입장"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#070b18] via-[#0d1325] to-[#141130] px-4 py-8 text-slate-100">
      {/* 황금 돼지 코인 지급 모달 */}
      {coinGrant.user ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-amber-400/35 bg-slate-950 p-6 shadow-[0_0_0_1px_rgba(251,191,36,.2),0_20px_50px_rgba(0,0,0,.7)]">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">🐷</span>
              <h2 className="text-lg font-bold text-amber-300">황금 돼지 코인 지급</h2>
            </div>
            <p className="mb-4 text-sm text-slate-300">
              <span className="font-semibold text-white">{coinGrant.user.name}</span>{" "}
              <span className="text-slate-400">({coinGrant.user.email})</span>
              <br />
              현재 잔액:{" "}
              <span className="font-bold text-amber-300">
                {Number(coinGrant.user.points || 0).toLocaleString("ko-KR")} 코인
              </span>
            </p>
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                코인 수량 <span className="text-slate-500">(음수 입력 시 차감)</span>
              </label>
              <input
                type="number"
                value={coinGrant.amount}
                onChange={(e) => setCoinGrant((prev) => ({ ...prev, amount: e.target.value, error: "" }))}
                placeholder="예: 100 (지급) 또는 -50 (차감)"
                className="w-full rounded-xl border border-amber-400/30 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/30"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">지급 사유</label>
              <input
                type="text"
                value={coinGrant.reason}
                onChange={(e) => setCoinGrant((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full rounded-xl border border-slate-600/50 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/25"
              />
            </div>
            {coinGrant.error ? (
              <div className="mb-3 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {coinGrant.error}
              </div>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleGrantCoinSubmit}
                disabled={coinGrant.loading}
                className="flex-1 rounded-xl border border-amber-400/50 bg-amber-500/20 py-2.5 text-sm font-bold text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
              >
                {coinGrant.loading ? "처리 중..." : "🐷 지급"}
              </button>
              <button
                type="button"
                onClick={() => setCoinGrant({ user: null, amount: "", reason: "관리자 황금 돼지 코인 지급", loading: false, error: "" })}
                disabled={coinGrant.loading}
                className="rounded-xl border border-slate-600/50 bg-slate-800/50 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700/50 disabled:opacity-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-violet-400/25 bg-slate-950/60 p-5 shadow-[0_0_0_1px_rgba(109,40,217,.18),0_18px_45px_rgba(15,23,42,.55)] backdrop-blur-md sm:p-7">
        <header className="mb-5 flex flex-col gap-3 border-b border-violet-500/25 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-violet-300">ADMIN MODE</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">회원 관리 페이지</h1>
            <p className="mt-1 text-sm text-slate-300">가입 회원 조회, 검색, 삭제 및 황금 돼지 코인 지급을 제공합니다.</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="rounded-lg border border-violet-400/35 bg-violet-500/10 px-3 py-2 text-violet-100">
              전체 회원 <span className="font-semibold text-white">{totalCount}</span>명
            </div>
            <div className="rounded-lg border border-slate-500/45 bg-slate-800/70 px-3 py-2 text-slate-200">
              검색 결과 <span className="font-semibold text-white">{visibleCount}</span>명
            </div>
          </div>
        </header>

        <form onSubmit={handleSearch} className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            type="search"
            placeholder="이름 또는 이메일 검색"
            className="w-full rounded-xl border border-violet-300/30 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-violet-300/70 focus:ring-2 focus:ring-violet-400/40"
          />
          <button
            type="submit"
            className="rounded-xl border border-violet-300/55 bg-violet-600/70 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500/80"
          >
            검색
          </button>
        </form>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/70">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-800/95 text-xs uppercase tracking-wider text-slate-300">
                <tr>
                  <th className="px-4 py-3">이름</th>
                  <th className="px-4 py-3">이메일</th>
                  <th className="px-4 py-3">가입일</th>
                  <th className="px-4 py-3">생년월일</th>
                  <th className="px-4 py-3">🐷 코인</th>
                  <th className="px-4 py-3">관리</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-t border-slate-700/70 hover:bg-slate-800/70">
                    <td className="px-4 py-3 font-medium text-slate-100">{user.name}</td>
                    <td className="px-4 py-3 text-slate-200">{user.email}</td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(user.joinedAt)}</td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(user.birthDate)}</td>
                    <td className="px-4 py-3 font-semibold text-amber-300">
                      {Number(user.points || 0).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCoinGrant({
                              user,
                              amount: "",
                              reason: "관리자 황금 돼지 코인 지급",
                              loading: false,
                              error: "",
                            })
                          }
                          className="rounded-lg border border-amber-400/45 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25"
                        >
                          🐷 코인
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          className="rounded-lg border border-rose-400/45 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                      표시할 회원 정보가 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {loading ? (
          <p className="mt-3 text-right text-xs text-slate-400">데이터를 불러오는 중...</p>
        ) : null}
      </div>
    </main>
  );
}
