"use client";

import { useMemo, useState } from "react";

const STEP_LABELS = [
  "기본 정보를 정리하는 중입니다",
  "결제/권한 확인을 진행하는 중입니다",
  "사주 원국을 계산하는 중입니다",
  "13개의 인생 챕터를 구성하는 중입니다",
  "상담문을 프리미엄 문장으로 다듬는 중입니다",
  "PDF 책자로 편집하는 중입니다",
];

const CHAPTER_ROADMAP = [
  "1. 사주 원국 완전 해설",
  "2. 월지·일간·조후 기질 분석",
  "3. 용신·희신 운용 전략",
  "4. 대운 정밀 분석",
  "5. 격국과 사회적 소명",
  "6. 관계의 전략",
  "7. 연애·결혼 완전 분석",
  "8. 재물과 현실 감각",
  "9. 직업·사업·커리어",
  "10. 건강·멘탈·생활 리듬",
  "11. 위기와 전환점",
  "12. 숨은 복과 귀인",
  "13. 최종 운명 로드맵",
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
    birthTimeKnown: true,
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

    if (form.birthTimeKnown && (form.hour === "" || form.minute === "")) {
      setLoading(false);
      setError("태어난 시간 입력을 확인해 주세요.");
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
        window.location.assign("/login?next=%2Fpremium%2Fsaju-lifebook");
      }
      return;
    }

    const payload = {
      featureKey: "saju_life_book_pdf",
      name: String(form.name || "").trim() || "사용자",
      gender: form.gender,
      year,
      month,
      day,
      birthTimeKnown: Boolean(form.birthTimeKnown),
      hour: form.birthTimeKnown ? Number(form.hour) : null,
      minute: form.birthTimeKnown ? Number(form.minute) : null,
      birthplace: String(form.birthplace || "").trim() || "서울",
    };

    let nextStep = 0;
    const tick = window.setInterval(() => {
      nextStep = Math.min(nextStep + 1, STEP_LABELS.length - 1);
      setStepIndex(nextStep);
    }, 650);

    try {
      const response = await fetch("/api/premium/saju-lifebook", {
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
      const message = String(err?.message || "인생의 책 생성 중 오류가 발생했습니다.");
      setError(message.includes("결제") || message.includes("권한") ? message : "PDF 생성 중 문제가 발생했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요.");
    } finally {
      window.clearInterval(tick);
      setLoading(false);
    }
  };

  const onPrintPdf = () => {
    if (!result?.pdfReady) return;

    const popup = window.open("", "_blank", "width=980,height=860");
    if (!popup) return;

    popup.document.write(String(result.pdfReady?.html || ""));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 20px 72px", color: "#1f130b" }}>
      <section style={{ marginBottom: 20, padding: 22, borderRadius: 24, background: "linear-gradient(135deg, #1d130d 0%, #5e3a20 52%, #8a5f37 100%)", color: "#fff6eb", boxShadow: "0 24px 48px rgba(48, 29, 14, .18)" }}>
        <p style={{ margin: 0, letterSpacing: ".18em", textTransform: "uppercase", opacity: .82 }}>Code:Destiny Premium PDF</p>
        <h1 style={{ margin: "10px 0 10px", fontSize: 38, lineHeight: 1.1 }}>사주 인생의 책</h1>
        <p style={{ margin: 0, fontSize: 18, color: "#ffe8d2" }}>팔자 8글자로 읽는 나만의 운명 해설서</p>
        <p style={{ margin: "10px 0 0", maxWidth: 760, color: "#f7ddc0" }}>
          원국, 월지, 일간, 용신, 대운, 격국, 관계, 연애, 재물, 직업, 건강, 위기관리, 실행 로드맵까지 13챕터로 정리한 프리미엄 사주 PDF입니다.
        </p>
        <div style={{ marginTop: 14, display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ border: "1px solid rgba(255,255,255,.4)", borderRadius: 999, padding: "5px 10px", fontSize: 12 }}>500코인 1회 차감</span>
          <span style={{ border: "1px solid rgba(255,255,255,.4)", borderRadius: 999, padding: "5px 10px", fontSize: 12 }}>결제 검증 → 생성 파이프라인</span>
          <span style={{ border: "1px solid rgba(255,255,255,.4)", borderRadius: 999, padding: "5px 10px", fontSize: 12 }}>PDF 인쇄/저장</span>
        </div>
      </section>

      <section style={{ marginBottom: 20, border: "1px solid #e9dcc8", borderRadius: 16, background: "#fffdf9", padding: 16 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 20 }}>13챕터 구성 미리보기</h2>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {CHAPTER_ROADMAP.map((row) => (
            <div key={row} style={{ border: "1px solid #efe4d1", borderRadius: 10, padding: "9px 10px", background: "#fff" }}>{row}</div>
          ))}
        </div>
      </section>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14, background: "#faf6ef", border: "1px solid #e7dcc8", borderRadius: 18, padding: 20, boxShadow: "0 16px 32px rgba(69, 47, 25, .07)" }}>
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

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={form.birthTimeKnown} onChange={(e) => onChange("birthTimeKnown", e.target.checked)} />
          태어난 시간을 알고 있어요
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label>
            출생 시
            <input type="number" min="0" max="23" value={form.hour} onChange={(e) => onChange("hour", e.target.value)} disabled={!form.birthTimeKnown} placeholder={!form.birthTimeKnown ? "시간 미상" : "12"} style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px", opacity: form.birthTimeKnown ? 1 : 0.55 }} />
          </label>
          <label>
            출생 분
            <input type="number" min="0" max="59" value={form.minute} onChange={(e) => onChange("minute", e.target.value)} disabled={!form.birthTimeKnown} placeholder={!form.birthTimeKnown ? "시간 미상" : "00"} style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px", opacity: form.birthTimeKnown ? 1 : 0.55 }} />
          </label>
        </div>

        {!form.birthTimeKnown && (
          <p style={{ margin: 0, color: "#7c5a3d", fontSize: 14 }}>태어난 시간이 없으면 시간 미상 기준으로 계산을 진행합니다.</p>
        )}

        <label>
          출생지
          <input value={form.birthplace} onChange={(e) => onChange("birthplace", e.target.value)} placeholder="서울" style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px" }} />
        </label>

        <button type="submit" disabled={loading} style={{ marginTop: 4, padding: "12px 14px", fontSize: 16, fontWeight: 700, borderRadius: 10, border: 0, background: "#111827", color: "#fff", cursor: loading ? "wait" : "pointer" }}>
          {loading ? "생성 중..." : "13챕터 인생의 책 만들기"}
        </button>
      </form>

      {loading && (
        <section style={{ marginTop: 18, border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, background: "#fff" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 700 }}>{STEP_LABELS[stepIndex]}</p>
          <div style={{ height: 10, background: "#f3f4f6", borderRadius: 999 }}>
            <div style={{ height: "100%", width: `${progressPercent}%`, background: "#0ea5e9", borderRadius: 999, transition: "width .25s" }} />
          </div>
        </section>
      )}

      {error && <p style={{ marginTop: 14, color: "#b91c1c", fontWeight: 700 }}>{error}</p>}

      {result && (
        <section style={{ marginTop: 22, border: "1px solid #d1d5db", borderRadius: 18, padding: 18, background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>생성 완료: {result.profile?.name}님의 인생의 책</h2>
            <button type="button" onClick={onPrintPdf} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#fff", cursor: "pointer", fontWeight: 700 }}>
              PDF 인쇄/저장
            </button>
          </div>

          <p style={{ color: "#4b5563" }}>총 {Array.isArray(result.chapters) ? result.chapters.length : 0}개 챕터가 준비되었습니다.</p>

          <div style={{ display: "grid", gap: 10 }}>
            {(result.chapters || []).map((chapter, index) => (
              <article key={chapter.id || index} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fcfcfb" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 17 }}>{index + 1}. {chapter.title}</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  {(chapter.categories || []).map((category) => (
                    <div key={category.id || category.title} style={{ padding: "10px 12px", borderRadius: 10, background: "#fff", border: "1px solid #ece2d0" }}>
                      <strong style={{ display: "block", marginBottom: 4 }}>{category.title}</strong>
                      <p style={{ margin: 0, color: "#374151" }}>{chapterPreview(category.finalText)}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
