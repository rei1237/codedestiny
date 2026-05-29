"use client";

import { useMemo, useRef, useState } from "react";

const SERVICE_KEY = "saju-lifebook";
const FEATURE_KEY = "saju_life_book_pdf";

const STEP_LABELS = [
  "프로필 정보 확인 중",
  "사주 원국 계산 중",
  "대운·세운 흐름 계산 중",
  "13챕터 로컬 원고 생성 중",
  "AI 상담문 보강 중",
  "PDF 편집/렌더링 중",
  "완료",
];

const CHAPTER_ROADMAP = [
  "I. 사주 원국 완전 해설",
  "II. 나의 설계도",
  "III. 숨겨진 무기",
  "IV. 대운 정밀 분석",
  "V. 격국과 사회적 소명",
  "VI. 관계의 전략",
  "VII. 연애·결혼 완전 분석",
  "VIII. 재물과 현실 감각",
  "IX. 직업·사업·커리어",
  "X. 건강·멘탈·생활 리듬",
  "XI. 위기와 전환점",
  "XII. 숨은 복과 귀인",
  "XIII. 최종 운명 로드맵",
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

function compactPreview(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  return raw.length > 180 ? `${raw.slice(0, 180)}...` : raw;
}

function mapApiError(status, payload) {
  const code = String(payload?.code || payload?.error?.code || "").toUpperCase();
  const message = String(payload?.message || payload?.error?.message || "").trim();

  if (status === 401 || code === "UNAUTHORIZED") {
    return "로그인 후 인생의 책 PDF를 생성할 수 있습니다.";
  }
  if (status === 402 || code.includes("PAYMENT") || code.includes("ACCESS")) {
    return "프리미엄 PDF 생성 권한이 필요합니다.";
  }
  if (status === 403 || code.includes("CHECK") || code.includes("VERIFY")) {
    return "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (message) return message;
  return "PDF 생성 중 문제가 발생했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요.";
}

function CoverImage() {
  const [loaded, setLoaded] = useState(true);

  if (!loaded) {
    return (
      <div
        aria-label="인생의 책 대체 비주얼"
        style={{
          width: "100%",
          aspectRatio: "16/10",
          borderRadius: 18,
          background: "radial-gradient(circle at 30% 20%, rgba(239, 203, 144, 0.32) 0%, rgba(106, 67, 35, 0.45) 40%, rgba(20, 12, 7, 0.95) 100%)",
          border: "1px solid rgba(239, 203, 144, 0.35)",
        }}
      />
    );
  }

  return (
    <img
      src="/fuctionassets/lifebook.webp"
      alt="사주 인생의 책"
      onError={() => setLoaded(false)}
      style={{
        width: "100%",
        aspectRatio: "16/10",
        borderRadius: 18,
        objectFit: "cover",
        border: "1px solid rgba(239, 203, 144, 0.35)",
      }}
    />
  );
}

export default function SajuLifebookPage() {
  const [form, setForm] = useState({
    name: "",
    gender: "female",
    calendarType: "solar",
    birthDate: nowDate(),
    birthTimeKnown: true,
    hour: "12",
    minute: "00",
    birthplace: "서울",
  });

  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [infoNote, setInfoNote] = useState("");
  const [result, setResult] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const timerRef = useRef(null);

  const chapters = Array.isArray(result?.chapters) ? result.chapters : [];
  const currentChapter = chapters[selectedChapter] || null;
  const categories = Array.isArray(currentChapter?.categories) ? currentChapter.categories : [];
  const currentCategory = categories[selectedCategory] || null;

  const progressPercent = useMemo(() => {
    const total = STEP_LABELS.length;
    const current = Math.max(1, Math.min(total, stepIndex + 1));
    return Math.round((current / total) * 100);
  }, [stepIndex]);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const stopTicker = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTicker = () => {
    stopTicker();
    timerRef.current = setInterval(() => {
      setStepIndex((prev) => {
        const max = STEP_LABELS.length - 3;
        return prev >= max ? prev : prev + 1;
      });
    }, 900);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setInfoNote("");
    setResult(null);
    setSelectedChapter(0);
    setSelectedCategory(0);
    setShowDetail(false);

    const name = String(form.name || "").trim();
    console.info("[LifeBook][ModalOpen]");
    if (!name) {
      setError("이름을 입력해 주세요.");
      return;
    }

    const birth = parseBirthDate(form.birthDate);
    if (!Number.isFinite(birth.year) || !Number.isFinite(birth.month) || !Number.isFinite(birth.day)) {
      setError("생년월일을 정확히 입력해 주세요.");
      return;
    }

    if (form.birthTimeKnown) {
      const hour = Number(form.hour);
      const minute = Number(form.minute);
      if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        setError("태어난 시간을 정확히 입력해 주세요.");
        return;
      }
    }

    setLoading(true);
    setStepIndex(0);
    startTicker();
    console.info("[LifeBook][ProfileResolved]", {
      hasBirthDate: Boolean(form.birthDate),
      hasBirthTime: Boolean(form.birthTimeKnown),
      gender: form.gender,
    });
    console.info("[LifeBook][BirthInputNormalized]");
    console.info("[LifeBook][ValidationBeforePayment]");

    try {
      console.info("[LifeBook][SessionCreateStart]");
      const response = await fetch("/api/lifebook/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          serviceKey: SERVICE_KEY,
          productKey: FEATURE_KEY,
          featureKey: FEATURE_KEY,
          name,
          gender: form.gender,
          calendarType: form.calendarType,
          birthDate: form.birthDate,
          birthTimeKnown: form.birthTimeKnown,
          hour: form.birthTimeKnown ? Number(form.hour) : null,
          minute: form.birthTimeKnown ? Number(form.minute) : null,
          birthplace: String(form.birthplace || "").trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        throw new Error(mapApiError(response.status, payload));
      }

      setStepIndex(STEP_LABELS.length - 1);
      setResult(payload.data || null);
      setShowDetail(true);
      console.info("[LifeBook][SessionCreateSuccess]");
      console.info("[LifeBook][PdfRequestSuccess]");
      if (payload?.data?.fallbackUsed) {
        setInfoNote("AI 문장 보강이 지연되어 로컬 사주 계산 기반 프리미엄 원고로 PDF를 완성합니다.");
        console.info("[LifeBook][LLMEnhanceFailedUseLocal]");
      }
    } catch (submitError) {
      console.info("[LifeBook][Error]", { message: String(submitError?.message || "") });
      setError(String(submitError?.message || "PDF 생성 중 문제가 발생했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요."));
    } finally {
      stopTicker();
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const html = String(result?.pdfReady?.html || "").trim();
    if (!html) {
      setError("PDF 렌더 데이터가 비어 있습니다. 다시 시도해 주세요.");
      return;
    }

    const popup = window.open("", "_blank", "noopener,noreferrer,width=980,height=1280");
    if (!popup) {
      setError("브라우저 팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.");
      return;
    }

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    popup.location.href = blobUrl;
    setTimeout(() => {
      try {
        popup.focus();
        popup.print();
      } finally {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1200);
      }
    }, 500);
  };

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0d0a08 0%, #16100b 50%, #0b0806 100%)", color: "#f7ead7" }}>
      <section style={{ maxWidth: 1160, margin: "0 auto", padding: "26px 16px 72px" }}>
        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 20 }}>
          <article style={{ borderRadius: 22, padding: 22, border: "1px solid rgba(245, 214, 165, .22)", background: "linear-gradient(155deg, rgba(34,24,15,.95), rgba(79,53,31,.94))" }}>
            <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.2 }}>사주 인생의 책</h1>
            <p style={{ marginTop: 10, fontSize: 18, color: "#f6ddb3" }}>팔자 8글자로 읽는 나만의 운명 해설서</p>
            <p style={{ marginTop: 12, color: "#ebd6b8", lineHeight: 1.7 }}>
              원국, 일간, 월지, 용신, 대운, 관계, 재물, 커리어, 건강, 위기관리, 실행전략까지
              13챕터로 구성된 프리미엄 리포트를 생성합니다.
            </p>
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Premium PDF", "13 Chapters", "사주 원국 기반", "최고 운세 전문가 해석", "LLM 상담문 보강"].map((tag) => (
                <span key={tag} style={{ borderRadius: 999, padding: "6px 12px", fontSize: 12, background: "rgba(245,214,165,.15)", border: "1px solid rgba(245,214,165,.38)" }}>{tag}</span>
              ))}
            </div>
          </article>

          <article style={{ borderRadius: 22, padding: 14, border: "1px solid rgba(245, 214, 165, .22)", background: "linear-gradient(160deg, rgba(26,19,12,.95), rgba(53,37,24,.93))" }}>
            <CoverImage />
            <p style={{ margin: "10px 6px 0", fontSize: 13, color: "#e9d4b2" }}>/fuctionassets/lifebook.webp</p>
          </article>
        </div>

        <section style={{ marginTop: 18, borderRadius: 18, padding: 16, border: "1px solid rgba(240,209,157,.22)", background: "rgba(24,17,12,.72)" }}>
          <h2 style={{ margin: "0 0 10px" }}>13챕터 구성</h2>
          <div className="roadmap-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
            {CHAPTER_ROADMAP.map((item) => (
              <div key={item} style={{ borderRadius: 12, padding: "10px 12px", border: "1px solid rgba(240,209,157,.22)", background: "rgba(240,209,157,.06)" }}>
                {item}
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={handleSubmit} style={{ marginTop: 20, borderRadius: 20, padding: 18, border: "1px solid rgba(240,209,157,.22)", background: "rgba(21,15,11,.8)" }}>
          <h2 style={{ margin: "0 0 12px" }}>생성 설정</h2>
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>이름</span>
              <input value={form.name} onChange={(e) => updateField("name", e.target.value)} style={{ borderRadius: 10, border: "1px solid #896744", background: "#16100b", color: "#fff4e5", padding: "10px 12px" }} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>성별</span>
              <select value={form.gender} onChange={(e) => updateField("gender", e.target.value)} style={{ borderRadius: 10, border: "1px solid #896744", background: "#16100b", color: "#fff4e5", padding: "10px 12px" }}>
                <option value="female">여성</option>
                <option value="male">남성</option>
                <option value="other">기타</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>생년월일</span>
              <input type="date" value={form.birthDate} onChange={(e) => updateField("birthDate", e.target.value)} style={{ borderRadius: 10, border: "1px solid #896744", background: "#16100b", color: "#fff4e5", padding: "10px 12px" }} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>양력/음력</span>
              <select value={form.calendarType} onChange={(e) => updateField("calendarType", e.target.value)} style={{ borderRadius: 10, border: "1px solid #896744", background: "#16100b", color: "#fff4e5", padding: "10px 12px" }}>
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>태어난 시</span>
              <input type="number" min="0" max="23" value={form.hour} disabled={!form.birthTimeKnown} onChange={(e) => updateField("hour", e.target.value)} style={{ borderRadius: 10, border: "1px solid #896744", background: form.birthTimeKnown ? "#16100b" : "#271d14", color: "#fff4e5", padding: "10px 12px" }} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>태어난 분</span>
              <input type="number" min="0" max="59" value={form.minute} disabled={!form.birthTimeKnown} onChange={(e) => updateField("minute", e.target.value)} style={{ borderRadius: 10, border: "1px solid #896744", background: form.birthTimeKnown ? "#16100b" : "#271d14", color: "#fff4e5", padding: "10px 12px" }} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>출생지</span>
              <input value={form.birthplace} onChange={(e) => updateField("birthplace", e.target.value)} style={{ borderRadius: 10, border: "1px solid #896744", background: "#16100b", color: "#fff4e5", padding: "10px 12px" }} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20 }}>
              <input type="checkbox" checked={!form.birthTimeKnown} onChange={(e) => updateField("birthTimeKnown", !e.target.checked)} />
              <span>태어난 시간을 모릅니다 (시간 미상 기준)</span>
            </label>
          </div>

          <p style={{ marginTop: 10, fontSize: 13, color: "#dcc5a1" }}>로그인 및 결제 권한 확인 후 생성이 시작됩니다.</p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            <button type="submit" disabled={loading} style={{ borderRadius: 999, border: "1px solid #e4c38a", background: loading ? "#7d6540" : "#e5c792", color: "#2e1d11", fontWeight: 800, padding: "10px 18px", cursor: loading ? "wait" : "pointer", touchAction: "manipulation" }}>
              {loading ? "인생의 책 생성 중..." : "인생의 책 작성 시작"}
            </button>
            {result?.pdfReady?.html ? (
              <button type="button" onClick={handlePrint} style={{ borderRadius: 999, border: "1px solid rgba(228,195,138,.7)", background: "transparent", color: "#f7e8cf", fontWeight: 700, padding: "10px 16px", cursor: "pointer", touchAction: "manipulation" }}>
                PDF 출력/다운로드
              </button>
            ) : null}
          </div>

          {loading ? (
            <div style={{ marginTop: 12, borderRadius: 12, padding: 12, border: "1px solid rgba(228,195,138,.3)", background: "rgba(228,195,138,.08)" }}>
              <div style={{ height: 8, width: "100%", borderRadius: 999, overflow: "hidden", background: "rgba(228,195,138,.22)" }}>
                <div style={{ width: `${progressPercent}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #f4d59f, #ca8c3f)" }} />
              </div>
              <p style={{ margin: "9px 0 0", color: "#f4dab4" }}>{STEP_LABELS[stepIndex]}</p>
            </div>
          ) : null}

          {error ? (
            <div style={{ marginTop: 12, borderRadius: 10, border: "1px solid #cc775f", background: "rgba(204,119,95,.15)", color: "#ffd8ce", padding: "10px 12px" }}>
              {error}
            </div>
          ) : null}

          {infoNote ? (
            <div style={{ marginTop: 12, borderRadius: 10, border: "1px solid #8aa95c", background: "rgba(138,169,92,.15)", color: "#e5f4cc", padding: "10px 12px" }}>
              {infoNote}
            </div>
          ) : null}
        </form>

        {chapters.length ? (
          <section style={{ marginTop: 20, borderRadius: 18, padding: 16, border: "1px solid rgba(240,209,157,.22)", background: "rgba(24,17,12,.72)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>챕터 상세창</h2>
              <button type="button" onClick={() => setShowDetail((prev) => !prev)} style={{ borderRadius: 999, border: "1px solid rgba(240,209,157,.4)", background: "transparent", color: "#f7e8cf", padding: "7px 14px", cursor: "pointer" }}>
                {showDetail ? "상세창 닫기" : "상세창 열기"}
              </button>
            </div>

            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {chapters.map((chapter, idx) => (
                <button
                  key={String(chapter.id || idx)}
                  type="button"
                  onClick={() => {
                    setSelectedChapter(idx);
                    setSelectedCategory(0);
                    setShowDetail(true);
                  }}
                  style={{
                    borderRadius: 999,
                    border: idx === selectedChapter ? "1px solid #f2cc8f" : "1px solid rgba(240,209,157,.35)",
                    background: idx === selectedChapter ? "rgba(242,204,143,.18)" : "transparent",
                    color: "#f7e8cf",
                    padding: "7px 12px",
                    cursor: "pointer",
                    touchAction: "manipulation",
                  }}
                >
                  {idx + 1}장
                </button>
              ))}
            </div>

            {showDetail && currentChapter ? (
              <div className="detail-grid" style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 12 }}>
                <article style={{ borderRadius: 14, border: "1px solid rgba(240,209,157,.24)", background: "rgba(240,209,157,.08)", padding: 12 }}>
                  <h3 style={{ margin: "0 0 10px" }}>{String(currentChapter.title || "")}</h3>
                  <div style={{ display: "grid", gap: 8 }}>
                    {categories.map((category, idx) => (
                      <button
                        key={`${category.id || idx}`}
                        type="button"
                        onClick={() => setSelectedCategory(idx)}
                        style={{
                          textAlign: "left",
                          borderRadius: 10,
                          border: idx === selectedCategory ? "1px solid #f2cc8f" : "1px solid rgba(240,209,157,.2)",
                          background: idx === selectedCategory ? "rgba(242,204,143,.15)" : "rgba(18,13,10,.52)",
                          color: "#f7e8cf",
                          padding: "10px 12px",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{String(category.title || "소주제")}</div>
                        <div style={{ marginTop: 4, fontSize: 13, color: "#dfcaab" }}>{compactPreview(category.finalText || category.localSummary || "")}</div>
                      </button>
                    ))}
                  </div>
                </article>

                <article style={{ borderRadius: 14, border: "1px solid rgba(240,209,157,.24)", background: "rgba(17,12,9,.78)", padding: 14 }}>
                  <h3 style={{ margin: "0 0 10px" }}>{String(currentCategory?.title || "상세 본문")}</h3>
                  <div style={{ color: "#e9d8bd", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                    {String(currentCategory?.finalText || currentCategory?.localSummary || "상세 상담문이 여기에 표시됩니다.")}
                  </div>
                </article>
              </div>
            ) : null}
          </section>
        ) : null}
      </section>

      <style jsx>{`
        @media (max-width: 980px) {
          .hero-grid,
          .detail-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 720px) {
          .roadmap-grid,
          .form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
