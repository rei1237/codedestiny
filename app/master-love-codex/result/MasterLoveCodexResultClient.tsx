"use client";

/**
 * 보관된 인연의 서 — 읽기 전용 몰입 코덱스.
 *
 * 이 라우트는 사이트맵에 없어 서버 렌더 텍스트 하한(1,800자) 대상이 아니다.
 * 그래서 코덱스 아래에 서비스 설명·주의사항을 두지 않는다 — 봉인 문장에서 끝난다.
 * 회당 결제지만 결과는 서버에 영구 저장되므로 이 화면은 재결제 없이 열린다.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/app/_lib/auth-client";
import { isRetriableResultPollFailure } from "@/app/_lib/consultationResultPolling";
import CodexReader, { type CodexChapter, type CodexLoveDna } from "@/src/features/master-love-codex/components/CodexReader";
import CodexShell from "@/src/features/master-love-codex/components/CodexShell";
import styles from "@/src/features/master-love-codex/styles/codex.module.css";

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
      <CodexShell ariaLabel="보관된 인연의 서를 여는 중">
        <div className="flex min-h-[100svh] items-center justify-center text-center">
          <p
            className={`${styles.numeral} text-[0.9375rem]`}
            style={{ letterSpacing: "0.24em", color: "var(--codex-gold)" }}
            aria-live="polite"
          >
            Unsealing
          </p>
        </div>
      </CodexShell>
    );
  }

  if (error || !session) {
    return (
      <CodexShell ariaLabel="인연의 서를 열 수 없음">
        <div className="flex min-h-[100svh] flex-col items-center justify-center text-center">
          <div className={styles.measure}>
            <p role="alert" className="text-[0.9375rem] leading-8">{error || "인연의 서를 찾을 수 없습니다."}</p>
            <div className="mt-10">
              <Link href="/master-love-codex" className={styles.cta}>인연의 서 화면으로</Link>
            </div>
          </div>
        </div>
      </CodexShell>
    );
  }

  return (
    <>
      {session.status !== "completed" ? (
        <div className="bg-[#0a0818] pt-6">
          <p className={`${styles.measure} text-center text-[0.8125rem] leading-7`} style={{ color: "#b9ad99" }}>
            아직 다 쓰이지 않은 인연의 서입니다.{" "}
            <Link href="/master-love-codex" className="underline underline-offset-4" style={{ color: "#e8d5a3" }}>
              이어 쓰기
            </Link>
          </p>
        </div>
      ) : null}
      <CodexReader
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
