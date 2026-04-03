"use client";

import { useCallback, useEffect, useState } from "react";

//  Types 

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  birthDate?: string;
  joinedAt: string;
  role: "user" | "admin";
  points: number;
  status?: "active" | "banned" | "suspended";
  banReason?: string;
  bannedAt?: string;
  lastLoginAt?: string;
};

type Stats = {
  summary: {
    totalUsers: number; todayUsers: number; weekUsers: number;
    monthUsers: number; adminUsers: number; bannedUsers: number;
    totalCoins: number; avgCoins: number;
  };
  gender: { M: number; F: number; OTHER: number };
  daily: { labels: string[]; counts: number[] };
  recentUsers: { _id: string; name: string; email: string; joinedAt: string; points: number; status?: string }[];
};

type PointHistory = {
  _id: string; kind: string; delta: number;
  balanceAfter: number; reason: string; createdAt: string;
};

type CoinModal = { user: AdminUser | null; amount: string; reason: string; loading: boolean; error: string };
type DetailModal = { user: AdminUser | null; history: PointHistory[]; loading: boolean };
type BanModal = { user: AdminUser | null; reason: string; loading: boolean };
type Toast = { id: number; msg: string; type: "success" | "error" };

//  Helpers 

const FLOWER_TOKEN_KEY = "flower_admin_token";
function getStoredToken() {
  if (typeof window === "undefined") return "";
  try { return sessionStorage.getItem(FLOWER_TOKEN_KEY) || ""; } catch { return ""; }
}
function fmtDate(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function fmtDateTime(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
}
function fmtNum(n: number) { return n.toLocaleString("ko-KR"); }

//  Toast 

function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-4 z-[200] flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl text-sm font-medium max-w-xs cursor-pointer transition-all
            ${t.type === "success"
              ? "border-emerald-400/40 bg-emerald-900/90 text-emerald-100"
              : "border-rose-400/40 bg-rose-900/90 text-rose-100"
            }`}
          onClick={() => remove(t.id)}
        >
          <span>{t.type === "success" ? "✅" : "❌"}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

//  BarChart 

function BarChart({ labels, counts }: { labels: string[]; counts: number[] }) {
  const max = Math.max(...counts, 1);
  const sl = labels.slice(-14); const sc = counts.slice(-14);
  return (
    <div className="flex items-end gap-[3px] h-24">
      {sc.map((c, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-0.5">
          <div className="w-full rounded-sm bg-violet-500/70 hover:bg-violet-400 transition-all"
            style={{ height: `${Math.max(4, Math.round((c / max) * 80))}px` }}
            title={`${sl[i]}: ${c}명`} />
          {i % 7 === 0 && <span className="text-[9px] text-slate-500 leading-none">{sl[i]}</span>}
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className={`rounded-xl border ${color ?? "border-violet-400/25 bg-violet-500/10"} p-4`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{typeof value === "number" ? fmtNum(value) : value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

//  Password Gate 

function PasswordGate({ onAuth }: { onAuth: (token: string) => void }) {
  const [pw, setPw] = useState(""); const [loading, setLoading] = useState(false); const [err, setErr] = useState("");
  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = pw.trim();
    if (!v) { setErr("비밀번호를 입력해 주세요."); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/admin/entry/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: v }),
      });
      if (!res.ok) { setErr("비밀번호가 올바르지 않습니다."); return; }
      const data = await res.json() as { adminToken?: string };
      if (!data.adminToken) { setErr("토큰 발급 실패. 다시 시도해 주세요."); return; }
      try { sessionStorage.setItem(FLOWER_TOKEN_KEY, data.adminToken); } catch { /* ignore */ }
      onAuth(data.adminToken);
    } catch { setErr("요청 중 오류가 발생했습니다."); }
    finally { setLoading(false); }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#070b18] to-[#12102a] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-violet-500/30 bg-slate-950/90 p-8 shadow-[0_0_60px_rgba(109,40,217,.18)] backdrop-blur-md">
        <div className="mb-7 text-center"><div className="text-5xl mb-3">🌸</div>
          <h1 className="text-xl font-bold text-white">관리자 인증</h1>
          <p className="mt-1.5 text-sm text-slate-400">관리자 비밀번호를 입력해 주세요.</p>
        </div>
        <form onSubmit={handle} className="flex flex-col gap-3">
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus placeholder="비밀번호"
            className="w-full rounded-xl border border-violet-300/25 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-violet-400/70 focus:ring-2 focus:ring-violet-400/20" />
          {err && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{err}</div>}
          <button type="submit" disabled={loading}
            className="w-full rounded-xl border border-violet-400/50 bg-violet-600/60 py-3 text-sm font-bold text-white hover:bg-violet-500/70 disabled:opacity-50 transition">
            {loading ? "인증 중" : "입장"}
          </button>
        </form>
      </div>
    </main>
  );
}

//  Dashboard Tab 

function DashboardTab({ token }: { token: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        if (!r.ok) { const t = await r.text(); throw new Error(`[${r.status}] ${t.slice(0,200)}`); }
        return r.json();
      })
      .then((d: Stats & { message?: string }) => {
        if (d.message) throw new Error(d.message);
        setStats(d);
      })
      .catch(e => setErr(e instanceof Error ? e.message : "알 수 없는 오류"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">통계 불러오는 중</p>;
  if (err) return (
    <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4">
      <p className="text-rose-300 text-sm font-semibold mb-2">⚠️ 통계 조회 오류</p>
      <p className="text-rose-200 text-xs break-words">{err}</p>
    </div>
  );
  if (!stats) return null;

  const { summary, gender, daily, recentUsers } = stats;
  const totalGender = (gender.M + gender.F + gender.OTHER) || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="전체 회원" value={summary.totalUsers} sub="누적 가입자" />
        <StatCard label="오늘 가입" value={summary.todayUsers} sub="금일 신규" color="border-emerald-400/25 bg-emerald-500/10" />
        <StatCard label="이번 주" value={summary.weekUsers} sub="7일 이내" color="border-sky-400/25 bg-sky-500/10" />
        <StatCard label="이번 달" value={summary.monthUsers} sub="당월 가입" color="border-amber-400/25 bg-amber-500/10" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="총 코인" value={summary.totalCoins} sub="전체 합산" color="border-amber-400/25 bg-amber-500/10" />
        <StatCard label="평균 코인" value={summary.avgCoins} sub="인당" color="border-amber-500/20 bg-amber-600/10" />
        <StatCard label="관리자" value={summary.adminUsers} sub="admin 계정" color="border-rose-400/25 bg-rose-500/10" />
        <StatCard label="제재 회원" value={summary.bannedUsers} sub="ban 상태" color="border-orange-400/25 bg-orange-500/10" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-700/60 bg-slate-900/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">최근 14일 신규 가입 추이</p>
          <BarChart labels={daily.labels} counts={daily.counts} />
        </div>
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">성별 분포</p>
          <div className="space-y-3">
            {(["M", "F", "OTHER"] as const).map(g => {
              const cnt = gender[g]; const pct = Math.round((cnt / totalGender) * 100);
              const label = g === "M" ? "남성" : g === "F" ? "여성" : "기타";
              const bar = g === "M" ? "bg-sky-500" : g === "F" ? "bg-pink-500" : "bg-slate-400";
              return (
                <div key={g}>
                  <div className="flex justify-between text-xs text-slate-300 mb-1"><span>{label}</span><span>{fmtNum(cnt)}명 ({pct}%)</span></div>
                  <div className="h-2 rounded-full bg-slate-700"><div className={`h-2 rounded-full ${bar}`} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/60">
        <div className="px-5 py-3 border-b border-slate-700/50">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">최근 가입자 5명</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800/60">
              <tr><th className="px-4 py-2 text-left">이름</th><th className="px-4 py-2 text-left">이메일</th><th className="px-4 py-2 text-left">가입일</th><th className="px-4 py-2 text-right">코인</th><th className="px-4 py-2 text-center">상태</th></tr>
            </thead>
            <tbody>
              {recentUsers.map(u => (
                <tr key={u._id} className="border-t border-slate-700/40 hover:bg-slate-800/40">
                  <td className="px-4 py-2.5 text-slate-100 font-medium">{u.name}</td>
                  <td className="px-4 py-2.5 text-slate-300">{u.email}</td>
                  <td className="px-4 py-2.5 text-slate-400">{fmtDate(u.joinedAt)}</td>
                  <td className="px-4 py-2.5 text-right text-amber-300 font-semibold">{fmtNum(u.points)}</td>
                  <td className="px-4 py-2.5 text-center">
                    {u.status === "banned"
                      ? <span className="rounded-full bg-rose-500/20 border border-rose-400/40 px-2 py-0.5 text-xs text-rose-300">제재</span>
                      : <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-xs text-emerald-300">정상</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

//  Members Tab 

function MembersTab({ token, toast }: { token: string; toast: (msg: string, type?: "success" | "error") => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchKw, setSearchKw] = useState("");
  const [detail, setDetail] = useState<DetailModal>({ user: null, history: [], loading: false });
  const [coin, setCoin] = useState<CoinModal>({ user: null, amount: "", reason: "관리자 황금 돼지 코인 지급", loading: false, error: "" });
  const [ban, setBan] = useState<BanModal>({ user: null, reason: "", loading: false });

  const fetchUsers = useCallback(async (kw: string) => {
    setLoading(true); setErr("");
    try {
      const r = await fetch(`/api/admin/members${kw ? `?search=${encodeURIComponent(kw)}` : ""}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { const t = await r.text(); throw new Error(`[${r.status}] ${t.slice(0,150)}`); }
      const d = await r.json() as { ok?: boolean; totalCount?: number; users?: AdminUser[]; message?: string };
      if (d.message) throw new Error(d.message);
      setUsers(d.users ?? []); setTotalCount(d.totalCount ?? 0);
    } catch (e) { setErr(e instanceof Error ? e.message : "알 수 없는 오류"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchUsers(searchKw); }, [fetchUsers, searchKw]);

  const openDetail = async (u: AdminUser) => {
    setDetail({ user: u, history: [], loading: true });
    try {
      const r = await fetch(`/api/admin/members/${encodeURIComponent(u._id)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`[${r.status}]`);
      const d = await r.json() as { user?: AdminUser; pointHistory?: PointHistory[] };
      setDetail({ user: d.user ?? u, history: d.pointHistory ?? [], loading: false });
    } catch { setDetail(p => ({ ...p, loading: false })); }
  };

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`${u.name} (${u.email})을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      const r = await fetch(`/api/admin/members/${encodeURIComponent(u._id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message || `[${r.status}]`); }
      if (detail.user?._id === u._id) setDetail({ user: null, history: [], loading: false });
      toast(`${u.name} 회원이 삭제되었습니다.`, "success");
      fetchUsers(searchKw);
    } catch (e) { toast(e instanceof Error ? e.message : "삭제 실패", "error"); }
  };

  const handleBan = async () => {
    const { user, reason, loading: ld } = ban;
    if (!user || ld) return;
    const isBanned = user.status === "banned";
    const action = isBanned ? "unban" : "ban";
    setBan(p => ({ ...p, loading: true }));
    try {
      const r = await fetch(`/api/admin/members/${encodeURIComponent(user._id)}/ban`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, reason }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message || `[${r.status}]`); }
      const d = await r.json() as { user?: AdminUser };
      const newStatus = d.user?.status ?? (action === "ban" ? "banned" : "active");
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, status: newStatus } : u));
      if (detail.user?._id === user._id) setDetail(p => ({ ...p, user: p.user ? { ...p.user, status: newStatus } : null }));
      toast(action === "ban" ? `${user.name} 계정을 정지했습니다.` : `${user.name} 계정 정지를 해제했습니다.`, "success");
      setBan({ user: null, reason: "", loading: false });
    } catch (e) { toast(e instanceof Error ? e.message : "처리 실패", "error"); setBan(p => ({ ...p, loading: false })); }
  };

  const submitCoin = async () => {
    const { user, amount, reason } = coin;
    if (!user) return;
    const delta = Number(amount);
    if (!Number.isFinite(delta) || delta === 0) { setCoin(p => ({ ...p, error: "유효한 수량을 입력하세요." })); return; }
    setCoin(p => ({ ...p, loading: true, error: "" }));
    try {
      const r = await fetch("/api/admin/members/points", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user._id, delta, reason }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message || `[${r.status}]`); }
      const d = await r.json() as { user?: { points: number } };
      const newPoints = d.user?.points ?? user.points;
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, points: newPoints } : u));
      if (detail.user?._id === user._id) setDetail(p => ({ ...p, user: p.user ? { ...p.user, points: newPoints } : null }));
      toast(`${user.name}님에게 ${delta > 0 ? "+" : ""}${fmtNum(delta)} 코인 ${delta > 0 ? "지급" : "차감"} 완료`, "success");
      setCoin({ user: null, amount: "", reason: "관리자 황금 돼지 코인 지급", loading: false, error: "" });
    } catch (e) { setCoin(p => ({ ...p, error: e instanceof Error ? e.message : "요청 오류", loading: false })); }
  };

  return (
    <div className="space-y-4">
      {/* 검색 바 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={e => { e.preventDefault(); setSearchKw(searchInput.trim()); }} className="flex gap-2 flex-1">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} type="search" placeholder="이름 또는 이메일 검색"
            className="flex-1 rounded-xl border border-violet-300/25 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20" />
          <button type="submit" className="rounded-xl border border-violet-400/40 bg-violet-600/60 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500/70">검색</button>
          {searchKw && <button type="button" onClick={() => { setSearchInput(""); setSearchKw(""); }} className="rounded-xl border border-slate-600/40 bg-slate-700/50 px-3 py-2.5 text-sm text-slate-300">초기화</button>}
        </form>
        <div className="flex gap-2 text-sm">
          <span className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-violet-100">전체 <b className="text-white">{fmtNum(totalCount)}</b>명</span>
          <span className="rounded-lg border border-slate-600/40 bg-slate-800/60 px-3 py-2 text-slate-200">검색 <b className="text-white">{fmtNum(users.length)}</b>명</span>
        </div>
      </div>
      {err && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"><b>⚠️ </b>{err}</div>}
      {/* 테이블 */}
      <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-800/90 text-xs uppercase tracking-wider text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">이름</th>
                <th className="px-4 py-3 text-left">이메일</th>
                <th className="px-4 py-3 text-left">가입일</th>
                <th className="px-4 py-3 text-left">생년월일</th>
                <th className="px-4 py-3 text-center">상태</th>
                <th className="px-4 py-3 text-right">🐷 코인</th>
                <th className="px-4 py-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className={`border-t border-slate-700/50 hover:bg-slate-800/50 cursor-pointer ${u.status === "banned" ? "bg-rose-950/20" : ""}`} onClick={() => openDetail(u)}>
                  <td className="px-4 py-3 font-medium text-slate-100">{u.name}</td>
                  <td className="px-4 py-3 text-slate-300">{u.email}</td>
                  <td className="px-4 py-3 text-slate-400">{fmtDate(u.joinedAt)}</td>
                  <td className="px-4 py-3 text-slate-400">{fmtDate(u.birthDate)}</td>
                  <td className="px-4 py-3 text-center">
                    {u.status === "banned"
                      ? <span className="rounded-full bg-rose-500/20 border border-rose-400/40 px-2 py-0.5 text-xs text-rose-300">제재</span>
                      : <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-xs text-emerald-300">정상</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-300">{fmtNum(u.points)}</td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => setCoin({ user: u, amount: "", reason: "관리자 황금 돼지 코인 지급", loading: false, error: "" })}
                        className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/25">🐷 코인</button>
                      <button onClick={() => setBan({ user: u, reason: "", loading: false })}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${u.status === "banned" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" : "border-orange-400/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20"}`}>
                        {u.status === "banned" ? "해제" : "정지"}
                      </button>
                      <button onClick={() => handleDelete(u)}
                        className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/20">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">표시할 회원이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
        {loading && <p className="px-4 py-3 text-right text-xs text-slate-500">로드 중</p>}
      </div>

      {/* 상세 모달 */}
      {detail.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm" onClick={() => setDetail({ user: null, history: [], loading: false })}>
          <div className="w-full max-w-lg rounded-2xl border border-sky-400/25 bg-slate-950 p-6 shadow-[0_0_0_1px_rgba(56,189,248,.15),0_24px_60px_rgba(0,0,0,.8)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {detail.user.name}
                  {detail.user.status === "banned" && <span className="text-xs rounded-full bg-rose-500/20 border border-rose-400/40 px-2 py-0.5 text-rose-300">제재중</span>}
                </h2>
                <p className="text-sm text-slate-400">{detail.user.email}</p>
              </div>
              <button onClick={() => setDetail({ user: null, history: [], loading: false })} className="text-slate-500 hover:text-slate-300 text-xl leading-none">✕</button>
            </div>
            <div className="space-y-2 text-sm mb-5">
              {([
                ["역할", detail.user.role === "admin" ? "👑 관리자" : "일반 사용자"],
                ["상태", detail.user.status === "banned" ? `🚫 제재 (${detail.user.banReason || "-"})` : "✅ 정상"],
                ["가입일", fmtDate(detail.user.joinedAt)],
                ["생년월일", fmtDate(detail.user.birthDate)],
                ["정지일", detail.user.bannedAt ? fmtDateTime(detail.user.bannedAt) : "-"],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between rounded-lg bg-slate-900/70 px-3 py-2">
                  <span className="text-slate-400">{k}</span><span className="text-slate-100 font-medium">{v}</span>
                </div>
              ))}
              <div className="flex justify-between rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2">
                <span className="text-slate-400">🐷 코인 잔액</span>
                <span className="text-amber-300 font-bold text-base">{fmtNum(detail.user.points)}</span>
              </div>
            </div>
            {/* 코인 내역 */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">최근 코인 내역</p>
              {detail.loading ? <p className="text-xs text-slate-500 py-3 text-center">불러오는 중</p>
                : detail.history.length === 0 ? <p className="text-xs text-slate-500 py-3 text-center">내역이 없습니다.</p>
                : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {detail.history.map(h => (
                      <div key={h._id} className="flex justify-between items-center rounded-lg bg-slate-900/60 px-3 py-1.5 text-xs">
                        <div>
                          <span className={`font-bold ${h.delta > 0 ? "text-emerald-300" : "text-rose-300"}`}>{h.delta > 0 ? `+${fmtNum(h.delta)}` : fmtNum(h.delta)}</span>
                          <span className="text-slate-500 ml-2">{h.reason || h.kind}</span>
                        </div>
                        <div className="text-slate-500 text-right">
                          <div>{fmtNum(h.balanceAfter)} 코인</div>
                          <div>{fmtDateTime(h.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => { setCoin({ user: detail.user!, amount: "", reason: "관리자 황금 돼지 코인 지급", loading: false, error: "" }); setDetail({ user: null, history: [], loading: false }); }}
                className="flex-1 rounded-xl border border-amber-400/45 bg-amber-500/20 py-2.5 text-sm font-bold text-amber-200 hover:bg-amber-500/30">🐷 코인 지급/차감</button>
              <button onClick={() => { setBan({ user: detail.user!, reason: "", loading: false }); setDetail({ user: null, history: [], loading: false }); }}
                className={`rounded-xl border px-4 py-2.5 text-sm font-bold ${detail.user.status === "banned" ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20" : "border-orange-400/40 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20"}`}>
                {detail.user.status === "banned" ? "정지 해제" : "계정 정지"}
              </button>
              <button onClick={() => setDetail({ user: null, history: [], loading: false })} className="rounded-xl border border-slate-600/40 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-300">닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* Ban 모달 */}
      {ban.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm" onClick={() => !ban.loading && setBan(p => ({ ...p, user: null }))}>
          <div className="w-full max-w-sm rounded-2xl border border-orange-400/30 bg-slate-950 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-white mb-1">
              {ban.user.status === "banned" ? "✅ 계정 정지 해제" : "🚫 계정 정지"}
            </h2>
            <p className="text-sm text-slate-400 mb-4">{ban.user.name} ({ban.user.email})</p>
            {ban.user.status !== "banned" && (
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">정지 사유</label>
                <input type="text" value={ban.reason} onChange={e => setBan(p => ({ ...p, reason: e.target.value }))} placeholder="사유 입력 (선택)"
                  className="w-full rounded-xl border border-orange-400/25 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-orange-400/60" />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleBan} disabled={ban.loading}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-bold disabled:opacity-50 ${ban.user.status === "banned" ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200" : "border-orange-400/50 bg-orange-500/20 text-orange-200"}`}>
                {ban.loading ? "처리 중" : ban.user.status === "banned" ? "정지 해제" : "정지하기"}
              </button>
              <button onClick={() => setBan(p => ({ ...p, user: null }))} disabled={ban.loading}
                className="rounded-xl border border-slate-600/40 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-300">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 코인 모달 */}
      {coin.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm" onClick={() => !coin.loading && setCoin(p => ({ ...p, user: null }))}>
          <div className="w-full max-w-sm rounded-2xl border border-amber-400/30 bg-slate-950 p-6" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">🐷</span>
              <div><h2 className="text-base font-bold text-amber-300">황금 돼지 코인</h2><p className="text-xs text-slate-400">{coin.user.name} ({coin.user.email})</p></div>
            </div>
            <p className="mb-4 text-sm text-slate-300">현재 잔액: <span className="font-bold text-amber-300">{fmtNum(coin.user.points)} 코인</span></p>
            <div className="space-y-3 mb-4">
              <div>
                <p className="text-xs text-slate-400 mb-2">빠른 선택</p>
                <div className="flex flex-wrap gap-1.5">
                  {[100, 500, 1000, 3000, 5000, 10000, -100, -500, -1000].map(v => (
                    <button key={v} type="button" onClick={() => setCoin(p => ({ ...p, amount: String(v) }))}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold border ${v > 0 ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" : "border-rose-400/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"}`}>
                      {v > 0 ? `+${fmtNum(v)}` : fmtNum(v)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">직접 입력 <span className="text-slate-500 font-normal">(음수=차감, 최대 10,000)</span></label>
                <input type="number" value={coin.amount} onChange={e => setCoin(p => ({ ...p, amount: e.target.value, error: "" }))} placeholder="예: 1000 또는 -500"
                  className="w-full rounded-xl border border-amber-400/25 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400/60" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">지급 사유</label>
                <input type="text" value={coin.reason} onChange={e => setCoin(p => ({ ...p, reason: e.target.value }))}
                  className="w-full rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 outline-none" />
              </div>
            </div>
            {coin.error && <div className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{coin.error}</div>}
            <div className="flex gap-2">
              <button type="button" onClick={submitCoin} disabled={coin.loading}
                className="flex-1 rounded-xl border border-amber-400/50 bg-amber-500/20 py-2.5 text-sm font-bold text-amber-200 hover:bg-amber-500/30 disabled:opacity-50">
                {coin.loading ? "처리 중" : "🐷 적용"}
              </button>
              <button type="button" onClick={() => setCoin(p => ({ ...p, user: null }))} disabled={coin.loading}
                className="rounded-xl border border-slate-600/40 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-300 disabled:opacity-50">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

//  Main Page 

type Tab = "dashboard" | "members";

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [isBooting, setIsBooting] = useState(true);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setToken(getStoredToken());
    setIsBooting(false);
  }, []);

  const addToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const logout = () => {
    try { sessionStorage.removeItem(FLOWER_TOKEN_KEY); } catch { /* ignore */ }
    setToken("");
  };

  if (isBooting) return (
    <main className="flex min-h-screen items-center justify-center bg-[#070b18]">
      <span className="text-slate-400 text-sm">로딩 중</span>
    </main>
  );
  if (!token) return <PasswordGate onAuth={setToken} />;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#070b18] via-[#0d1325] to-[#141130] text-slate-100">
      <ToastContainer toasts={toasts} remove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
      <header className="sticky top-0 z-30 border-b border-violet-500/20 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌸</span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-violet-400">CODE DESTINY</p>
              <h1 className="text-base font-bold text-white leading-tight">관리자 패널</h1>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {(["dashboard", "members"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${tab === t ? "bg-violet-600/70 text-white border border-violet-400/50" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"}`}>
                {t === "dashboard" ? "📊 대시보드" : "👥 회원관리"}
              </button>
            ))}
            <button onClick={logout} className="ml-2 rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/50">로그아웃</button>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">
        {tab === "dashboard" && <DashboardTab token={token} />}
        {tab === "members" && <MembersTab token={token} toast={addToast} />}
      </div>
    </main>
  );
}
