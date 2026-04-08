import { NextRequest, NextResponse } from "next/server";
import React from "react";
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer, Font,
} from "@react-pdf/renderer";

export const runtime = "nodejs";
export const maxDuration = 300;

// ─────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────
interface ChapterData {
  chapter: number;
  title: string;
  subtitle: string;
  icon: string;
  text: string;
  sections: { title: string; body: string }[];
}
interface VedicChartSummary {
  lagna: { signSanskrit: string; signKo: string; degree: number; };
  moonNakshatra: { ko: string; name: string; pada: number; moonSignKo: string; };
  atmakaraka: { nameKo: string; signKo: string; degree: number; };
  vimshottariDasha: {
    current?: { planet: string; endDate: string; remainYears: number; };
    antar?: { planet: string; endDate: string; };
  };
  yogas: { nameKo: string; description: string; }[];
  ayanamsa: number;
}
interface PDFRequest {
  chapters: ChapterData[];
  chart?: VedicChartSummary;
  userName?: string;
  birthDate?: string;
}

// ─────────────────────────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── 페이지
  page: {
    backgroundColor: "#07091a",
    paddingVertical: 48,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
  },
  pageLight: {
    backgroundColor: "#fafaf6",
    paddingVertical: 48,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
  },

  // ── 커버
  coverPage: {
    backgroundColor: "#04030f",
    paddingVertical: 0,
    paddingHorizontal: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  coverGradient: {
    width: "100%",
    height: "100%",
    backgroundColor: "#07091a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 50,
  },
  coverOmSymbol: { fontSize: 64, color: "#d4a017", textAlign: "center", marginBottom: 14 },
  coverBadge: {
    fontSize: 8, color: "#d4a017", letterSpacing: 3, textAlign: "center",
    marginBottom: 20, fontFamily: "Helvetica-Bold",
  },
  coverTitle: {
    fontSize: 28, color: "#fff", fontFamily: "Helvetica-Bold",
    textAlign: "center", lineHeight: 1.4, marginBottom: 10,
  },
  coverSubtitle: { fontSize: 13, color: "#a78bfa", textAlign: "center", lineHeight: 1.6, marginBottom: 30 },
  coverDivider: { width: 120, height: 1.5, backgroundColor: "#d4a017", marginBottom: 30 },
  coverInfoRow: { flexDirection: "row", justifyContent: "center", gap: 20, marginBottom: 6 },
  coverInfoLabel: { fontSize: 9, color: "#d4a017", fontFamily: "Helvetica-Bold", letterSpacing: 1.5 },
  coverInfoValue: { fontSize: 11, color: "#e2e8f0", marginTop: 2 },
  coverFooter: { fontSize: 9, color: "#4b5563", marginTop: 40, textAlign: "center", letterSpacing: 1 },

  // ── 목차
  tocTitle: { fontSize: 18, color: "#d4a017", fontFamily: "Helvetica-Bold", marginBottom: 24, letterSpacing: 1 },
  tocRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: "#1e2a4a",
  },
  tocChapter: { fontSize: 9, color: "#7c8ba3", letterSpacing: 1, fontFamily: "Helvetica-Bold" },
  tocChapterTitle: { fontSize: 11, color: "#e2e8f0", marginTop: 1 },
  tocChapterSub: { fontSize: 9, color: "#6678a0", marginTop: 1 },
  tocIcon: { fontSize: 14 },

  // ── 챕터 공통
  chapterHeader: {
    marginBottom: 22,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: "#1e2a4a",
  },
  chapterBadge: {
    fontSize: 8, color: "#d4a017", fontFamily: "Helvetica-Bold",
    letterSpacing: 2.5, marginBottom: 6,
  },
  chapterTitle: { fontSize: 20, color: "#fff", fontFamily: "Helvetica-Bold", lineHeight: 1.3 },
  chapterSubtitle: { fontSize: 10, color: "#7c8ba3", marginTop: 4 },
  chapterIcon: { fontSize: 28, marginBottom: 6 },

  // ── 섹션
  sectionTitle: {
    fontSize: 13, color: "#d4a017", fontFamily: "Helvetica-Bold",
    marginTop: 18, marginBottom: 8, paddingBottom: 4,
    borderBottomWidth: 0.5, borderBottomColor: "#1e2a4a",
  },
  sectionBody: {
    fontSize: 10.5, color: "#cbd5e1", lineHeight: 1.85,
    marginBottom: 10, letterSpacing: 0.1,
  },
  rawText: { fontSize: 10.5, color: "#cbd5e1", lineHeight: 1.85, letterSpacing: 0.1 },

  // ── 차트 요약 박스
  chartBox: {
    backgroundColor: "#0d1230", borderWidth: 1, borderColor: "#1e2a4a",
    borderRadius: 8, padding: 16, marginBottom: 20,
  },
  chartBoxTitle: { fontSize: 9, color: "#d4a017", fontFamily: "Helvetica-Bold", letterSpacing: 2, marginBottom: 10 },
  chartRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  chartBadge: {
    backgroundColor: "#111827", borderWidth: 0.8, borderColor: "#2d3c60",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    fontSize: 9, color: "#93c5fd",
  },

  // ── 요가 박스
  yogaBox: {
    backgroundColor: "#0f0e2a", borderWidth: 1, borderColor: "#2d2060",
    borderRadius: 8, padding: 14, marginVertical: 8,
  },
  yogaName: { fontSize: 11, color: "#c4b5fd", fontFamily: "Helvetica-Bold", marginBottom: 4 },
  yogaDesc: { fontSize: 9.5, color: "#94a3b8", lineHeight: 1.7 },

  // ── 수료증 페이지
  certPage: {
    backgroundColor: "#04030f",
    paddingVertical: 60,
    paddingHorizontal: 60,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  certBorder: {
    width: "100%",
    borderWidth: 2.5, borderColor: "#d4a017", borderRadius: 12,
    padding: 40, display: "flex", flexDirection: "column", alignItems: "center",
  },
  certIcon: { fontSize: 48, marginBottom: 16, textAlign: "center" },
  certTitle: { fontSize: 22, color: "#d4a017", fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 8, letterSpacing: 2 },
  certSubtitle: { fontSize: 11, color: "#a78bfa", textAlign: "center", marginBottom: 24, lineHeight: 1.5 },
  certDivider: { width: 100, height: 1, backgroundColor: "#d4a017", marginBottom: 24 },
  certBody: { fontSize: 10.5, color: "#e2e8f0", textAlign: "center", lineHeight: 1.9, maxWidth: "85%" },
  certFooter: { fontSize: 9, color: "#4b5563", marginTop: 30, textAlign: "center", letterSpacing: 1.5 },

  // ── 페이지 번호
  pageNum: { fontSize: 9, color: "#374151", textAlign: "center", marginTop: 8 },
});

