"use client";

import type { FortuneTeaHouseCalendarType, FortuneTeaHouseConsultResponse, FortuneTeaSukuyoPersonSnapshot } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import LlmParagraphs from "@/components/fortune/LlmParagraphs";
import AssetImage from "./AssetImage";
import styles from "../styles/fortune-tea-house.module.css";

type TeaHouseSukuyoResultPanelProps = {
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

const scoreLabels = [
  ["destiny", "인연감"],
  ["harmony", "조화"],
  ["emotion", "정서"],
  ["growth", "성장"],
  ["stability", "지속성"],
] as const;

function PersonMoonCard({ person, label }: { person: FortuneTeaSukuyoPersonSnapshot; label: string }) {
  return (
    <article className={styles.sukuyoMoonCard}>
      <span>{label}</span>
      <h4>{person.name}</h4>
      <strong>{person.sukuyoName || "본명숙 확인 전"} {person.sukuyoHanja ? `· ${person.sukuyoHanja}` : ""}</strong>
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
          <dt>숙의 기운</dt>
          <dd>{[person.direction, person.element].filter(Boolean).join(" · ") || "조용히 접힘"}</dd>
        </div>
      </dl>
      {person.keywords?.length ? <p>{person.keywords.join(" · ")}</p> : null}
    </article>
  );
}

export default function TeaHouseSukuyoResultPanel({ result }: TeaHouseSukuyoResultPanelProps) {
  const compatibility = result.sukuyoCompatibility;
  if (!compatibility?.available) {
    return (
      <section className={styles.sukuyoResultPanel} data-available="false" aria-labelledby="sukuyoResultPanelTitle">
        <header className={styles.sukuyoResultHeader}>
          <div>
            <span>달빛 궁합의 방</span>
            <h3 id="sukuyoResultPanelTitle">27숙 인연의 흐름이 아직 접혀 있어요</h3>
            <p>{compatibility?.summary || "두 사람의 생년월일과 달력 기준이 모두 놓이면 연이가 27숙의 거리를 조용히 펼쳐볼게요."}</p>
          </div>
          <AssetImage className={styles.sukuyoResultImage} src={fortuneTeaHouseAssets.consultModes.sukuyo} alt="27숙 인연의 흐름" />
        </header>
      </section>
    );
  }

  return (
    <section className={styles.sukuyoResultPanel} data-available="true" aria-labelledby="sukuyoResultPanelTitle">
      <header className={styles.sukuyoResultHeader}>
        <div>
          <span>달빛 궁합의 방</span>
          <h3 id="sukuyoResultPanelTitle">{compatibility.title}</h3>
          <LlmParagraphs text={compatibility.summary} />
        </div>
        <AssetImage className={styles.sukuyoResultImage} src={fortuneTeaHouseAssets.consultModes.sukuyo} alt="27숙 인연의 흐름" />
      </header>

      <div className={styles.sukuyoMoonGrid}>
        <PersonMoonCard person={compatibility.user} label="나의 본명숙" />
        <PersonMoonCard person={compatibility.partner} label="상대의 본명숙" />
      </div>

      <div className={styles.sukuyoRelationGrid}>
        <article>
          <span>관계 유형</span>
          <strong>{compatibility.relationType || "인연"} {compatibility.relationTypeHan ? `· ${compatibility.relationTypeHan}` : ""}</strong>
          <p>{compatibility.relationshipType || "관계 유형을 조용히 살핍니다."}</p>
        </article>
        <article>
          <span>숙요 거리</span>
          <strong>{compatibility.distanceLabel || "동숙"}</strong>
          <p>{compatibility.direction || "두 사람의 달빛이 같은 자리에서 마주 봅니다."}</p>
        </article>
        <article>
          <span>궁합 온도</span>
          <strong>{compatibility.compatibilityIndex ? `${compatibility.compatibilityIndex}%` : "확인 중"}</strong>
          <p>{compatibility.focus || "관계의 흐름"}을 중심으로 읽었습니다.</p>
        </article>
      </div>

      {compatibility.relationDetail || compatibility.elementHarmony || compatibility.scores ? (
        <div className={styles.sukuyoDataGrid}>
          {compatibility.relationDetail ? (
            <article className={styles.sukuyoDataCard}>
              <span>방향별 관계</span>
              <strong>{compatibility.relationDetail.typeAToB || "순행"} / {compatibility.relationDetail.typeBToA || "역행"}</strong>
              <p>{compatibility.relationDetail.userToPartnerMeaning || "다가가는 방향을 살핍니다."}</p>
              <p>{compatibility.relationDetail.partnerToUserMeaning || "되돌아오는 방향을 살핍니다."}</p>
            </article>
          ) : null}
          {compatibility.elementHarmony ? (
            <article className={styles.sukuyoDataCard}>
              <span>오행 조화</span>
              <strong>{compatibility.elementHarmony.userElement || "나"} · {compatibility.elementHarmony.partnerElement || "상대"} · {compatibility.elementHarmony.relation || "보완"}</strong>
              <p>{compatibility.elementHarmony.summary}</p>
            </article>
          ) : null}
          {compatibility.scores ? (
            <article className={styles.sukuyoScoreCard}>
              <span>기본 숙요점 점수</span>
              <strong>{compatibility.scores.total}점 · {compatibility.scores.label}</strong>
              <div>
                {scoreLabels.map(([key, label]) => (
                  <p key={key}>
                    <span>{label}</span>
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
          <span>끌림의 결</span>
          <h4 id="sukuyoStrengthTitle">두 사람 사이에서 살아나는 힘</h4>
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
          <span>조심할 결</span>
          <h4 id="sukuyoCautionTitle">달빛이 흔들릴 때 먼저 보아야 할 것</h4>
        </div>
        <div className={styles.sukuyoTextList}>
          {compatibility.cautions.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>

      {compatibility.roleGuide ? (
        <section className={styles.sukuyoRoleGuide} aria-labelledby="sukuyoRoleGuideTitle">
          <span>오늘의 관계 처방</span>
          <h4 id="sukuyoRoleGuideTitle">서로에게 건넬 수 있는 태도</h4>
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
