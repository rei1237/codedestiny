"use client";

import { useState } from "react";
import type { DestinyBiasResultViewModel } from "../../lib/types";
import BiasDestinyScoreGauge from "../BiasDestinyScoreGauge";
import BiasDestinyElementChart from "../BiasDestinyElementChart";
import BiasDestinyFiveSections from "../BiasDestinyFiveSections";
import BiasFandomHeroCard from "../BiasFandomHeroCard";
import BiasFandomJourneyCard from "../BiasFandomJourneyCard";
import BiasFandomBehaviorSection from "../BiasFandomBehaviorSection";
import BiasFandomPersistenceCard from "../BiasFandomPersistenceCard";
import BiasFandomDetachmentCard from "../BiasFandomDetachmentCard";
import BiasFandomFinaleCard from "../BiasFandomFinaleCard";
import BiasDestinyMzZone from "../BiasDestinyMzZone";
import tabs from "../../report-tabs.module.css";

type TabKey = "report" | "fandom" | "meme";

const TABS: { key: TabKey; label: string; hint: string }[] = [
  { key: "report", label: "케미 리포트", hint: "점수·오행·5가지 풀이" },
  { key: "fandom", label: "팬덤 성향", hint: "내 덕질 캐릭터" },
  { key: "meme", label: "밈 존", hint: "케미 4글자·전생 썰" },
];

type Props = {
  vm: DestinyBiasResultViewModel;
  onOpen?: (tab: TabKey) => void;
};

/** 긴 리포트(점수 게이지·오행·5탭·팬덤 성향·밈)를 접힘 탭 3개로 묶는다. 첫 화면은 카드와 공유에 양보한다. */
export default function ChemiReportTabs({ vm, onOpen }: Props) {
  const [open, setOpen] = useState<TabKey | null>(null);

  return (
    <section className={tabs.wrap} aria-labelledby="dbk-report-tabs-title">
      <h3 id="dbk-report-tabs-title" className={tabs.title}>
        <span>Full Report</span>더 깊게 파 보기
      </h3>
      <div className={tabs.list}>
        {TABS.map((tab) => {
          const active = open === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={`${tabs.tab} ${active ? tabs.tabActive : ""}`}
              aria-expanded={active}
              aria-controls={`dbk-report-panel-${tab.key}`}
              onClick={() => {
                setOpen(active ? null : tab.key);
                if (!active) onOpen?.(tab.key);
              }}
            >
              <b>{tab.label}</b>
              <small>{tab.hint}</small>
            </button>
          );
        })}
      </div>

      {open === "report" ? (
        <div id="dbk-report-panel-report" className={tabs.panel}>
          <BiasDestinyScoreGauge vm={vm} />
          <BiasDestinyElementChart vm={vm} />
          <BiasDestinyFiveSections vm={vm} />
        </div>
      ) : null}
      {open === "fandom" ? (
        <div id="dbk-report-panel-fandom" className={tabs.panel}>
          <BiasFandomHeroCard vm={vm} />
          <BiasFandomJourneyCard vm={vm} />
          <BiasFandomBehaviorSection vm={vm} />
          <BiasFandomPersistenceCard vm={vm} />
          <BiasFandomDetachmentCard vm={vm} />
          <BiasFandomFinaleCard vm={vm} />
        </div>
      ) : null}
      {open === "meme" ? (
        <div id="dbk-report-panel-meme" className={tabs.panel}>
          <BiasDestinyMzZone vm={vm} />
        </div>
      ) : null}
    </section>
  );
}
