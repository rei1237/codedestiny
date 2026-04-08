"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "../components/ToastProvider";

type CoinRecord = {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  kind: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
};

const KIND_LABELS: Record<string, string> = {
  charge: "충전", deduct: "차감", refund: "환불", adjust: "조정",
};
const KIND_COLORS: Record<string, string> = {
  charge: "text-emerald-400",
  deduct: "text-red-400",
  refund: "text-blue-400",
  adjust: "text-yellow-400",
};

function getToken() {
  if (typeof window === "undefined") return "";
  try { return sessionStorage.getItem("flower_admin_token") || ""; } catch { return ""; }
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function CoinsPage() {
  const { showToast } = useToast();
  const [records, setRecords] = useState<CoinRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterKind, setFilterKind] = useState("");
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        ...(filterKind && { kind: filterKind }),
        ...(userId && { userId }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      const res = await fetch(`/api/admin/coin-history?${params}`, {
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("API 오류");
      const data = await res.json();
      setRecords(data.records || []);
      setTotalCount(data.totalCount || 0);
    } catch {
      showToast("코인 이력을 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }, [page, filterKind, userId, dateFrom, dateTo, showToast]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">코인 이력</h1>
        <p className="text-sm text-slate-400 mt-1">전체 {totalCount.toLocaleString()}건</p>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filterKind}
          onChange={(e) => { setFilterKind(e.target.value); setPage(1); }}
          className="bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">모든 종류</option>
          <option value="charge">충전</option>
          <option value="deduct">차감</option>
          <option value="refund">환불</option>
          <option value="adjust">조정</option>
        </select>
        <input
          type="text"
          value={userId}
          onChange={(e) => { setUserId(e.target.value); setPage(1); }}
          placeholder="유저 ID 검색..."
          className="bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 w-52"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
        />
        <span className="text-slate-500 self-center text-xs">~</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
        />
        <button
          onClick={fetchRecords}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors"
        >
          조회
        </button>
      </div>

      {/* 테이블 */}
      <div className="bg-[#13131f] border border-[#2a2a3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a3e]">
              {["일시", "유저", "종류", "코인 변화", "잔여 코인", "사유"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e2e]">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">불러오는 중...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">이력이 없습니다.</td></tr>
            ) : (
              records.map((r) => (
                <tr key={r._id} className="hover:bg-[#1a1a2e] transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(r.createdAt).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white text-xs font-medium">{r.userName || "-"}</div>
                    <div className="text-slate-500 text-xs">{r.userEmail || r.userId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${KIND_COLORS[r.kind] || "text-slate-300"}`}>
                      {KIND_LABELS[r.kind] || r.kind}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-sm font-medium ${r.delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {r.delta >= 0 ? "+" : ""}{r.delta.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{r.balanceAfter.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">{r.reason || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#1e1e2e] text-slate-300 disabled:opacity-40 hover:bg-[#2a2a3e] transition-colors">이전</button>
          <span className="text-sm text-slate-400">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#1e1e2e] text-slate-300 disabled:opacity-40 hover:bg-[#2a2a3e] transition-colors">다음</button>
        </div>
      )}
    </div>
  );
}
