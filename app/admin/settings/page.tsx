"use client";

import { useEffect, useState } from "react";
import { useToast } from "../components/ToastProvider";
import { ConfirmModal } from "../components/ConfirmModal";

type Settings = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  newUserCoins: number;
  popupEnabled: boolean;
  popupTitle: string;
  popupContent: string;
  cacheTtlSeconds: number;
};

function getToken() {
  if (typeof window === "undefined") return "";
  try { return sessionStorage.getItem("flower_admin_token") || ""; } catch { return ""; }
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSettings, setPendingSettings] = useState<Settings | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch("/api/admin/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("설정을 불러오지 못했습니다.");
        const data = await res.json();
        setSettings(data.settings);
      } catch (err: unknown) {
        showToast((err as Error).message, "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  function handleChange<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => s ? ({ ...s, [key]: value }) : s);
  }

  function handleSaveClick() {
    if (!settings) return;
    setPendingSettings(settings);
    setConfirmOpen(true);
  }

  async function handleConfirmSave() {
    if (!pendingSettings) return;
    setConfirmOpen(false);
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(pendingSettings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "저장 실패");
      showToast("설정이 저장되었습니다.", "success");
    } catch (err: unknown) {
      showToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-slate-500">설정을 불러오는 중...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-slate-500">설정을 불러오지 못했습니다.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">시스템 설정</h1>
          <p className="text-sm text-slate-400 mt-1">서비스 전반 설정을 관리합니다.</p>
        </div>
        <button
          onClick={handleSaveClick}
          disabled={saving}
          className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "저장 중..." : "변경사항 저장"}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {/* 점검 모드 */}
        <div className="bg-[#13131f] border border-[#2a2a3e] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">서비스 상태</h2>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-slate-300">점검 모드</p>
              <p className="text-xs text-slate-500 mt-0.5">활성화 시 일반 유저 접근이 차단됩니다.</p>
            </div>
            <button
              onClick={() => handleChange("maintenanceMode", !settings.maintenanceMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.maintenanceMode ? "bg-violet-600" : "bg-slate-600"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.maintenanceMode ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
          {settings.maintenanceMode && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">점검 메시지</label>
              <input
                value={settings.maintenanceMessage}
                onChange={(e) => handleChange("maintenanceMessage", e.target.value)}
                placeholder="현재 서비스 점검 중입니다."
                className="w-full bg-[#1e1e2e] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          )}
        </div>

        {/* 신규 유저 코인 */}
        <div className="bg-[#13131f] border border-[#2a2a3e] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">코인 설정</h2>
          <div>
            <label className="block text-xs text-slate-400 mb-1">신규 가입 지급 코인</label>
            <input
              type="number"
              min={0}
              value={settings.newUserCoins}
              onChange={(e) => handleChange("newUserCoins", Number(e.target.value))}
              className="w-40 bg-[#1e1e2e] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* 팝업 */}
        <div className="bg-[#13131f] border border-[#2a2a3e] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">팝업 공지</h2>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-300">팝업 활성화</p>
            <button
              onClick={() => handleChange("popupEnabled", !settings.popupEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.popupEnabled ? "bg-violet-600" : "bg-slate-600"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.popupEnabled ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
          {settings.popupEnabled && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">팝업 제목</label>
                <input
                  value={settings.popupTitle}
                  onChange={(e) => handleChange("popupTitle", e.target.value)}
                  placeholder="공지 제목"
                  className="w-full bg-[#1e1e2e] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">팝업 내용</label>
                <textarea
                  value={settings.popupContent}
                  onChange={(e) => handleChange("popupContent", e.target.value)}
                  rows={3}
                  placeholder="공지 내용을 입력하세요..."
                  className="w-full bg-[#1e1e2e] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* 캐시 */}
        <div className="bg-[#13131f] border border-[#2a2a3e] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">캐시 설정</h2>
          <div>
            <label className="block text-xs text-slate-400 mb-1">캐시 TTL (초)</label>
            <input
              type="number"
              min={0}
              value={settings.cacheTtlSeconds}
              onChange={(e) => handleChange("cacheTtlSeconds", Number(e.target.value))}
              className="w-40 bg-[#1e1e2e] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="설정 저장"
        message="변경된 설정을 저장하시겠습니까?"
        confirmLabel="저장"
        onConfirm={handleConfirmSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
