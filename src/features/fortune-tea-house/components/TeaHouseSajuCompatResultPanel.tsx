"use client";

import type { FortuneTeaHouseCalendarType, FortuneTeaHouseConsultResponse, FortuneTeaSajuCompatPersonSnapshot } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import LlmParagraphs from "@/components/fortune/LlmParagraphs";
import AssetImage from "./AssetImage";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type TeaHouseSajuCompatResultPanelProps = {
  result: FortuneTeaHouseConsultResponse;
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    {focus} 는 런타임 치환 자리다 — 한국어 원문은 조사가 붙지만, 다른 언어는 어순이 달라
    문장 전체를 하나의 키로 두어야 옮길 수 있다. */
const KO = {
  calendar: { lunar: "음력", solar: "양력", unknown: "달력 정보 없음" },
  gender: { female: "여성", male: "남성", unknown: "성별 미입력" },
  card: {
    dayMasterEmpty: "명식 확인 전",
    birthDateLabel: "태어난 날",
    birthDateEmpty: "미입력",
    calendarLabel: "달의 기준",
    genderLabel: "성별",
    pillarsLabel: "사주 네 기둥",
    pillarsEmpty: "확인 전",
    elementsSuffix: "기운",
  },
  eyebrow: "사주 궁합의 방",
  emptyTitle: "두 사람의 명식이 아직 나란히 놓이지 않았어요",
  emptySummary: "두 사람의 생년월일이 모두 놓이면 연이가 두 명식을 나란히 펼쳐볼게요.",
  headerAlt: "두 사람의 사주",
  mineLabel: "나의 사주",
  partnerLabel: "상대의 사주",
  dayMasterEyebrow: "일간의 결",
  dayMasterEmpty: "두 명식의 결",
  harmonyEmpty: "두 사람의 오행 기운을 나란히 놓고 조율의 결을 살핍니다.",
  relationEyebrow: "관계 유형",
  relationEmpty: "인연",
  focusEmpty: "관계의 흐름",
  focusSentence: "{focus}을 중심으로 읽었습니다.",
  strengthEyebrow: "맞물리는 결",
  strengthTitle: "두 명식이 함께일 때 살아나는 힘",
  cautionEyebrow: "조율할 결",
  cautionTitle: "두 명식이 부딪힐 때 먼저 보아야 할 것",
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

function pillarLine(person: FortuneTeaSajuCompatPersonSnapshot) {
  if (!person.pillars) return "";
  return [person.pillars.year, person.pillars.month, person.pillars.day, person.pillars.hour].filter(Boolean).join(" · ");
}

function PersonSajuCard({ person, label }: { person: FortuneTeaSajuCompatPersonSnapshot; label: string }) {
  const copy = useTeaHouseCopy("sajuCompat", KO);
  const pillars = pillarLine(person);
  return (
    <article className={styles.sukuyoMoonCard}>
      <span>{label}</span>
      <h4>{person.name}</h4>
      <strong>{person.dayMaster || copy.card.dayMasterEmpty} {person.primaryTenGod ? `· ${person.primaryTenGod}` : ""}</strong>
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
          <dt>{copy.card.pillarsLabel}</dt>
          <dd>{pillars || copy.card.pillarsEmpty}</dd>
        </div>
      </dl>
      {person.dominantElements?.length ? <p>{person.dominantElements.join(" · ")} {copy.card.elementsSuffix}</p> : null}
    </article>
  );
}

export default function TeaHouseSajuCompatResultPanel({ result }: TeaHouseSajuCompatResultPanelProps) {
  const copy = useTeaHouseCopy("sajuCompat", KO);
  const compat = result.sajuCompatibility;
  if (!compat?.available) {
    return (
      <section className={styles.sukuyoResultPanel} data-available="false" aria-labelledby="sajuCompatResultPanelTitle">
        <header className={styles.sukuyoResultHeader}>
          <div>
            <span>{copy.eyebrow}</span>
            <h3 id="sajuCompatResultPanelTitle">{copy.emptyTitle}</h3>
            <p>{compat?.summary || copy.emptySummary}</p>
          </div>
          <AssetImage className={styles.sukuyoResultImage} src={fortuneTeaHouseAssets.consultModes.saju} alt={copy.headerAlt} />
        </header>
      </section>
    );
  }

  const interaction = compat.interaction;
  return (
    <section className={styles.sukuyoResultPanel} data-available="true" aria-labelledby="sajuCompatResultPanelTitle">
      <header className={styles.sukuyoResultHeader}>
        <div>
          <span>{copy.eyebrow}</span>
          <h3 id="sajuCompatResultPanelTitle">{compat.title}</h3>
          <LlmParagraphs text={compat.summary} />
        </div>
        <AssetImage className={styles.sukuyoResultImage} src={fortuneTeaHouseAssets.consultModes.saju} alt={copy.headerAlt} />
      </header>

      <div className={styles.sukuyoMoonGrid}>
        <PersonSajuCard person={compat.user} label={copy.mineLabel} />
        <PersonSajuCard person={compat.partner} label={copy.partnerLabel} />
      </div>

      {interaction ? (
        <div className={styles.sukuyoRelationGrid}>
          <article>
            <span>{copy.dayMasterEyebrow}</span>
            <strong>{interaction.dayMasterRelation || copy.dayMasterEmpty}</strong>
            <p>{interaction.elementHarmony || copy.harmonyEmpty}</p>
          </article>
          <article>
            <span>{copy.relationEyebrow}</span>
            <strong>{compat.relationshipType || copy.relationEmpty}</strong>
            <p>{copy.focusSentence.replace("{focus}", compat.focus || copy.focusEmpty)}</p>
          </article>
        </div>
      ) : null}

      {interaction?.strengths?.length ? (
        <section className={styles.sukuyoPanelSection} aria-labelledby="sajuCompatStrengthTitle">
          <div>
            <span>{copy.strengthEyebrow}</span>
            <h4 id="sajuCompatStrengthTitle">{copy.strengthTitle}</h4>
          </div>
          <AssetImage
            className={styles.resultSectionMascot}
            src={fortuneTeaHouseAssets.yeoni.transparent.bust}
            fallbackSrc={fortuneTeaHouseAssets.yeoni.bust}
            alt=""
          />
          <div className={styles.sukuyoTextList}>
            {interaction.strengths.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </section>
      ) : null}

      {interaction?.cautions?.length ? (
        <section className={styles.sukuyoPanelSection} aria-labelledby="sajuCompatCautionTitle">
          <div>
            <span>{copy.cautionEyebrow}</span>
            <h4 id="sajuCompatCautionTitle">{copy.cautionTitle}</h4>
          </div>
          <div className={styles.sukuyoTextList}>
            {interaction.cautions.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </section>
      ) : null}

      {compat.adviceKeywords?.length ? (
        <div className={styles.sukuyoKeywordList}>
          {compat.adviceKeywords.map((keyword) => (
            <span key={keyword}>{keyword}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
