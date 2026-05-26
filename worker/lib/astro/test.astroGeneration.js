// ============================================================
// Test: Astro Western Premium PDF Generation
// ============================================================

import { generateAstroPdf, generateAstroChapterOnly } from "./generateAstroPdf.js";

// Mock chart data for testing
const mockChart = {
  planets: {
    Sun: { signKo: "사자자리", longitude: 120.5, house: 10, degree: 0.5 },
    Moon: { signKo: "천칭자리", longitude: 180.2, house: 7, degree: 0.2 },
    Mercury: { signKo: "처녀자리", longitude: 150.1, house: 9, degree: 0.1 },
    Venus: { signKo: "황소자리", longitude: 60.3, house: 4, degree: 0.3 },
    Mars: { signKo: "양자리", longitude: 20.4, house: 1, degree: 0.4 },
    Jupiter: { signKo: "궁수자리", longitude: 270.1, house: 12, degree: 0.1 },
    Saturn: { signKo: "물고기자리", longitude: 330.2, house: 2, degree: 0.2 },
    Uranus: { signKo: "물병자리", longitude: 300.5, house: 1, degree: 0.5 },
    Neptune: { signKo: "물고기자리", longitude: 340.3, house: 2, degree: 0.3 },
    Pluto: { signKo: "염소자리", longitude: 280.4, house: 12, degree: 0.4 },
  },
  ascendant: { signKo: "천칭자리", longitude: 180.0, degree: 0, house: 1 },
  midheaven: { signKo: "염소자리", longitude: 270.0, degree: 0, house: 10 },
  northNode: { signKo: "황소자리", longitude: 60.0, degree: 0, house: 4 },
  southNode: { signKo: "전갈자리", longitude: 240.0, degree: 0, house: 10 },
  aspects: [
    { p1: "Sun", p2: "Moon", type: "trine", orb: 2.3 },
    { p1: "Sun", p2: "Saturn", type: "square", orb: 5.1 },
    { p1: "Mercury", p2: "Venus", type: "conjunction", orb: 1.2 },
    { p1: "Mars", p2: "Saturn", type: "opposition", orb: 3.4 },
    { p1: "Jupiter", p2: "Neptune", type: "sextile", orb: 2.1 },
  ],
};

async function testSingleChapter() {
  console.log("=== Testing Single Chapter Generation ===\n");
  const result = await generateAstroChapterOnly({
    chart: mockChart,
    chapterNum: 1,
    reportId: "test-astro-001",
  });

  console.log("Result:", {
    ok: result.ok,
    chapter: result.chapter,
    source: result.source,
    textLength: result.text?.length || 0,
    quality: result.quality,
  });

  if (result.ok) {
    console.log("\nGenerated text (first 500 chars):");
    console.log(result.text.substring(0, 500));
  }
}

async function testFullPdf() {
  console.log("\n\n=== Testing Full PDF Generation ===\n");

  const progressUpdates = [];
  const result = await generateAstroPdf({
    chart: mockChart,
    reportId: "test-astro-full-001",
    body: {},
    onProgress: (progress) => {
      progressUpdates.push(progress);
      console.log(`[Progress] ${progress.code}: ${progress.message}`);
    },
  });

  console.log("\nGeneration Result:", {
    ok: result.ok,
    mode: result.mode,
    reportId: result.reportId,
    totalChapters: result.pdfData?.chapters?.length,
    totalLength: result.pdfData?.chapters?.reduce((sum, ch) => sum + ch.text.length, 0),
    warnings: result.warnings.length,
  });

  console.log("\nChapter Summary:");
  for (const ch of result.pdfData?.chapters || []) {
    console.log(`  Ch${ch.chapter}: ${ch.title} (${ch.text.length} chars, source: ${ch.source})`);
  }

  console.log("\nWarnings:");
  for (const warning of result.warnings || []) {
    console.log(`  - [${warning.chapter || warning.chapterId}] ${warning.warning}`);
  }
}

async function runTests() {
  try {
    await testSingleChapter();
    await testFullPdf();
    console.log("\n✅ All tests completed!");
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exit(1);
  }
}

// Run tests
runTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
