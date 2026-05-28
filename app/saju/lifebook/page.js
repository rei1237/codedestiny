"use client";

import { useMemo, useState } from "react";

const STEP_LABELS = [
  "기본 정보를 정리하는 중입니다",
  "결제/권한 확인을 진행하는 중입니다",
  "사주 원국을 계산하는 중입니다",
  "13개의 인생 챕터를 구성하는 중입니다",
  "상담문을 프리미엄 문장으로 다듬는 중입니다",
  "PDF 책자로 편집하는 중입니다",
];

const CHAPTER_ROADMAP = [
  "1. 사주 원국 완전 해설",
  "2. 월지·일간·조후 기질 분석",
  "3. 용신·희신 운용 전략",
  "4. 대운 정밀 분석",
  "5. 격국과 사회적 소명",
  "6. 관계의 전략",
  "7. 연애·결혼 완전 분석",
  "8. 재물과 현실 감각",
  "9. 직업·사업·커리어",
  "10. 건강·멘탈·생활 리듬",
  "11. 위기와 전환점",
  "12. 숨은 복과 귀인",
  "13. 최종 운명 로드맵",
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

function chapterPreview(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  return raw.length > 140 ? `${raw.slice(0, 140)}...` : raw;
}

export default function SajuLifebookPage() {
  const [form, setForm] = useState({
    name: "",
    gender: "female",
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

  const progressPercent = useMemo(() => {
    const total = STEP_LABELS.length;
    return Math.max(0, Math.min(100, Math.round(((stepIndex + 1) / total) * 100)));
  }, [stepIndex]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
import { redirect } from "next/navigation";

export default function SajuLifebookPage() {
  redirect("/?action=openLifeBookModal");
}
    setLoading(true);
