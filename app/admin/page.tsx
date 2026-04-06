"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LineChart, Line, BarChart as ReBarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

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
    todayChargeCoins: number; todayChargeCount: number;
  };
  gender: { M: number; F: number; OTHER: number };
  daily: { labels: string[]; counts: number[] };
  chargeDaily: { labels: string[]; totals: number[] };
  recentUsers: { _id: string; name: string; email: string; joinedAt: string; points: number; status?: string }[];
  recentCharges: { _id: string; userId: string; delta: number; reason: string; createdAt: string }[];
  recentBanned: { _id: string; name: string; email: string; bannedAt: string; banReason: string }[];
};

type FortuneStats = {
  todayCount: number;
  avgResponseMs: number;
  categoryData: { name: string; value: number; key: string }[];
  daily: { labels: string[]; counts: number[] };
};

type PointHistory = {
  _id: string; kind: string; delta: number;
  balanceAfter: number; reason: string; createdAt: string;
};

type CoinModal = { user: AdminUser | null; amount: string; reason: string; loading: boolean; error: string };
type DetailModal = { user: AdminUser | null; history: PointHistory[]; loading: boolean };
type BanModal = { user: AdminUser | null; reason: string; loading: boolean };
type Toast = { id: number; msg: string; type: "success" | "error" };
type FortuneContent = { _id: string; category: string; subcategory: string; title: string; content: string; tags: string[]; sortOrder: number; isActive: boolean; createdAt: string; updatedAt: string };
type CoinRecord = { _id: string; userId: string; userName: string; userEmail: string; kind: string; delta: number; balanceAfter: number; reason: string; createdAt: string };
type AppSettings = { maintenanceMode: boolean; maintenanceMessage: string; newUserCoins: number; fortuneCosts: Record<string, number>; coinPackages: Array<{ id: string; name: string; coins: number; priceKRW: number; isActive: boolean }>; popupEnabled: boolean; popupTitle: string; popupContent: string; cacheTtlSeconds: number; abuseRules: { bulkQuery: { enabled: boolean; windowMinutes: number; threshold: number }; multiAccountDetect: boolean; abnormalPaymentBlock: boolean }; ipBlockList: Array<{ ip: string; reason: string; blockedAt: string }> };

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

/** API 오류 응답에서 사람이 읽을 수 있는 메시지 추출
 * - JSON { message } → 메시지 반환
 * - HTML → Cloudflare에러 텍스트 추출 후 반환 (더이상 메시지 숨기지 않음)
 * - 기타 텍스트 → 최대 400자 잘라 반환 */
async function safeErrorMsg(r: Response): Promise<string> {
  let text = "";
  try { text = await r.text(); } catch { return `서버 오류 (HTTP ${r.status})`; }
  if (text.trimStart().startsWith("<")) {
    // HTML 에러 페이지 — 실제 에러 텍스트 추출
    const titleMatch = text.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    const h1Match = text.match(/<h1[^>]*>([^<]{1,200})<\/h1>/i);
    const bodyText = (h1Match?.[1] || titleMatch?.[1] || "").trim();
    // Cloudflare 워커 예외 코드 추출 (예: Error 1101)
    const cfCodeMatch = text.match(/error\s+(\d{4})/i) || text.match(/(Error\s+\d+[^<]{0,60})/i);
    const cfCode = cfCodeMatch?.[1] || "";
    if (bodyText || cfCode) {
      return `[HTTP ${r.status}] ${cfCode ? cfCode + " — " : ""}${bodyText || "Worker exception"}\n※ /api/admin/diag 에서 단계별 진단을 확인하세요.`;
    }
    return `[HTTP ${r.status}] Worker/서버 예외 발생 — /api/admin/diag 에서 진단하세요.`;
  }
  try {
    const parsed = JSON.parse(text) as { message?: string };
    if (parsed?.message) return parsed.message;
  } catch { /* JSON 파싱 실패 — 원문 반환 */ }
  return text.slice(0, 400) || `HTTP ${r.status}`;
}

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

//  Chart Colors 

const CHART_COLORS = {
  violet: "#7c3aed",
  emerald: "#10b981",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  rose: "#f43f5e",
  pink: "#ec4899",
  slate: "#64748b",
};
const PIE_COLORS = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#ec4899", "#8b5cf6", "#06b6d4"];

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

