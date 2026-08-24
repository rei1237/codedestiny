"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Home, Loader2 } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { isRetriableResultPollFailure } from "@/app/_lib/consultationResultPolling";
import { toDisplayText } from "@/lib/llm-text";
import type { AnalysisBasis } from "@/lib/fortune/analysis-basis";
import PagedResultViewer, { usePagedViewerMode } from "@/components/fortune/PagedResultViewer";
import AiResultProse from "@/components/fortune/AiResultProse";
import { StructuredReadingResult, parseStructuredReading, splitAssistantSections } from "../VedicAiClient";
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

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") || "";
    let cancelled = false;

    (async () => {
      try {
        const previewState = readDevPreviewState();
        if (previewState) {
          const data = buildVedicPreviewPayload(previewState);
          if (data.ok && data.consultation) setView({ kind: "detail", consultation: data.consultation as Consultation });
          else setView({ kind: "missing" });
          return;
        }
        const path = id
          ? `/api/vedic-ai/result?id=${encodeURIComponent(id)}`
          : "/api/vedic-ai/result";
        // 생성 중(202)이면 완료까지 몇 차례 재확인한다(서버 신선도 창 420s 이내에서 40회 ≈ 5분).
        for (let attempt = 0; attempt < 40; attempt += 1) {
          const response = await authFetch(path);
          if (response.status === 401) {
            // authFetch가 일시 401을 503으로 이미 흡수하므로, 여기 도달한 401은 확정 로그아웃이다.
            if (!cancelled) setView({ kind: "login" });
            return;
          }
          if (isRetriableResultPollFailure(response.status)) {
            // 일시적 DB/인증 장애(503)는 미조회 화면으로 종착하지 말고 202처럼 재폴링해 자가 복구한다.
            if (cancelled) return;
            await new Promise((resolve) => window.setTimeout(resolve, attempt < 2 ? 3000 : 8000));
            continue;
          }
          if (id && response.status === 202) {
            if (cancelled) return;
            await new Promise((resolve) => window.setTimeout(resolve, attempt < 2 ? 3000 : 8000));
            continue;
          }
          const data = await response.json().catch(() => ({}));
          if (cancelled) return;
          if (id) {
            if (data?.ok && data.consultation) setView({ kind: "detail", consultation: data.consultation as Consultation });
            else setView({ kind: "missing" });
          } else {
            setView({ kind: "list", items: Array.isArray(data?.consultations) ? data.consultations : [] });
          }
          return;
        }
        if (!cancelled) setView({ kind: "missing" });
      } catch {
        if (!cancelled) setView({ kind: "missing" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <main className={styles.shell} data-vedic-ai-page="result-route-v20260704">
      <section className={styles.resultPanel}>
        <div className={styles.chatList}>
          {consultation.messages.map((message, index) => {
            const structured = message.role === "assistant" ? parseStructuredReading(message.content) : null;
            if (structured) {
              return (
                <StructuredReadingResult
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
