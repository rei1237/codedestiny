"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Clock3, Heart, Moon, Sparkles, X } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import type { FortuneTeaHouseConsultMode, FortuneTeaHouseConsultResponse } from "../data/consult";

type TeaHouseHistoryItem = {
  resultId: string;
  consultationMode: FortuneTeaHouseConsultMode;
  questionSummary: string;
  createdAt?: string;
};

type TeaHouseHistoryPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (result: FortuneTeaHouseConsultResponse) => void;
};

const CONSULTATION_MODE_META: Record<FortuneTeaHouseConsultMode, { label: string; icon: typeof Sparkles }> = {
  tarot: { label: "타로", icon: Sparkles },
  saju: { label: "사주", icon: Moon },
  sukuyo: { label: "숙요점 궁합", icon: Heart },
};

function formatRelativeDate(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

export default function TeaHouseHistoryPanel({ isOpen, onClose, onSelectResult }: TeaHouseHistoryPanelProps) {
  const [items, setItems] = useState<TeaHouseHistoryItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [openingResultId, setOpeningResultId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const loadHistory = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await authFetch("/api/fortune-tea-house/results", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; items?: TeaHouseHistoryItem[] } | null;
      if (!response.ok || !payload?.ok) {
        setStatus("error");
        return;
      }
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void loadHistory();
    closeButtonRef.current?.focus();
  }, [isOpen, loadHistory]);

  if (!isOpen) return null;

  async function openResult(resultId: string) {
    if (openingResultId) return;
    setOpeningResultId(resultId);
    try {
      const response = await authFetch(`/api/fortune-tea-house/results/${encodeURIComponent(resultId)}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; result?: FortuneTeaHouseConsultResponse } | null;
      if (!response.ok || !payload?.ok || !payload.result) {
        setOpeningResultId(null);
        return;
      }
      onSelectResult(payload.result);
    } catch {
      setOpeningResultId(null);
    }
  }

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] min-h-screen overflow-y-auto bg-gradient-to-b from-deep-indigo to-midnight-ink text-pearl-mist animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fortuneTeaHistoryTitle"
      onMouseDown={handleBackdropMouseDown}
    >
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_0%,rgba(216,179,108,.14),transparent_46%),radial-gradient(ellipse_at_82%_100%,rgba(156,135,212,.12),transparent_50%)]" />
      </div>

      <button
        ref={closeButtonRef}
        type="button"
        className="fixed right-4 top-4 z-[75] grid h-11 w-11 place-items-center rounded-full border border-champagne-gold/25 bg-white/[0.07] text-champagne-gold shadow-[0_16px_40px_rgba(0,0,0,.35)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-champagne-gold/50 hover:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-champagne-gold/50 sm:right-6 sm:top-6"
        onClick={onClose}
        aria-label="상담 기록 닫기"
      >
        <X size={18} aria-hidden />
      </button>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-16 sm:px-6">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-champagne-gold/80">Tea House</p>
          <h2 id="fortuneTeaHistoryTitle" className="mt-2 text-2xl font-medium text-pearl-mist sm:text-3xl">
            지난 상담 기록
          </h2>
          <p className="mt-2 text-sm text-pearl-mist/70">연이와 나눈 이야기를 다시 펼쳐볼 수 있어요.</p>
        </header>

        {status === "loading" || status === "idle" ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
            ))}
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
            <p className="text-sm text-pearl-mist/80">상담 기록을 불러오지 못했어요.</p>
            <button
              type="button"
              className="mt-3 rounded-full border border-champagne-gold/40 px-4 py-2 text-sm font-semibold text-champagne-gold transition hover:bg-champagne-gold/10"
              onClick={() => void loadHistory()}
            >
              다시 시도
            </button>
          </div>
        ) : null}

        {status === "ready" && items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <Clock3 className="mx-auto mb-3 text-champagne-gold/70" size={28} aria-hidden />
            <p className="text-sm text-pearl-mist/80">아직 완료된 상담이 없어요. 찻집에서 첫 상담을 시작해 보세요.</p>
          </div>
        ) : null}

        {status === "ready" && items.length > 0 ? (
          <ul className="grid gap-3">
            {items.map((item) => {
              const meta = CONSULTATION_MODE_META[item.consultationMode] || CONSULTATION_MODE_META.tarot;
              const Icon = meta.icon;
              const isOpening = openingResultId === item.resultId;
              return (
                <li key={item.resultId}>
                  <button
                    type="button"
                    className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left transition hover:-translate-y-0.5 hover:border-champagne-gold/35 hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-champagne-gold/40 disabled:opacity-60"
                    onClick={() => void openResult(item.resultId)}
                    disabled={isOpening}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-champagne-gold/25 bg-champagne-gold/10 text-champagne-gold">
                      <Icon size={18} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-xs font-semibold text-champagne-gold/80">
                        <span>{meta.label}</span>
                        <span aria-hidden>·</span>
                        <span>{formatRelativeDate(item.createdAt)}</span>
                      </span>
                      <span className="mt-1 block truncate text-sm text-pearl-mist/90">
                        {item.questionSummary || "질문 요약이 없어요"}
                      </span>
                    </span>
                    {isOpening ? <span className="shrink-0 text-xs text-pearl-mist/60">여는 중…</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