function DashboardTab({ token, toast }: { token: string; toast: (msg: string, type?: "success" | "error") => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [fortuneStats, setFortuneStats] = useState<FortuneStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("seongbae555@gmail.com");
  const [promoteRole, setPromoteRole] = useState<"admin" | "user">("admin");
  const [promoting, setPromoting] = useState(false);
  const [promoteMsg, setPromoteMsg] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } })
        .then(async r => { if (!r.ok) throw new Error(await safeErrorMsg(r)); return r.json(); }),
      fetch("/api/admin/fortune-stats", { headers: { Authorization: `Bearer ${token}` } })
        .then(async r => { if (!r.ok) return null; return r.json(); }),
    ])
      .then(([s, f]) => {
        if (s?.message) throw new Error(s.message);
        setStats(s);
        if (f?.ok) setFortuneStats(f);
      })
      .catch(e => setErr(e instanceof Error ? e.message : "알 수 없는 오류"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-slate-800/50 animate-pulse" />
      ))}
    </div>
  );
  if (err) return (
    <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 space-y-2">
      <p className="text-rose-300 text-sm font-semibold">⚠️ 통계 조회 오류</p>
      <p className="text-rose-200 text-xs break-words whitespace-pre-wrap">{err}</p>
      <div className="flex flex-wrap gap-3 mt-2">
        <a href="/api/admin/diag" target="_blank" rel="noopener noreferrer" className="text-xs underline text-sky-400 hover:text-sky-300">🔍 /api/admin/diag</a>
        <a href="/api/admin/ping" target="_blank" rel="noopener noreferrer" className="text-xs underline text-sky-400 hover:text-sky-300">🩺 /api/admin/ping</a>
        <button onClick={() => { try { sessionStorage.removeItem("flower_admin_token"); } catch { /* ignore */ } window.location.reload(); }}
          className="text-xs underline text-amber-400 hover:text-amber-300">🔄 재로그인</button>
      </div>
    </div>
  );
  if (!stats) return null;

  const handlePromote = async () => {
    if (!promoteEmail.trim()) return;
    setPromoting(true); setPromoteMsg("");
    try {
      const r = await fetch("/api/admin/promote-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: promoteEmail.trim(), role: promoteRole }),
      });
      const d = await r.json() as { ok?: boolean; message?: string };
      if (!r.ok || !d.ok) throw new Error(d.message || `[${r.status}]`);
      setPromoteMsg(`✅ ${d.message}`);
      toast(d.message || "역할 변경 완료", "success");
    } catch (e) { setPromoteMsg(`❌ ${e instanceof Error ? e.message : "오류"}`); }
    finally { setPromoting(false); }
  };

  const { summary, gender, daily, chargeDaily, recentUsers, recentCharges, recentBanned } = stats;
  const totalGender = (gender.M + gender.F + gender.OTHER) || 1;

  // recharts용 데이터 변환
  const signupLineData = daily.labels.slice(-14).map((label, i) => ({
    date: label,
    가입자: daily.counts.slice(-14)[i],
  }));
  const chargeBarData = chargeDaily ? chargeDaily.labels.slice(-14).map((label, i) => ({
    date: label,
    충전코인: chargeDaily.totals.slice(-14)[i],
  })) : [];
  const fortuneLineData = fortuneStats ? fortuneStats.daily.labels.slice(-14).map((label, i) => ({
    date: label,
    조회수: fortuneStats.daily.counts.slice(-14)[i],
  })) : [];

  // Donut data
  const genderPieData = [
    { name: "남성", value: gender.M },
    { name: "여성", value: gender.F },
    { name: "기타", value: gender.OTHER },
  ].filter(d => d.value > 0);

  const tooltipStyle = { backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 12 };

  return (
    <div className="space-y-6">
      {/* ── 통계 카드 Row 1: 회원 ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="전체 회원" value={summary.totalUsers} sub="누적 가입자" />
        <StatCard label="오늘 가입" value={summary.todayUsers} sub="금일 신규" color="border-emerald-400/25 bg-emerald-500/10" />
        <StatCard label="이번 주" value={summary.weekUsers} sub="7일 이내" color="border-sky-400/25 bg-sky-500/10" />
        <StatCard label="이번 달" value={summary.monthUsers} sub="당월 가입" color="border-amber-400/25 bg-amber-500/10" />
      </div>

      {/* ── 통계 카드 Row 2: 코인·운세·응답속도 ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="오늘 충전 코인" value={summary.todayChargeCoins ?? 0} sub={`${summary.todayChargeCount ?? 0}건`} color="border-amber-400/25 bg-amber-500/10" />
        <StatCard label="오늘 운세 조회" value={fortuneStats?.todayCount ?? "-"} sub="fortune_view_logs" color="border-violet-400/25 bg-violet-500/10" />
        <StatCard label="평균 응답시간" value={fortuneStats ? `${fortuneStats.avgResponseMs}ms` : "-"} sub="최근 7일" color="border-sky-400/25 bg-sky-500/10" />
        <StatCard label="제재 회원" value={summary.bannedUsers} sub="ban 상태" color="border-rose-400/25 bg-rose-500/10" />
      </div>

      {/* ── 차트 Row 1: 가입 추이 (Line) + 성별 (Donut) ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-700/60 bg-slate-900/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">최근 14일 신규 가입 추이</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={signupLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="가입자" stroke={CHART_COLORS.violet} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">성별 분포</p>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={genderPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}>
                {genderPieData.map((_, i) => <Cell key={i} fill={[CHART_COLORS.sky, CHART_COLORS.pink, CHART_COLORS.slate][i]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${fmtNum(v)}명`]} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {(["M", "F", "OTHER"] as const).map(g => {
              const cnt = gender[g]; const pct = Math.round((cnt / totalGender) * 100);
              const label = g === "M" ? "남성" : g === "F" ? "여성" : "기타";
              const bar = g === "M" ? "bg-sky-500" : g === "F" ? "bg-pink-500" : "bg-slate-400";
              return (
                <div key={g}>
                  <div className="flex justify-between text-xs text-slate-300 mb-0.5"><span>{label}</span><span>{fmtNum(cnt)}명 ({pct}%)</span></div>
                  <div className="h-1.5 rounded-full bg-slate-700"><div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 차트 Row 2: 운세 조회 (Line) + 카테고리 비율 (Donut) ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-700/60 bg-slate-900/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">최근 14일 운세 조회 추이</p>
          {fortuneStats ? (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={fortuneLineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="조회수" stroke={CHART_COLORS.emerald} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[150px] text-slate-500 text-sm">
              운세 조회 기록이 아직 없습니다.<br />
              <span className="text-xs text-slate-600 mt-1">logFortuneView() 호출 시 기록됩니다.</span>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">카테고리별 조회 비율</p>
          {fortuneStats && fortuneStats.categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={fortuneStats.categoryData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" paddingAngle={2}>
                    {fortuneStats.categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${fmtNum(v)}회`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-1 space-y-1 max-h-32 overflow-y-auto pr-1">
                {fortuneStats.categoryData.map((c, i) => (
                  <div key={c.key} className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-slate-300">{c.name}</span>
                    </span>
                    <span className="text-slate-400">{fmtNum(c.value)}회</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[150px] text-slate-500 text-xs text-center">조회 데이터 없음</div>
          )}
        </div>
      </div>

      {/* ── 차트 Row 3: 코인 충전 Bar ── */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">최근 14일 코인 충전 추이</p>
        {chargeBarData.length > 0 ? (
          <ResponsiveContainer width="100%" height={150}>
            <ReBarChart data={chargeBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${fmtNum(v)} 코인`]} />
              <Bar dataKey="충전코인" fill={CHART_COLORS.amber} radius={[3, 3, 0, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[150px] text-slate-500 text-sm">충전 내역이 없습니다.</div>
        )}
      </div>

      {/* ── 최근 활동 피드 ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 최근 가입자 */}
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60">
          <div className="border-b border-slate-700/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">👤 최근 가입자 5명</p>
          </div>
          <div className="divide-y divide-slate-700/40">
            {recentUsers.map(u => (
              <div key={u._id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/40">
                <div>
                  <p className="text-sm font-medium text-slate-100">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-amber-300 font-semibold">{fmtNum(u.points)} 🐷</p>
                  <p className="text-xs text-slate-500">{fmtDate(u.joinedAt)}</p>
                </div>
              </div>
            ))}
            {recentUsers.length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-500">없음</p>}
          </div>
        </div>

        {/* 최근 결제(충전) */}
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60">
          <div className="border-b border-slate-700/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">🐷 최근 충전 5건</p>
          </div>
          <div className="divide-y divide-slate-700/40">
            {(recentCharges ?? []).map(c => (
              <div key={c._id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/40">
                <div>
                  <p className="text-xs text-slate-400 font-mono">{String(c.userId).slice(-8)}</p>
                  <p className="text-xs text-slate-500">{c.reason || "충전"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-300">+{fmtNum(c.delta)}</p>
                  <p className="text-xs text-slate-500">{fmtDateTime(c.createdAt)}</p>
                </div>
              </div>
            ))}
            {(recentCharges ?? []).length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-500">없음</p>}
          </div>
        </div>

        {/* 최근 제재 회원 */}
        <div className="rounded-xl border border-rose-400/15 bg-slate-900/60">
          <div className="border-b border-slate-700/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-400">🚫 최근 제재 3명</p>
          </div>
          <div className="divide-y divide-slate-700/40">
            {(recentBanned ?? []).map(u => (
              <div key={u._id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/40">
                <div>
                  <p className="text-sm font-medium text-slate-100">{u.name}</p>
                  <p className="text-xs text-rose-300/70">{u.banReason || "사유 없음"}</p>
                </div>
                <p className="text-xs text-slate-500">{fmtDate(u.bannedAt)}</p>
              </div>
            ))}
            {(recentBanned ?? []).length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-500">없음</p>}
          </div>
        </div>
      </div>

      {/* 역할 빠른 설정 */}
      <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/8 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-300 mb-3">👑 이메일로 역할 설정</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-slate-400">이메일</label>
            <input type="email" value={promoteEmail} onChange={e => setPromoteEmail(e.target.value)}
              className="w-full rounded-xl border border-yellow-400/25 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-yellow-400/60" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">역할</label>
            <select value={promoteRole} onChange={e => setPromoteRole(e.target.value as "admin" | "user")}
              className="rounded-xl border border-yellow-400/25 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-yellow-400/60">
              <option value="admin">👑 관리자</option>
              <option value="user">👤 일반 사용자</option>
            </select>
          </div>
          <button onClick={handlePromote} disabled={promoting || !promoteEmail.trim()}
            className="rounded-xl border border-yellow-400/50 bg-yellow-500/20 px-5 py-2.5 text-sm font-bold text-yellow-200 hover:bg-yellow-500/30 disabled:opacity-50">
            {promoting ? "처리 중…" : "적용"}
          </button>
        </div>
        {promoteMsg && <p className={`mt-2 text-xs ${promoteMsg.startsWith("✅") ? "text-emerald-300" : "text-rose-300"}`}>{promoteMsg}</p>}
      </div>
    </div>
  );
}

type RoleModal = { user: AdminUser | null; loading: boolean };

function MembersTab({ token, toast }: { token: string; toast: (msg: string, type?: "success" | "error") => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 50;
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchKw, setSearchKw] = useState("");
  const [detail, setDetail] = useState<DetailModal>({ user: null, history: [], loading: false });
  const [coin, setCoin] = useState<CoinModal>({ user: null, amount: "", reason: "관리자 꽃꽃돼지 코인 지급", loading: false, error: "" });
  const [ban, setBan] = useState<BanModal>({ user: null, reason: "", loading: false });
  const [roleModal, setRoleModal] = useState<RoleModal>({ user: null, loading: false });

  const fetchUsers = useCallback(async (kw: string, pg: number) => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams({ page: String(pg), pageSize: String(PAGE_SIZE) });
      if (kw) params.set("search", kw);
      const r = await fetch(`/api/admin/members?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(await safeErrorMsg(r));
      const d = await r.json() as { ok?: boolean; totalCount?: number; filteredCount?: number; users?: AdminUser[]; totalPages?: number; message?: string };
      if (d.message) throw new Error(d.message);
      setUsers(d.users ?? []);
      setTotalCount(d.totalCount ?? 0);
      setFilteredCount(d.filteredCount ?? d.totalCount ?? 0);
      setTotalPages(d.totalPages ?? 1);
    } catch (e) { setErr(e instanceof Error ? e.message : "알 수 없는 오류"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { setPage(1); }, [searchKw]);
  useEffect(() => { fetchUsers(searchKw, page); }, [fetchUsers, searchKw, page]);

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
      fetchUsers(searchKw, page);
    } catch (e) { toast(e instanceof Error ? e.message : "삭제 실패", "error"); }
  };

  const handleRoleChange = async (targetRole: "admin" | "user") => {
    const { user } = roleModal;
    if (!user) return;
    setRoleModal(p => ({ ...p, loading: true }));
    try {
      const r = await fetch(`/api/admin/members/${encodeURIComponent(user._id)}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: targetRole }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message || `[${r.status}]`); }
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, role: targetRole } : u));
      if (detail.user?._id === user._id) setDetail(p => ({ ...p, user: p.user ? { ...p.user, role: targetRole } : null }));
      toast(`${user.name} 계정을 ${targetRole === "admin" ? "관리자" : "일반 사용자"}로 변경했습니다.`, "success");
      setRoleModal({ user: null, loading: false });
    } catch (e) { toast(e instanceof Error ? e.message : "역할 변경 실패", "error"); setRoleModal(p => ({ ...p, loading: false })); }
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
      setCoin({ user: null, amount: "", reason: "관리자 꽃꽃돼지 코인 지급", loading: false, error: "" });
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
        <div className="flex gap-2 text-sm flex-wrap">
          <span className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-violet-100">전체 가입자 <b className="text-white">{fmtNum(totalCount)}</b>명</span>
          {searchKw && <span className="rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sky-200">검색결과 <b className="text-white">{fmtNum(filteredCount)}</b>명</span>}
          <button onClick={() => fetchUsers(searchKw, page)} className="rounded-lg border border-slate-600/40 bg-slate-700/50 px-3 py-2 text-xs text-slate-300 hover:bg-slate-600/50">↻ 새로고침</button>
        </div>
      </div>
      {err && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 space-y-2">
          <p><b>⚠️ </b>{err}</p>
          <div className="flex flex-wrap gap-3">
            <a href="/api/admin/diag" target="_blank" rel="noopener noreferrer" className="text-xs underline text-sky-400">🔍 /api/admin/diag 진단</a>
            <button onClick={() => { try { sessionStorage.removeItem("flower_admin_token"); } catch { /* ignore */ } window.location.reload(); }}
              className="text-xs underline text-amber-400">🔄 재로그인</button>
          </div>
        </div>
      )}
      {/* 테이블 */}
      <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-800/90 text-xs uppercase tracking-wider text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">이름 / 역할</th>
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
                      <button onClick={() => setCoin({ user: u, amount: "", reason: "관리자 꽃꽃돼지 코인 지급", loading: false, error: "" })}
                        className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/25">🐷 코인</button>
                      <button onClick={() => setBan({ user: u, reason: "", loading: false })}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${u.status === "banned" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" : "border-orange-400/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20"}`}>
                        {u.status === "banned" ? "해제" : "정지"}
                      </button>
                      <button onClick={() => setRoleModal({ user: u, loading: false })}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${u.role === "admin" ? "border-yellow-400/40 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20" : "border-slate-500/40 bg-slate-700/30 text-slate-300 hover:bg-slate-600/40"}`}>
                        {u.role === "admin" ? "👑" : "👤"}
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

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <button disabled={page <= 1} onClick={() => setPage(1)}
            className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-30 hover:bg-slate-700/50">«</button>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-30 hover:bg-slate-700/50">‹ 이전</button>
          <span className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-4 py-1.5 text-xs text-violet-200">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-30 hover:bg-slate-700/50">다음 ›</button>
          <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
            className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-30 hover:bg-slate-700/50">»</button>
        </div>
      )}

      {/* 상세 모달 */}
      {detail.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm" onClick={() => setDetail({ user: null, history: [], loading: false })}>
          <div className="w-full max-w-lg rounded-2xl border border-sky-400/25 bg-slate-950 p-6 shadow-[0_0_0_1px_rgba(56,189,248,.15),0_24px_60px_rgba(0,0,0,.8)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {detail.user.role === "admin" && <span title="관리자">👑</span>}
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
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => { setRoleModal({ user: detail.user!, loading: false }); setDetail({ user: null, history: [], loading: false }); }}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${
                  detail.user.role === "admin"
                    ? "border-slate-500/40 bg-slate-700/40 text-slate-300 hover:bg-slate-600/50"
                    : "border-yellow-400/40 bg-yellow-500/15 text-yellow-200 hover:bg-yellow-500/25"
                }`}>
                {detail.user.role === "admin" ? "👤 관리자 해제" : "👑 관리자 설정"}
              </button>
              <button onClick={() => { setCoin({ user: detail.user!, amount: "", reason: "관리자 꽃꽃돼지 코인 지급", loading: false, error: "" }); setDetail({ user: null, history: [], loading: false }); }}
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

      {/* 역할 변경 모달 */}
      {roleModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm" onClick={() => !roleModal.loading && setRoleModal(p => ({ ...p, user: null }))}>
          <div className="w-full max-w-sm rounded-2xl border border-yellow-400/30 bg-slate-950 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-white mb-1">👑 역할 변경</h2>
            <p className="text-sm text-slate-400 mb-5">{roleModal.user.name} ({roleModal.user.email})</p>
            <p className="text-xs text-slate-400 mb-4">
              현재 역할: <span className={`font-semibold ${roleModal.user.role === "admin" ? "text-yellow-300" : "text-slate-200"}`}>
                {roleModal.user.role === "admin" ? "👑 관리자" : "👤 일반 사용자"}
              </span>
            </p>
            <div className="flex gap-2">
              {roleModal.user.role !== "admin" && (
                <button onClick={() => handleRoleChange("admin")} disabled={roleModal.loading}
                  className="flex-1 rounded-xl border border-yellow-400/50 bg-yellow-500/20 py-2.5 text-sm font-bold text-yellow-200 hover:bg-yellow-500/30 disabled:opacity-50">
                  {roleModal.loading ? "처리 중" : "👑 관리자로 설정"}
                </button>
              )}
              {roleModal.user.role === "admin" && (
                <button onClick={() => handleRoleChange("user")} disabled={roleModal.loading}
                  className="flex-1 rounded-xl border border-slate-500/50 bg-slate-700/30 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-600/40 disabled:opacity-50">
                  {roleModal.loading ? "처리 중" : "👤 일반 사용자로 변경"}
                </button>
              )}
              <button onClick={() => setRoleModal(p => ({ ...p, user: null }))} disabled={roleModal.loading}
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
              <div><h2 className="text-base font-bold text-amber-300">꽃꽃돼지 코인</h2><p className="text-xs text-slate-400">{coin.user.name} ({coin.user.email})</p></div>
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


// ─── Coin Grant Tab ───────────────────────────────────────────
function CoinGrantTab({ token, toast }: { token: string; toast: (msg: string, type?: "success" | "error") => void }) {
  const [searchInput, setSearchInput] = useState("");
  const [searchKw, setSearchKw] = useState("");
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("관리자 꽃꽃돼지 코인 지급");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [history, setHistory] = useState<PointHistory[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkReason, setBulkReason] = useState("관리자 황금 돼지 이벤트 코인 지급");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ ok: number; fail: number; errors: string[] } | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const kw = searchInput.trim();
    if (!kw) return;
    setSearchKw(kw); setSearching(true); setSearchErr(""); setSearchResults([]);
    try {
      const params = new URLSearchParams({ search: kw, pageSize: "20", page: "1" });
      const r = await fetch(`/api/admin/members?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(await safeErrorMsg(r));
      const d = await r.json() as { users?: AdminUser[]; message?: string };
      if (d.message) throw new Error(d.message);
      setSearchResults(d.users ?? []);
    } catch (e) { setSearchErr(e instanceof Error ? e.message : "검색 오류"); }
    finally { setSearching(false); }
  };

  const selectUser = async (u: AdminUser) => {
    setSelected(u); setAmount(""); setSubmitErr(""); setHistory([]); setHistLoading(true);
    try {
      const r = await fetch(`/api/admin/members/${encodeURIComponent(u._id)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`[${r.status}]`);
      const d = await r.json() as { user?: AdminUser; pointHistory?: PointHistory[] };
      if (d.user) setSelected(d.user);
      setHistory(d.pointHistory ?? []);
    } catch { /* history load fail — show empty */ }
    finally { setHistLoading(false); }
  };

  const handleGrant = async () => {
    if (!selected) return;
    const delta = Number(amount);
    if (!Number.isFinite(delta) || delta === 0) { setSubmitErr("유효한 수량을 입력하세요."); return; }
    setSubmitting(true); setSubmitErr("");
    try {
      const r = await fetch("/api/admin/members/points", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: selected._id, delta, reason }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message || `[${r.status}]`); }
      const d = await r.json() as { user?: { points: number } };
      const newPoints = d.user?.points ?? selected.points;
      const updated = { ...selected, points: newPoints };
      setSelected(updated);
      setSearchResults(prev => prev.map(u => u._id === selected._id ? updated : u));
      setHistory(prev => [{
        _id: String(Date.now()), kind: "adjust", delta, balanceAfter: newPoints,
        reason, createdAt: new Date().toISOString(),
      }, ...prev]);
      setAmount("");
      toast(`${selected.name}님 ${delta > 0 ? "+" : ""}${fmtNum(delta)} 코인 ${delta > 0 ? "지급" : "차감"} 완료`, "success");
    } catch (e) { setSubmitErr(e instanceof Error ? e.message : "요청 오류"); }
    finally { setSubmitting(false); }
  };

  const handleBulkGrant = async () => {
    const emails = bulkEmails.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    const delta = Number(bulkAmount);
    if (emails.length === 0) { toast("이메일을 입력하세요.", "error"); return; }
    if (!Number.isFinite(delta) || delta === 0) { toast("유효한 코인 수량을 입력하세요.", "error"); return; }
    setBulkSubmitting(true); setBulkResult(null);
    let ok = 0; const errors: string[] = [];
    for (const email of emails) {
      try {
        const sr = await fetch(`/api/admin/members?${new URLSearchParams({ search: email, pageSize: "5" })}`, { headers: { Authorization: `Bearer ${token}` } });
        const sd = await sr.json() as { users?: AdminUser[] };
        const user = (sd.users ?? []).find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) { errors.push(`${email}: 회원 없음`); continue; }
        const pr = await fetch("/api/admin/members/points", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId: user._id, delta, reason: bulkReason }),
        });
        if (!pr.ok) { const pd = await pr.json(); errors.push(`${email}: ${pd.message || pr.status}`); continue; }
        ok++;
      } catch (e) { errors.push(`${email}: ${e instanceof Error ? e.message : "오류"}`); }
    }
    setBulkResult({ ok, fail: errors.length, errors });
    setBulkSubmitting(false);
    if (ok > 0) toast(`${ok}명에게 코인 지급 완료`, "success");
    if (errors.length > 0) toast(`${errors.length}건 실패`, "error");
  };

  const QUICK_AMOUNTS = [100, 500, 1000, 3000, 5000, 10000, -100, -500, -1000];

  return (
    <div className="space-y-6">
      {/* 개별 지급 섹션 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 왼쪽: 회원 검색 + 선택 */}
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-400/25 bg-amber-500/8 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300 mb-3">🔍 회원 검색</p>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} type="search"
                placeholder="이름 또는 이메일"
                className="flex-1 rounded-xl border border-amber-400/25 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400/60" />
              <button type="submit" disabled={searching || !searchInput.trim()}
                className="rounded-xl border border-amber-400/50 bg-amber-500/25 px-4 py-2.5 text-sm font-bold text-amber-200 hover:bg-amber-500/35 disabled:opacity-40">
                {searching ? "…" : "검색"}
              </button>
            </form>
            {searchErr && <p className="mt-2 text-xs text-rose-300">⚠️ {searchErr}</p>}
          </div>

          {searchResults.length > 0 && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 overflow-hidden">
              <p className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-700/50">
                검색 결과 {searchResults.length}명
              </p>
              <div className="max-h-64 overflow-y-auto">
                {searchResults.map(u => (
                  <button key={u._id} onClick={() => selectUser(u)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm border-b border-slate-700/40 last:border-b-0 hover:bg-slate-800/60 transition text-left
                      ${selected?._id === u._id ? "bg-amber-900/30 border-l-2 border-l-amber-400/60" : ""}`}>
                    <div>
                      <span className="font-semibold text-slate-100">{u.name}</span>
                      <span className="ml-2 text-xs text-slate-400">{u.email}</span>
                      {u.status === "banned" && <span className="ml-2 text-xs text-rose-300">제재중</span>}
                    </div>
                    <span className="text-amber-300 font-bold text-xs">{fmtNum(u.points)} 🐷</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchKw && searchResults.length === 0 && !searching && (
            <p className="text-center text-sm text-slate-500 py-4">일치하는 회원이 없습니다.</p>
          )}
        </div>

        {/* 오른쪽: 코인 지급 폼 */}
        <div>
          {!selected ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 flex items-center justify-center h-full min-h-[200px]">
              <p className="text-slate-500 text-sm">왼쪽에서 회원을 검색해 선택하세요</p>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-400/30 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-base">{selected.name}</p>
                  <p className="text-xs text-slate-400">{selected.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">현재 잔액</p>
                  <p className="text-xl font-bold text-amber-300">{fmtNum(selected.points)} 🐷</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-2">빠른 선택</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_AMOUNTS.map(v => (
                    <button key={v} type="button" onClick={() => { setAmount(String(v)); setSubmitErr(""); }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold border ${v > 0
                        ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                        : "border-rose-400/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"}`}>
                      {v > 0 ? `+${fmtNum(v)}` : fmtNum(v)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  직접 입력 <span className="text-slate-500 font-normal">(음수=차감)</span>
                </label>
                <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setSubmitErr(""); }}
                  placeholder="예: 1000 또는 -500"
                  className="w-full rounded-xl border border-amber-400/25 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400/60" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">지급 사유</label>
                <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-400/40" />
              </div>

              {submitErr && <p className="text-xs text-rose-300 border border-rose-400/30 bg-rose-500/10 rounded-xl px-3 py-2">⚠️ {submitErr}</p>}

              <button onClick={handleGrant} disabled={submitting || !amount}
                className="w-full rounded-xl border border-amber-400/50 bg-amber-500/25 py-3 text-sm font-bold text-amber-200 hover:bg-amber-500/35 disabled:opacity-40 transition">
                {submitting ? "처리 중…" : `🐷 ${Number(amount) > 0 ? "코인 지급" : "코인 차감"} 적용`}
              </button>

              {/* 코인 내역 */}
              {(histLoading || history.length > 0) && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 mt-2">최근 코인 내역</p>
                  {histLoading
                    ? <p className="text-xs text-slate-500 text-center py-2">로드 중…</p>
                    : (
                      <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                        {history.map(h => (
                          <div key={h._id} className="flex justify-between items-center rounded-lg bg-slate-900/60 px-3 py-1.5 text-xs">
                            <div>
                              <span className={`font-bold ${h.delta > 0 ? "text-emerald-300" : "text-rose-300"}`}>
                                {h.delta > 0 ? `+${fmtNum(h.delta)}` : fmtNum(h.delta)}
                              </span>
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* 일괄 지급 섹션 */}
      <div className="rounded-xl border border-violet-400/25 bg-violet-500/8 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-300 mb-4">📋 이메일 일괄 지급</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              이메일 목록 <span className="text-slate-500 font-normal">(줄바꿈·쉼표·세미콜론 구분)</span>
            </label>
            <textarea value={bulkEmails} onChange={e => setBulkEmails(e.target.value)} rows={5}
              placeholder={"user1@example.com\nuser2@example.com"}
              className="w-full rounded-xl border border-violet-400/25 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-400/60 resize-none" />
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">지급 코인 수량</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[100, 500, 1000, 3000, 5000].map(v => (
                  <button key={v} type="button" onClick={() => setBulkAmount(String(v))}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-emerald-400/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20">
                    +{fmtNum(v)}
                  </button>
                ))}
              </div>
              <input type="number" value={bulkAmount} onChange={e => setBulkAmount(e.target.value)} placeholder="코인 수량"
                className="w-full rounded-xl border border-violet-400/25 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-400/60" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">지급 사유</label>
              <input type="text" value={bulkReason} onChange={e => setBulkReason(e.target.value)}
                className="w-full rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 outline-none" />
            </div>
            <button onClick={handleBulkGrant} disabled={bulkSubmitting || !bulkEmails.trim() || !bulkAmount}
              className="w-full rounded-xl border border-violet-400/50 bg-violet-500/25 py-2.5 text-sm font-bold text-violet-200 hover:bg-violet-500/35 disabled:opacity-40 transition">
              {bulkSubmitting ? "처리 중…" : "🐷 일괄 지급 실행"}
            </button>
          </div>
        </div>
        {bulkResult && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-xs space-y-1 ${bulkResult.fail > 0 ? "border-orange-400/30 bg-orange-500/10" : "border-emerald-400/30 bg-emerald-500/10"}`}>
            <p className="font-semibold text-slate-200">
              ✅ 성공 <span className="text-emerald-300">{bulkResult.ok}명</span>
              {bulkResult.fail > 0 && <> &nbsp;|&nbsp; ❌ 실패 <span className="text-rose-300">{bulkResult.fail}건</span></>}
            </p>
            {bulkResult.errors.map((e, i) => <p key={i} className="text-rose-300">{e}</p>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Banned Users Tab ──────────────────────────────────────────
function BannedUsersTab({ token, toast }: { token: string; toast: (msg: string, type?: "success" | "error") => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchKw, setSearchKw] = useState("");

  const fetchBanned = useCallback(async (kw: string) => {
    setLoading(true); setErr("");
    try {
      // 차단 유저는 소수이므로 pageSize=200으로 전체 로드
      const params = new URLSearchParams({ pageSize: "200", page: "1" });
      if (kw) params.set("search", kw);
      const r = await fetch(`/api/admin/members?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(await safeErrorMsg(r));
      const d = await r.json() as { users?: AdminUser[] };
      const banned = (d.users ?? []).filter(u => u.status === "banned");
      setUsers(banned);
    } catch (e) { setErr(e instanceof Error ? e.message : "오류"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchBanned(searchKw); }, [fetchBanned, searchKw]);

  const handleUnban = async (u: AdminUser) => {
    if (!confirm(`${u.name} (${u.email}) 의 정지를 해제하시겠습니까?`)) return;
    try {
      const r = await fetch(`/api/admin/members/${encodeURIComponent(u._id)}/ban`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "unban" }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message || `[${r.status}]`); }
      toast(`${u.name} 정지 해제 완료`, "success");
      fetchBanned(searchKw);
    } catch (e) { toast(e instanceof Error ? e.message : "처리 실패", "error"); }
  };

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`${u.name} 계정을 완전 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
    try {
      const r = await fetch(`/api/admin/members/${encodeURIComponent(u._id)}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message || `[${r.status}]`); }
      toast(`${u.name} 계정 삭제 완료`, "success");
      fetchBanned(searchKw);
    } catch (e) { toast(e instanceof Error ? e.message : "삭제 실패", "error"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <form onSubmit={e => { e.preventDefault(); setSearchKw(searchInput.trim()); }} className="flex gap-2 flex-1">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} type="search" placeholder="이름/이메일 검색"
            className="flex-1 rounded-xl border border-rose-400/25 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-rose-400/50" />
          <button type="submit" className="rounded-xl border border-rose-400/40 bg-rose-600/30 px-4 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-600/50">검색</button>
          {searchKw && <button type="button" onClick={() => { setSearchInput(""); setSearchKw(""); }} className="rounded-xl border border-slate-600/40 bg-slate-700/50 px-3 py-2.5 text-sm text-slate-300">초기화</button>}
        </form>
        <span className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">제재 <b className="text-white">{users.length}</b>명</span>
      </div>

      {err && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 space-y-2">
          <p><b>⚠️ </b>{err}</p>
          <div className="flex flex-wrap gap-3">
            <a href="/api/admin/diag" target="_blank" rel="noopener noreferrer" className="text-xs underline text-sky-400">🔍 /api/admin/diag 진단</a>
            <button onClick={() => { try { sessionStorage.removeItem("flower_admin_token"); } catch { /* ignore */ } window.location.reload(); }}
              className="text-xs underline text-amber-400">🔄 재로그인</button>
          </div>
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-5 py-10 text-center text-slate-500 text-sm">
          {searchKw ? "검색 결과가 없습니다." : "🎉 제재된 회원이 없습니다."}
        </div>
      )}

      {users.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-rose-400/20 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-rose-900/40 text-xs uppercase tracking-wider text-rose-300">
                <tr>
                  <th className="px-4 py-3 text-left">이름</th>
                  <th className="px-4 py-3 text-left">이메일</th>
                  <th className="px-4 py-3 text-left">정지일</th>
                  <th className="px-4 py-3 text-left">정지 사유</th>
                  <th className="px-4 py-3 text-right">코인</th>
                  <th className="px-4 py-3 text-center">조치</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className="border-t border-slate-700/40 bg-rose-950/10 hover:bg-rose-950/25">
                    <td className="px-4 py-3 font-medium text-slate-100">{u.name}</td>
                    <td className="px-4 py-3 text-slate-300">{u.email}</td>
                    <td className="px-4 py-3 text-slate-400">{fmtDate(u.bannedAt)}</td>
                    <td className="px-4 py-3 text-rose-300 text-xs max-w-[200px]">
                      <span title={u.banReason || "-"} className="line-clamp-2">{u.banReason || "-"}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-300">{fmtNum(u.points)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => handleUnban(u)}
                          className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20">
                          ✅ 해제
                        </button>
                        <button onClick={() => handleDelete(u)}
                          className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/20">
                          🗑️ 삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && <p className="px-4 py-2 text-right text-xs text-slate-500">로드 중</p>}
        </div>
      )}
    </div>
  );
}


