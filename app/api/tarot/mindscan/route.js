import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Gemini API 키 선택 (1~4 중 라운드로빈)
function getGeminiKey() {
  const keys = [
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
  ].filter(Boolean);
  if (keys.length === 0) return null;
  const index = Math.floor(Math.random() * keys.length);
  return keys[index];
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { pairs } = body;

    if (!Array.isArray(pairs) || pairs.length === 0) {
      return NextResponse.json(
        { ok: false, message: "카드 페어 데이터가 필요합니다." },
        { status: 400 }
      );
    }

    // Gemini API 키 확인
    const apiKey = getGeminiKey();
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, message: "Gemini API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 마인드 스캔 타로 리딩 프롬프트 생성
    const prompt = `당신은 마인드 스캔 타로 마스터입니다. 사용자가 선택한 타로 카드 페어를 바탕으로 상대방의 진짜 속마음, 감정, 욕구를 심층 분석하여 해석해주세요.

분석할 카드 페어:
${pairs.map((p, i) => `${i + 1}. ${p.name || p.id} (방향: ${p.orientation || '정방향'})`).join("\n")}

다음 형식으로 리딩을 제공해주세요:
1. 전체적인 상대방의 마음 상태 요약
2. 각 카드별 상세 해석 및 상대방의 내면에 대한 통찰
3. 관계에 대한 조언 및 제안

따뜻하고 공감하는 어조로, 구체적이고 실용적인 조언을 포함해주세요.`;

    // Gemini API 호출
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2000,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[tarot/mindscan] Gemini API error:", errorData);
      return NextResponse.json(
        { ok: false, message: "리딩 생성 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const reading = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return NextResponse.json({
      ok: true,
      reading,
      pairs,
    });
  } catch (error) {
    console.error("[tarot/mindscan] Error:", error);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
