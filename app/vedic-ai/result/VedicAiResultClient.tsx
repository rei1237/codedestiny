"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { StructuredReadingResult, parseStructuredReading, splitAssistantSections } from "../VedicAiClient";
import styles from "../VedicAiClient.module.css";

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
  return String(value ?? "").trim();
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export default function VedicAiResultClient() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") || "";
    let cancelled = false;

    (async () => {
      try {
        const path = id
          ? `/api/vedic-ai/result?id=${encodeURIComponent(id)}`
          : "/api/vedic-ai/result";
        const response = await authFetch(path);
        if (response.status === 401) {
          if (!cancelled) setView({ kind: "login" });
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (id) {
          if (data?.ok && data.consultation) setView({ kind: "detail", consultation: data.consultation as Consultation });
          else setView({ kind: "missing" });
        } else {
          setView({ kind: "list", items: Array.isArray(data?.consultations) ? data.consultations : [] });
        }
      } catch {
        if (!cancelled) setView({ kind: "missing" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSendMessage() {
    if (view.kind !== "detail" || chatBusy || chatInput.trim().length < 2) return;
    const message = chatInput.trim();
    setChatInput("");
    setError("");
    setChatBusy(true);
    try {
      const response = await authFetch("/api/vedic-ai/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: view.consultation.id, message }),
      });
      const data = await response.json().catch(() => ({}));
      if (data?.ok && data.consultation) {
        setView({ kind: "detail", consultation: data.consultation as Consultation });
        return;
      }
      throw new Error();
    } catch {
      setError("추가 질문을 보내는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setChatBusy(false);
    }
  }

  const backLink = (
    <Link href="/vedic-ai/" className={styles.resultListItem} style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
      <ArrowLeft size={16} aria-hidden="true" />
      <strong>베다점 AI 상담으로 돌아가기</strong>
    </Link>
  );

  if (view.kind === "loading") {
    return (
      <main className={styles.shell} aria-busy="true">
        <section className={styles.resultPanel} style={{ minHeight: "60dvh", display: "grid", placeItems: "center" }}>
          <p style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Loader2 className={styles.spin} size={18} aria-hidden="true" /> 저장된 별의 지도를 여는 중입니다.
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
            <h2>로그인이 필요합니다</h2>
            <p>저장된 베다점 상담은 본인 계정으로 로그인해야 다시 볼 수 있습니다.</p>
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
            <h2>상담 기록을 찾지 못했습니다</h2>
            <p>주소가 잘못되었거나 다른 계정의 상담일 수 있습니다.</p>
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
            <span>지난 베다점 상담 다시 보기</span>
          </div>
          {view.items.length ? (
            <div className={styles.resultListCard}>
              {view.items.map((item) => (
                <Link key={item.id} href={`/vedic-ai/result/?id=${encodeURIComponent(item.id)}`} className={styles.resultListItem}>
                  <strong>{item.topic || "베다점 AI 상담"}{item.name ? ` · ${item.name}` : ""}</strong>
                  <small>{[item.chartSummary, formatDate(item.updatedAt || item.createdAt)].filter(Boolean).join(" · ")}</small>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <h2>아직 저장된 상담이 없습니다</h2>
              <p>상담을 완료하면 이곳에서 언제든 다시 볼 수 있습니다.</p>
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
                />
              );
            }
            return message.role === "assistant" ? (
              <div className={styles.sectionGrid} key={`${message.role}-${index}`}>
                {splitAssistantSections(message.content).map((section, sectionIndex) => (
                  <article className={styles.sectionCard} key={`${section.title}-${sectionIndex}`}>
                    <span>{section.title}</span>
                    <p>{section.body}</p>
                  </article>
                ))}
              </div>
            ) : (
              <article className={styles.userMsg} key={`${message.role}-${index}`}>
                <span>나의 질문</span>
                <p>{message.content}</p>
              </article>
            );
          })}
        </div>

        {error ? (
          <div className={styles.errorBox}><span>{error}</span></div>
        ) : null}

        <div className={styles.chatInput}>
          <textarea
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            maxLength={1800}
            disabled={chatBusy}
            placeholder="저장된 차트 그대로, 이어서 더 묻고 싶은 말을 적어 주세요."
          />
          <button
            type="button"
            onClick={() => void handleSendMessage()}
            disabled={chatBusy || chatInput.trim().length < 2}
            aria-label="추가 질문 보내기"
          >
            {chatBusy ? <Loader2 className={styles.spin} size={18} /> : <Send size={18} />}
          </button>
        </div>

        <div style={{ marginTop: "1rem" }}>{backLink}</div>
      </section>
    </main>
  );
}
