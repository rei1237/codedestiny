"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "./components/ToastProvider";

type Stats = {
  summary: {
    totalUsers: number;
    todayUsers: number;
    weekUsers: number;
    adminUsers: number;
    bannedUsers: number;
    totalCoins: number;
  };
  daily: { labels: string[]; counts: number[] };
  recentUsers: { _id: string; name: string; email: string; joinedAt: string; points: number }[];
};

function StatCard({ title, value, sub, color }: { title: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-[#13131f] border border-[#2a2a3e] rounded-xl p-5">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{title}</p>
      <p className={`text-2xl font-bold ${color || "text-white"}`}>
        {typeof value === "number" ? value.toLocaleString("ko-KR") : value}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function getToken() {
  if (typeof window === "undefined") return "";
  try { return sessionStorage.getItem("flower_admin_token") || ""; } catch { return ""; }
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminDashboard() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/stats", {
          headers: authHeaders(),
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setStats(data);
      } catch (err: unknown) {
        showToast(`통계 조회 오류: ${(err as Error).message}`, "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  // daily 데이터를 recharts 형태로 변환
  const dailyData = stats?.daily
    ? stats.daily.labels.map((label, i) => ({
        date: label,
        가입자: stats.daily.counts[i] ?? 0,
      }))
    : [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">대시보드</h1>
        <p className="text-sm text-slate-400 mt-1">서비스 운영 현황을 한눈에 확인합니다.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-slate-500">통계를 불러오는 중...</div>
        </div>
      ) : !stats ? (
        <div className="bg-red-900/20 border border-red-700 rounded-xl p-5 text-red-300 text-sm">
          통계를 불러오지 못했습니다. 로그인 상태를 확인하거나 페이지를 새로고침하세요.
        </div>
      ) : (
        <>
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            <StatCard title="전체 유저" value={stats.summary.totalUsers} color="text-white" />
            <StatCard title="오늘 신규 가입" value={stats.summary.todayUsers} color="text-violet-400" sub="오늘 가입" />
            <StatCard title="주간 가입" value={stats.summary.weekUsers} color="text-blue-400" sub="최근 7일" />
            <StatCard title="관리자" value={stats.summary.adminUsers} color="text-yellow-400" />
            <StatCard title="차단된 유저" value={stats.summary.bannedUsers} color="text-red-400" />
            <StatCard title="누적 코인" value={stats.summary.totalCoins} color="text-emerald-400" sub="전체 유저 보유" />
          </div>

          {/* 주간 가입자 차트 */}
          <div className="bg-[#13131f] border border-[#2a2a3e] rounded-xl p-5 mb-8">
            <h2 className="text-sm font-semibold text-white mb-4">주간 신규 가입자 추이</h2>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#2a2a3e" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#2a2a3e" }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ background: "#1e1e2e", border: "1px solid #313145", borderRadius: "8px", fontSize: 12 }}
                    labelStyle={{ color: "#94a3b8" }}
                    itemStyle={{ color: "#a78bfa" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="가입자"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    dot={{ fill: "#7c3aed", r: 3 }}
                    activeDot={{ r: 5, fill: "#a78bfa" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-sm text-center py-8">차트 데이터가 없습니다.</p>
            )}
          </div>

          {/* 최근 가입 */}
          <div className="bg-[#13131f] border border-[#2a2a3e] rounded-xl">
            <div className="px-5 py-4 border-b border-[#2a2a3e]">
              <h2 className="text-sm font-semibold text-white">최근 가입 유저</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a3e]">
                  {["이름", "이메일", "가입일", "포인트"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e2e]">
                {(stats.recentUsers || []).slice(0, 10).map((u) => (
                  <tr key={u._id} className="hover:bg-[#1a1a2e] transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-slate-400">{u.email}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(u.joinedAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{u.points.toLocaleString()}</td>
                  </tr>
                ))}
                {(!stats.recentUsers || stats.recentUsers.length === 0) && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">데이터가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
