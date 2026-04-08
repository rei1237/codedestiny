"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../components/ToastProvider";

type User = {
  _id: string;
  name: string;
  email: string;
  joinedAt: string;
  role: "user" | "admin";
  status: "active" | "banned" | "suspended";
  points: number;
  lastLoginAt?: string;
  banReason?: string;
};

function getToken() {
  if (typeof window === "undefined") return "";
  try { return sessionStorage.getItem("flower_admin_token") || ""; } catch { return ""; }
}

function fmtDate(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  banned:    "bg-red-500/20 text-red-400 border-red-500/30",
  suspended: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};
const STATUS_LABEL: Record<string, string> = {
  active: "활성", banned: "차단됨", suspended: "정지됨",
};
const ROLE_BADGE: Record<string, string> = {
  admin: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  user:  "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // 상태 변경 모달
  const [statusModal, setStatusModal] = useState<{
    open: boolean; user: User | null; targetStatus: string; banReason: string;
  }>({ open: false, user: null, targetStatus: "", banReason: "" });

  // 삭제 확인 모달
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: User | null }>({
    open: false, user: null,
  });

  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        ...(search && { search }),
        ...(filterStatus && { status: filterStatus }),
        ...(filterRole && { role: filterRole }),
      });
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("API 오류");
      const data = await res.json();
      setUsers(data.users || []);
      setTotalCount(data.totalCount || 0);
    } catch {
      showToast("유저 목록을 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterRole, showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // 검색 시 페이지 초기화
  function handleSearch(v: string) { setSearch(v); setPage(1); }

  async function handleStatusChange() {
    if (!statusModal.user) return;
    setActionLoading(true);
    try {
      const token = getToken();
      const body: Record<string, string> = { status: statusModal.targetStatus };
      if (statusModal.targetStatus === "banned") body.banReason = statusModal.banReason;
      const res = await fetch(`/api/admin/users/${statusModal.user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "오류");
      showToast(`${STATUS_LABEL[statusModal.targetStatus]} 처리되었습니다.`, "success");
      setStatusModal({ open: false, user: null, targetStatus: "", banReason: "" });
      fetchUsers();
    } catch (err: unknown) {
      showToast((err as Error).message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteModal.user) return;
    setActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/admin/users/${deleteModal.user._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "오류");
      showToast("회원이 삭제되었습니다.", "success");
      setDeleteModal({ open: false, user: null });
      fetchUsers();
    } catch (err: unknown) {
      showToast((err as Error).message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">유저 관리</h1>
        <p className="text-sm text-slate-400 mt-1">전체 {totalCount.toLocaleString()}명</p>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="이름 또는 이메일 검색..."
          className="bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 w-64"
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">모든 상태</option>
          <option value="active">활성</option>
          <option value="banned">차단됨</option>
          <option value="suspended">정지됨</option>
        </select>
        <select
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
          className="bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">모든 권한</option>
          <option value="admin">관리자만</option>
          <option value="user">일반 유저</option>
        </select>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* 테이블 */}
      <div className="bg-[#13131f] border border-[#2a2a3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a3e]">
              {["이름", "이메일", "가입일", "마지막 로그인", "권한", "상태", "포인트", "작업"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e2e]">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">불러오는 중...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">검색 결과가 없습니다.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="hover:bg-[#1a1a2e] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-slate-300">{u.email}</td>
                  <td className="px-4 py-3 text-slate-400">{fmtDate(u.joinedAt)}</td>
                  <td className="px-4 py-3 text-slate-400">{fmtDate(u.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${ROLE_BADGE[u.role] || ROLE_BADGE.user}`}>
                      {u.role === "admin" ? "관리자" : "유저"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${STATUS_BADGE[u.status] || STATUS_BADGE.active}`}>
                      {STATUS_LABEL[u.status] || u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{u.points.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {u.status !== "banned" && u.role !== "admin" && (
                        <button
                          onClick={() => setStatusModal({ open: true, user: u, targetStatus: "banned", banReason: "" })}
                          className="px-2 py-1 text-xs bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors border border-red-600/30"
                        >
                          차단
                        </button>
                      )}
                      {u.status === "banned" && (
                        <button
                          onClick={() => setStatusModal({ open: true, user: u, targetStatus: "active", banReason: "" })}
                          className="px-2 py-1 text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 rounded transition-colors border border-emerald-600/30"
                        >
                          해제
                        </button>
                      )}
                      {u.role !== "admin" && (
                        <button
                          onClick={() => setDeleteModal({ open: true, user: u })}
                          className="px-2 py-1 text-xs bg-slate-600/20 text-slate-400 hover:bg-slate-600/40 rounded transition-colors border border-slate-600/30"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#1e1e2e] text-slate-300 disabled:opacity-40 hover:bg-[#2a2a3e] transition-colors"
          >
            이전
          </button>
          <span className="text-sm text-slate-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#1e1e2e] text-slate-300 disabled:opacity-40 hover:bg-[#2a2a3e] transition-colors"
          >
            다음
          </button>
        </div>
      )}

      {/* 상태 변경 모달 */}
      {statusModal.open && statusModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setStatusModal({ open: false, user: null, targetStatus: "", banReason: "" })} />
          <div className="relative bg-[#1e1e2e] border border-[#313145] rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-white mb-1">
              {statusModal.targetStatus === "banned" ? "유저 차단" : "차단 해제"}
            </h3>
            <p className="text-xs text-slate-400 mb-4">{statusModal.user.name} ({statusModal.user.email})</p>
            {statusModal.targetStatus === "banned" && (
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1">차단 사유</label>
                <textarea
                  value={statusModal.banReason}
                  onChange={(e) => setStatusModal((s) => ({ ...s, banReason: e.target.value }))}
                  placeholder="차단 사유를 입력하세요..."
                  rows={3}
                  className="w-full bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setStatusModal({ open: false, user: null, targetStatus: "", banReason: "" })}
                className="px-4 py-2 rounded-lg text-sm text-slate-300 bg-[#2a2a3e] hover:bg-[#333355] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleStatusChange}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  statusModal.targetStatus === "banned"
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {actionLoading ? "처리 중..." : "확인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        open={deleteModal.open}
        title="회원 삭제"
        message={`정말로 '${deleteModal.user?.name}' 회원을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`}
        confirmLabel={actionLoading ? "삭제 중..." : "삭제"}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, user: null })}
      />
    </div>
  );
}
