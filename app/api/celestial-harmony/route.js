import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { cards, planets, question } = body;

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json(
        { ok: false, message: "카드 데이터가 필요합니다." },
        { status: 400 }
      );
    }

    // OpenAI API 키 확인
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, message: "API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 11행성 타로 리딩 프롬프트 생성
    const systemPrompt = `당신은 천체의 선율 타로 마스터입니다. 11개 행성(태양, 달, 수성, 금성, 화성, 목성, 토성, 천왕성, 해왕성, 명왕성, 지구)의 에너지와 타로 카드를 결합하여 심층 해석을 제공합니다.

각 행성은 다음 영역을 담당합니다:
- 태양: 자아, 정체성, 의지
- 달: 감정, 무의식, 본능
- 수성: 의사소통, 사고, 학습
- 금성: 사랑, 아름다움, 조화
- 화성: 행동, 용기, 열정
- 목성: 확장, 행운, 지혜
- 토성: 책임, 경계, 교훈
- 천왕성: 혁신, 자유, 변화
- 해왕성: 꿈, 직관, 영성
- 명왕성: 변형, 내면 힘, 재생
- 지구: 현실, 안정, 육체

타로 카드와 행성 에너지를 결합하여 통합적이고 깊이 있는 리딩을 제공하세요.`;

    const userPrompt = `질문: ${question || "현재 상황에 대한 조언"}

뽑은 카드: ${cards.map((c, i) => `${i + 1}. ${c.name || c.id} (행성: ${planets?.[i] || "미지정"})`).join("\n")}

각 카드와 해당 행성 에너지를 결합하여 해석해주세요. 전체적인 조언과 통찰을 포함해주세요.`;

    // OpenAI API 호출
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[celestial-harmony] OpenAI API error:", errorData);
      return NextResponse.json(
        { ok: false, message: "리딩 생성 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const reading = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      ok: true,
      reading,
      cards,
      planets: planets || [],
    });
  } catch (error) {
    console.error("[celestial-harmony] Error:", error);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
