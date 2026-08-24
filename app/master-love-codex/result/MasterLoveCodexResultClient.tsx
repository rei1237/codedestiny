"use client";

/**
 * 보관된 인연의 서 — 읽기 전용 몰입 코덱스.
 *
 * 이 라우트는 사이트맵에 없어 서버 렌더 텍스트 하한(1,800자) 대상이 아니다.
 * 그래서 코덱스 아래에 서비스 설명·주의사항을 두지 않는다 — 봉인 문장에서 끝난다.
 * 회당 결제지만 결과는 서버에 영구 저장되므로 이 화면은 재결제 없이 열린다.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/app/_lib/auth-client";
import { isRetriableResultPollFailure } from "@/app/_lib/consultationResultPolling";
import CodexAmbience from "@/src/features/master-love-codex/components/CodexAmbience";
import CodexReader, { type CodexChapter, type CodexLoveDna } from "@/src/features/master-love-codex/components/CodexReader";
import CodexShell from "@/src/features/master-love-codex/components/CodexShell";
import { masterLoveCodexBgmTracks } from "@/src/features/master-love-codex/data/assets";
import { getMasterLoveCodexCopy, useMasterLoveCodexLocale, type MasterLoveCodexCopy } from "@/src/features/master-love-codex/_lib/copy";
import styles from "@/src/features/master-love-codex/styles/codex.module.css";

type SessionState = {
  sessionId: string;
  status: string;
  /** 서버가 준 모드 — 궁합판이면 막 제목·표지가 관계 축으로 바뀐다 */
  mode?: "solo" | "compat";
  /** paid / pass / monthly_credit / admin — 리포트 표식의 금액 표기를 가른다 */
  accessType?: string;
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

function buildBirthLine(birthInfo: SessionState["birthInfo"], copy: MasterLoveCodexCopy) {
  if (!birthInfo) return "";
  const parts: string[] = [birthInfo.calendarType === "lunar" ? copy.calendarLunar : copy.calendarSolar];
  if (birthInfo.birthDate) parts.push(birthInfo.birthDate);
  parts.push(birthInfo.birthTimeUnknown ? copy.birthTimeUnknownShort : birthInfo.birthTime || "");
  if (birthInfo.gender) parts.push(birthInfo.gender === "male" ? copy.genderMale : copy.genderFemale);
  return parts.filter(Boolean).join(" · ");
}

export default function MasterLoveCodexResultClient() {
  // 🔴 useMasterLoveCodexCopy() 를 그대로 쓰면 안 된다 — getMasterLoveCodexCopy 가 EN 과 스프레드
  //    병합을 하므로 **렌더마다 새 객체**를 돌려준다. 그 값을 아래 load 의 의존성에 넣는 순간
  //    useCallback 이 매 렌더 새로 만들어지고, 그것을 보는 useEffect 가 다시 돌아 무한 fetch 가 된다.
  //    로케일로 메모해 신원을 고정한다(이 레포의 언어 전환은 경로 이동이라 실제로는 안 바뀐다).
  const locale = useMasterLoveCodexLocale();
  const copy = useMemo(() => getMasterLoveCodexCopy(locale), [locale]);
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (typeof window === "undefined") return;
    const sessionId = new URLSearchParams(window.location.search).get("sessionId") || "";
    if (!sessionId) {
      setError(copy.resultMissingSessionIdError);
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
          setError(copy.resultUnstableRefreshError);
        } else if (response.status === 401) {
          setError(copy.errorText.LOGIN_REQUIRED);
        } else if (response.status === 404) {
          setError(copy.resultNotFoundError);
        } else {
          setError(payload?.message || copy.resultLoadFailedError);
        }
        setLoading(false);
        return;
      }
      setSession({
        sessionId: String(payload.sessionId || sessionId),
        status: String(payload.status || ""),
        // 🔴 mode 를 복사하지 않으면 아래 CodexReader 로 항상 undefined 가 내려가,
        //    궁합판 리포트가 개인판 막 제목·표지로 열린다(서버는 정상적으로 내려준다).
        mode: payload.mode === "compat" ? "compat" : "solo",
        accessType: String(payload.accessType || ""),
        chapters: Array.isArray(payload.chapters) ? payload.chapters : [],
        loveDna: payload.loveDna || null,
        totalCharCount: Number(payload.totalCharCount || 0),
        birthInfo: payload.birthInfo || null,
      });
    } catch {
      setError(copy.errorText.NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  }, [copy]);

  useEffect(() => { void load(); }, [load]);

  // 봉인을 여는 동안부터 본문까지 같은 트랙이 이어지도록, 프래그먼트의 첫 자식으로 둔다.
  // (열지 못한 경우에는 붙이지 않는다 — 오류 화면에는 음악을 얹지 않는다.)
  const ambience = <CodexAmbience track={masterLoveCodexBgmTracks.reading} />;

  if (loading) {
    return (
      <>
        {ambience}
        <CodexShell ariaLabel={copy.resultLoadingAriaLabel}>
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
      </>
    );
  }

  if (error || !session) {
    return (
      <CodexShell ariaLabel={copy.resultErrorAriaLabel}>
        <div className="flex min-h-[100svh] flex-col items-center justify-center text-center">
          <div className={styles.measure}>
            <p role="alert" className="text-[0.9375rem] leading-8">{error || copy.resultNotFoundFallback}</p>
            <div className="mt-10">
              <Link href="/master-love-codex" className={styles.cta}>{copy.resultBackToLanding}</Link>
            </div>
          </div>
        </div>
      </CodexShell>
    );
  }

  return (
    <>
      {ambience}
      {session.status !== "completed" ? (
        <div className="bg-[#0a0818] pt-6">
          <p className={`${styles.measure} text-center text-[0.8125rem] leading-7`} style={{ color: "#b9ad99" }}>
            {copy.resultIncompleteNotice}{" "}
            <Link href="/master-love-codex" className="underline underline-offset-4" style={{ color: "#e8d5a3" }}>
              {copy.resultContinueWriting}
            </Link>
          </p>
        </div>
      ) : null}
      <CodexReader
        chapters={session.chapters}
        loveDna={session.loveDna}
        name={session.birthInfo?.name || ""}
        birthLine={buildBirthLine(session.birthInfo, copy)}
        totalCharCount={session.totalCharCount}
        sessionId={session.sessionId}
        mode={session.mode === "compat" ? "compat" : "solo"}
        accessType={session.accessType || ""}
      />
    </>
  );
}