// ─── Coin History Tab ─────────────────────────────────────────

const KIND_LABELS: Record<string, { label: string; color: string }> = {
  charge: { label: "충전", color: "text-emerald-300 border-emerald-400/40 bg-emerald-500/10" },
  deduct: { label: "차감", color: "text-rose-300 border-rose-400/40 bg-rose-500/10" },
  refund: { label: "환불", color: "text-sky-300 border-sky-400/40 bg-sky-500/10" },
  adjust: { label: "조정", color: "text-amber-300 border-amber-400/40 bg-amber-500/10" },
};

function CoinHistoryTab({ token, toast }: { token: string; toast: (msg: string, type?: "success" | "error") => void }) {
  const [records, setRecords] = useState<CoinRecord[]>([]);
  const [summary, setSummary] = useState<Record<string, { total: number; count: number }>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [userInput, setUserInput] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const PAGE_SIZE = 50;

  const fetchHistory = useCallback(async (kind: string, user: string, from: string, to: string, pg: number) => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams({ page: String(pg), pageSize: String(PAGE_SIZE) });
      if (kind !== "all") params.set("kind", kind);
      if (user) params.set("userId", user);
      if (from) params.set("dateFrom", from);
      if (to) params.set("dateTo", to);
      const r = await window.fetch(`/api/admin/coin-history?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(await safeErrorMsg(r));
      const d = await r.json() as { records?: CoinRecord[]; summary?: Record<string, { total: number; count: number }>; totalPages?: number };
      setRecords(d.records ?? []);
      setSummary(d.summary ?? {});
      setTotalPages(d.totalPages ?? 1);
    } catch (e) { setErr(e instanceof Error ? e.message : "오류"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchHistory(kindFilter, userSearch, dateFrom, dateTo, page); }, [fetchHistory, kindFilter, userSearch, dateFrom, dateTo, page]);

  const exportCSV = () => {
    if (records.length === 0) { toast("내보낼 데이터가 없습니다.", "error"); return; }
    const header = "날짜,이름,이메일,종류,코인변동,잔액,사유";
    const rows = records.map(r =>
      [fmtDateTime(r.createdAt), r.userName, r.userEmail, r.kind, r.delta, r.balanceAfter, `"${(r.reason || "").replace(/"/g, '""')}"`].join(",")
    );
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `coin-history-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast("CSV 저장 완료", "success");
  };

  const SUMMARY_KINDS = ["charge", "deduct", "refund", "adjust"];

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SUMMARY_KINDS.map(k => {
          const s = summary[k] ?? { total: 0, count: 0 };
          const { label, color } = KIND_LABELS[k] ?? { label: k, color: "text-slate-300 border-slate-400/40 bg-slate-500/10" };
          const borderBg = color.split(" ").slice(1).join(" ");
          return (
            <div key={k} className={`rounded-xl border ${borderBg} p-4`}>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
              <p className="mt-1 text-xl font-bold text-white">{s.count.toLocaleString("ko-KR")}건</p>
              <p className="text-xs text-slate-400">{s.total > 0 ? "+" : ""}{fmtNum(s.total)} 코인</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">종류</label>
          <select value={kindFilter} onChange={e => { setKindFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none">
            <option value="all">전체</option>
            <option value="charge">충전</option>
            <option value="deduct">차감</option>
            <option value="refund">환불</option>
            <option value="adjust">조정</option>
          </select>
        </div>
        <form onSubmit={e => { e.preventDefault(); setUserSearch(userInput.trim()); setPage(1); }} className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">회원 검색</label>
          <div className="flex gap-2">
            <input value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="이름 또는 이메일"
              className="w-48 rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/50" />
            <button type="submit" className="rounded-xl border border-violet-400/40 bg-violet-600/50 px-3 py-2 text-sm text-white">검색</button>
            {userSearch && <button type="button" onClick={() => { setUserInput(""); setUserSearch(""); setPage(1); }} className="rounded-xl border border-slate-600/40 bg-slate-700/50 px-3 py-2 text-xs text-slate-300">✕</button>}
          </div>
        </form>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">시작일</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">종료일</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none" />
        </div>
        <div className="flex items-end gap-2 ml-auto">
          <button onClick={() => fetchHistory(kindFilter, userSearch, dateFrom, dateTo, page)} className="rounded-xl border border-slate-600/40 bg-slate-700/50 px-3 py-2 text-xs text-slate-300">↻ 새로고침</button>
          <button onClick={exportCSV} className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/25">📥 CSV</button>
        </div>
      </div>

      {err && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">⚠️ {err}</div>}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-800/90 text-xs uppercase tracking-wider text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">날짜</th>
                <th className="px-4 py-3 text-left">이름</th>
                <th className="px-4 py-3 text-left">이메일</th>
                <th className="px-4 py-3 text-center">종류</th>
                <th className="px-4 py-3 text-right">변동</th>
                <th className="px-4 py-3 text-right">잔액</th>
                <th className="px-4 py-3 text-left">사유</th>
              </tr>
            </thead>
            <tbody>
              {records.map(rec => {
                const k = KIND_LABELS[rec.kind] ?? { label: rec.kind, color: "text-slate-300 border-slate-400/40 bg-slate-500/10" };
                return (
                  <tr key={rec._id} className="border-t border-slate-700/40 hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{fmtDateTime(rec.createdAt)}</td>
                    <td className="px-4 py-2.5 text-slate-100 font-medium">{rec.userName || "-"}</td>
                    <td className="px-4 py-2.5 text-slate-300">{rec.userEmail || "-"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${k.color}`}>{k.label}</span>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold ${rec.delta > 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {rec.delta > 0 ? `+${fmtNum(rec.delta)}` : fmtNum(rec.delta)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-amber-300">{fmtNum(rec.balanceAfter)}</td>
                    <td className="px-4 py-2.5 text-slate-400 max-w-[200px] truncate" title={rec.reason}>{rec.reason || "-"}</td>
                  </tr>
                );
              })}
              {!loading && records.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">조회 결과가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
        {loading && <p className="px-4 py-3 text-right text-xs text-slate-500">로드 중</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <button disabled={page <= 1} onClick={() => setPage(1)} className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-30">«</button>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-30">‹ 이전</button>
          <span className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-4 py-1.5 text-xs text-violet-200">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-30">다음 ›</button>
          <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-30">»</button>
        </div>
      )}
    </div>
  );
}

