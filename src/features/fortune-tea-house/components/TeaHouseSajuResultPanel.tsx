"use client";

import type { CSSProperties } from "react";
import type { FortuneTeaHouseConsultResponse } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import AssetImage from "./AssetImage";
import FiveElementBalance from "./FiveElementBalance";
import SajuPillarBoard from "./SajuPillarBoard";
import TeaHouseButton from "./TeaHouseButton";
import TenGodSymbolCard from "./TenGodSymbolCard";
import styles from "../styles/fortune-tea-house.module.css";

type TeaHouseSajuResultPanelProps = {
  result: FortuneTeaHouseConsultResponse;
  onShowTarot: () => void;
  onEditBirthInfo: () => void;
  showTarotAction?: boolean;
};

function calendarLabel(value?: "solar" | "lunar") {
  if (value === "lunar") return "음력";
  if (value === "solar") return "양력";
  return "달력 정보 없음";
}

function timeLabel(hasBirthTime?: boolean, birthTime?: string) {
  return hasBirthTime && birthTime ? birthTime : "출생시간 미상";
}

export default function TeaHouseSajuResultPanel({ result, onShowTarot, onEditBirthInfo, showTarotAction = true }: TeaHouseSajuResultPanelProps) {
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
            <span>연이가 펼친 달빛 명식</span>
            <h3 id="sajuResultPanelTitle">사주가 비춘 오늘의 기본 흐름</h3>
            <p>출생정보가 충분하지 않아 오늘은 사주의 세부 흐름을 펼치지 않았어요. 연이는 보이는 정보와 지금 적어주신 고민의 결만 차분히 읽어드릴게요.</p>
          </div>
          <AssetImage
            className={styles.sajuResultYeoni}
            src={fortuneTeaHouseAssets.yeoni.transparent.bust}
            fallbackSrc={fortuneTeaHouseAssets.yeoni.bust}
            alt="사주 결과 시트를 펼치는 인간 상담사 연이"
          />
        </header>

        <div className={styles.sajuLockedGrid}>
          <article className={styles.sajuLockedMoonCard}>
            <span>잠시 접힌 달빛 명식</span>
            <strong>출생정보 없음</strong>
            <p>{saju.cautionReading}</p>
          </article>
          <SajuPillarBoard pillars={saju.pillars} />
        </div>

        <div className={styles.sajuResultActions}>
          {showTarotAction ? <TeaHouseButton onClick={onShowTarot}>타로 중심으로 계속 보기</TeaHouseButton> : null}
          <TeaHouseButton variant="secondary" onClick={onEditBirthInfo}>
            출생정보 다시 입력
          </TeaHouseButton>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.sajuResultPanel} data-available="true" aria-labelledby="sajuResultPanelTitle">
      <header className={styles.sajuResultHeader}>
        <div>
          <span>연이가 펼친 달빛 명식</span>
          <h3 id="sajuResultPanelTitle">사주가 비춘 오늘의 기본 흐름</h3>
          <p>연이가 찻집의 조용한 빛 아래에서 손님의 사주 한 잔을 펼쳐 보았어요.</p>
        </div>
        <AssetImage
          className={styles.sajuResultYeoni}
          src={fortuneTeaHouseAssets.yeoni.transparent.bust}
          fallbackSrc={fortuneTeaHouseAssets.yeoni.bust}
          alt="사주 결과 시트를 펼치는 인간 상담사 연이"
        />
      </header>

      <section className={styles.sajuSummaryCard} aria-label="손님의 사주 한 잔">
        <div className={styles.sajuSummaryIntro}>
          <span>{birth?.nickname || "손님"}의 사주 한 잔</span>
          <strong>{saju.title}</strong>
          <p>{saju.summary}</p>
        </div>
        <dl className={styles.sajuSummaryGrid}>
          <div>
            <dt>태어난 날</dt>
            <dd>{birth?.birthDate || "미입력"}</dd>
          </div>
          <div>
            <dt>태어난 시간</dt>
            <dd>{timeLabel(birth?.hasBirthTime, birth?.birthTime)}</dd>
          </div>
          <div>
            <dt>달의 기준</dt>
            <dd>{calendarLabel(birth?.calendarType)}</dd>
          </div>
          <div>
            <dt>일간</dt>
            <dd>{saju.dayMaster || "조용히 접힘"}</dd>
          </div>
          <div>
            <dt>대표 기운</dt>
            <dd>{saju.dominantElements?.length ? saju.dominantElements.join(" · ") : "천천히 확인"}</dd>
          </div>
          <div>
            <dt>오늘 들어온 십성</dt>
            <dd>{primaryTenGod ? primaryTenGod.nameKo : "조용히 접힘"}</dd>
          </div>
          <div>
            <dt>출생지</dt>
            <dd>{birth?.birthPlace || "선택 안 함"}</dd>
          </div>
          <div>
            <dt>시간대</dt>
            <dd>{birth?.timezone || "Asia/Seoul"}</dd>
          </div>
        </dl>
      </section>

      <SajuPillarBoard pillars={saju.pillars} />
      <FiveElementBalance elements={saju.fiveElements} />

      {categoryGauges.length ? (
        <section className={styles.sajuPanelSection} aria-labelledby="sajuCategoryGaugeTitle">
          <div className={styles.sajuPanelSectionHeader}>
            <span>{result.teaCup.name}의 사주 흐름</span>
            <h4 id="sajuCategoryGaugeTitle">찻잔별 상태 게이지</h4>
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
          <span>사주가 초대한 오늘의 손님</span>
          <h4 id="sajuTenGodTitle">오늘 찻집에 들어온 십성</h4>
        </div>
        {primaryTenGod ? (
          <div className={styles.sajuTenGodLayout}>
            <TenGodSymbolCard tenGodId={primaryTenGod.id} size="lg" selected />
            <div className={styles.sajuTenGodReading}>
              <span>{primaryTenGod.roleInTeaHouse}</span>
              <strong>{primaryTenGod.nameKo}</strong>
              <p>{primaryTenGod.reading}</p>
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
          <p className={styles.sajuMutedText}>오늘은 십성 손님의 모습이 또렷하게 떠오르지 않았어요. 연이는 보이지 않는 흐름을 억지로 꾸미지 않고, 지금 드러난 결만 조용히 읽어드릴게요.</p>
        )}
      </section>

      <section className={styles.sajuPanelSection} aria-labelledby="sajuYeoniReadingTitle">
        <div className={styles.sajuPanelSectionHeader}>
          <span>인간 상담사 연이의 해석</span>
          <h4 id="sajuYeoniReadingTitle">연이가 읽은 사주의 기본 흐름</h4>
        </div>
        <div className={styles.sajuReadingText}>
          <p>{saju.summary}</p>
          {saju.keyPoints.map((point) => (
            <span key={point}>{point}</span>
          ))}
        </div>
      </section>

      {deepSections.length ? (
        <section className={styles.sajuDeepResultSection} aria-labelledby="sajuDeepResultTitle">
          <div className={styles.sajuPanelSectionHeader}>
            <span>상담 결과가 완성되었습니다</span>
            <h4 id="sajuDeepResultTitle">오늘의 사주 상담지</h4>
          </div>
          <div className={styles.sajuDeepResultGrid}>
            {deepSections.map((section) => (
              <article className={styles.sajuDeepResultCard} data-tone={section.tone || "summary"} key={section.id || section.title}>
                <span>{section.title}</span>
                <p>{section.body}</p>
              </article>
            ))}
          </div>
          {saju.oneLineAdvice ? (
            <aside className={styles.sajuOneLineAdvice}>
              <span>한 문장 조언</span>
              <p>{saju.oneLineAdvice}</p>
            </aside>
          ) : null}
        </section>
      ) : null}

      <section className={styles.sajuCautionBlock} aria-labelledby="sajuCautionTitle">
        <span>주의할 기운</span>
        <h4 id="sajuCautionTitle">조금 천천히 살펴야 할 결</h4>
        <p>{saju.cautionReading}</p>
      </section>

      <section className={styles.sajuActionBlock} aria-labelledby="sajuActionTitle">
        <span>오늘의 행동 처방</span>
        <h4 id="sajuActionTitle">사주가 권하는 한 걸음</h4>
        <p>{saju.actionPrescription}</p>
      </section>

      {showTarotAction ? (
        <section className={styles.sajuTarotReadyCard} aria-labelledby="sajuTarotReadyTitle">
          <div>
            <span>타로와 만날 준비</span>
            <h4 id="sajuTarotReadyTitle">찻잔 위에 다음 상징이 떠오를 차례예요</h4>
            <p>{saju.tarotBridgeReady}</p>
          </div>
          <TeaHouseButton onClick={onShowTarot}>타로 카드 펼치기</TeaHouseButton>
        </section>
      ) : null}
    </section>
  );
}
