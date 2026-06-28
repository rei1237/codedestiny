"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import type { FortuneTeaHouseQuestionInput } from "../data/consult";
import { type TeaHouseCup } from "../data/teaCups";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import TeaCupVisual from "./TeaCupVisual";
import YeoniDialogueActor from "./YeoniDialogueActor";
import styles from "../styles/fortune-tea-house.module.css";

type QuestionInputSceneProps = {
  selectedCup: TeaHouseCup;
  initialInput?: Partial<FortuneTeaHouseQuestionInput>;
  onSubmit: (input: FortuneTeaHouseQuestionInput) => void;
  onBack: () => void;
  isSubmitting?: boolean;
  submitError?: string;
};

const concernTopics = ["연애 · 재회", "썸 · 인연", "진로 · 사업", "금전운", "마음 회복", "이별 · 위기"] as const;

export default function QuestionInputScene({ selectedCup, initialInput, onSubmit, onBack, isSubmitting = false, submitError = "" }: QuestionInputSceneProps) {
  const [nickname, setNickname] = useState(initialInput?.nickname || "");
  const [birthDate, setBirthDate] = useState(initialInput?.birthDate || "");
  const [birthTime, setBirthTime] = useState(initialInput?.birthTime || "");
  const [gender, setGender] = useState(initialInput?.gender || "");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">(initialInput?.calendarType || "solar");
  const [question, setQuestion] = useState(initialInput?.question || "");
  const [error, setError] = useState("");

  function buildInput(nextQuestion: string): FortuneTeaHouseQuestionInput {
    const birthInfoSummary = [
      birthDate ? birthDate.replaceAll("-", ".") : "",
      birthTime ? birthTime : "",
      gender === "male" ? "남성" : gender === "female" ? "여성" : "",
      calendarType === "lunar" ? "음력" : "양력",
    ]
      .filter(Boolean)
      .join(" ");
    return {
      nickname: nickname.trim(),
      concernTopic: selectedCup.topic,
      birthInfo: birthInfoSummary,
      birthDate,
      birthTime,
      gender,
      calendarType,
      question: nextQuestion,
    };
  }

  function submitCurrentQuestion() {
    if (isSubmitting) return;
    const nextQuestion = question.trim();
    if (nextQuestion.length < 4) {
      setError("연이가 읽을 수 있도록 마음을 조금만 더 적어 주세요.");
      return;
    }
    setError("");
    onSubmit(buildInput(nextQuestion));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitCurrentQuestion();
  }

  return (
    <section className={styles.questionScene} aria-labelledby="teaQuestionTitle">
      <div className={styles.questionActor}>
        <YeoniDialogueActor mood="comfort" isSpeaking={false} className={styles.yeoniPortrait} priority />
        <TeaCupVisual cup={selectedCup} state="selected" size="large" className={styles.questionSelectedCup} />
      </div>
      <form className={styles.questionPanel} onSubmit={handleSubmit}>
        <p className={styles.sceneEyebrow}>{selectedCup.ritualTitle}</p>
        <h2 id="teaQuestionTitle">{selectedCup.name} 위에 오늘의 질문을 올려주세요</h2>
        <p className={styles.sceneDescription}>
          {selectedCup.summonLine} 출생정보를 몰라도 괜찮아요. 오늘은 찻잔과 타로를 중심으로 먼저 읽고, 사주가 열리면 더 깊게 이어볼게요.
        </p>
        <TeaHouseDialogueBox
          speaker="연이"
          text={selectedCup.questionGuideLine}
        />

        <section className={styles.questionFormSection} aria-labelledby="tarotQuestionSectionTitle">
          <div className={styles.questionSectionHeader}>
            <span>A</span>
            <div>
              <h3 id="tarotQuestionSectionTitle">오늘의 질문</h3>
              <p>말이 엉켜 있어도 괜찮아요. 연이가 찻잔 위에 놓인 장면부터 천천히 읽습니다.</p>
            </div>
          </div>
          <div className={styles.questionFieldGrid}>
            <label className={styles.questionLabel} htmlFor="fortuneTeaNickname">
              닉네임
              <input
                id="fortuneTeaNickname"
                className={styles.questionInput}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="손님"
                autoComplete="nickname"
                disabled={isSubmitting}
              />
            </label>
            <fieldset className={styles.concernTopicGroup}>
              <legend>상담 주제</legend>
              <div>
                {concernTopics.map((topic) => (
                  <button
                    className={styles.concernTopicButton}
                    data-selected={selectedCup.topic === topic ? "true" : "false"}
                    key={topic}
                    type="button"
                    disabled
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <p className={styles.topicSyncNotice}>{selectedCup.name} 상담은 {selectedCup.topic}으로 고정되어 있어요.</p>
            </fieldset>
          </div>

          <label className={styles.questionLabel} htmlFor="fortuneTeaQuestion">
            고민 내용
            <textarea
              id="fortuneTeaQuestion"
              className={styles.questionTextarea}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={selectedCup.questionPlaceholder}
              rows={7}
              disabled={isSubmitting}
            />
          </label>
        </section>

        <section className={styles.questionFormSection} aria-labelledby="sajuBirthSectionTitle">
          <div className={styles.questionSectionHeader}>
            <span>B</span>
            <div>
              <h3 id="sajuBirthSectionTitle">사주가 읽을 나의 기본 흐름</h3>
              <p>출생정보가 있으면 사주의 기본 기운과 십성 흐름을 함께 볼 수 있어요. 출생시간을 모르면 시주 없이 큰 흐름 중심으로 읽습니다.</p>
            </div>
          </div>
          <div className={styles.questionFieldGrid}>
            <label className={styles.questionLabel} htmlFor="fortuneTeaBirthDate">
              생년월일
              <input
                id="fortuneTeaBirthDate"
                className={styles.questionInput}
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                disabled={isSubmitting}
              />
            </label>
            <label className={styles.questionLabel} htmlFor="fortuneTeaBirthTime">
              출생시간
              <input
                id="fortuneTeaBirthTime"
                className={styles.questionInput}
                type="time"
                value={birthTime}
                onChange={(event) => setBirthTime(event.target.value)}
                disabled={isSubmitting}
              />
            </label>
            <label className={styles.questionLabel} htmlFor="fortuneTeaGender">
              성별
              <select id="fortuneTeaGender" className={styles.questionInput} value={gender} onChange={(event) => setGender(event.target.value)} disabled={isSubmitting}>
                <option value="">선택 안 함</option>
                <option value="female">여성</option>
                <option value="male">남성</option>
              </select>
            </label>
            <label className={styles.questionLabel} htmlFor="fortuneTeaCalendarType">
              양력/음력
              <select
                id="fortuneTeaCalendarType"
                className={styles.questionInput}
                value={calendarType}
                onChange={(event) => setCalendarType(event.target.value === "lunar" ? "lunar" : "solar")}
                disabled={isSubmitting}
              >
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </label>
          </div>
          <p className={styles.birthOptionalNotice}>
            출생정보를 몰라도 괜찮아요. 오늘은 찻잔과 타로, 현재 고민의 흐름을 중심으로 읽어드릴게요.
          </p>
        </section>
        {error ? <p className={styles.questionError}>{error}</p> : null}
        {submitError ? (
          <section className={styles.questionSubmitErrorCard} role="alert" aria-live="assertive">
            <strong>찻잔의 향이 잠시 흐려졌어요.</strong>
            <p>{submitError}</p>
            <TeaHouseButton type="button" variant="secondary" onClick={submitCurrentQuestion} loading={isSubmitting}>
              다시 한 번 건네기
            </TeaHouseButton>
          </section>
        ) : null}
        <div className={styles.storyActions}>
          <TeaHouseButton variant="ghost" onClick={onBack} disabled={isSubmitting}>
            찻잔 다시 고르기
          </TeaHouseButton>
          <TeaHouseButton type="submit" loading={isSubmitting}>
            연이에게 건네기
          </TeaHouseButton>
        </div>
      </form>
    </section>
  );
}
