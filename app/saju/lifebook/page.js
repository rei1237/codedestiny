"use client";

import { useMemo, useRef, useState } from "react";
import { runBillingCoinGate } from "@/app/_lib/billing-client";
import { calculateLocalSaju } from "@/app/saju/animal-destiny/engine/localSajuCalculator";
import LifeFortuneGraph, {
  resolveLifeFortuneCurrentAge,
  resolveLifeFortuneGraphData,
} from "@/app/components/lifebook/LifeFortuneGraph";

const SERVICE_KEY = "saju-lifebook";
const FEATURE_KEY = "saju_life_book_pdf";

const STEP_LABELS = [
  "프로필 정보를 확인하는 중입니다",
  "사주 원국을 정리하는 중입니다",
  "팔자 8글자의 흐름을 해석하는 중입니다",
  "대운과 세운의 큰 흐름을 반영하는 중입니다",
  "재물·직업·관계의 구조를 정리하는 중입니다",
  "용신과 인생 전략을 구성하는 중입니다",
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
  "VIII. 재물·직업 완전 분석",
  "IX. 건강·심신 리듬",
  "X. 신살·십이운성·퀀텀 포인트",
  "XI. 위기와 반전 시나리오",
  "XII. 나의 길",
  "XIII. 마스터플랜",
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

function getDisplayCurrentAge(result, birthDate) {
  return resolveLifeFortuneCurrentAge(result, birthDate);
}

function compactPreview(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  return raw.length > 180 ? `${raw.slice(0, 180)}...` : raw;
}

function resolveArchiveFormatUrl(rawUrl, format = "pdf") {
  const url = String(rawUrl || "").trim();
  if (!url) return "";
  if (!url.includes("/api/premium/pdf-archive/") || /[?&]format=(pdf|html)/i.test(url)) {
    return url;
  }
  return `${url}${url.includes("?") ? "&" : "?"}format=${encodeURIComponent(format)}`;
}

function getLifeBookDownloadTargets(data) {
  return {
    pdfUrl: String(
      data?.pdfReady?.downloadUrl
      || data?.downloadUrl
      || data?.pdfReady?.pdfUrl
      || data?.pdfUrl
      || "",
    ).trim(),
    htmlUrl: String(data?.pdfReady?.htmlUrl || data?.htmlUrl || "").trim(),
    html: String(data?.pdfReady?.html || "").trim(),
  };
}

function makeRequestId(prefix = "lifebook") {
  return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 9)}`;
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
  if (/seed|llm/i.test(message)) {
    return "인생의 책 생성 중 내부 해석 흐름이 끊겼습니다. 입력 정보를 다시 확인한 뒤 재시도해 주세요.";
  }
  if (message) return message;
  return "PDF 생성 중 문제가 발생했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요.";
}

function normalizeClientLifeBookPillar(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const stem = String(source.g || source.stem || source.stemKo || "").trim();
  const branch = String(source.j || source.branch || source.branchKo || "").trim();
  return {
    stem,
    branch,
    ganji: String(source.ganji || `${stem}${branch}`).trim(),
    stemElement: String(source.gE || source.stemElement || "").trim(),
    branchElement: String(source.jE || source.branchElement || "").trim(),
  };
}

function normalizeLifeBookEngineGender(gender) {
  if (gender === "male") return "male";
  if (gender === "female") return "female";
  return "unknown";
}

function isAdvancedQuantumMyeongriReport(report) {
  if (!report || typeof report !== "object") return false;
  const engineVersion = String(report?.metadata?.engineVersion || "").trim();
  const userMarkdown = String(report?.userReport?.markdown || "").trim();
  return engineVersion === "QUANTUM_MYEONGRI_ENGINE_V2" || userMarkdown.includes("QUANTUM MYEONGRI Engine v.2");
}

function buildLocalLifeBookEngine({ form, birth, hour, minute }) {
  return calculateLocalSaju({
    year: birth.year,
    month: birth.month,
    day: birth.day,
    hour,
    minute,
    hasTime: true,
    calendarType: form.calendarType === "lunar" ? "lunar" : "solar",
    lunarLeap: false,
    gender: normalizeLifeBookEngineGender(form.gender),
    timezone: "Asia/Seoul",
    birthplace: String(form.birthplace || "").trim(),
  });
}

function readClientLifeBookEnginePayload(localEngine = null) {
  if (typeof window === "undefined") return {};
  const snapshot = window.__destinyFlowerSajuSnapshot && typeof window.__destinyFlowerSajuSnapshot === "object"
    ? window.__destinyFlowerSajuSnapshot
    : {};
  const analysis = snapshot.analysis && typeof snapshot.analysis === "object"
    ? snapshot.analysis
    : (snapshot.saju && typeof snapshot.saju === "object" ? snapshot.saju : {});
  const payload = {};
  if (analysis && Object.keys(analysis).length) payload.analysisSignals = analysis;

  if (isAdvancedQuantumMyeongriReport(localEngine?.structuredAdvancedReport)) {
    payload.quantumMyeongriJson = {
      version: "life-book-client-route-v2",
      sourceTrace: {
        source: "app/saju/lifebook/page.js",
        engine: "app/saju/animal-destiny/engine/localSajuCalculator.ts",
        engineVersion: String(localEngine.structuredAdvancedReport?.metadata?.engineVersion || "QUANTUM_MYEONGRI_ENGINE_V2"),
        hasFinalAdvancedReport: Boolean(localEngine.finalAdvancedReport),
        hasCalculationEvidence: Boolean(localEngine.calculationEvidence),
      },
      structuredAdvancedReport: localEngine.structuredAdvancedReport,
      finalAdvancedReport: localEngine.finalAdvancedReport || {},
      calculationEvidence: localEngine.calculationEvidence || {},
    };
    payload.structuredAdvancedReport = localEngine.structuredAdvancedReport;
    payload.finalAdvancedReport = localEngine.finalAdvancedReport || {};
    payload.calculationEvidence = localEngine.calculationEvidence || {};
    payload.engineVersion = String(localEngine.structuredAdvancedReport?.metadata?.engineVersion || "QUANTUM_MYEONGRI_ENGINE_V2");
    return payload;
  }

  if (window.G_PILLARS || window.G_POWER || window.G_JOHU || window.G_DAEWUN || window.G_DAEUN) {
    const pillars = window.G_PILLARS && typeof window.G_PILLARS === "object" ? window.G_PILLARS : {};
    payload.quantumMyeongriJson = {
      version: "life-book-client-route-v1",
      sourceTrace: {
        source: "app/saju/lifebook/page.js",
        hasPillars: Boolean(window.G_PILLARS),
        hasPower: Boolean(window.G_POWER),
        hasJohu: Boolean(window.G_JOHU),
        hasDaewun: Boolean(window.G_DAEWUN || window.G_DAEUN),
      },
      structuredAdvancedReport: {
        metadata: {
          engineVersion: "client-route-quantum-myeongri-v1",
          timezone: "Asia/Seoul",
          hourPillarTimePolicy: "TRUE_SOLAR_TIME",
          dayChangePolicy: "MIDNIGHT",
        },
        fourPillars: {
          year: normalizeClientLifeBookPillar(pillars.y || pillars.year),
          month: normalizeClientLifeBookPillar(pillars.m || pillars.month),
          day: normalizeClientLifeBookPillar(pillars.d || pillars.day),
          hour: normalizeClientLifeBookPillar(pillars.h || pillars.hour),
        },
        strengthAnalysis: window.G_POWER || {},
        climateAnalysis: window.G_JOHU || {},
        yongshin: {
          primary: String(analysis.yongshin || analysis.useful || "").trim(),
          secondary: String(analysis.support || "").trim(),
          gishin: Array.isArray(analysis.kishin_elements) ? analysis.kishin_elements : [],
        },
        gyeokguk: {
          primary: String(analysis.gyeokguk || analysis.gyeok || "").trim(),
          reasoning: String(analysis.gyeokgukReason || "").trim(),
        },
        daewoon: {
          cycles: Array.isArray(window.G_DAEWUN) ? window.G_DAEWUN : (Array.isArray(window.G_DAEUN) ? window.G_DAEUN : []),
        },
        sewoon: {
          currentYear: {
            label: String(analysis.currentYearPillar || "").trim(),
            ganji: String(analysis.currentYearPillar || "").trim(),
          },
          analysis: String(analysis.yearlyLuckSummary || "").trim(),
        },
        lifeDomains: {
          relationships: String(analysis.relationshipSignal || "").trim(),
          romance: String(analysis.spouseSignal || "").trim(),
          career: String(analysis.careerSignal || "").trim(),
          wealth: String(analysis.wealthSignal || "").trim(),
          healthMind: String(analysis.healthSignal || "").trim(),
        },
      },
    };
    payload.structuredAdvancedReport = payload.quantumMyeongriJson.structuredAdvancedReport;
  }
  return payload;
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
  const [result, setResult] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [enginePreview, setEnginePreview] = useState(null);
  const timerRef = useRef(null);
  const submitLockRef = useRef(false);

  const chapters = Array.isArray(result?.chapters) ? result.chapters : [];
  const currentChapter = chapters[selectedChapter] || null;
  const categories = Array.isArray(currentChapter?.categories) ? currentChapter.categories : [];
  const currentCategory = categories[selectedCategory] || null;

  const progressPercent = useMemo(() => {
    const total = STEP_LABELS.length;
    const current = Math.max(1, Math.min(total, stepIndex + 1));
    return Math.round((current / total) * 100);
  }, [stepIndex]);
  const fortuneGraphData = useMemo(() => resolveLifeFortuneGraphData(result), [result]);
  const fortuneCurrentAge = useMemo(() => getDisplayCurrentAge(result, form.birthDate), [form.birthDate, result]);

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
    if (submitLockRef.current || loading) return;
    setError("");
    setResult(null);
    setSelectedChapter(0);
    setSelectedCategory(0);
    setShowDetail(false);
    setEnginePreview(null);

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

    if (!form.birthTimeKnown) {
      setError("인생의 책 PDF는 시주와 대운 흐름까지 정밀하게 보기 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 입력해 주세요.");
      return;
    }

    const hour = Number(form.hour);
    const minute = Number(form.minute);
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      setError("태어난 시간을 정확히 입력해 주세요.");
      return;
    }

    let localEngine = null;
    try {
      localEngine = buildLocalLifeBookEngine({ form, birth, hour, minute });
      if (!isAdvancedQuantumMyeongriReport(localEngine?.structuredAdvancedReport)) {
        throw new Error("QUANTUM_MYEONGRI_ENGINE_V2 structured report missing");
      }
      setEnginePreview({
        status: "ready",
        title: "사주 원국과 대운 흐름이 인생의 책 원고에 반영됩니다.",
        summary: String(localEngine.finalAdvancedReport?.brandPhrases?.join(" · ") || "운의 환골탈태 · 천기적 액션 처방"),
      });
    } catch (engineError) {
      console.warn("[LifeBook][QuantumMyeongriV2Failed]", engineError);
      setError("퀀텀 명리엔진 v2 계산값을 만들지 못했습니다. 생년월일시와 양력/음력 설정을 다시 확인해 주세요.");
      return;
    }

    submitLockRef.current = true;
    setLoading(true);
    setStepIndex(0);
    // DO NOT start ticker yet - wait for billing gate confirmation first
    console.info("[LifeBook][ProfileResolved]", {
      hasBirthDate: Boolean(form.birthDate),
      hasBirthTime: Boolean(form.birthTimeKnown),
      gender: form.gender,
    });
    console.info("[LifeBook][BillingGateStart]");

    try {
      console.info("[LifeBook][BillingGateCalling]");
      const requestId = makeRequestId("lifebook");
      const reportId = `saju-lifebook-${Date.now().toString(36)}`;
      const reportSessionId = `life-book:${reportId}`;

      const gate = await runBillingCoinGate({
        categoryKey: "premium-report",
        featureKey: FEATURE_KEY,
        subFeatureKey: FEATURE_KEY,
        reason: "인생의 책 생성 (13챕터)",
        requestId,
        reportId,
        sessionId: reportSessionId,
        reportSessionId,
        forceDeduct: true,
      });

      if (!gate?.ok) {
        throw new Error(gate?.error?.message || gate?.message || "프리미엄 PDF 생성 권한이 필요합니다.");
      }

      console.info("[LifeBook][BillingGateSuccess]", { hasAccessGrant: Boolean(gate?.data?.accessGrant) });
      
      // NOW start the ticker after billing confirmation
      startTicker();

      const gateRaw = gate?.raw && typeof gate.raw === "object" ? gate.raw : {};
      const gateData = gate?.data && typeof gate.data === "object" ? gate.data : {};
      const gatePayloadData = gateRaw?.data && typeof gateRaw.data === "object" ? gateRaw.data : {};

      const premiumAccessToken = String(
        gateData?.premiumAccessToken
        || gatePayloadData?.premiumAccessToken
        || gateRaw?.premiumAccessToken
        || "",
      ).trim();

      const accessGrant = (gateData?.accessGrant && typeof gateData.accessGrant === "object")
        ? gateData.accessGrant
        : (gatePayloadData?.accessGrant && typeof gatePayloadData.accessGrant === "object")
          ? gatePayloadData.accessGrant
          : (gateRaw?.accessGrant && typeof gateRaw.accessGrant === "object")
            ? gateRaw.accessGrant
            : null;

      const payment = (gateData?.consume && typeof gateData.consume === "object")
        ? gateData.consume
        : (gatePayloadData?.consume && typeof gatePayloadData.consume === "object")
          ? gatePayloadData.consume
          : (gateRaw?.consume && typeof gateRaw.consume === "object")
            ? gateRaw.consume
            : null;

      const clientEnginePayload = readClientLifeBookEnginePayload(localEngine);
      const payload = {
        serviceKey: SERVICE_KEY,
        productKey: FEATURE_KEY,
        featureKey: FEATURE_KEY,
        reportType: "lifeBook",
        generationMode: "local",
        calculationSource: "client-quantum-myeongri-v2+worker-saju-engine",
        authoringMode: "local",
        sessionId: String(accessGrant?.sessionId || reportSessionId || "").trim(),
        reportSessionId: String(accessGrant?.sessionId || reportSessionId || "").trim(),
        reportId: String(accessGrant?.reportId || reportId || "").trim(),
        premiumAccessToken: premiumAccessToken || undefined,
        accessGrant: accessGrant || undefined,
        payment: payment || undefined,
        purchaseId: String(accessGrant?.purchaseId || payment?.transactionId || "").trim() || undefined,
        requestId,
        name,
        gender: form.gender,
        calendarType: form.calendarType,
        birthDate: form.birthDate,
        birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        birthHour: hour,
        birthMinute: minute,
        hour,
        minute,
        birthTimeKnown: true,
        birthplace: String(form.birthplace || "").trim(),
        timezone: "Asia/Seoul",
        engineData: {
          source: "app/saju/lifebook/page.js",
          workerNativeRequired: true,
          engineVersion: clientEnginePayload.engineVersion || undefined,
          structuredAdvancedReport: clientEnginePayload.structuredAdvancedReport || undefined,
          finalAdvancedReport: clientEnginePayload.finalAdvancedReport || undefined,
          calculationEvidence: clientEnginePayload.calculationEvidence || undefined,
        },
        analysisSignals: clientEnginePayload.analysisSignals || undefined,
        quantumMyeongriJson: clientEnginePayload.quantumMyeongriJson || undefined,
        structuredAdvancedReport: clientEnginePayload.structuredAdvancedReport || undefined,
        finalAdvancedReport: clientEnginePayload.finalAdvancedReport || undefined,
      };

      const headers = { "Content-Type": "application/json" };
      if (premiumAccessToken) headers["x-premium-access-token"] = premiumAccessToken;

      const response = await fetch("/api/premium/saju-lifebook/prepare", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok || !responsePayload?.ok) {
        throw new Error(mapApiError(response.status, responsePayload));
      }
      const resultPayload = responsePayload.data || responsePayload || {};

      setStepIndex(STEP_LABELS.length - 1);
      setResult(resultPayload || null);
      setShowDetail(true);
      console.info("[LifeBook][SessionCreateSuccess]");
      console.info("[LifeBook][PdfRequestSuccess]");
    } catch (submitError) {
      console.info("[LifeBook][Error]", { message: String(submitError?.message || "") });
      setError(String(submitError?.message || "PDF 생성 중 문제가 발생했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요."));
    } finally {
      stopTicker();
      submitLockRef.current = false;
      setLoading(false);
    }
  };
  const handlePrint = () => {
    const { pdfUrl, htmlUrl, html } = getLifeBookDownloadTargets(result);
    const downloadPdfUrl = resolveArchiveFormatUrl(pdfUrl, "pdf");
    const downloadHtmlUrl = resolveArchiveFormatUrl(htmlUrl, "html");

    if (downloadPdfUrl) {
      window.open(downloadPdfUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (downloadHtmlUrl) {
      window.open(downloadHtmlUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (html) {
      const popup = window.open("", "_blank", "noopener,noreferrer,width=980,height=1280");
      if (!popup) {
        setError("브라우저가 팝업을 차단했습니다. 팝업 차단을 해제한 뒤 다시 시도해주세요.");
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
      return;
    }

    setError("결과를 찾지 못했습니다. 다시 시도해주세요.");
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
              {["Premium PDF", "13 Chapters", "사주 원국 기반", "최고 운세 전문가 해석", "완성형 상담문 리포트"].map((tag) => (
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

          <div style={{ marginTop: 12, borderRadius: 14, padding: 12, border: "1px solid rgba(244,213,159,.28)", background: "rgba(244,213,159,.07)", display: "grid", gap: 7 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <strong style={{ color: "#f5d69f" }}>정밀 사주 계산</strong>
              <span style={{ borderRadius: 999, padding: "4px 10px", fontSize: 12, border: "1px solid rgba(244,213,159,.38)", color: "#ffe5b8" }}>
                {enginePreview?.status === "ready" ? "계산값 반영 완료" : "생성 시 정밀 계산"}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "#dcc5a1" }}>
              {enginePreview?.title || "생성 버튼을 누르면 입력값 기준으로 사주 원국과 운의 흐름을 계산한 뒤 PDF 원고에 반영합니다."}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["원국 분석", "대운 흐름", "생애 전략"].map((tag) => (
                <span key={tag} style={{ borderRadius: 999, padding: "4px 9px", fontSize: 11, background: "rgba(255,244,229,.08)", color: "#f7e8cf" }}>{tag}</span>
              ))}
            </div>
          </div>

          <p style={{ marginTop: 10, fontSize: 13, color: "#dcc5a1" }}>로그인 및 결제 권한 확인 후 생성이 시작됩니다.</p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            <button type="submit" disabled={loading} style={{ borderRadius: 999, border: "1px solid #e4c38a", background: loading ? "#7d6540" : "#e5c792", color: "#2e1d11", fontWeight: 800, padding: "10px 18px", cursor: loading ? "wait" : "pointer", touchAction: "manipulation" }}>
              {loading ? "인생의 책 생성 중..." : "인생의 책 작성 시작"}
            </button>
            {(result?.pdfUrl || result?.downloadUrl || result?.htmlUrl || result?.pdfReady?.pdfUrl || result?.pdfReady?.downloadUrl || result?.pdfReady?.htmlUrl || result?.pdfReady?.html) ? (
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

        </form>

        <LifeFortuneGraph
          data={fortuneGraphData}
          currentAge={fortuneCurrentAge}
          preview={!fortuneGraphData}
        />

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

