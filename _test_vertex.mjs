// Vertex AI 연결 테스트 스크립트
// 실행: node _test_vertex.mjs
// 키 파일은 환경 변수(GOOGLE_APPLICATION_CREDENTIALS)로만 참조 — 경로를 코드에 하드코딩하지 않음

import { VertexAI } from "@google-cloud/vertexai";

const projectId = "vertex-492922";
const location  = "us-central1";
const model     = "gemini-1.5-flash"; // 빠른 테스트용 (Pro보다 할당량 여유)

const vertexAI = new VertexAI({ project: projectId, location });
const generativeModel = vertexAI.getGenerativeModel({ model });

console.log("▶ Vertex AI 연결 중...");
try {
  const result = await generativeModel.generateContent(
    "안녕! 한 문장으로 자기소개 해줘."
  );
  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "(응답 없음)";
  console.log("✅ 연결 성공!");
  console.log("Gemini 응답:", text);
} catch (err) {
  console.error("❌ 연결 실패:", err.message);
  if (err.message.includes("credentials")) {
    console.log("→ GOOGLE_APPLICATION_CREDENTIALS 경로를 확인하세요.");
  } else if (err.message.includes("quota")) {
    console.log("→ API 할당량 초과. Google Cloud Console에서 Vertex AI API 활성화 여부를 확인하세요.");
  }
}
