"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Home, Loader2 } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { usePaidDeliveryScope } from "@/app/hooks/usePaidDeliveryScope";
import ConsultationShare from "@/components/fortune/ConsultationShare";
import { vedicShareChoices } from "@/lib/consultation-sharing";
import { toDisplayText } from "@/lib/llm-text";
import type { AnalysisBasis } from "@/lib/fortune/analysis-basis";
import PagedResultViewer, { usePagedViewerMode } from "@/components/fortune/PagedResultViewer";
import AiResultProse from "@/components/fortune/AiResultProse";
import { StructuredReadingResult, parseStructuredReading, splitAssistantSections, pollVedicResult } from "../VedicAiClient";
import styles from "../VedicAiClient.module.css";
import { readDevPreviewState } from "@/lib/dev-preview/core";
import { buildVedicPreviewPayload } from "@/lib/dev-preview/fixtures/vedic";
import { currentVedicResultCopy } from "./resultCopy";

// 🔴 결제가 끝난 뒤 사용자가 실제로 결과를 받아 보는 화면이라 한국어 하드코딩이 그대로 노출됐다.
//    언어 전환은 경로 이동이라 렌더 시점에 한 번 읽으면 충분하다(resultCopy.ts 주석 참조).
const COPY = currentVedicResultCopy();

type Message = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type Consultation = {
  id: string;
  status: string;
  birthInfo: Record<string, unknown>;
  topic: string;
  userQuestion?: string;
  vedicChart: Record<string, unknown>;
  analysisBasis?: AnalysisBasis | null;
  messages: Message[];
};

type ConsultationListItem = {
  id: string;
  topic: string;
  name: string;
  chartSummary: string;
  createdAt?: string;
  updatedAt?: string;
};

type ViewState =
  | { kind: "loading" }
  | { kind: "login" }
  | { kind: "missing" }
  | { kind: "list"; items: ConsultationListItem[] }
  | { kind: "detail"; consultation: Consultation };

