"use client";

import { useMemo, useState } from "react";

const STEP_LABELS = [
  "결제/권한 확인",
  "입력값 검증",
  "로컬 사주 계산",
  "13챕터 골격 생성",
  "LLM 보강 및 검수",
  "PDF 준비 데이터 완성",
];

function nowDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseBirthDate(dateText) {
  const [y, m, d] = String(dateText || "").split("-").map((v) => Number(v));
  return {
    year: Number.isFinite(y) ? y : NaN,
    month: Number.isFinite(m) ? m : NaN,
    day: Number.isFinite(d) ? d : NaN,
  };
}

function chapterPreview(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  return raw.length > 140 ? `${raw.slice(0, 140)}...` : raw;
}

export default function SajuLifebookPage() {
  const [form, setForm] = useState({
    name: "",
    gender: "female",
    birthDate: nowDate(),
    hour: "12",
    minute: "00",
    birthplace: "서울",
  });
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const progressPercent = useMemo(() => {
    const total = STEP_LABELS.length;
    return Math.max(0, Math.min(100, Math.round(((stepIndex + 1) / total) * 100)));
  }, [stepIndex]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    setStepIndex(0);

    const { year, month, day } = parseBirthDate(form.birthDate);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      setLoading(false);
      setError("생년월일을 확인해 주세요.");
      return;
    }

    const authToken = (() => {
      try {
        return String(localStorage.getItem("fortune_auth_token") || "").trim();
      } catch (_) {
        return "";
      }
    })();

    if (!authToken) {
      setLoading(false);
      if (window.confirm("로그인이 필요합니다. 로그인 페이지로 이동할까요?")) {
        window.location.assign("/login?next=%2Fsaju%2Flifebook");
      }
      return;
    }

    const payload = {
      featureKey: "saju_lifebook_pdf",
      name: String(form.name || "").trim() || "사용자",
      gender: form.gender,
      year,
      month,
      day,
      hour: Number(form.hour),
      minute: Number(form.minute),
      birthplace: String(form.birthplace || "").trim() || "서울",
    };

    const tick = window.setInterval(() => {
      setStepIndex((prev) => (prev < STEP_LABELS.length - 1 ? prev + 1 : prev));
    }, 550);

    try {
      const response = await fetch("/api/premium/saju-lifebook/prepare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(String(data?.message || "인생의 책 생성에 실패했습니다."));
      }

      setStepIndex(STEP_LABELS.length - 1);
      setResult(data.data || null);
    } catch (err) {
      setError(String(err?.message || "인생의 책 생성 중 오류가 발생했습니다."));
    } finally {
      window.clearInterval(tick);
      setLoading(false);
    }
  };

  const onPrintPdf = () => {
    if (!result?.pdfReady) return;

    const title = `${result.profile?.name || "사용자"} - 사주 인생의 책`;
    const chapterHtml = (result.pdfReady.chapters || [])
      .map((chapter) => {
        return `
          <section style="margin-bottom:28px;">
            <h2 style="font-size:20px;margin:0 0 8px;">${chapter.chapter}. ${chapter.title}</h2>
            <p style="white-space:pre-wrap;line-height:1.72;margin:0;">${String(chapter.text || "")}</p>
          </section>
        `;
      })
      .join("\n");

    const popup = window.open("", "_blank", "width=980,height=860");
    if (!popup) return;

    popup.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
        </head>
        <body style="font-family: 'Noto Sans KR', sans-serif; padding: 24px 28px;">
          <h1 style="margin:0 0 12px;">${title}</h1>
          <p style="margin:0 0 20px;color:#555;">생성 시각: ${new Date().toLocaleString("ko-KR")}</p>
          ${chapterHtml}
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 64px" }}>
      <h1 style={{ margin: "0 0 10px", fontSize: 34, lineHeight: 1.2 }}>사주 인생의 책 PDF 생성</h1>
      <p style={{ margin: "0 0 22px", color: "#555" }}>
        출생 정보를 입력하면 결제/권한을 재검증한 뒤 13챕터 프리미엄 리포트를 생성합니다.
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, background: "#faf8f3", border: "1px solid #e7dcc8", borderRadius: 14, padding: 18 }}>
        <label>
          이름
          <input value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="홍길동" style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px" }} />
        </label>

        <label>
          성별
          <select value={form.gender} onChange={(e) => onChange("gender", e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px" }}>
            <option value="female">여성</option>
            <option value="male">남성</option>
            <option value="unknown">기타/미상</option>
          </select>
        </label>

        <label>
          생년월일
          <input type="date" value={form.birthDate} onChange={(e) => onChange("birthDate", e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px" }} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label>
            출생 시
            <input type="number" min="0" max="23" value={form.hour} onChange={(e) => onChange("hour", e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px" }} />
          </label>
          <label>
            출생 분
            <input type="number" min="0" max="59" value={form.minute} onChange={(e) => onChange("minute", e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px" }} />
          </label>
        </div>

        <label>
          출생지
          <input value={form.birthplace} onChange={(e) => onChange("birthplace", e.target.value)} placeholder="서울" style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px" }} />
        </label>

        <button type="submit" disabled={loading} style={{ marginTop: 4, padding: "12px 14px", fontSize: 16, fontWeight: 700, borderRadius: 10, border: 0, background: "#111827", color: "#fff", cursor: loading ? "wait" : "pointer" }}>
          {loading ? "생성 중..." : "500코인으로 생성 시작"}
        </button>
      </form>

      {loading && (
        <section style={{ marginTop: 18, border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
          <p style={{ margin: "0 0 8px", fontWeight: 700 }}>진행 단계: {STEP_LABELS[stepIndex]}</p>
          <div style={{ height: 10, background: "#f3f4f6", borderRadius: 999 }}>
            <div style={{ height: "100%", width: `${progressPercent}%`, background: "#0ea5e9", borderRadius: 999, transition: "width .25s" }} />
          </div>
        </section>
      )}

      {error && <p style={{ marginTop: 14, color: "#b91c1c", fontWeight: 700 }}>{error}</p>}

      {result && (
        <section style={{ marginTop: 22, border: "1px solid #d1d5db", borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>생성 완료: {result.profile?.name}님의 인생의 책</h2>
            <button type="button" onClick={onPrintPdf} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#fff", cursor: "pointer", fontWeight: 700 }}>
              PDF 인쇄/저장
            </button>
          </div>

          <p style={{ color: "#4b5563" }}>총 {Array.isArray(result.chapters) ? result.chapters.length : 0}개 챕터가 준비되었습니다.</p>

          <div style={{ display: "grid", gap: 10 }}>
            {(result.chapters || []).map((chapter, index) => (
              <article key={chapter.id || index} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 17 }}>{index + 1}. {chapter.title}</h3>
                <p style={{ margin: 0, color: "#374151" }}>{chapterPreview(chapter.text)}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
