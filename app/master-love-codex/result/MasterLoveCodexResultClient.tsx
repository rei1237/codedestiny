"use client";

/**
 * 보관된 인연의 서 — 읽기 전용 몰입 코덱스.
 *
 * 이 라우트는 사이트맵에 없어 서버 렌더 텍스트 하한(1,800자) 대상이 아니다.
 * 그래서 코덱스 아래에 서비스 설명·주의사항을 두지 않는다 — 봉인 문장에서 끝난다.
 * 회당 결제지만 결과는 서버에 영구 저장되므로 이 화면은 재결제 없이 열린다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePaidDeliveryScope } from "@/app/hooks/usePaidDeliveryScope";
import { authFetch } from "@/app/_lib/auth-client";
import { isRetriableResultPollFailure } from "@/app/_lib/consultationResultPolling";
// 🔴 이어쓰기 루프의 정본. 진입 화면(MasterLoveCodexPage)과 **같은 함수**를 쓴다 — 여기에
//    사본을 만들면 두 화면의 재시도·정체 예산이 갈라진다.
import { runCodexBatches } from "@/src/features/master-love-codex/_lib/runCodexBatches";
import { MASTER_LOVE_CODEX_TOTAL_CHAPTERS } from "@/src/features/master-love-codex/constants";
import CodexAmbience from "@/src/features/master-love-codex/components/CodexAmbience";
import CodexReader, { type CodexChapter, type CodexLoveDna } from "@/src/features/master-love-codex/components/CodexReader";
import CodexShell from "@/src/features/master-love-codex/components/CodexShell";
import { masterLoveCodexBgmTracks } from "@/src/features/master-love-codex/data/assets";
import { getMasterLoveCodexCopy, useMasterLoveCodexLocale, type MasterLoveCodexCopy } from "@/src/features/master-love-codex/_lib/copy";
import styles from "@/src/features/master-love-codex/styles/codex.module.css";
import { masterLoveCodexBilling } from "@/src/features/master-love-codex/constants";

type SessionState = {
  sessionId: string;
  status: string;
  /**
   * /session 이 함께 내려주는 생성 토큰(worker/routes/master-love-codex.js sessionWithAccessToken).
   * 🔴 이걸 담아야 이 화면이 재결제 없이 /generate 를 직접 밀 수 있다 — 없으면 이어쓰기 주체가
   *    될 수 없고 예전처럼 "이어 쓰기" 링크로 진입 화면에 되돌려보내는 수밖에 없다.
   */
  accessToken?: string;
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
  // 이어쓰기 상태. `error` 와 섞지 않는다 — 여긴 이미 열린 책이고, 실패해도 지금까지의 장은 읽힌다.
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState("");
  /** 이어쓰기를 이미 건 세션. StrictMode 이중 마운트에서 루프 두 개가 락을 서로 뺏는 것을 막는다. */
  const resumeStartedForRef = useRef("");
  /** 화면을 떠나면 루프를 멈춘다 — 언마운트 뒤 setState 와 유령 /generate 왕복을 남기지 않는다. */
  const stoppedRef = useRef(false);
  const [accountEpoch, setAccountEpoch] = useState(0);
  const captureOwner = usePaidDeliveryScope(() => {
    stoppedRef.current = true; resumeStartedForRef.current = "";
    setSession(null); setError(""); setResumeError(""); setResuming(false); setLoading(true);
    setAccountEpoch(value => value + 1);
  });

  const load = useCallback(async () => {
    if (typeof window === "undefined") return;
    const isCurrent = captureOwner();
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
      if (!isCurrent()) return;
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
        accessToken: String(payload.accessToken || ""),
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
      if (isCurrent()) setError(copy.errorText.NETWORK_ERROR);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [captureOwner, copy]);

  useEffect(() => { void load(); }, [load, accountEpoch]);
  useEffect(() => () => { stoppedRef.current = true; }, []);

  /**
   * 미완성 세션을 **이 화면에서** 끝까지 쓴다.
   *
   * 원래 배치 루프는 진입 화면에만 있어서, 완주하려면 그 탭이 5~10분 살아 있어야 했다. PG
   * 리다이렉트로 돌아온 모바일 문서가 정확히 그 조건을 못 채워 "결제했는데 책이 미완성"이
   * 반복됐다. 여기서 이으면 사용자가 실제로 머무는 읽기 화면이 완성을 책임진다.
   */
  const resume = useCallback(async (target: SessionState) => {
    const isCurrent = captureOwner();
    const accessToken = String(target.accessToken || "");
    // 토큰이 없으면 서버가 이 세션을 이 문서에 이어쓰도록 허가하지 않은 것이다 — 링크로 돌려보낸다.
    if (!accessToken) return;
    setResuming(true);
    setResumeError("");
    try {
      await runCodexBatches({
        sessionId: target.sessionId,
        accessToken,
        seed: { sessionId: target.sessionId, status: target.status, accessToken, chapters: target.chapters },
        errorText: copy.errorText,
        shouldStop: () => stoppedRef.current || !isCurrent() || document.hidden || !navigator.onLine,
        onProgress: (next) => {
          if (!isCurrent()) return;
          setSession((current) => (current ? {
            ...current,
            status: String(next.status || current.status),
            accessToken: String(next.accessToken || current.accessToken || ""),
            chapters: Array.isArray(next.chapters) ? next.chapters : current.chapters,
            loveDna: next.loveDna ?? current.loveDna,
            totalCharCount: Number(next.totalCharCount ?? current.totalCharCount),
          } : current));
        },
      });
      // 마지막 배치 응답에는 loveDna·글자수 같은 마무리 필드가 아직 없을 수 있다. 완성본을 한 번 다시 읽는다.
      if (!stoppedRef.current && isCurrent()) await load();
    } catch (caught) {
      if (stoppedRef.current || !isCurrent()) return;
      setResumeError(caught instanceof TypeError
        ? copy.errorText.NETWORK_ERROR
        : caught instanceof Error ? caught.message : copy.errorText.SERVER_ERROR);
    } finally {
      if (!stoppedRef.current && isCurrent()) setResuming(false);
    }
  }, [captureOwner, copy, load]);

  useEffect(() => {
    if (!session || session.status === "completed" || !session.accessToken) return;
    if (resumeStartedForRef.current === session.sessionId) return;
    resumeStartedForRef.current = session.sessionId;
    stoppedRef.current = false;
    void resume(session);
  }, [session, resume]);

  const retryResume = useCallback(() => {
    if (!session || resuming) return;
    stoppedRef.current = false;
    void resume(session);
  }, [session, resuming, resume]);

  useEffect(() => {
    const recover = () => { if (!document.hidden && navigator.onLine) retryResume(); };
    window.addEventListener("online", recover);
    document.addEventListener("visibilitychange", recover);
    return () => { window.removeEventListener("online", recover); document.removeEventListener("visibilitychange", recover); };
  }, [retryResume]);

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
      <h1 className="sr-only">{masterLoveCodexBilling(session.mode === "compat" ? "compat" : "solo", locale).title}</h1>
      {/*
        미완성 상태를 셋으로 가른다. 예전에는 셋 다 "아직 다 쓰이지 않았습니다 · 이어 쓰기"
        하나로 뭉뚱그려져, 지금 이 화면이 이어쓰는 중인지 멈춘 것인지 사용자가 알 수 없었다.
      */}
      {session.status !== "completed" ? (
        <div className="bg-[#0a0818] pt-6">
          <p className={`${styles.measure} text-center text-[0.8125rem] leading-7`} style={{ color: "#b9ad99" }}>
            {resumeError ? (
              <>
                {copy.resultResumeFailedNotice}{" "}
                <button
                  type="button"
                  onClick={retryResume}
                  className="underline underline-offset-4"
                  style={{ color: "#e8d5a3" }}
                >
                  {copy.resultResumeRetry}
                </button>
              </>
            ) : resuming ? (
              // aria-live 로 읽어 준다 — 화면을 못 보는 사용자에게도 장이 쌓이는 것이 전달돼야
              // "머물면 완성된다"는 안내가 실제로 지켜지는지 확인할 수 있다.
              <span aria-live="polite">
                {copy.resultResumingNotice(session.chapters.length, MASTER_LOVE_CODEX_TOTAL_CHAPTERS)}
              </span>
            ) : (
              <>
                {copy.resultIncompleteNotice}{" "}
                <Link href="/master-love-codex" className="underline underline-offset-4" style={{ color: "#e8d5a3" }}>
                  {copy.resultContinueWriting}
                </Link>
              </>
            )}
          </p>
        </div>
      ) : null}
      <CodexReader
        completed={session.status === "completed"}
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
