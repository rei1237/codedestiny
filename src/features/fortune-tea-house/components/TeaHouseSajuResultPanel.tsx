"use client";

import type { CSSProperties } from "react";
import type { FortuneTeaHouseConsultResponse } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import LlmParagraphs from "@/components/fortune/LlmParagraphs";
import AssetImage from "./AssetImage";
import FiveElementBalance from "./FiveElementBalance";
import SajuPillarBoard from "./SajuPillarBoard";
import TeaHouseButton from "./TeaHouseButton";
import TenGodSymbolCard from "./TenGodSymbolCard";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type TeaHouseSajuResultPanelProps = {
  result: FortuneTeaHouseConsultResponse;
  onShowTarot: () => void;
  onEditBirthInfo: () => void;
  showTarotAction?: boolean;
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    {name}·{cup} 은 런타임 치환 자리다. 한국어는 조사가 붙지만 다른 언어는 어순이 달라
    문장 전체를 한 키로 둔다. "Asia/Seoul" 은 IANA 타임존 식별자라 번역 대상이 아니다. */
const KO = {
  calendar: { lunar: "음력", solar: "양력", unknown: "달력 정보 없음" },
  timeUnknown: "출생시간 미상",
  eyebrow: "연이가 펼친 달빛 명식",
  title: "사주가 비춘 오늘의 기본 흐름",
  emptyLead: "출생정보가 충분하지 않아 오늘은 사주의 세부 흐름을 펼치지 않았어요. 연이는 보이는 정보와 지금 적어주신 고민의 결만 차분히 읽어드릴게요.",
  lead: "연이가 찻집의 조용한 빛 아래에서 손님의 사주 한 잔을 펼쳐 보았어요.",
  yeoniAlt: "사주 결과 시트를 펼치는 인간 상담사 연이",
  lockedEyebrow: "잠시 접힌 달빛 명식",
  lockedTitle: "출생정보 없음",
  tarotContinue: "타로 중심으로 계속 보기",
  editBirth: "출생정보 다시 입력",
  summaryAria: "손님의 사주 한 잔",
  guestFallback: "손님",
  summaryHeading: "{name}의 사주 한 잔",
  birthDateLabel: "태어난 날",
  birthDateEmpty: "미입력",
  birthTimeLabel: "태어난 시간",
  calendarFieldLabel: "달의 기준",
  dayMasterLabel: "일간",
  folded: "조용히 접힘",
  elementsLabel: "대표 기운",
  elementsEmpty: "천천히 확인",
  tenGodFieldLabel: "오늘 들어온 십성",
  birthPlaceLabel: "출생지",
  birthPlaceEmpty: "선택 안 함",
  timezoneLabel: "시간대",
  gaugeEyebrow: "{cup}의 사주 흐름",
  gaugeTitle: "찻잔별 상태 게이지",
  tenGodEyebrow: "사주가 초대한 오늘의 손님",
  tenGodTitle: "오늘 찻집에 들어온 십성",
  tenGodEmpty: "오늘은 십성 손님의 모습이 또렷하게 떠오르지 않았어요. 연이는 보이지 않는 흐름을 억지로 꾸미지 않고, 지금 드러난 결만 조용히 읽어드릴게요.",
  readingEyebrow: "인간 상담사 연이의 해석",
  readingTitle: "연이가 읽은 사주의 기본 흐름",
  deepEyebrow: "상담 결과가 완성되었습니다",
  deepTitle: "오늘의 사주 상담지",
  adviceLabel: "한 문장 조언",
  cautionEyebrow: "주의할 기운",
  cautionTitle: "조금 천천히 살펴야 할 결",
  actionEyebrow: "오늘의 행동 처방",
  actionTitle: "사주가 권하는 한 걸음",
  tarotReadyEyebrow: "타로와 만날 준비",
  tarotReadyTitle: "찻잔 위에 다음 상징이 떠오를 차례예요",
  tarotOpen: "타로 카드 펼치기",
};

// 비교 대상("lunar"·"solar")은 데이터 값이라 그대로 두고, 돌려주는 라벨만 사전을 태운다.
function calendarLabel(value: "solar" | "lunar" | undefined, copy: typeof KO) {
  if (value === "lunar") return copy.calendar.lunar;
  if (value === "solar") return copy.calendar.solar;
  return copy.calendar.unknown;
}

function timeLabel(hasBirthTime: boolean | undefined, birthTime: string | undefined, copy: typeof KO) {
  return hasBirthTime && birthTime ? birthTime : copy.timeUnknown;
}

export default function TeaHouseSajuResultPanel({ result, onShowTarot, onEditBirthInfo, showTarotAction = true }: TeaHouseSajuResultPanelProps) {
  const copy = useTeaHouseCopy("sajuResult", KO);
  const saju = result.saju;
  const birth = saju.birthSummary;
  const primaryTenGod = saju.primaryTenGod;
  const deepSections = saju.deepSections || [];
  const categoryGauges = result.emotionAnalysis || [];
  if (!saju.available) {
    return (
      <section className={styles.sajuResultPanel} data-available="false" aria-labelledby="sajuResultPanelTitle">
        <header className={styles.sajuResultHeader}>
          <div>
            <span>{copy.eyebrow}</span>
            <h3 id="sajuResultPanelTitle">{copy.title}</h3>
            <p>{copy.emptyLead}</p>
          </div>
          <AssetImage
            className={styles.sajuResultYeoni}
            src={fortuneTeaHouseAssets.yeoni.transparent.bust}
            fallbackSrc={fortuneTeaHouseAssets.yeoni.bust}
            alt={copy.yeoniAlt}
          />
        </header>

        <div className={styles.sajuLockedGrid}>
          <article className={styles.sajuLockedMoonCard}>
            <span>{copy.lockedEyebrow}</span>
            <strong>{copy.lockedTitle}</strong>
            <p>{saju.cautionReading}</p>
          </article>
          <SajuPillarBoard pillars={saju.pillars} />
        </div>

        <div className={styles.sajuResultActions}>
          {showTarotAction ? <TeaHouseButton onClick={onShowTarot}>{copy.tarotContinue}</TeaHouseButton> : null}
          <TeaHouseButton variant="secondary" onClick={onEditBirthInfo}>
            {copy.editBirth}
          </TeaHouseButton>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.sajuResultPanel} data-available="true" aria-labelledby="sajuResultPanelTitle">
      <header className={styles.sajuResultHeader}>
        <div>
          <span>{copy.eyebrow}</span>
          <h3 id="sajuResultPanelTitle">{copy.title}</h3>
          <p>{copy.lead}</p>
        </div>
        <AssetImage
          className={styles.sajuResultYeoni}
          src={fortuneTeaHouseAssets.yeoni.transparent.bust}
          fallbackSrc={fortuneTeaHouseAssets.yeoni.bust}
          alt={copy.yeoniAlt}
        />
      </header>

      <section className={styles.sajuSummaryCard} aria-label={copy.summaryAria}>
        <div className={styles.sajuSummaryIntro}>
          <span>{copy.summaryHeading.replace("{name}", birth?.nickname || copy.guestFallback)}</span>
          <strong>{saju.title}</strong>
          <LlmParagraphs text={saju.summary} />
        </div>
        <dl className={styles.sajuSummaryGrid}>
          <div>
            <dt>{copy.birthDateLabel}</dt>
            <dd>{birth?.birthDate || copy.birthDateEmpty}</dd>
          </div>
          <div>
            <dt>{copy.birthTimeLabel}</dt>
            <dd>{timeLabel(birth?.hasBirthTime, birth?.birthTime, copy)}</dd>
          </div>
          <div>
            <dt>{copy.calendarFieldLabel}</dt>
            <dd>{calendarLabel(birth?.calendarType, copy)}</dd>
          </div>
          <div>
            <dt>{copy.dayMasterLabel}</dt>
            <dd>{saju.dayMaster || copy.folded}</dd>
          </div>
          <div>
            <dt>{copy.elementsLabel}</dt>
            <dd>{saju.dominantElements?.length ? saju.dominantElements.join(" · ") : copy.elementsEmpty}</dd>
          </div>
          <div>
            <dt>{copy.tenGodFieldLabel}</dt>
            <dd>{primaryTenGod ? primaryTenGod.nameKo : copy.folded}</dd>
          </div>
          <div>
            <dt>{copy.birthPlaceLabel}</dt>
            <dd>{birth?.birthPlace || copy.birthPlaceEmpty}</dd>
          </div>
          <div>
            <dt>{copy.timezoneLabel}</dt>
            <dd>{birth?.timezone || "Asia/Seoul"}</dd>
          </div>
        </dl>
      </section>

      <SajuPillarBoard pillars={saju.pillars} />
      <FiveElementBalance elements={saju.fiveElements} />

      {categoryGauges.length ? (
        <section className={styles.sajuPanelSection} aria-labelledby="sajuCategoryGaugeTitle">
          <div className={styles.sajuPanelSectionHeader}>
            <span>{copy.gaugeEyebrow.replace("{cup}", result.teaCup.name)}</span>
            <h4 id="sajuCategoryGaugeTitle">{copy.gaugeTitle}</h4>
          </div>
          <div className={styles.resultEmotionList}>
            {categoryGauges.map((item) => (
              <div className={styles.resultEmotionItem} data-tone={item.tone} key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.value}%</span>
                </div>
                <div className={styles.resultGaugeTrack}>
                  <span style={{ "--gauge-value": `${item.value}%` } as CSSProperties} />
                </div>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.sajuPanelSection} aria-labelledby="sajuTenGodTitle">
        <div className={styles.sajuPanelSectionHeader}>
          <span>{copy.tenGodEyebrow}</span>
          <h4 id="sajuTenGodTitle">{copy.tenGodTitle}</h4>
        </div>
        {primaryTenGod ? (
          <div className={styles.sajuTenGodLayout}>
            <TenGodSymbolCard tenGodId={primaryTenGod.id} size="lg" selected />
            <div className={styles.sajuTenGodReading}>
              <span>{primaryTenGod.roleInTeaHouse}</span>
              <strong>{primaryTenGod.nameKo}</strong>
              <LlmParagraphs text={primaryTenGod.reading} />
              {saju.secondaryTenGods?.length ? (
                <div className={styles.sajuTenGodChips}>
                  {saju.secondaryTenGods.map((tenGod) => (
                    <TenGodSymbolCard key={tenGod.id} tenGodId={tenGod.id} size="sm" showDescription={false} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <p className={styles.sajuMutedText}>{copy.tenGodEmpty}</p>
        )}
      </section>

      <section className={styles.sajuPanelSection} aria-labelledby="sajuYeoniReadingTitle">
        <div className={styles.sajuPanelSectionHeader}>
          <span>{copy.readingEyebrow}</span>
          <h4 id="sajuYeoniReadingTitle">{copy.readingTitle}</h4>
        </div>
        <div className={styles.sajuReadingText}>
          <LlmParagraphs text={saju.summary} />
          {saju.keyPoints.map((point) => (
            <span key={point}>{point}</span>
          ))}
        </div>
      </section>

      {deepSections.length ? (
        <section className={styles.sajuDeepResultSection} aria-labelledby="sajuDeepResultTitle">
          <div className={styles.sajuPanelSectionHeader}>
            <span>{copy.deepEyebrow}</span>
            <h4 id="sajuDeepResultTitle">{copy.deepTitle}</h4>
          </div>
          <div className={styles.sajuDeepResultGrid}>
            {deepSections.map((section) => (
              <article className={styles.sajuDeepResultCard} data-tone={section.tone || "summary"} key={section.id || section.title}>
                <span>{section.title}</span>
                <LlmParagraphs text={section.body} />
              </article>
            ))}
          </div>
          {saju.oneLineAdvice ? (
            <aside className={styles.sajuOneLineAdvice}>
              <span>{copy.adviceLabel}</span>
              <p>{saju.oneLineAdvice}</p>
            </aside>
          ) : null}
        </section>
      ) : null}

      <section className={styles.sajuCautionBlock} aria-labelledby="sajuCautionTitle">
        <span>{copy.cautionEyebrow}</span>
        <h4 id="sajuCautionTitle">{copy.cautionTitle}</h4>
        <LlmParagraphs text={saju.cautionReading} />
      </section>

      <section className={styles.sajuActionBlock} aria-labelledby="sajuActionTitle">
        <span>{copy.actionEyebrow}</span>
        <h4 id="sajuActionTitle">{copy.actionTitle}</h4>
        <LlmParagraphs text={saju.actionPrescription} />
      </section>

      {showTarotAction ? (
        <section className={styles.sajuTarotReadyCard} aria-labelledby="sajuTarotReadyTitle">
          <div>
            <span>{copy.tarotReadyEyebrow}</span>
            <h4 id="sajuTarotReadyTitle">{copy.tarotReadyTitle}</h4>
            <p>{saju.tarotBridgeReady}</p>
          </div>
          <TeaHouseButton onClick={onShowTarot}>{copy.tarotOpen}</TeaHouseButton>
        </section>
      ) : null}
    </section>
  );
}
