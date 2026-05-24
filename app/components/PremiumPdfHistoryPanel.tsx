"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type PremiumPdfHistoryItem = {
  reportId: string;
  title: string;
  sessionKind: string;
  reportType: string;
  totalChapters: number;
  completedChapters: number;
  totalChars: number;
  isComplete: boolean;
  statusPath: string;
  downloadPath: string;
  updatedAt?: string | null;
};

type PremiumPdfHistoryPanelProps = {
  title?: string;
  sessionKinds?: string[];
  limit?: number;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PremiumPdfHistoryPanel({
  title = "내 PDF 히스토리",
  sessionKinds = [],
  limit = 20,
}: PremiumPdfHistoryPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<PremiumPdfHistoryItem[]>([]);

  const filteredKinds = useMemo(() => {
    const norm = Array.isArray(sessionKinds) ? sessionKinds : [];
    return norm
      .map((row) => String(row || "").trim())
      .filter(Boolean);
  }, [sessionKinds]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/premium/pdf-reports?limit=${encodeURIComponent(String(limit || 20))}`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        throw new Error(String(payload?.message || "히스토리를 불러오지 못했습니다."));
      }

      const rows = Array.isArray(payload?.reports) ? payload.reports : [];
      const nextItems = rows
        .map((row: any) => ({
          reportId: String(row?.reportId || "").trim(),
          title: String(row?.title || "").trim(),
          sessionKind: String(row?.sessionKind || "").trim(),
          reportType: String(row?.reportType || "").trim(),
          totalChapters: Number(row?.totalChapters || 0),
          completedChapters: Number(row?.completedChapters || 0),
          totalChars: Number(row?.totalChars || 0),
          isComplete: Boolean(row?.isComplete),
          statusPath: String(row?.statusPath || "").trim(),
          downloadPath: String(row?.downloadPath || "").trim(),
          updatedAt: row?.updatedAt || null,
        }))
        .filter((row: PremiumPdfHistoryItem) => row.reportId);

      setItems(nextItems);
    } catch (err: any) {
      setError(String(err?.message || "히스토리를 불러오지 못했습니다."));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(() => {
    if (!filteredKinds.length) return items;
    const set = new Set(filteredKinds);
    return items.filter((row) => set.has(row.sessionKind));
  }, [items, filteredKinds]);

  return (
    <section style={{
      marginTop: 16,
      borderRadius: 14,
      border: "1px solid rgba(148,163,184,0.2)",
      background: "rgba(2,6,23,0.45)",
      padding: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <p style={{ margin: 0, color: "rgba(226,232,240,0.95)", fontWeight: 700, fontSize: "0.86rem" }}>{title}</p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          style={{
            borderRadius: 8,
            border: "1px solid rgba(148,163,184,0.4)",
            background: "rgba(15,23,42,0.85)",
            color: loading ? "rgba(148,163,184,0.6)" : "rgba(226,232,240,0.9)",
            fontSize: "0.72rem",
            fontWeight: 700,
            padding: "6px 10px",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "새로고침 중" : "새로고침"}
        </button>
      </div>

      {error ? (
        <p style={{ margin: 0, color: "rgba(248,113,113,0.92)", fontSize: "0.76rem" }}>{error}</p>
      ) : null}

      {!error && !visibleItems.length ? (
        <p style={{ margin: 0, color: "rgba(148,163,184,0.82)", fontSize: "0.76rem" }}>
          저장된 리포트가 아직 없습니다.
        </p>
      ) : null}

      <div style={{ display: "grid", gap: 8 }}>
        {visibleItems.map((item) => {
          const statusHref = item.statusPath ? `${item.statusPath}?reportId=${encodeURIComponent(item.reportId)}` : "";
          const downloadHref = item.downloadPath ? `${item.downloadPath}?reportId=${encodeURIComponent(item.reportId)}` : "";
          const detailHref = `/api/premium/pdf-reports/${encodeURIComponent(item.reportId)}`;
          return (
            <article key={`${item.reportId}:${item.sessionKind}`} style={{
              borderRadius: 10,
              border: "1px solid rgba(51,65,85,0.8)",
              background: "rgba(15,23,42,0.55)",
              padding: "10px 11px",
            }}>
              <p style={{ margin: 0, color: "#fff", fontSize: "0.8rem", fontWeight: 700 }}>
                {item.title || item.reportType || item.sessionKind}
              </p>
              <p style={{ margin: "4px 0 0", color: "rgba(148,163,184,0.86)", fontSize: "0.72rem" }}>
                {item.completedChapters}/{item.totalChapters} 챕터 · {item.totalChars.toLocaleString("ko-KR")}자 · {formatDate(item.updatedAt)}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {statusHref ? (
                  <a
                    href={statusHref}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      borderRadius: 8,
                      border: "1px solid rgba(125,211,252,0.45)",
                      background: "rgba(8,47,73,0.6)",
                      color: "rgba(125,211,252,0.95)",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "5px 10px",
                      textDecoration: "none",
                    }}
                  >
                    상태 보기
                  </a>
                ) : null}
                {downloadHref ? (
                  <a
                    href={downloadHref}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      borderRadius: 8,
                      border: "1px solid rgba(253,224,71,0.45)",
                      background: "rgba(113,63,18,0.48)",
                      color: "rgba(253,224,71,0.95)",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "5px 10px",
                      textDecoration: "none",
                    }}
                  >
                    다운로드
                  </a>
                ) : null}
                <a
                  href={detailHref}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    borderRadius: 8,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(15,23,42,0.75)",
                    color: "rgba(226,232,240,0.92)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "5px 10px",
                    textDecoration: "none",
                  }}
                >
                  상세 JSON
                </a>
                <span style={{
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.35)",
                  color: item.isComplete ? "rgba(134,239,172,0.95)" : "rgba(251,191,36,0.95)",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "4px 9px",
                }}>
                  {item.isComplete ? "완료" : "진행 중"}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
