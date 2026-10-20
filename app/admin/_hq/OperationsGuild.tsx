"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, ExternalLink, ShieldCheck } from "lucide-react";
import { operationsAdvisors, WORDPRESS_EDITOR, missionHref } from "@/lib/admin-operations.mjs";
import { HQ_ART } from "./art";
import { HqImage } from "./components";
import type { HqSummary } from "./types";

export default function OperationsGuild({ data }: { data: HqSummary }) {
  const advisors = operationsAdvisors(data);
  const [selected, setSelected] = useState("yeoni");
  const advisor = advisors.find((item) => item.id === selected) || advisors[0];
  return (
    <section className="cd-ops-guild" aria-labelledby="ops-guild-title">
      <div className="cd-ops-guild__heading">
        <div><h2 id="ops-guild-title">오늘의 운영 길드</h2><p>한 번에 하나씩. 마스터와 다음 퀘스트를 골라요.</p></div>
        <Link href="/admin/wordpress/" className="cd-ops-link"><BookOpen size={17} aria-hidden="true" /> WordPress 작업실 <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className="cd-ops-guild__body">
        <div className="cd-ops-roster" role="group" aria-label="운영 마스터">
          {advisors.map((item) => (
            <button key={item.id} type="button"  id={`keeper-${item.id}`} aria-controls="keeper-dialogue" aria-pressed={item.id === selected}
              onClick={() => setSelected(item.id)} className="cd-ops-keeper">
              <HqImage art={HQ_ART[item.art as keyof typeof HQ_ART]} className="cd-ops-keeper__portrait" />
              <span><strong>{item.name}</strong><span>{item.role}</span></span>
              <small>{item.mood}</small>
            </button>
          ))}
        </div>
        <div className="cd-ops-dialogue" role="region" id="keeper-dialogue" aria-labelledby={`keeper-${advisor.id}`} tabIndex={0}>
          <div className="cd-ops-dialogue__scene">
            <HqImage art={HQ_ART[advisor.art as keyof typeof HQ_ART]} className="cd-ops-dialogue__portrait" />
            <span>{advisor.name} · {advisor.mood}</span>
          </div>
          <div className="cd-ops-dialogue__copy" aria-live="polite">
            <h3>{advisor.title}</h3><p>{advisor.body}</p>
            <small><ShieldCheck size={14} aria-hidden="true" /> {advisor.evidence}</small>
            <Link href={missionHref(advisor.mission)} className="cd-adm-btn cd-adm-btn--primary">{advisor.action} <ArrowRight size={16} aria-hidden="true" /></Link>
            <span className="cd-ops-disclosure">퀘스트를 추가한 뒤 증빙과 완료 기록으로 XP를 얻어요.</span>
          </div>
        </div>
      </div>
      <footer className="cd-ops-guild__footer"><span>현재 집중 채널 · WordPress</span><a href={WORDPRESS_EDITOR} target="_blank" rel="noopener noreferrer">블로그 편집기 열기 <ExternalLink size={14} aria-hidden="true" /></a></footer>
    </section>
  );
}
