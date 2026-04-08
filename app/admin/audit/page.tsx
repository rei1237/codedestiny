"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "../components/ToastProvider";

type AuditLog = {
  _id: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  note: string;
  ip: string;
  createdAt: string;
  before?: unknown;
  after?: unknown;
};

const ACTION_LABELS: Record<string, string> = {
  user_ban: "유저 차단",
  user_unban: "차단 해제",
  user_suspend: "유저 정지",
  user_delete: "유저 삭제",
  user_role_change: "권한 변경",
  coin_grant: "코인 지급",
  content_create: "콘텐츠 생성",
  content_update: "콘텐츠 수정",
  content_delete: "콘텐츠 삭제",
  settings_update: "설정 변경",
};

const ACTION_COLORS: Record<string, string> = {
  user_ban: "text-red-400 bg-red-500/10 border-red-500/20",
  user_delete: "text-red-400 bg-red-500/10 border-red-500/20",
  user_unban: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  content_delete: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  content_create: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  content_update: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  settings_update: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

function getToken() {
  if (typeof window === "undefined") return "";
  try { return sessionStorage.getItem("flower_admin_token") || ""; } catch { return ""; }
}

export default function AuditPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const PAGE_SIZE = 30;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        ...(filterAction && { action: filterAction }),
        ...(filterType && { targetType: filterType }),
      });
      const res = await fetch(`/api/admin/audit?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("API 오류");
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalCount(data.totalCount || 0);
    } catch {
      showToast("감사 로그를 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterType, showToast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">감사 로그</h1>
        <p className="text-sm text-slate-400 mt-1">관리자 작업 이력 — 전체 {totalCount.toLocaleString()}건</p>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          className="bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">모든 작업</option>
          {Object.entries(ACTION_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">모든 유형</option>
          <option value="user">유저</option>
          <option value="content">콘텐츠</option>
          <option value="coin">코인</option>
          <option value="settings">설정</option>
        </select>
        <button onClick={fetchLogs} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors">
          새로고침
        </button>
      </div>

      {/* 로그 목록 */}
      <div className="flex flex-col gap-2">
        {loading ? (
          <div className="bg-[#13131f] border border-[#2a2a3e] rounded-xl p-8 text-center text-slate-500">불러오는 중...</div>
        ) : logs.length === 0 ? (
          <div className="bg-[#13131f] border border-[#2a2a3e] rounded-xl p-8 text-center text-slate-500">로그가 없습니다.</div>
        ) : (
          logs.map((log) => (
            <div key={log._id} className="bg-[#13131f] border border-[#2a2a3e] rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-[#1a1a2e] transition-colors"
                onClick={() => setExpandedId(expandedId === log._id ? null : log._id)}
              >
                <span className={`px-2 py-0.5 rounded text-xs border ${ACTION_COLORS[log.action] || "text-slate-400 bg-slate-500/10 border-slate-500/20"}`}>
                  {ACTION_LABELS[log.action] || log.action}
                </span>
                <span className="text-slate-300 text-sm flex-1">{log.adminEmail}</span>
                <span className="text-slate-500 text-xs">{log.targetType} / {log.targetId || "-"}</span>
                <span className="text-slate-500 text-xs ml-4">
                  {new Date(log.createdAt).toLocaleString("ko-KR")}
                </span>
                <span className="text-slate-600 text-xs">{expandedId === log._id ? "▲" : "▼"}</span>
              </div>
              {expandedId === log._id && (
                <div className="px-4 pb-4 border-t border-[#2a2a3e] mt-0 pt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">변경 전</p>
                    <pre className="text-xs text-slate-300 bg-[#0d0d1a] rounded-lg p-3 overflow-auto max-h-32">
                      {log.before ? JSON.stringify(log.before, null, 2) : "없음"}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">변경 후</p>
                    <pre className="text-xs text-slate-300 bg-[#0d0d1a] rounded-lg p-3 overflow-auto max-h-32">
                      {log.after ? JSON.stringify(log.after, null, 2) : "없음"}
                    </pre>
                  </div>
                  {log.ip && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500">IP: <span className="text-slate-400">{log.ip}</span></p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
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