// ─────────────────────────────────────────────────────────────────
// 차트 요약 컴포넌트
// ─────────────────────────────────────────────────────────────────
function ChartSummaryBox({ chart }: { chart?: VedicChartSummary }) {
  if (!chart) return null;
  return React.createElement(View, { style: styles.chartBox },
    React.createElement(Text, { style: styles.chartBoxTitle }, "VEDIC BIRTH CHART SUMMARY — LAHIRI AYANAMSA"),
    React.createElement(View, { style: styles.chartRow },
      React.createElement(Text, { style: styles.chartBadge }, `♈ Lagna: ${chart.lagna.signSanskrit} ${chart.lagna.degree}°`),
      React.createElement(Text, { style: styles.chartBadge }, `🌙 Moon Nak: ${chart.moonNakshatra.ko} (${chart.moonNakshatra.name}) pada${chart.moonNakshatra.pada}`),
      React.createElement(Text, { style: styles.chartBadge }, `🕉 Atmakaraka: ${chart.atmakaraka.nameKo}`),
    ),
    React.createElement(View, { style: styles.chartRow },
      React.createElement(Text, { style: styles.chartBadge }, `⏳ Dasha: ${chart.vimshottariDasha.current?.planet ?? "-"} 대운 / ${chart.vimshottariDasha.antar?.planet ?? "-"} 세운`),
      React.createElement(Text, { style: styles.chartBadge }, `Ayanamsa: ${chart.ayanamsa}°`),
    ),
    chart.yogas?.length > 0 && React.createElement(View, { style: styles.chartRow },
      ...chart.yogas.slice(0,4).map((yoga, i) =>
        React.createElement(Text, { key: i, style: { ...styles.chartBadge, borderColor: "#3d2a6d", color: "#c4b5fd" } }, `✦ ${yoga.nameKo}`)
      )
    ),
  );
}

// ─────────────────────────────────────────────────────────────────
// 목차 페이지
// ─────────────────────────────────────────────────────────────────
function TableOfContents({ chapters }: { chapters: ChapterData[] }) {
  return React.createElement(Page, { size: "A4", style: styles.page },
    React.createElement(Text, { style: styles.tocTitle }, "목차 (Table of Contents)"),
    ...chapters.map((ch, i) =>
      React.createElement(View, { key: i, style: styles.tocRow },
        React.createElement(View, { style: { flex: 1 } },
          React.createElement(Text, { style: styles.tocChapter }, `CHAPTER ${ch.chapter.toString().padStart(2,"0")}`),
          React.createElement(Text, { style: styles.tocChapterTitle }, `${ch.icon}  ${ch.title}`),
          React.createElement(Text, { style: styles.tocChapterSub }, ch.subtitle),
        ),
      )
    ),
    React.createElement(Text, { style: styles.pageNum }, "— CODE : DESTINY · VEDIC PREMIUM —"),
  );
}

