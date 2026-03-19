"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  birthDate: string;
  joinedAt: string;
  role: "user" | "admin";
};

type AdminUsersResponse = {
  totalCount?: number;
  count?: number;
  users?: AdminUser[];
  message?: string;
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

export default function AdminPage() {
  // 위장 목적: 외부에서 `/admin` 경로를 발견했을 때 관리자 기능을 노출하지 않는다.
  // - 관리자 UI/기능/문구("ADMIN MODE")를 렌더링하지 않는다.
  // - 대신 일반적인 404/미존재 화면처럼 보이도록 구성한다.
  return (
    <main
      className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4 py-10 text-slate-100"
      role="main"
      aria-label="미존재 페이지"
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-700/60 bg-slate-950/60 p-6 shadow-[0_18px_50px_rgba(0,0,0,.45)]"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#f472b6] shadow-[0_0_0_6px_rgba(244,114,182,.18)]" />
          <h1 className="text-2xl font-extrabold">페이지를 찾을 수 없습니다.</h1>
        </div>
        <p className="text-slate-400 leading-7 mt-2">
          요청하신 경로는 존재하지 않거나 처리할 수 없습니다.
          <br />
          잠시 후 다시 시도해 주세요.
        </p>
        <div className="mt-5 flex gap-3 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-600/60 bg-slate-800/40 px-4 py-2 font-semibold"
          >
            홈으로
          </Link>
          <button
            type="button"
            onClick={() => (typeof window !== "undefined" ? window.history.back() : null)}
            className="inline-flex items-center justify-center rounded-xl border border-slate-600/60 bg-slate-800/20 px-4 py-2 font-semibold"
          >
            뒤로가기
          </button>
        </div>
      </div>
    </main>
  );

  const router = useRouter();

  const [token, setToken] = useState("");
  const [isBooting, setIsBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const [totalCount, setTotalCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000",
    [],
  );

  const endpoint = `${apiBase}/api/admin/users`;

  useEffect(() => {
    const savedToken = localStorage.getItem("fortune_auth_token");
    const rawUser = localStorage.getItem("fortune_auth_user");

    if (!savedToken) {
      router.replace("/login?next=%2Fadmin");
      return;
    }

    try {
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
      if (!parsedUser || parsedUser.role !== "admin") {
        router.replace("/login?next=%2Fadmin");
        return;
      }
    } catch {
      router.replace("/login?next=%2Fadmin");
      return;
    }

    setToken(savedToken);
    setIsBooting(false);
  }, [router]);

  const fetchUsers = useCallback(
    async (keyword: string) => {
      if (!token) return;

      setLoading(true);
      setError("");

      try {
        const query = keyword ? `?search=${encodeURIComponent(keyword)}` : "";
        const response = await fetch(`${endpoint}${query}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json()) as AdminUsersResponse;

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("fortune_auth_token");
          localStorage.removeItem("fortune_auth_user");
          document.cookie = "fortune_auth_token=; path=/; max-age=0";
          document.cookie = "fortune_auth_role=; path=/; max-age=0";
          router.replace("/login?next=%2Fadmin");
          return;
        }

        if (!response.ok) {
          setError(payload.message || "회원 목록을 불러오지 못했습니다.");
          return;
        }

        const nextUsers = Array.isArray(payload.users) ? payload.users : [];
        const nextVisibleCount = Number(payload.count ?? nextUsers.length);
        const nextTotalCount = Number(payload.totalCount ?? nextVisibleCount);

        setUsers(nextUsers);
        setVisibleCount(nextVisibleCount);
        setTotalCount(nextTotalCount);
      } catch {
        setError("관리자 API에 연결하지 못했습니다. 서버 상태를 확인해 주세요.");
      } finally {
        setLoading(false);
      }
    },
    [endpoint, router, token],
  );

  useEffect(() => {
    if (!isBooting && token) {
      fetchUsers(searchKeyword);
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
      const response = await fetch(`${endpoint}/${encodeURIComponent(user._id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message || "회원 삭제에 실패했습니다.");
        return;
      }

      await fetchUsers(searchKeyword);
    } catch {
      setError("회원 삭제 요청 중 오류가 발생했습니다.");
    }
  };

  if (isBooting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-200">
        관리자 권한 확인 중...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#070b18] via-[#0d1325] to-[#141130] px-4 py-8 text-slate-100">
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-violet-400/25 bg-slate-950/60 p-5 shadow-[0_0_0_1px_rgba(109,40,217,.18),0_18px_45px_rgba(15,23,42,.55)] backdrop-blur-md sm:p-7">
        <header className="mb-5 flex flex-col gap-3 border-b border-violet-500/25 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-violet-300">ADMIN MODE</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">회원 관리 페이지</h1>
            <p className="mt-1 text-sm text-slate-300">가입 회원 조회, 검색, 삭제 기능을 제공합니다.</p>
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
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        className="rounded-lg border border-rose-400/45 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
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
