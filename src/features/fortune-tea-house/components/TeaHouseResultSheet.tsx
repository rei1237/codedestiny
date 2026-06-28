"use client";

import type { CSSProperties } from "react";
import type { FortuneTeaHouseConsultResponse } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import { getTenGodMeta } from "../data/tenGods";
import AssetImage from "./AssetImage";
import TarotAssetCard from "./TarotAssetCard";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import TenGodSymbolCard from "./TenGodSymbolCard";
import YeoniDialogueActor from "./YeoniDialogueActor";
import styles from "../styles/fortune-tea-house.module.css";

type TeaHouseResultSheetProps = {
  result: FortuneTeaHouseConsultResponse;
  onRestart: () => void;
  onReady: () => void;
};

export default function TeaHouseResultSheet({ result, onRestart, onReady }: TeaHouseResultSheetProps) {
  const direction = result.tarot.orientation === "upright" ? "정방향" : "역방향";
  const saju = result.saju || {
    available: false,
    title: "사주가 말하는 기본 흐름",
    summary: "출생정보가 충분하지 않아 오늘은 현재 고민과 타로, 찻잔의 흐름을 중심으로 읽어드릴게요.",
    keyPoints: ["현재 고민과 찻잔, 타로 흐름 중심으로 읽었습니다."],
  };
  const synthesis = result.synthesis || {
    title: "연이가 읽은 두 흐름의 접점",
    summary: "찻잔과 타로가 지금 마음의 방향을 함께 비춥니다.",
    sajuTarotBridge: "오늘은 현재 고민과 카드의 상징을 중심으로, 마음이 덜 다치게 움직일 수 있는 다음 한 걸음을 살핍니다.",
  };
  const tenGodSnapshot = saju.tenGodSnapshot;
  const primaryTenGodId = tenGodSnapshot?.available ? tenGodSnapshot.primaryTenGod : undefined;
  const secondaryTenGodIds = tenGodSnapshot?.available ? tenGodSnapshot.secondaryTenGods || [] : [];
  const primaryTenGodMeta = primaryTenGodId ? getTenGodMeta(primaryTenGodId) : null;
  const resultSheetStyle = {
    "--tea-result-sheet": `url("${fortuneTeaHouseAssets.ui.resultSheet}")`,
  } as CSSProperties;

  return (
    <section className={styles.resultScene} aria-labelledby="teaResultTitle">
      <aside className={styles.resultYeoniPanel}>
        <AssetImage className={styles.resultFullYeoni} src={fortuneTeaHouseAssets.yeoni.full} alt="상담 결과를 들려주는 연이" priority />
        <YeoniDialogueActor mood="closing" isSpeaking cueText={result.closingLine} className={styles.resultYeoniActor} priority />
        <AssetImage className={styles.resultBubbleAsset} src={fortuneTeaHouseAssets.yeoni.bubble} alt="연이 말풍선 장식" />
        <TeaHouseDialogueBox speaker="연이" text={result.closingLine} />
      </aside>

      <article className={styles.resultSheet} style={resultSheetStyle}>
        <header className={styles.resultHeader}>
          <p className={styles.sceneEyebrow}>연이가 읽어 준 오늘의 찻잔</p>
          <h2 id="teaResultTitle">{result.sessionTitle}</h2>
          <p>{result.questionSummary}</p>
        </header>

        <div className={styles.resultSummaryGrid}>
          <div>
            <span>선택한 찻잔</span>
            <strong>{result.teaCup.name}</strong>
            <p>{result.teaCup.topic}</p>
          </div>
          <div>
            <span>사주 핵심</span>
            <strong>{saju.available ? saju.title : "현재 질문 중심"}</strong>
            <p>{saju.summary}</p>
          </div>
          <div>
            <span>운명의 카드</span>
            <strong>
              {result.tarot.nameKo} · {direction}
            </strong>
            <p>{result.tarot.keywords.join(" · ")}</p>
          </div>
        </div>

        <section className={styles.resultBlock} aria-labelledby="sajuResultTitle">
          <h3 id="sajuResultTitle">사주가 말하는 기본 흐름</h3>
          <p className={styles.sajuSummary}>{saju.summary}</p>
          <div className={styles.sajuKeyPointList}>
            {saju.keyPoints.map((point) => (
              <span className={styles.sajuKeyPoint} key={point}>
                {point}
              </span>
            ))}
          </div>
          {saju.caution ? <p className={styles.sajuCaution}>{saju.caution}</p> : null}
        </section>

        {primaryTenGodId && primaryTenGodMeta ? (
          <section className={styles.resultBlock} aria-labelledby="tenGodResultTitle">
            <div className={styles.tenGodSectionHeader}>
              <div>
                <span>사주가 초대한 오늘의 손님</span>
                <h3 id="tenGodResultTitle">오늘 찻집에 들어온 십성</h3>
              </div>
              <p>오늘 찻집에 가장 먼저 들어온 손님은 {primaryTenGodMeta.nameKo}입니다.</p>
            </div>
            <div className={styles.tenGodResultGrid}>
              <TenGodSymbolCard tenGodId={primaryTenGodId} size="lg" selected />
              {secondaryTenGodIds.length ? (
                <div className={styles.tenGodSecondaryList}>
                  {secondaryTenGodIds.map((tenGodId) => (
                    <TenGodSymbolCard key={tenGodId} tenGodId={tenGodId} size="sm" showDescription={false} />
                  ))}
                </div>
              ) : null}
            </div>
            <p className={styles.tenGodBridgeText}>
              {primaryTenGodMeta.yeoniDescription} 오늘의 {result.tarot.nameKo} {direction}과 함께 보면, 이 흐름은{" "}
              {primaryTenGodMeta.shadowSide} 그래서 먼저 확인 가능한 감정과 현실을 나누어 보는 편이 좋아요.
            </p>
          </section>
        ) : null}

        <section className={styles.resultBlock} aria-labelledby="emotionResultTitle">
          <h3 id="emotionResultTitle">마음의 향 분석</h3>
          <AssetImage className={styles.resultGaugeAsset} src={fortuneTeaHouseAssets.pig.emotionGauge} alt="감정 분석 게이지 장식" />
          <div className={styles.resultEmotionList}>
            {result.emotionAnalysis.map((item) => (
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

        <section className={styles.resultBlock} aria-labelledby="tarotResultTitle">
          <h3 id="tarotResultTitle">타로 카드 해석</h3>
          <div className={styles.resultTarotGrid}>
            <TarotAssetCard
              cardId={result.tarot.cardId}
              number={result.tarot.number}
              nameKo={result.tarot.nameKo}
              nameEn={result.tarot.nameEn}
              orientation={result.tarot.orientation}
              keywords={result.tarot.keywords}
              meaning={result.tarot.meaning}
              size="lg"
            />
            <div className={styles.resultTarotCopy}>
              <p>{result.tarot.reading}</p>
              <p>{result.teaCup.reading}</p>
            </div>
          </div>
        </section>

        <section className={`${styles.resultBlock} ${styles.synthesisBlock}`} aria-labelledby="synthesisResultTitle">
          <h3 id="synthesisResultTitle">{synthesis.title}</h3>
          {primaryTenGodId ? (
            <div className={styles.synthesisVisualPair} aria-label={`${primaryTenGodMeta?.nameKo || "십성"}과 ${result.tarot.nameKo}의 연결`}>
              <TenGodSymbolCard tenGodId={primaryTenGodId} size="sm" showDescription={false} selected />
              <span>×</span>
              <TarotAssetCard
                cardId={result.tarot.cardId}
                number={result.tarot.number}
                nameKo={result.tarot.nameKo}
                nameEn={result.tarot.nameEn}
                orientation={result.tarot.orientation}
                keywords={result.tarot.keywords.slice(0, 2)}
                size="sm"
              />
            </div>
          ) : null}
          <p>{synthesis.summary}</p>
          <strong>{synthesis.sajuTarotBridge}</strong>
        </section>

        <section className={styles.resultBlock} aria-labelledby="yeoniReadingTitle">
          <h3 id="yeoniReadingTitle">연이의 상담</h3>
          <div className={styles.yeoniReadingGrid}>
            <p>{result.yeoniReading.intro}</p>
            <p>{result.yeoniReading.main}</p>
            <p>{result.yeoniReading.advice}</p>
            <p>{result.yeoniReading.caution}</p>
          </div>
        </section>

        <section className={styles.resultBlock} aria-labelledby="choiceSimulationTitle">
          <h3 id="choiceSimulationTitle">선택지별 흐름</h3>
          <div className={styles.choiceGrid}>
            {result.choiceSimulation.map((choice) => (
              <article className={styles.choiceCard} key={choice.id}>
                <span>{choice.subtitle}</span>
                <h4>{choice.title}</h4>
                <p>{choice.result}</p>
                <strong>{choice.caution}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.actionPrescription} aria-labelledby="actionPrescriptionTitle">
          <h3 id="actionPrescriptionTitle">오늘의 행동 처방</h3>
          <p>{result.actionPrescription}</p>
          <div className={styles.luckyKeywordList}>
            {result.luckyKeywords.map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
        </section>

        <div className={styles.resultActions}>
          <TeaHouseButton onClick={onRestart}>다시 상담하기</TeaHouseButton>
          <TeaHouseButton variant="secondary" onClick={onReady}>
            결과 저장
          </TeaHouseButton>
          <TeaHouseButton variant="ghost" disabled>
            심화 상담 열기
          </TeaHouseButton>
        </div>
      </article>
    </section>
  );
}
