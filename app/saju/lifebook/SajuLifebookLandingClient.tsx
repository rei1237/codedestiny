"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const LifebookChapterViewer = dynamic(() => import("./LifebookChapterViewer"), { ssr: false });

const SAMPLE_CHAPTERS = [
  { id: 1, title: "제1장 — 사주 원국 완전 해설", content: "(여기에 실제 API 연동 시 챕터별 내용이 들어갑니다)" },
  { id: 2, title: "제2장 — 대운 흐름과 인생의 전환점", content: "(샘플) 대운 흐름 분석 내용" },
  { id: 3, title: "제3장 — 재물운과 직업의 길", content: "(샘플) 재물/직업 분석 내용" },
  { id: 4, title: "제4장 — 건강과 심리의 파동", content: "(샘플) 건강/심리 분석 내용" },
];

export default function SajuLifebookLandingClient() {
  const [chapters] = useState(SAMPLE_CHAPTERS);
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 0 64px" }}>
      <h1 style={{ fontSize: "2.1rem", fontWeight: 800, color: "#fcd34d", marginBottom: 18 }}>📜 인생의 책 — 프리미엄 사주 심층 분석</h1>
      <p style={{ color: "#e2e8f0", marginBottom: 18 }}>
        사주팔자 8글자로 운명의 흐름을 완전 해독하는 프리미엄 심층 분석 리포트입니다.<br/>
        <b>각 챕터별로 클릭해서 열람할 수 있으며, PDF 저장 시 Vertex AI 우선 + Gemini API 잔량 분산으로 생성됩니다.</b>
      </p>
      <div style={{ marginBottom: 32 }}>
        <ul style={{ color: "#f8fafc", fontSize: "1.08rem", lineHeight: 1.7 }}>
          <li>일주·용신·대운 완전 해독</li>
          <li>재물·직업·건강 운명 흐름 분석</li>
          <li>10년 대운 타이밍 로드맵</li>
          <li>개운 처방전 포함 · PDF 저장 가능</li>
        </ul>
      </div>
      <LifebookChapterViewer chapters={chapters} />
      <div style={{ marginTop: 38, color: "#fcd34d", fontSize: "0.98rem" }}>
        ※ 실제 분석은 결제 후 사주 정보 입력 시 자동 생성됩니다.<br/>
        ※ PDF 저장 시 Vertex AI 우선, 잔량 부족 시 Gemini API 키를 순차적으로 사용합니다.
      </div>
    </div>
  );
}
