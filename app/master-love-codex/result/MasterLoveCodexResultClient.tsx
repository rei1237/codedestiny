"use client";

/**
 * 마스터 인연의 서 — 보관된 인연의 서 재열람.
 * 회당 결제지만 결과는 서버에 영구 저장되므로 이 화면은 재결제 없이 열린다.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { isRetriableResultPollFailure } from "@/app/_lib/consultationResultPolling";
import CodexBookReader, { type CodexChapter, type CodexLoveDna } from "@/src/features/master-love-codex/components/CodexBookReader";

type SessionState = {
  sessionId: string;
  status: string;
  chapters: CodexChapter[];
  loveDna: CodexLoveDna | null;
  totalCharCount: number;
  birthInfo: {
    name?: string;
    gender?: string;
    birthDate?: string;
    birthTime?: string;
    birthTimeUnknown?: boolean;
    calendarType?: string;
  } | null;
};

function buildBirthLine(birthInfo: SessionState["birthInfo"]) {
  if (!birthInfo) return "";
  const parts: string[] = [birthInfo.calendarType === "lunar" ? "음력" : "양력"];
  if (birthInfo.birthDate) parts.push(birthInfo.birthDate);
  parts.push(birthInfo.birthTimeUnknown ? "태어난 시각 모름" : birthInfo.birthTime || "");
  if (birthInfo.gender) parts.push(birthInfo.gender === "male" ? "남성" : "여성");
  return parts.filter(Boolean).join(" · ");
}

export default function MasterLoveCodexResultClient() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (typeof window === "undefined") return;
    const sessionId = new URLSearchParams(window.location.search).get("sessionId") || "";
    if (!sessionId) {
      setError("보관 번호가 없습니다. 서재에서 인연의 서를 다시 선택해 주세요.");
      setLoading(false);
      return;
    }
    try {
      const response = await authFetch(`/api/master-love-codex/session?sessionId=${encodeURIComponent(sessionId)}`, {
        method: "GET",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        if (isRetriableResultPollFailure(response.status, payload)) {
          setError("연결이 잠시 불안정합니다. 잠시 후 새로고침해 주세요.");
        } else if (response.status === 401) {
          setError("인연의 서를 열려면 로그인이 필요합니다.");
        } else if (response.status === 404) {
          setError("요청하신 인연의 서를 찾을 수 없습니다.");
        } else {
          setError(payload?.message || "인연의 서를 불러오지 못했습니다.");
        }
        setLoading(false);
        return;
      }
      setSession({
        sessionId: String(payload.sessionId || sessionId),
        status: String(payload.status || ""),
        chapters: Array.isArray(payload.chapters) ? payload.chapters : [],
        loveDna: payload.loveDna || null,
        totalCharCount: Number(payload.totalCharCount || 0),
        birthInfo: payload.birthInfo || null,
      });
    } catch {
      setError("연결이 불안정합니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-[#0d0714] text-rose-50">
        <p className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-amber-200" aria-hidden="true" />
          보관된 인연의 서를 여는 중입니다...
        </p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center gap-4 bg-[#0d0714] px-6 text-center text-rose-50">
        <p role="alert" className="max-w-sm text-sm leading-7 text-rose-100/85">{error || "인연의 서를 찾을 수 없습니다."}</p>
        <Link
          href="/master-love-codex"
          className="rounded-full bg-gradient-to-r from-amber-200 via-rose-200 to-amber-100 px-5 py-2.5 text-sm font-black text-[#2b1020]"
        >
          인연의 서 화면으로
        </Link>
      </div>
    );
  }

  return (
    <>
      {session.status !== "completed" ? (
        <div className="bg-[#0d0714] px-5 pt-6">
          <p className="mx-auto max-w-3xl rounded-xl border border-amber-200/30 bg-amber-200/10 px-4 py-3 text-center text-xs font-semibold text-amber-100/85">
            아직 다 쓰이지 않은 인연의 서입니다. 본편 화면에서 이어 쓰면 남은 장이 채워집니다.
          </p>
        </div>
      ) : null}
      <CodexBookReader
        chapters={session.chapters}
        loveDna={session.loveDna}
        name={session.birthInfo?.name || ""}
        birthLine={buildBirthLine(session.birthInfo)}
        totalCharCount={session.totalCharCount}
        sessionId={session.sessionId}
      />
    </>
  );
}
