"use client";

import type { FortuneTeaHouseCalendarType, FortuneTeaHouseConsultResponse, FortuneTeaSukuyoPersonSnapshot } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import LlmParagraphs from "@/components/fortune/LlmParagraphs";
import AssetImage from "./AssetImage";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type TeaHouseSukuyoResultPanelProps = {
  result: FortuneTeaHouseConsultResponse;
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    {focus} 는 런타임 치환 자리다 — 한국어는 조사가 붙지만 다른 언어는 어순이 달라
    문장 전체를 한 키로 둔다. scoreLabels 의 키(destiny·harmony…)는 점수 필드명이라 번역하지 않는다. */
const KO = {
  calendar: { lunar: "음력", solar: "양력", unknown: "달력 정보 없음" },
  gender: { female: "여성", male: "남성", unknown: "성별 미입력" },
  score: { destiny: "인연감", harmony: "조화", emotion: "정서", growth: "성장", stability: "지속성" },
  card: {
    sukuyoEmpty: "본명숙 확인 전",
    birthDateLabel: "태어난 날",
    birthDateEmpty: "미입력",
    calendarLabel: "달의 기준",
    genderLabel: "성별",
    energyLabel: "숙의 기운",
    energyEmpty: "조용히 접힘",
  },
  eyebrow: "달빛 궁합의 방",
  emptyTitle: "27숙 인연의 흐름이 아직 접혀 있어요",
  emptySummary: "두 사람의 생년월일과 달력 기준이 모두 놓이면 연이가 27숙의 거리를 조용히 펼쳐볼게요.",
  headerAlt: "27숙 인연의 흐름",
  mineLabel: "나의 본명숙",
  partnerLabel: "상대의 본명숙",
  relationEyebrow: "관계 유형",
  relationEmpty: "인연",
  relationDescEmpty: "관계 유형을 조용히 살핍니다.",
  distanceEyebrow: "숙요 거리",
  distanceEmpty: "동숙",
  directionEmpty: "두 사람의 달빛이 같은 자리에서 마주 봅니다.",
  tempEyebrow: "궁합 온도",
  tempChecking: "확인 중",
  focusEmpty: "관계의 흐름",
  focusSentence: "{focus}을 중심으로 읽었습니다.",
  directionalEyebrow: "방향별 관계",
  forwardEmpty: "순행",
  backwardEmpty: "역행",
  towardEmpty: "다가가는 방향을 살핍니다.",
  returnEmpty: "되돌아오는 방향을 살핍니다.",
  elementEyebrow: "오행 조화",
  elementMine: "나",
  elementPartner: "상대",
  elementRelation: "보완",
  scoreEyebrow: "기본 숙요점 점수",
  scoreSuffix: "점",
  strengthEyebrow: "끌림의 결",
  strengthTitle: "두 사람 사이에서 살아나는 힘",
  cautionEyebrow: "조심할 결",
  cautionTitle: "달빛이 흔들릴 때 먼저 보아야 할 것",
  roleEyebrow: "오늘의 관계 처방",
  roleTitle: "서로에게 건넬 수 있는 태도",
};

// 비교 대상("lunar"·"female" 등)은 데이터 값이라 그대로 두고, 돌려주는 라벨만 사전을 태운다.
function calendarLabel(value: FortuneTeaHouseCalendarType | undefined, copy: typeof KO) {
  if (value === "lunar") return copy.calendar.lunar;
  if (value === "solar") return copy.calendar.solar;
  return copy.calendar.unknown;
}

function genderLabel(value: string | undefined, copy: typeof KO) {
  if (value === "female") return copy.gender.female;
  if (value === "male") return copy.gender.male;
  return copy.gender.unknown;
}

const scoreLabels = ["destiny", "harmony", "emotion", "growth", "stability"] as const;

function PersonMoonCard({ person, label }: { person: FortuneTeaSukuyoPersonSnapshot; label: string }) {
  const copy = useTeaHouseCopy("sukuyoResult", KO);
  return (
    <article className={styles.sukuyoMoonCard}>
      <span>{label}</span>
      <h4>{person.name}</h4>
      <strong>{person.sukuyoName || copy.card.sukuyoEmpty} {person.sukuyoHanja ? `· ${person.sukuyoHanja}` : ""}</strong>
      <dl>
        <div>
          <dt>{copy.card.birthDateLabel}</dt>
          <dd>{person.birthDate || copy.card.birthDateEmpty}</dd>
        </div>
        <div>
          <dt>{copy.card.calendarLabel}</dt>
          <dd>{calendarLabel(person.calendarType, copy)}</dd>
        </div>
        <div>
          <dt>{copy.card.genderLabel}</dt>
          <dd>{genderLabel(person.gender, copy)}</dd>
        </div>
        <div>
          <dt>{copy.card.energyLabel}</dt>
          <dd>{[person.direction, person.element].filter(Boolean).join(" · ") || copy.card.energyEmpty}</dd>
        </div>
      </dl>
      {person.keywords?.length ? <p>{person.keywords.join(" · ")}</p> : null}
    </article>
  );
}

export default function TeaHouseSukuyoResultPanel({ result }: TeaHouseSukuyoResultPanelProps) {
  const copy = useTeaHouseCopy("sukuyoResult", KO);
  const compatibility = result.sukuyoCompatibility;
  if (!compatibility?.available) {
    return (
      <section className={styles.sukuyoResultPanel} data-available="false" aria-labelledby="sukuyoResultPanelTitle">
        <header className={styles.sukuyoResultHeader}>
          <div>
            <span>{copy.eyebrow}</span>
            <h3 id="sukuyoResultPanelTitle">{copy.emptyTitle}</h3>
            <p>{compatibility?.summary || copy.emptySummary}</p>
          </div>
          <AssetImage className={styles.sukuyoResultImage} src={fortuneTeaHouseAssets.consultModes.sukuyo} alt={copy.headerAlt} />
        </header>
      </section>
    );
  }

  return (
    <section className={styles.sukuyoResultPanel} data-available="true" aria-labelledby="sukuyoResultPanelTitle">
      <header className={styles.sukuyoResultHeader}>
        <div>
          <span>{copy.eyebrow}</span>
          <h3 id="sukuyoResultPanelTitle">{compatibility.title}</h3>
          <LlmParagraphs text={compatibility.summary} />
        </div>
        <AssetImage className={styles.sukuyoResultImage} src={fortuneTeaHouseAssets.consultModes.sukuyo} alt={copy.headerAlt} />
      </header>

      <div className={styles.sukuyoMoonGrid}>
        <PersonMoonCard person={compatibility.user} label={copy.mineLabel} />
        <PersonMoonCard person={compatibility.partner} label={copy.partnerLabel} />
      </div>

      <div className={styles.sukuyoRelationGrid}>
        <article>
          <span>{copy.relationEyebrow}</span>
          <strong>{compatibility.relationType || copy.relationEmpty} {compatibility.relationTypeHan ? `· ${compatibility.relationTypeHan}` : ""}</strong>
          <p>{compatibility.relationshipType || copy.relationDescEmpty}</p>
        </article>
        <article>
          <span>{copy.distanceEyebrow}</span>
          <strong>{compatibility.distanceLabel || copy.distanceEmpty}</strong>
          <p>{compatibility.direction || copy.directionEmpty}</p>
        </article>
        <article>
          <span>{copy.tempEyebrow}</span>
          <strong>{compatibility.compatibilityIndex ? `${compatibility.compatibilityIndex}%` : copy.tempChecking}</strong>
          <p>{copy.focusSentence.replace("{focus}", compatibility.focus || copy.focusEmpty)}</p>
        </article>
      </div>

      {compatibility.relationDetail || compatibility.elementHarmony || compatibility.scores ? (
        <div className={styles.sukuyoDataGrid}>
          {compatibility.relationDetail ? (
            <article className={styles.sukuyoDataCard}>
              <span>{copy.directionalEyebrow}</span>
              <strong>{compatibility.relationDetail.typeAToB || copy.forwardEmpty} / {compatibility.relationDetail.typeBToA || copy.backwardEmpty}</strong>
              <p>{compatibility.relationDetail.userToPartnerMeaning || copy.towardEmpty}</p>
              <p>{compatibility.relationDetail.partnerToUserMeaning || copy.returnEmpty}</p>
            </article>
          ) : null}
          {compatibility.elementHarmony ? (
            <article className={styles.sukuyoDataCard}>
              <span>{copy.elementEyebrow}</span>
              <strong>{compatibility.elementHarmony.userElement || copy.elementMine} · {compatibility.elementHarmony.partnerElement || copy.elementPartner} · {compatibility.elementHarmony.relation || copy.elementRelation}</strong>
              <p>{compatibility.elementHarmony.summary}</p>
            </article>
          ) : null}
          {compatibility.scores ? (
            <article className={styles.sukuyoScoreCard}>
              <span>{copy.scoreEyebrow}</span>
              <strong>{compatibility.scores.total}{copy.scoreSuffix} · {compatibility.scores.label}</strong>
              <div>
                {scoreLabels.map((key) => (
                  <p key={key}>
                    <span>{copy.score[key]}</span>
                    <b>{compatibility.scores?.[key]}</b>
                  </p>
                ))}
              </div>
            </article>
          ) : null}
        </div>
      ) : null}

      <section className={styles.sukuyoPanelSection} aria-labelledby="sukuyoStrengthTitle">
        <div>
          <span>{copy.strengthEyebrow}</span>
          <h4 id="sukuyoStrengthTitle">{copy.strengthTitle}</h4>
        </div>
        <AssetImage
          className={styles.resultSectionMascot}
          src={fortuneTeaHouseAssets.yeoni.transparent.bust}
          fallbackSrc={fortuneTeaHouseAssets.yeoni.bust}
          alt=""
        />
        <div className={styles.sukuyoTextList}>
          {compatibility.strengths.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>

      <section className={styles.sukuyoPanelSection} aria-labelledby="sukuyoCautionTitle">
        <div>
          <span>{copy.cautionEyebrow}</span>
          <h4 id="sukuyoCautionTitle">{copy.cautionTitle}</h4>
        </div>
        <div className={styles.sukuyoTextList}>
          {compatibility.cautions.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>

      {compatibility.roleGuide ? (
        <section className={styles.sukuyoRoleGuide} aria-labelledby="sukuyoRoleGuideTitle">
          <span>{copy.roleEyebrow}</span>
          <h4 id="sukuyoRoleGuideTitle">{copy.roleTitle}</h4>
          <div>
            <LlmParagraphs text={compatibility.roleGuide.userAction} />
            <LlmParagraphs text={compatibility.roleGuide.partnerAction} />
          </div>
        </section>
      ) : null}

      <div className={styles.sukuyoKeywordList}>
        {compatibility.adviceKeywords.map((keyword) => (
          <span key={keyword}>{keyword}</span>
        ))}
      </div>
    </section>
  );
}
