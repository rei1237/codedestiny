"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../components/ToastProvider";

type Content = {
  _id: string;
  category: string;
  subcategory: string;
  title: string;
  content: string;
  tags: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const CATEGORIES = [
  { value: "saju",      label: "사주" },
  { value: "tarot",     label: "타로" },
  { value: "horoscope", label: "별자리" },
  { value: "dream",     label: "꿈해몽" },
  { value: "daily",     label: "오늘의운세" },
  { value: "geomancy",  label: "풍수지리" },
  { value: "love",      label: "연애운" },
  { value: "career",    label: "직업운" },
];

const EMPTY_FORM: Omit<Content, "_id" | "createdAt" | "updatedAt"> = {
  category: "saju",
  subcategory: "",
  title: "",
  content: "",
  tags: [],
  sortOrder: 0,
  isActive: true,
};

function getToken() {
  if (typeof window === "undefined") return "";
  try { return sessionStorage.getItem("flower_admin_token") || ""; } catch { return ""; }
}

export default function ContentPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Content[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // 편집 모달
  const [editModal, setEditModal] = useState<{
    open: boolean;
    item: Partial<Content> | null;
    isNew: boolean;
  }>({ open: false, item: null, isNew: false });
  const [formData, setFormData] = useState({ ...EMPTY_FORM, tags: [] as string[], tagsStr: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // 삭제 확인
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item: Content | null }>({
    open: false, item: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        ...(search && { search }),
        ...(filterCat && { category: filterCat }),
      });
      const res = await fetch(`/api/admin/content?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("API 오류");
      const data = await res.json();
      setItems(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch {
      showToast("콘텐츠 목록을 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCat, showToast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openNew() {
    setFormData({ ...EMPTY_FORM, tags: [], tagsStr: "" });
    setFormError("");
    setEditModal({ open: true, item: null, isNew: true });
  }

  function openEdit(item: Content) {
    setFormData({
      category: item.category,
      subcategory: item.subcategory,
      title: item.title,
      content: item.content,
      tags: item.tags,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
      tagsStr: item.tags.join(", "),
    });
    setFormError("");
    setEditModal({ open: true, item, isNew: false });
  }

  async function handleSave() {
    // 검증
    if (!formData.title.trim()) { setFormError("제목을 입력하세요."); return; }
    if (!formData.content.trim()) { setFormError("내용을 입력하세요."); return; }
    if (!formData.category) { setFormError("카테고리를 선택하세요."); return; }

    setFormLoading(true);
    setFormError("");
    try {
      const token = getToken();
      const payload = {
        category: formData.category,
        subcategory: formData.subcategory.trim(),
        title: formData.title.trim(),
        content: formData.content.trim(),
        tags: formData.tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
        sortOrder: Number(formData.sortOrder) || 0,
        isActive: formData.isActive,
      };

      const isNew = editModal.isNew;
      const url = isNew ? "/api/admin/content" : `/api/admin/content/${(editModal.item as Content)._id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "저장 실패");

      showToast(isNew ? "콘텐츠가 생성되었습니다." : "콘텐츠가 수정되었습니다.", "success");
      setEditModal({ open: false, item: null, isNew: false });
      fetchItems();
    } catch (err: unknown) {
      setFormError((err as Error).message);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteModal.item) return;
    setDeleteLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/admin/content/${deleteModal.item._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "삭제 실패");
      showToast("콘텐츠가 삭제되었습니다.", "success");
      setDeleteModal({ open: false, item: null });
      fetchItems();
    } catch (err: unknown) {
      showToast((err as Error).message, "error");
    } finally {
      setDeleteLoading(false);
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">콘텐츠 관리</h1>
          <p className="text-sm text-slate-400 mt-1">전체 {totalCount.toLocaleString()}건</p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors"
        >
          + 콘텐츠 추가
        </button>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="제목 또는 내용 검색..."
          className="bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 w-64"
        />
        <select
          value={filterCat}
          onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}
          className="bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">모든 카테고리</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* 테이블 */}
      <div className="bg-[#13131f] border border-[#2a2a3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a3e]">
              {["카테고리", "제목", "서브카테고리", "공개", "정렬순서", "수정일", "작업"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e2e]">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">불러오는 중...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">콘텐츠가 없습니다.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item._id} className="hover:bg-[#1a1a2e] transition-colors">
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-violet-500/20 text-violet-400 border border-violet-500/30">
                      {CATEGORIES.find((c) => c.value === item.category)?.label || item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white max-w-xs truncate">{item.title}</td>
                  <td className="px-4 py-3 text-slate-400">{item.subcategory || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs border ${
                      item.isActive
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-slate-500/20 text-slate-500 border-slate-600/30"
                    }`}>
                      {item.isActive ? "공개" : "비공개"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{item.sortOrder}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded border border-blue-600/30 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, item })}
                        className="px-2 py-1 text-xs bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded border border-red-600/30 transition-colors"
                      >
                        삭제
                      </button>
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
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#1e1e2e] text-slate-300 disabled:opacity-40 hover:bg-[#2a2a3e] transition-colors">이전</button>
          <span className="text-sm text-slate-400">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#1e1e2e] text-slate-300 disabled:opacity-40 hover:bg-[#2a2a3e] transition-colors">다음</button>
        </div>
      )}

      {/* 편집/생성 모달 */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditModal({ open: false, item: null, isNew: false })} />
          <div className="relative bg-[#1e1e2e] border border-[#313145] rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-white mb-5">
              {editModal.isNew ? "콘텐츠 추가" : "콘텐츠 수정"}
            </h3>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">카테고리 *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
                    className="w-full bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">서브카테고리</label>
                  <input
                    value={formData.subcategory}
                    onChange={(e) => setFormData((f) => ({ ...f, subcategory: e.target.value }))}
                    placeholder="선택사항"
                    className="w-full bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">제목 *</label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                  placeholder="콘텐츠 제목"
                  className="w-full bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">내용 *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData((f) => ({ ...f, content: e.target.value }))}
                  placeholder="콘텐츠 내용을 입력하세요..."
                  rows={6}
                  className="w-full bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">태그 (쉼표 구분)</label>
                  <input
                    value={formData.tagsStr}
                    onChange={(e) => setFormData((f) => ({ ...f, tagsStr: e.target.value }))}
                    placeholder="태그1, 태그2"
                    className="w-full bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">정렬순서</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                    className="w-full bg-[#13131f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((f) => ({ ...f, isActive: e.target.checked }))}
                  className="accent-violet-600"
                />
                <label htmlFor="isActive" className="text-sm text-slate-300">공개</label>
              </div>
              {formError && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-xs text-red-300">{formError}</div>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={() => setEditModal({ open: false, item: null, isNew: false })}
                className="px-4 py-2 rounded-lg text-sm text-slate-300 bg-[#2a2a3e] hover:bg-[#333355] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={formLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
              >
                {formLoading ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        open={deleteModal.open}
        title="콘텐츠 삭제"
        message={`정말로 '${deleteModal.item?.title}' 콘텐츠를 삭제하시겠습니까?`}
        confirmLabel={deleteLoading ? "삭제 중..." : "삭제"}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, item: null })}
      />
    </div>
  );
}
