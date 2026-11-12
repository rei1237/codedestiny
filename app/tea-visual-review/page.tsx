"use client";
// Temporary local inspection harness. Removed before delivery.
import { useState } from "react";
import TeaHouseResultSheet from "@/src/features/fortune-tea-house/components/TeaHouseResultSheet";
import ScentLoadingScene from "@/src/features/fortune-tea-house/components/ScentLoadingScene";
import DayMasterReading from "@/src/features/fortune-tea-house/components/DayMasterReading";
import TenGodSymbolCard from "@/src/features/fortune-tea-house/components/TenGodSymbolCard";
import { tenGods } from "@/src/features/fortune-tea-house/data/tenGods";
import { buildFortuneTeaHouseConsultResult } from "@/src/features/fortune-tea-house/lib/buildConsultResult";
import type { FortuneTeaHouseConsultMode } from "@/src/features/fortune-tea-house/data/consult";
import report from "@/src/features/fortune-tea-house/styles/tea-report.module.css";
import room from "@/src/features/fortune-tea-house/styles/tea-room.module.css";

const person = { name: "화면 검증", birthDate: "1991-02-20", calendarType: "solar" as const, gender: "male", birthTime: "08:30" };
export default function Review() {
  const [mode, setMode] = useState<FortuneTeaHouseConsultMode>("saju");
  const [status, setStatus] = useState<"running" | "complete" | "error">("running");
  const result = buildFortuneTeaHouseConsultResult({ consultationMode: mode, selectedTeaCupId: "lotus-moon", selectedTeaCupName: "연꽃 달차", selectedTeaCupTopic: "마음", question: "다음 선택을 차분히 정리하고 싶어요.", nickname: "화면 검증", birthDate: person.birthDate, birthTime: "08:30", gender: "male", calendarType: "solar", sajuCompatibility: { user: person, partner: { ...person, birthDate: "1992-09-02", gender: "female" }, relationshipType: "연인", focus: "대화" }, sukuyo: { user: person, partner: { ...person, birthDate: "1992-09-02", gender: "female" }, relationshipType: "연인" } });
  result.consultationMode = mode;
  result.consultationVersion = "tea-v2";
  result.resultId = "ui-review-mock";
  if (typeof window !== "undefined") (window as Window & { __teaReviewResult?: unknown }).__teaReviewResult = result;
  return <main style={{ background: "#24081a", padding: "24px 0", minHeight: "100vh" }}>
    <nav style={{ padding: 16, color: "white" }}>{(["saju", "sajuCompatibility", "tarot", "sukuyo"] as const).map(item => <button key={item} onClick={() => setMode(item)}>{item}</button>)}{(["running", "complete", "error"] as const).map(item => <button key={item} onClick={() => setStatus(item)}>{item}</button>)}</nav>
    <div id="loading-review"><ScentLoadingScene progress={{ percent: 45, label: status, message: "상담의 근거를 정리하고 있어요.", delayed: true, status }}/></div>
    <section className={room.checkpointReading} aria-label="저장된 상담 본문"><h2>먼저 준비된 상담</h2><p>아직 완성 전인 상담입니다. 저장된 부분부터 읽을 수 있어요.</p>{["명식의 핵심 근거", "함께일 때의 강점"].map(title => <details key={title}><summary>{title}</summary><p>서로의 속도가 다르게 느껴질 수 있어요. 먼저 대화를 나눌 시간을 정하고, 확인한 사실과 짐작을 구분해 보세요.</p></details>)}</section>
    <TeaHouseResultSheet result={result} readOnly honeyDrops={null} onRestart={() => {}} onShowTarot={() => {}} onEditBirthInfo={() => {}} onHoneyDropsChange={() => {}} onResultUpdate={() => {}}/>
    <section className={report.resultScene} id="all-symbols"><div className={report.resultSheet}>{tenGods.map(god => <TenGodSymbolCard key={god.id} tenGodId={god.id}/>)}</div></section>
    <section className={report.resultScene} id="all-day-masters"><div className={report.resultSheet}>{["갑","을","병","정","무","기","경","신","임","계"].map(value => <DayMasterReading value={value} key={value}/>)}</div></section>
  </main>;
}