// ─── Fortune Content Tab ──────────────────────────────────────

const CONTENT_CATEGORIES = ["saju", "tarot", "horoscope", "dream", "daily", "geomancy", "love", "career"];
const CATEGORY_LABELS: Record<string, string> = {
  saju: "사주", tarot: "타로", horoscope: "별자리", dream: "꿈해몽",
  daily: "오늘의 운세", geomancy: "풍수", love: "연애운", career: "직업운",
};

function FortuneContentTab({ token, toast }: { token: string; toast: (msg: string, type?: "success" | "error") => void }) {
  const [items, setItems] = useState<FortuneContent[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchKw, setSearchKw] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; item: Partial<FortuneContent> | null; saving: boolean; error: string }>({ open: false, item: null, saving: false, error: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<FortuneContent | null>(null);
  const PAGE_SIZE = 20;

  const fetchContents = useCallback(async (cat: string, kw: string, active: boolean, pg: number) => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams({ page: String(pg), pageSize: String(PAGE_SIZE) });
      if (cat !== "all") params.set("category", cat);
      if (kw) params.set("search", kw);
      if (active) params.set("isActive", "true");
      const r = await window.fetch(`/api/admin/content?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(await safeErrorMsg(r));
      const d = await r.json() as { items?: FortuneContent[]; totalPages?: number };
      setItems(d.items ?? []);
      setTotalPages(d.totalPages ?? 1);
    } catch (e) { setErr(e instanceof Error ? e.message : "오류"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchContents(catFilter, searchKw, activeOnly, page); }, [fetchContents, catFilter, searchKw, activeOnly, page]);

  const openCreate = () => setModal({ open: true, item: { category: "saju", isActive: true, sortOrder: 0, tags: [] }, saving: false, error: "" });
  const openEdit = (item: FortuneContent) => setModal({ open: true, item: { ...item }, saving: false, error: "" });

  const saveContent = async () => {
    const { item } = modal;
    if (!item) return;
    const isNew = !item._id;
    if (!item.title?.trim()) { setModal(p => ({ ...p, error: "제목을 입력해 주세요." })); return; }
    if (!item.content?.trim()) { setModal(p => ({ ...p, error: "내용을 입력해 주세요." })); return; }
    setModal(p => ({ ...p, saving: true, error: "" }));
    try {
      const url = isNew ? "/api/admin/content" : `/api/admin/content/${item._id}`;
      const method = isNew ? "POST" : "PATCH";
      const r = await window.fetch(url, {
        method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(item),
      });
      if (!r.ok) { const d = await r.json() as { message?: string }; throw new Error(d.message || `[${r.status}]`); }
      toast(isNew ? "콘텐츠 생성 완료" : "콘텐츠 업데이트 완료", "success");
      setModal({ open: false, item: null, saving: false, error: "" });
      fetchContents(catFilter, searchKw, activeOnly, page);
    } catch (e) { setModal(p => ({ ...p, saving: false, error: e instanceof Error ? e.message : "저장 실패" })); }
  };

  const deleteContent = async (item: FortuneContent) => {
    try {
      const r = await window.fetch(`/api/admin/content/${item._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { const d = await r.json() as { message?: string }; throw new Error(d.message || `[${r.status}]`); }
      toast("콘텐츠 삭제 완료", "success");
      setDeleteConfirm(null);
      fetchContents(catFilter, searchKw, activeOnly, page);
    } catch (e) { toast(e instanceof Error ? e.message : "삭제 실패", "error"); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-violet-400/25 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none">
            <option value="all">전체 카테고리</option>
            {CONTENT_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
          </select>
          <form onSubmit={e => { e.preventDefault(); setSearchKw(searchInput.trim()); setPage(1); }} className="flex gap-2">
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="제목 검색"
              className="w-40 rounded-xl border border-violet-400/20 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/50" />
            <button type="submit" className="rounded-xl border border-violet-400/40 bg-violet-600/50 px-3 py-2 text-sm text-white">검색</button>
            {searchKw && <button type="button" onClick={() => { setSearchInput(""); setSearchKw(""); setPage(1); }} className="rounded-xl border border-slate-600/40 bg-slate-700/50 px-3 py-2 text-xs text-slate-300">✕</button>}
          </form>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={activeOnly} onChange={e => { setActiveOnly(e.target.checked); setPage(1); }} className="rounded accent-violet-500" />
            <span className="text-sm text-slate-300">활성만</span>
          </label>
        </div>
        <button onClick={openCreate} className="rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-500/30">
          + 새 콘텐츠
        </button>
      </div>

      {err && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">⚠️ {err}</div>}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-800/90 text-xs uppercase tracking-wider text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">제목</th>
                <th className="px-4 py-3 text-left">카테고리</th>
                <th className="px-4 py-3 text-left">서브카테고리</th>
                <th className="px-4 py-3 text-center">순서</th>
                <th className="px-4 py-3 text-center">상태</th>
                <th className="px-4 py-3 text-left">최종 수정</th>
                <th className="px-4 py-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id} className="border-t border-slate-700/40 hover:bg-slate-800/40">
                  <td className="px-4 py-2.5 font-medium text-slate-100 max-w-[200px] truncate" title={item.title}>{item.title}</td>
                  <td className="px-4 py-2.5 text-slate-300">{CATEGORY_LABELS[item.category] || item.category}</td>
                  <td className="px-4 py-2.5 text-slate-400">{item.subcategory || "-"}</td>
                  <td className="px-4 py-2.5 text-center text-slate-300">{item.sortOrder}</td>
                  <td className="px-4 py-2.5 text-center">
                    {item.isActive
                      ? <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-xs text-emerald-300">활성</span>
                      : <span className="rounded-full bg-slate-500/20 border border-slate-400/30 px-2 py-0.5 text-xs text-slate-400">비활성</span>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{fmtDate(item.updatedAt)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => openEdit(item)} className="rounded-lg border border-sky-400/30 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300 hover:bg-sky-500/20">수정</button>
                      <button onClick={() => setDeleteConfirm(item)} className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">콘텐츠가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
        {loading && <p className="px-4 py-3 text-right text-xs text-slate-500">로드 중</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <button disabled={page <= 1} onClick={() => setPage(1)} className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-30">«</button>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-30">‹ 이전</button>
          <span className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-4 py-1.5 text-xs text-violet-200">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-30">다음 ›</button>
          <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-30">»</button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal.open && modal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm" onClick={() => !modal.saving && setModal(p => ({ ...p, open: false }))}>
          <div className="w-full max-w-2xl rounded-2xl border border-violet-400/25 bg-slate-950 p-6 shadow-[0_24px_60px_rgba(0,0,0,.8)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-white mb-5">{modal.item._id ? "콘텐츠 수정" : "새 콘텐츠 추가"}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">카테고리</label>
                  <select value={modal.item.category || "saju"} onChange={e => setModal(p => ({ ...p, item: { ...p.item!, category: e.target.value } }))}
                    className="w-full rounded-xl border border-violet-400/25 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none">
                    {CONTENT_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">서브카테고리</label>
                  <input value={modal.item.subcategory || ""} onChange={e => setModal(p => ({ ...p, item: { ...p.item!, subcategory: e.target.value } }))}
                    placeholder="선택 사항"
                    className="w-full rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">제목 *</label>
                <input value={modal.item.title || ""} onChange={e => setModal(p => ({ ...p, item: { ...p.item!, title: e.target.value } }))}
                  className="w-full rounded-xl border border-violet-400/25 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/60" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">내용 * <span className="text-slate-500 font-normal">(최대 20,000자)</span></label>
                <textarea value={modal.item.content || ""} onChange={e => setModal(p => ({ ...p, item: { ...p.item!, content: e.target.value } }))} rows={8}
                  className="w-full rounded-xl border border-violet-400/25 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/60 resize-none font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">태그 (쉼표 구분)</label>
                  <input value={(modal.item.tags || []).join(", ")} onChange={e => setModal(p => ({ ...p, item: { ...p.item!, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) } }))}
                    placeholder="예: 사주, 운세"
                    className="w-full rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">정렬 순서</label>
                  <input type="number" value={modal.item.sortOrder ?? 0} onChange={e => setModal(p => ({ ...p, item: { ...p.item!, sortOrder: Number(e.target.value) } }))}
                    className="w-full rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none" />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-700/40 bg-slate-900/60 px-4 py-3">
                <input type="checkbox" checked={modal.item.isActive ?? true} onChange={e => setModal(p => ({ ...p, item: { ...p.item!, isActive: e.target.checked } }))} className="accent-violet-500 w-4 h-4" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">활성 상태</p>
                  <p className="text-xs text-slate-400">비활성화하면 서비스에 노출되지 않습니다.</p>
                </div>
              </label>
            </div>
            {modal.error && <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{modal.error}</div>}
            <div className="mt-5 flex gap-2 justify-end">
              <button onClick={() => setModal(p => ({ ...p, open: false }))} disabled={modal.saving}
                className="rounded-xl border border-slate-600/40 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-300">취소</button>
              <button onClick={saveContent} disabled={modal.saving}
                className="rounded-xl border border-violet-400/50 bg-violet-600/50 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-500/70 disabled:opacity-50">
                {modal.saving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-rose-400/30 bg-slate-950 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-white mb-2">🗑️ 콘텐츠 삭제</h2>
            <p className="text-sm text-slate-300 mb-1">아래 콘텐츠를 삭제하시겠습니까?</p>
            <p className="text-sm font-semibold text-rose-300 mb-5">&ldquo;{deleteConfirm.title}&rdquo;</p>
            <div className="flex gap-2">
              <button onClick={() => deleteContent(deleteConfirm)}
                className="flex-1 rounded-xl border border-rose-400/50 bg-rose-500/25 py-2.5 text-sm font-bold text-rose-200 hover:bg-rose-500/35">삭제</button>
              <button onClick={() => setDeleteConfirm(null)}
                className="rounded-xl border border-slate-600/40 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-300">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────

function SettingsTab({ token, toast }: { token: string; toast: (msg: string, type?: "success" | "error") => void }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ipInput, setIpInput] = useState({ ip: "", reason: "" });

  useEffect(() => {
    setLoading(true);
    window.fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        if (!r.ok) throw new Error(await safeErrorMsg(r));
        return r.json();
      })
      .then((d: { settings?: AppSettings }) => setSettings(d.settings ?? null))
      .catch(e => setErr(e instanceof Error ? e.message : "오류"))
      .finally(() => setLoading(false));
  }, [token]);

  const save = async (patch: Partial<AppSettings>) => {
    setSaving(true);
    try {
      const r = await window.fetch("/api/admin/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error(await safeErrorMsg(r));
      const d = await r.json() as { settings?: AppSettings };
      if (d.settings) setSettings(d.settings);
      toast("설정이 저장되었습니다.", "success");
    } catch (e) { toast(e instanceof Error ? e.message : "저장 실패", "error"); }
    finally { setSaving(false); }
  };

  const addIp = async () => {
    const ip = ipInput.ip.trim();
    if (!ip) { toast("IP 주소를 입력하세요.", "error"); return; }
    const newList = [...(settings?.ipBlockList ?? []), { ip, reason: ipInput.reason.trim(), blockedAt: new Date().toISOString() }];
    setIpInput({ ip: "", reason: "" });
    await save({ ipBlockList: newList });
  };

  const removeIp = async (idx: number) => {
    const newList = (settings?.ipBlockList ?? []).filter((_, i) => i !== idx);
    await save({ ipBlockList: newList });
  };

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">설정 불러오는 중…</p>;
  if (!settings) return <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-300 text-sm">설정을 불러올 수 없습니다. {err}</div>;

  return (
    <div className="space-y-6">
      {/* 서비스 운영 */}
      <section className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">🔧 서비스 운영</h2>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-700/40 bg-slate-800/50 px-4 py-3 cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-slate-200">점검 모드</p>
            <p className="text-xs text-slate-400">활성화 시 일반 사용자 접근을 제한합니다.</p>
          </div>
          <input type="checkbox" checked={settings.maintenanceMode} onChange={e => save({ maintenanceMode: e.target.checked })} className="accent-violet-500 w-5 h-5" />
        </label>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-300">점검 안내 메시지</label>
          <textarea value={settings.maintenanceMessage || ""} onChange={e => setSettings(p => p ? { ...p, maintenanceMessage: e.target.value } : p)} rows={2}
            onBlur={() => save({ maintenanceMessage: settings.maintenanceMessage })}
            className="w-full rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">신규 회원 지급 코인</label>
            <input type="number" value={settings.newUserCoins} onChange={e => setSettings(p => p ? { ...p, newUserCoins: Number(e.target.value) } : p)}
              onBlur={() => save({ newUserCoins: settings.newUserCoins })}
              className="w-full rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">캐시 TTL (초)</label>
            <input type="number" value={settings.cacheTtlSeconds} onChange={e => setSettings(p => p ? { ...p, cacheTtlSeconds: Number(e.target.value) } : p)}
              onBlur={() => save({ cacheTtlSeconds: settings.cacheTtlSeconds })}
              className="w-full rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none" />
          </div>
        </div>
      </section>

      {/* 운세 비용 */}
      <section className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-5 space-y-3">
        <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider">🐷 운세별 코인 비용</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(settings.fortuneCosts || {}).map(([key, val]) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-slate-400">{CATEGORY_LABELS[key] || key}</label>
              <input type="number" value={val as number} onChange={e => setSettings(p => p ? { ...p, fortuneCosts: { ...p.fortuneCosts, [key]: Number(e.target.value) } } : p)}
                onBlur={() => save({ fortuneCosts: settings.fortuneCosts })}
                className="w-full rounded-xl border border-amber-400/20 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none" />
            </div>
          ))}
        </div>
      </section>

      {/* 코인 패키지 */}
      <section className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-5 space-y-3">
        <h2 className="text-sm font-bold text-violet-300 uppercase tracking-wider">📦 코인 패키지</h2>
        <div className="space-y-2">
          {(settings.coinPackages || []).map((pkg, i) => (
            <div key={pkg.id || i} className="flex flex-col gap-2 rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 sm:flex-row sm:items-center">
              <div className="flex-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <label className="text-xs text-slate-500">이름</label>
                  <input value={pkg.name} onChange={e => setSettings(p => { if (!p) return p; const pkgs = [...p.coinPackages]; pkgs[i] = { ...pkgs[i], name: e.target.value }; return { ...p, coinPackages: pkgs }; })}
                    className="w-full rounded-lg border border-slate-600/30 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">코인</label>
                  <input type="number" value={pkg.coins} onChange={e => setSettings(p => { if (!p) return p; const pkgs = [...p.coinPackages]; pkgs[i] = { ...pkgs[i], coins: Number(e.target.value) }; return { ...p, coinPackages: pkgs }; })}
                    className="w-full rounded-lg border border-slate-600/30 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">가격 (₩)</label>
                  <input type="number" value={pkg.priceKRW} onChange={e => setSettings(p => { if (!p) return p; const pkgs = [...p.coinPackages]; pkgs[i] = { ...pkgs[i], priceKRW: Number(e.target.value) }; return { ...p, coinPackages: pkgs }; })}
                    className="w-full rounded-lg border border-slate-600/30 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none" />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={pkg.isActive} onChange={e => setSettings(p => { if (!p) return p; const pkgs = [...p.coinPackages]; pkgs[i] = { ...pkgs[i], isActive: e.target.checked }; return { ...p, coinPackages: pkgs }; })} className="accent-violet-500" />
                    <span className="text-xs text-slate-300">활성</span>
                  </label>
                  <button onClick={() => setSettings(p => p ? { ...p, coinPackages: p.coinPackages.filter((_, j) => j !== i) } : p)}
                    className="text-xs text-rose-400 hover:text-rose-300">삭제</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSettings(p => p ? { ...p, coinPackages: [...p.coinPackages, { id: String(Date.now()), name: "새 패키지", coins: 100, priceKRW: 1000, isActive: true }] } : p)}
            className="rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-xs text-violet-300 hover:bg-violet-500/25">+ 패키지 추가</button>
          <button onClick={() => save({ coinPackages: settings.coinPackages })} disabled={saving}
            className="rounded-xl border border-violet-400/50 bg-violet-600/50 px-4 py-2 text-xs font-bold text-white hover:bg-violet-500/70 disabled:opacity-50">💾 저장</button>
        </div>
      </section>

      {/* 팝업 */}
      <section className="rounded-xl border border-sky-400/20 bg-sky-500/5 p-5 space-y-3">
        <h2 className="text-sm font-bold text-sky-300 uppercase tracking-wider">📣 서비스 팝업</h2>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-700/40 bg-slate-800/50 px-4 py-3 cursor-pointer">
          <p className="text-sm font-semibold text-slate-200">팝업 활성화</p>
          <input type="checkbox" checked={settings.popupEnabled} onChange={e => save({ popupEnabled: e.target.checked })} className="accent-sky-500 w-5 h-5" />
        </label>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-300">팝업 제목</label>
          <input value={settings.popupTitle || ""} onChange={e => setSettings(p => p ? { ...p, popupTitle: e.target.value } : p)}
            onBlur={() => save({ popupTitle: settings.popupTitle })}
            className="w-full rounded-xl border border-sky-400/20 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-300">팝업 내용</label>
          <textarea value={settings.popupContent || ""} onChange={e => setSettings(p => p ? { ...p, popupContent: e.target.value } : p)} rows={3}
            onBlur={() => save({ popupContent: settings.popupContent })}
            className="w-full rounded-xl border border-sky-400/20 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none resize-none" />
        </div>
      </section>

      {/* IP 차단 목록 */}
      <section className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-5 space-y-3">
        <h2 className="text-sm font-bold text-rose-300 uppercase tracking-wider">🚫 IP 차단 목록</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-300">IP 주소</label>
            <input value={ipInput.ip} onChange={e => setIpInput(p => ({ ...p, ip: e.target.value }))} placeholder="예: 192.168.1.100"
              className="w-full rounded-xl border border-rose-400/20 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-rose-400/50" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-300">차단 사유</label>
            <input value={ipInput.reason} onChange={e => setIpInput(p => ({ ...p, reason: e.target.value }))} placeholder="(선택)"
              className="w-full rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none" />
          </div>
          <button onClick={addIp} disabled={saving || !ipInput.ip.trim()}
            className="rounded-xl border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-sm font-bold text-rose-200 hover:bg-rose-500/30 disabled:opacity-50">+ 차단 추가</button>
        </div>
        {(settings.ipBlockList || []).length === 0
          ? <p className="text-center text-sm text-slate-500 py-3">차단된 IP가 없습니다.</p>
          : (
            <div className="space-y-1.5">
              {settings.ipBlockList.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-700/40 bg-slate-900/60 px-4 py-2.5">
                  <div>
                    <span className="font-mono text-sm text-rose-300">{entry.ip}</span>
                    {entry.reason && <span className="ml-3 text-xs text-slate-400">{entry.reason}</span>}
                    <span className="ml-3 text-xs text-slate-500">{fmtDate(entry.blockedAt)}</span>
                  </div>
                  <button onClick={() => removeIp(idx)} disabled={saving}
                    className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20 disabled:opacity-50">해제</button>
                </div>
              ))}
            </div>
          )}
      </section>

      {/* 어뷰징 규칙 */}
      <section className="rounded-xl border border-orange-400/20 bg-orange-500/5 p-5 space-y-3">
        <h2 className="text-sm font-bold text-orange-300 uppercase tracking-wider">⚠️ 어뷰징 방지 규칙</h2>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-700/40 bg-slate-800/50 px-4 py-3 cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-slate-200">대량 질의 제한</p>
            <p className="text-xs text-slate-400">단시간 내 과도한 API 요청 차단</p>
          </div>
          <input type="checkbox" checked={settings.abuseRules?.bulkQuery?.enabled ?? false}
            onChange={e => setSettings(p => p ? { ...p, abuseRules: { ...p.abuseRules, bulkQuery: { ...p.abuseRules.bulkQuery, enabled: e.target.checked } } } : p)}
            onBlur={() => save({ abuseRules: settings.abuseRules })} className="accent-orange-500 w-5 h-5" />
        </label>
        {settings.abuseRules?.bulkQuery?.enabled && (
          <div className="grid grid-cols-2 gap-3 pl-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">감지 윈도우 (분)</label>
              <input type="number" value={settings.abuseRules.bulkQuery.windowMinutes ?? 1}
                onChange={e => setSettings(p => p ? { ...p, abuseRules: { ...p.abuseRules, bulkQuery: { ...p.abuseRules.bulkQuery, windowMinutes: Number(e.target.value) } } } : p)}
                onBlur={() => save({ abuseRules: settings.abuseRules })}
                className="w-full rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">요청 임계값</label>
              <input type="number" value={settings.abuseRules.bulkQuery.threshold ?? 100}
                onChange={e => setSettings(p => p ? { ...p, abuseRules: { ...p.abuseRules, bulkQuery: { ...p.abuseRules.bulkQuery, threshold: Number(e.target.value) } } } : p)}
                onBlur={() => save({ abuseRules: settings.abuseRules })}
                className="w-full rounded-xl border border-slate-600/40 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none" />
            </div>
          </div>
        )}
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-700/40 bg-slate-800/50 px-4 py-3 cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-slate-200">다중 계정 감지</p>
            <p className="text-xs text-slate-400">동일 기기/IP의 복수 계정 가입 감지</p>
          </div>
          <input type="checkbox" checked={settings.abuseRules?.multiAccountDetect ?? false}
            onChange={e => { const u = { ...settings.abuseRules, multiAccountDetect: e.target.checked }; setSettings(p => p ? { ...p, abuseRules: u } : p); save({ abuseRules: u }); }}
            className="accent-orange-500 w-5 h-5" />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-700/40 bg-slate-800/50 px-4 py-3 cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-slate-200">비정상 결제 차단</p>
            <p className="text-xs text-slate-400">의심스러운 결제 패턴 자동 차단</p>
          </div>
          <input type="checkbox" checked={settings.abuseRules?.abnormalPaymentBlock ?? false}
            onChange={e => { const u = { ...settings.abuseRules, abnormalPaymentBlock: e.target.checked }; setSettings(p => p ? { ...p, abuseRules: u } : p); save({ abuseRules: u }); }}
            className="accent-orange-500 w-5 h-5" />
        </label>
      </section>
    </div>
  );
}

//  Main Page 

type Tab = "dashboard" | "members" | "coins" | "banned" | "history" | "content" | "settings";

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
    // setToken("") 대신 즉시 홈으로 이동 — setToken 후 PasswordGate가 렌더되는 현상 방지
    window.location.href = '/';
  };

  if (isBooting) return (
    <main className="flex min-h-screen items-center justify-center bg-[#070b18]">
      <span className="text-slate-400 text-sm">로딩 중</span>
    </main>
  );
  if (!token) return <PasswordGate onAuth={setToken} />;

  const TAB_CONFIG: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "📊 대시보드" },
    { id: "members", label: "👥 회원관리" },
    { id: "coins", label: "🪙 코인 지급" },
    { id: "banned", label: "🚫 악성 유저" },
    { id: "history", label: "📜 코인 이력" },
    { id: "content", label: "📝 콘텐츠 관리" },
    { id: "settings", label: "⚙️ 시스템 설정" },
  ];

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
          <nav className="flex items-center gap-1 flex-wrap">
            {TAB_CONFIG.map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${tab === id ? "bg-violet-600/70 text-white border border-violet-400/50" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"}`}>
                {label}
              </button>
            ))}
            <button onClick={logout} className="ml-2 rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/50">로그아웃</button>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">
        {tab === "dashboard" && <DashboardTab token={token} toast={addToast} />}
        {tab === "members" && <MembersTab token={token} toast={addToast} />}
        {tab === "coins" && <CoinGrantTab token={token} toast={addToast} />}
        {tab === "banned" && <BannedUsersTab token={token} toast={addToast} />}
        {tab === "history" && <CoinHistoryTab token={token} toast={addToast} />}
        {tab === "content" && <FortuneContentTab token={token} toast={addToast} />}
        {tab === "settings" && <SettingsTab token={token} toast={addToast} />}
      </div>
    </main>
  );
}
