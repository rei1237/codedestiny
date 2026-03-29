import { NextResponse } from "next/server";

const GEMINI_ENDPOINT_TEMPLATE =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

function pickGeminiApiKeys() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GOOGLE_API_KEY_3,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

function parseGeminiText(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim()) return part.text.trim();
    }
  }
  return "";
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const systemPrompt = String(body?.systemPrompt || "").trim();
    const userPrompt = String(body?.userPrompt || "").trim();

    if (!systemPrompt || !userPrompt) {
      return NextResponse.json(
        { ok: false, message: "systemPrompt/userPrompt가 필요합니다." },
        { status: 400 }
      );
    }

    const keys = pickGeminiApiKeys();
    if (!keys.length) {
      return NextResponse.json(
        { ok: false, message: "서버 Gemini 키 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const model = String(process.env.YOGA_GURU_GEMINI_MODEL || process.env.PSYCHO_ANALYSIS_GEMINI_MODEL || "gemini-2.5-flash").trim();
    const endpoint = GEMINI_ENDPOINT_TEMPLATE.replace("{model}", encodeURIComponent(model));

    let lastError = null;
    for (const key of keys) {
      try {
        const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: userPrompt }],
              },
            ],
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const msg = payload?.error?.message || payload?.message || `Gemini 요청 실패 (${response.status})`;
          lastError = new Error(msg);
          continue;
        }

        const text = parseGeminiText(payload);
        if (!text) {
          lastError = new Error("모델 응답이 비어 있습니다.");
          continue;
        }

        return NextResponse.json({ ok: true, text, model });
      } catch (error) {
        lastError = error;
      }
    }

    return NextResponse.json(
      { ok: false, message: String(lastError?.message || "요가 코스 생성에 실패했습니다.") },
      { status: 502 }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: String(error?.message || "요청 처리에 실패했습니다.") },
      { status: 500 }
    );
  }
}
