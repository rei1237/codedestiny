import { NextResponse } from "next/server";
import type { FortuneTeaHouseConsultRequest } from "@/src/features/fortune-tea-house/data/consult";
import { generateFortuneTeaHouseConsultGeneration } from "@/src/features/fortune-tea-house/lib/fortuneTeaConsultEngine";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = false;

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeConsultationMode(value: unknown): FortuneTeaHouseConsultRequest["consultationMode"] {
  return value === "saju" ? "saju" : value === "sukuyo" ? "sukuyo" : "tarot";
}

function normalizeRequest(body: Record<string, unknown>): FortuneTeaHouseConsultRequest {
  const consultationMode = normalizeConsultationMode(body.consultationMode);
  const selectedTeaCupId = cleanText(body.selectedTeaCupId, 80);
  const selectedTeaCupName = cleanText(body.selectedTeaCupName, 80);
  const selectedTeaCupTopic = cleanText(body.selectedTeaCupTopic, 80);
  const question = cleanText(body.question, 1200);

  if (!selectedTeaCupId || !selectedTeaCupName || !selectedTeaCupTopic) {
    throw new Error("찻잔을 다시 골라 주세요.");
  }

  if (question.length < 4) {
    throw new Error("연이가 읽을 수 있도록 마음을 조금만 더 적어 주세요.");
  }

  return {
    consultationMode,
    attemptId: cleanText(body.attemptId, 180),
    resultId: cleanText(body.resultId, 180),
    jobId: cleanText(body.jobId, 180),
    selectedTeaCupId,
    selectedTeaCupName,
    selectedTeaCupTopic,
    question,
    nickname: cleanText(body.nickname, 40),
    concernTopic: cleanText(body.concernTopic, 80),
    birthInfo: cleanText(body.birthInfo, 160),
    birthDate: cleanText(body.birthDate, 20),
    birthTime: cleanText(body.birthTime, 12),
    gender: cleanText(body.gender, 20),
    calendarType: body.calendarType === "lunar" ? "lunar" : "solar",
    sukuyo: consultationMode === "sukuyo" ? body.sukuyo as FortuneTeaHouseConsultRequest["sukuyo"] : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const normalizedRequest = normalizeRequest(body);
    const generation = await generateFortuneTeaHouseConsultGeneration(normalizedRequest, process.env);

    return NextResponse.json({
      ok: true,
      result: {
        ...generation.result,
        resultId: generation.result.resultId || normalizedRequest.resultId || normalizedRequest.attemptId,
        consultationMode: normalizedRequest.consultationMode,
      },
      generationMeta: generation.generationMeta,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "연이가 상담문을 여는 중 잠시 멈췄어요. 다시 한 번 건네 주세요.",
      },
      { status: 400 },
    );
  }
}
