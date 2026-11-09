"use client";

import { useEffect } from "react";

import type { ProfileDiarySection } from "@/app/profile/diary/_components/ProfileDiaryBridge";

function profileDiaryHref(section: ProfileDiarySection) {
  const target = new URL("/", window.location.origin);
  target.searchParams.set("action", "dpOpenList");
  target.searchParams.set("view", "diary");
  target.searchParams.set("section", section);
  const day = new URLSearchParams(window.location.search).get("d");
  if (/^\d{4}-\d{2}-\d{2}$/.test(day || "")) target.searchParams.set("d", day as string);
  return `${target.pathname}${target.search}`;
}

export default function DiaryProfileRedirect({ section }: { section: ProfileDiarySection }) {
  useEffect(() => {
    window.location.replace(profileDiaryHref(section));
  }, [section]);

  return (
    <main style={{ maxWidth: 560, margin: "18vh auto", padding: 24, textAlign: "center" }}>
      <h1>프로필의 운기 기록으로 이동하고 있어요</h1>
      <p>기존 기록은 그대로 이어집니다.</p>
      <a href={`/?action=dpOpenList&view=diary&section=${section}`}>운기 기록 열기</a>
    </main>
  );
}
