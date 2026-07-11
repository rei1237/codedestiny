"use client";

import type { FortuneTeaHouseCalendarType, FortuneTeaHouseConsultResponse, FortuneTeaSajuCompatPersonSnapshot } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import LlmParagraphs from "@/components/fortune/LlmParagraphs";
import AssetImage from "./AssetImage";
import styles from "../styles/fortune-tea-house.module.css";

type TeaHouseSajuCompatResultPanelProps = {
  result: FortuneTeaHouseConsultResponse;
};

function calendarLabel(value?: FortuneTeaHouseCalendarType) {
  if (value === "lunar") return "음력";
  if (value === "solar") return "양력";
  return "달력 정보 없음";
}

function genderLabel(value?: string) {
  if (value === "female") return "여성";
  if (value === "male") return "남성";
  return "성별 미입력";
}

function pillarLine(person: FortuneTeaSajuCompatPersonSnapshot) {
  if (!person.pillars) return "";
  return [person.pillars.year, person.pillars.month, person.pillars.day, person.pillars.hour].filter(Boolean).join(" · ");
}

function PersonSajuCard({ person, label }: { person: FortuneTeaSajuCompatPersonSnapshot; label: string }) {
  const pillars = pillarLine(person);
  return (
    <article className={styles.sukuyoMoonCard}>
      <span>{label}</span>
      <h4>{person.name}</h4>
      <strong>{person.dayMaster || "명식 확인 전"} {person.primaryTenGod ? `· ${person.primaryTenGod}` : ""}</strong>
      <dl>
        <div>
          <dt>태어난 날</dt>
          <dd>{person.birthDate || "미입력"}</dd>
        </div>
        <div>
          <dt>달의 기준</dt>
          <dd>{calendarLabel(person.calendarType)}</dd>
        </div>
        <div>
          <dt>성별</dt>
          <dd>{genderLabel(person.gender)}</dd>
        </div>
        <div>
          <dt>사주 네 기둥</dt>
          <dd>{pillars || "확인 전"}</dd>
        </div>
      </dl>
      {person.dominantElements?.length ? <p>{person.dominantElements.join(" · ")} 기운</p> : null}
    </article>
  );
}

export default function TeaHouseSajuCompatResultPanel({ result }: TeaHouseSajuCompatResultPanelProps) {
  const compat = result.sajuCompatibility;
  if (!compat?.available) {
    return (
      <section className={styles.sukuyoResultPanel} data-available="false" aria-labelledby="sajuCompatResultPanelTitle">
        <header className={styles.sukuyoResultHeader}>
          <div>
            <span>사주 궁합의 방</span>
            <h3 id="sajuCompatResultPanelTitle">두 사람의 명식이 아직 나란히 놓이지 않았어요</h3>
            <p>{compat?.summary || "두 사람의 생년월일이 모두 놓이면 연이가 두 명식을 나란히 펼쳐볼게요."}</p>
          </div>
          <AssetImage className={styles.sukuyoResultImage} src={fortuneTeaHouseAssets.consultModes.saju} alt="두 사람의 사주" />
        </header>
      </section>
    );
  }

  const interaction = compat.interaction;
  return (
    <section className={styles.sukuyoResultPanel} data-available="true" aria-labelledby="sajuCompatResultPanelTitle">
      <header className={styles.sukuyoResultHeader}>
        <div>
          <span>사주 궁합의 방</span>
          <h3 id="sajuCompatResultPanelTitle">{compat.title}</h3>
          <LlmParagraphs text={compat.summary} />
        </div>
        <AssetImage className={styles.sukuyoResultImage} src={fortuneTeaHouseAssets.consultModes.saju} alt="두 사람의 사주" />
      </header>

      <div className={styles.sukuyoMoonGrid}>
        <PersonSajuCard person={compat.user} label="나의 사주" />
        <PersonSajuCard person={compat.partner} label="상대의 사주" />
      </div>

      {interaction ? (
        <div className={styles.sukuyoRelationGrid}>
          <article>
            <span>일간의 결</span>
            <strong>{interaction.dayMasterRelation || "두 명식의 결"}</strong>
            <p>{interaction.elementHarmony || "두 사람의 오행 기운을 나란히 놓고 조율의 결을 살핍니다."}</p>
          </article>
          <article>
            <span>관계 유형</span>
            <strong>{compat.relationshipType || "인연"}</strong>
            <p>{compat.focus || "관계의 흐름"}을 중심으로 읽었습니다.</p>
          </article>
        </div>
      ) : null}

      {interaction?.strengths?.length ? (
        <section className={styles.sukuyoPanelSection} aria-labelledby="sajuCompatStrengthTitle">
          <div>
            <span>맞물리는 결</span>
            <h4 id="sajuCompatStrengthTitle">두 명식이 함께일 때 살아나는 힘</h4>
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
            <span>조율할 결</span>
            <h4 id="sajuCompatCautionTitle">두 명식이 부딪힐 때 먼저 보아야 할 것</h4>
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