function toText(value: unknown) {
  return toDisplayText(value);
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export default function VedicAiResultClient() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [viewAll, setViewAll] = usePagedViewerMode("vedicAiViewerModeV1");

  const [resumeEpoch, setResumeEpoch] = useState(0);
  const captureOwner = usePaidDeliveryScope(() => { setView({ kind: "loading" }); setResumeEpoch(value => value + 1); });
  useEffect(() => {
    const resume = () => { if (document.visibilityState !== "hidden") setResumeEpoch(value => value + 1); };
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("focus", resume);
    return () => {
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("focus", resume);
    };
  }, []);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") || "";
    let cancelled = false, hasPartial = false;
    const sameOwner = captureOwner();
    const isCurrent = () => !cancelled && sameOwner();
    (async () => {
      try {
        const previewState = readDevPreviewState();
        if (previewState) {
          const data = buildVedicPreviewPayload(previewState);
          if (data.ok && data.consultation) setView({ kind: "detail", consultation: data.consultation as Consultation });
          else setView({ kind: "missing" });
          return;
        }
        let sessionId = id;
        if (!sessionId) {
          const response = await authFetch("/api/vedic-ai/result");
          const data = await response.json();
          if (!isCurrent()) return;
          if (response.status === 401) { setView({ kind: "login" }); return; }
          if (!response.ok) throw new Error("RESULT_UNAVAILABLE");
          sessionId = data.pendingSessionId || "";
          if (!sessionId) { setView({ kind: "list", items: data.consultations || [] }); return; }
          const url = new URL(window.location.href); url.searchParams.set("id", sessionId); window.history.replaceState({}, "", url);
        }
        const result = await pollVedicResult(sessionId, isCurrent, consultation => { hasPartial = true; setView({ kind: "detail", consultation }); });
        if (!isCurrent()) return;
        if (result.consultation) setView({ kind: "detail", consultation: result.consultation });
        else if (!hasPartial) setView({ kind: "missing" });
      } catch {
        if (isCurrent() && !hasPartial) setView({ kind: "missing" });
      }
    })();
    return () => { cancelled = true; };
  }, [resumeEpoch, captureOwner]);

  const backLink = (
    <Link href="/vedic-ai/" className={styles.resultListItem} style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
      <ArrowLeft size={16} aria-hidden="true" />
      <strong>{COPY.backToConsult}</strong>
    </Link>
  );

  if (view.kind === "loading") {
    return (
      <main className={styles.shell} aria-busy="true">
        <section className={styles.resultPanel} style={{ minHeight: "60dvh", display: "grid", placeItems: "center" }}>
          <p style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Loader2 className={styles.spin} size={18} aria-hidden="true" /> {COPY.loadingSaved}
          </p>
        </section>
      </main>
    );
  }

  if (view.kind === "login") {
    return (
      <main className={styles.shell}>
        <section className={styles.resultPanel}>
          <div className={styles.emptyState}>
            <h2>{COPY.loginTitle}</h2>
            <p>{COPY.loginBody}</p>
            {backLink}
          </div>
        </section>
      </main>
    );
  }

  if (view.kind === "missing") {
    return (
      <main className={styles.shell}>
        <section className={styles.resultPanel}>
          <div className={styles.emptyState}>
            <h2>{COPY.missingTitle}</h2>
            <p>{COPY.missingBody}</p>
            {backLink}
          </div>
        </section>
      </main>
    );
  }

  if (view.kind === "list") {
    return (
      <main className={styles.shell}>
        <section className={styles.resultPanel}>
          <div className={styles.summaryHeader}>
            <span>{COPY.listHeading}</span>
          </div>
          {view.items.length ? (
            <div className={styles.resultListCard}>
              {view.items.map((item) => (
                <Link key={item.id} href={`/vedic-ai/result/?id=${encodeURIComponent(item.id)}`} className={styles.resultListItem}>
                  <strong>{item.topic || COPY.topicFallback}{item.name ? ` · ${item.name}` : ""}</strong>
                  <small>{[item.chartSummary, formatDate(item.updatedAt || item.createdAt)].filter(Boolean).join(" · ")}</small>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <h2>{COPY.emptyTitle}</h2>
              <p>{COPY.emptyBody}</p>
            </div>
          )}
          <div style={{ marginTop: "1rem" }}>{backLink}</div>
        </section>
      </main>
    );
  }

  const { consultation } = view;
  const chart = consultation.vedicChart || {};
  const shareChoices = vedicShareChoices(consultation);

  return (
    <main className={styles.shell} data-vedic-ai-page="result-route-v20260704">
      <section className={styles.resultPanel}>
        {consultation.status !== "completed" && <div className={styles.resumeStatus} role="status"><h2>{COPY.resumeTitle}</h2><p>{COPY.resumeBody}</p><button type="button" className={styles.resultListItem} onClick={() => setResumeEpoch(value => value + 1)}>{COPY.resumeButton}</button></div>}
        <div className={styles.chatList}>
          {consultation.messages.map((message, index) => {
            const structured = message.role === "assistant" ? parseStructuredReading(message.content) : null;
            if (structured) {
              return (
                <StructuredReadingResult
                  completed={consultation.status === "completed"}
                  key={`${message.role}-${index}`}
                  reading={structured}
                  chart={chart}
                  name={toText(consultation.birthInfo?.name)}
                  basis={consultation.analysisBasis || null}
                />
              );
            }
            return message.role === "assistant" ? (
              <AssistantSectionsView
                key={`${message.role}-${index}`}
                content={message.content}
                viewAll={viewAll}
                onViewAllChange={setViewAll}
              />
            ) : (
              <article className={styles.userMsg} key={`${message.role}-${index}`}>
                <span>{COPY.myQuestion}</span>
                <p>{message.content}</p>
              </article>
            );
          })}
        </div>

        {shareChoices.length > 0 && (
          <div className={styles.resultShare}>
            <ConsultationShare brand="vedic" choices={shareChoices} />
          </div>
        )}

        <footer className={styles.resultFooter}>
          <span className={styles.resultFooterRule} aria-hidden="true" />
          <p className={styles.resultFooterNote}>{COPY.footerNote}</p>
          <div className={styles.resultFooterActions}>
            <Link href="/vedic-ai/" className={styles.resultFooterPrimary}>
              <ArrowLeft size={16} aria-hidden="true" />
              <span>{COPY.backToConsult}</span>
            </Link>
            <Link href="/" className={styles.resultFooterSecondary}>
              <Home size={16} aria-hidden="true" />
              <span data-cd-trans="home.nav.home">홈</span>
            </Link>
          </div>
        </footer>
      </section>
    </main>
  );
}

// 장문 상담(다섹션)은 한 장씩 넘기는 페이지 뷰어로, 짧은 follow-up(단일 섹션)은 기존 카드로 렌더링.
function AssistantSectionsView({ content, viewAll, onViewAllChange }: { content: string; viewAll: boolean; onViewAllChange: (viewAll: boolean) => void }) {
  const sections = splitAssistantSections(content);
  const renderSection = (section: { title: string; body: string }, sectionIndex: number) => (
    <article className={styles.sectionCard} key={`${section.title}-${sectionIndex}`}>
      <span>{section.title}</span>
      <AiResultProse value={section.body} />
    </article>
  );
  if (sections.length <= 1) {
    return <div className={styles.sectionGrid}>{sections.map(renderSection)}</div>;
  }
  return (
    <PagedResultViewer
      pages={sections.map((section, index) => ({
        id: `vedic-section-${index}`,
        label: toText(section.title).slice(0, 12) || COPY.chapterFallback(index + 1),
        content: renderSection(section, index),
      }))}
      deckLabel={COPY.deckLabel}
      viewAll={viewAll}
      onViewAllChange={onViewAllChange}
    />
  );
}