// ─────────────────────────────────────────────────────────────────
// 챕터 페이지
// ─────────────────────────────────────────────────────────────────
function ChapterPage({ ch, chart }: { ch: ChapterData; chart?: VedicChartSummary }) {
  const elements: React.ReactElement[] = [
    React.createElement(View, { key: "header", style: styles.chapterHeader },
      React.createElement(Text, { style: styles.chapterBadge }, `CHAPTER ${ch.chapter.toString().padStart(2,"0")} · KARMIC BLUEPRINT`),
      React.createElement(Text, { style: styles.chapterTitle }, ch.title),
      React.createElement(Text, { style: styles.chapterSubtitle }, `${ch.icon}  ${ch.subtitle}`),
    ),
  ];

  // 챕터 1에 차트 요약 삽입
  if (ch.chapter === 1 && chart) {
    elements.push(
      React.createElement(ChartSummaryBox as React.ComponentType<{chart?: VedicChartSummary}>, { key: "chart", chart })
    );
  }

  // 챕터 10에 요가 박스 삽입
  if (ch.chapter === 10 && chart?.yogas?.length) {
    for (let i = 0; i < Math.min(chart.yogas.length, 3); i++) {
      elements.push(
        React.createElement(View, { key: `yoga-${i}`, style: styles.yogaBox },
          React.createElement(Text, { style: styles.yogaName }, `✦ ${chart.yogas[i].nameKo}`),
          React.createElement(Text, { style: styles.yogaDesc }, chart.yogas[i].description),
        )
      );
    }
  }

  // 섹션 내용
  if (ch.sections.length > 0) {
    for (const sec of ch.sections) {
      elements.push(
        React.createElement(Text, { key: `sec-${sec.title}`, style: styles.sectionTitle }, sec.title),
        React.createElement(Text, { key: `body-${sec.title}`, style: styles.sectionBody }, sec.body),
      );
    }
  } else if (ch.text) {
    elements.push(React.createElement(Text, { key: "rawtext", style: styles.rawText }, ch.text));
  } else {
    elements.push(React.createElement(Text, { key: "empty", style: styles.rawText }, "이 챕터는 아직 생성되지 않았습니다."));
  }

  elements.push(React.createElement(Text, { key: "pagenum", style: styles.pageNum }, `— Chapter ${ch.chapter} —`));

  return React.createElement(Page, { size: "A4", style: styles.page, wrap: true }, ...elements);
}

// ─────────────────────────────────────────────────────────────────
// 수료증 페이지
// ─────────────────────────────────────────────────────────────────
function CertificatePage({ userName, chart }: { userName?: string; chart?: VedicChartSummary }) {
  const lagna = chart?.lagna.signSanskrit ?? "라그나";
  const lastName = userName ? ` ${userName}님의` : "당신의";
  return React.createElement(Page, { size: "A4", style: styles.certPage },
    React.createElement(View, { style: styles.certBorder },
      React.createElement(Text, { style: styles.certIcon }, "🕉️"),
      React.createElement(Text, { style: styles.certTitle }, "KARMIC BLUEPRINT"),
      React.createElement(Text, { style: styles.certSubtitle }, "베다 점성술 프리미엄 리포트 완성 증명서\nJyotish Master Report — CODE : DESTINY"),
      React.createElement(View, { style: styles.certDivider }),
      React.createElement(Text, { style: styles.certBody },
        `이 리포트는${lastName} ${lagna} 라그나의 카르마 청사진입니다.\n\n` +
        `별들의 지도를 읽는 이유는 그 노예가 되기 위함이 아니라,\n` +
        `우주의 흐름을 이해하고 삶의 주인(Master)이 되기 위함입니다.\n\n` +
        `"나는 ${lagna} 라그나의 에너지를 통해 이번 생의 카르마를 완성하고,\n` +
        `자유 의지와 헌신으로 내 운명의 주인공으로 우뚝 서겠습니다."\n\n` +
        `— Sankalpa (산칼파: 영혼의 맹세)`),
      React.createElement(View, { style: styles.certDivider }),
      React.createElement(Text, { style: styles.certFooter }, `CODE : DESTINY · PREMIUM COLLECTION · VEDIC ASTROLOGY`),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────
// 커버 페이지
// ─────────────────────────────────────────────────────────────────
function CoverPage({ userName, birthDate, chart }: { userName?: string; birthDate?: string; chart?: VedicChartSummary }) {
  const rows = [];
  if (userName) rows.push({ label: "이름", value: userName });
  if (birthDate) rows.push({ label: "출생일", value: birthDate });
  if (chart) {
    rows.push({ label: "라그나", value: `${chart.lagna.signSanskrit} ${chart.lagna.degree}°` });
    rows.push({ label: "달 낙샤트라", value: `${chart.moonNakshatra.ko} (${chart.moonNakshatra.name}) pada${chart.moonNakshatra.pada}` });
    rows.push({ label: "아트마카라카", value: chart.atmakaraka.nameKo });
    rows.push({ label: "현재 다샤", value: `${chart.vimshottariDasha?.current?.planet ?? "-"} 대운` });
  }

  return React.createElement(Page, { size: "A4", style: { backgroundColor: "#04030f", padding: 0 } },
    React.createElement(View, { style: styles.coverGradient },
      React.createElement(Text, { style: styles.coverBadge }, "CODE : DESTINY · PREMIUM COLLECTION"),
      React.createElement(Text, { style: { fontSize: 50, textAlign: "center", marginBottom: 12, color: "#d4a017" } }, "🕉️"),
      React.createElement(Text, { style: styles.coverTitle }, "Karmic Blueprint\n베다 점성술 프리미엄 리포트"),
      React.createElement(Text, { style: styles.coverSubtitle }, "Jyotish Vidya — 주티쉬 마스터 분析\n12챕터 심층 카르마 청사진"),
      React.createElement(View, { style: styles.coverDivider }),
      ...rows.map((r, i) =>
        React.createElement(View, { key: i, style: { marginBottom: 8, alignItems: "center" } },
          React.createElement(Text, { style: styles.coverInfoLabel }, r.label.toUpperCase()),
          React.createElement(Text, { style: styles.coverInfoValue }, r.value),
        )
      ),
      chart?.yogas?.length
        ? React.createElement(View, { style: { marginTop: 24, alignItems: "center" } },
            React.createElement(Text, { style: { fontSize: 9, color: "#6366f1", letterSpacing: 1.5, marginBottom: 8, fontFamily: "Helvetica-Bold" } }, "검출된 요가 (Yoga)"),
            React.createElement(View, { style: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 } },
              ...chart.yogas.slice(0,4).map((yoga, i) =>
                React.createElement(Text, { key: i, style: { fontSize: 9, color: "#c4b5fd", borderWidth: 0.8, borderColor: "#4c1d95", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 } },
                  `✦ ${yoga.nameKo}`)
              )
            )
          )
        : null,
      React.createElement(Text, { style: styles.coverFooter }, "Lahiri Ayanamsa · Vimshottari Dasha · Whole Sign Houses"),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────
// 메인 PDF 문서
// ─────────────────────────────────────────────────────────────────
function VedicPDFDocument({ chapters, chart, userName, birthDate }: PDFRequest) {
  return React.createElement(Document,
    { title: "베다 점성술 프리미엄 리포트 — Karmic Blueprint", author: "CODE : DESTINY", subject: "Vedic Astrology Premium Report" },
    // 커버
    React.createElement(CoverPage as React.ComponentType<{userName?: string; birthDate?: string; chart?: VedicChartSummary}>, { userName, birthDate, chart }),
    // 목차
    React.createElement(TableOfContents as React.ComponentType<{chapters: ChapterData[]}>, { chapters }),
    // 챕터들
    ...chapters.map((ch, i) =>
      React.createElement(ChapterPage as React.ComponentType<{ch: ChapterData; chart?: VedicChartSummary}>, { key: i, ch, chart: ch.chapter === 1 ? chart : undefined })
    ),
    // 수료증
    React.createElement(CertificatePage as React.ComponentType<{userName?: string; chart?: VedicChartSummary}>, { userName, chart }),
  );
}

// ─────────────────────────────────────────────────────────────────
// POST 핸들러
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: PDFRequest = await req.json();
    const { chapters, chart, userName, birthDate } = body;

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json({ ok: false, error: "No chapters data" }, { status: 400 });
    }

    const doc = React.createElement(
      VedicPDFDocument as React.ComponentType<PDFRequest>,
      { chapters, chart, userName, birthDate }
    ) as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;

    const buffer = await renderToBuffer(doc);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="vedic-karmic-blueprint-${Date.now()}.pdf"`,
        "Content-Length": buffer.length.toString(),
      },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/premium/vedic-pdf]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
