"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import type { FortuneTeaHouseQuestionInput } from "../data/consult";
import { type TeaHouseCup } from "../data/teaCups";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import YeoniDialogueActor from "./YeoniDialogueActor";
import styles from "../styles/fortune-tea-house.module.css";

type QuestionInputSceneProps = {
  selectedCup: TeaHouseCup;
  initialInput?: Partial<FortuneTeaHouseQuestionInput>;
  onSubmit: (input: FortuneTeaHouseQuestionInput) => void;
  onBack: () => void;
};

const concernTopics = ["연애·재회", "썸·인연", "진로·사업", "금전운", "마음 회복", "이별·위기"] as const;

const questionGuideDialogue =
  "좋아요. 고민 내용은 타로가 읽을 현재 질문이 되고, 출생정보는 사주가 읽을 기본 흐름이 됩니다.\n출생시간을 몰라도 상담은 진행할 수 있어요. 인간 상담사 연이가 찻잔과 카드, 사주의 흐름이 만나는 지점을 차분히 읽어드릴게요.";

export default function QuestionInputScene({ selectedCup, initialInput, onSubmit, onBack }: QuestionInputSceneProps) {
  const [nickname, setNickname] = useState(initialInput?.nickname || "");
  const [concernTopic, setConcernTopic] = useState(initialInput?.concernTopic || selectedCup.topic || concernTopics[0]);
  const [birthDate, setBirthDate] = useState(initialInput?.birthDate || "");
  const [birthTime, setBirthTime] = useState(initialInput?.birthTime || "");
  const [gender, setGender] = useState(initialInput?.gender || "");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">(initialInput?.calendarType || "solar");
  const [question, setQuestion] = useState(initialInput?.question || "");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (nextQuestion.length < 4) {
      setError("연이가 읽을 수 있도록 마음을 조금만 더 적어 주세요.");
      return;
    }
    setError("");
    const birthInfoSummary = [
      birthDate ? birthDate.replaceAll("-", ".") : "",
      birthTime ? birthTime : "",
      gender === "male" ? "남성" : gender === "female" ? "여성" : "",
      calendarType === "lunar" ? "음력" : "양력",
    ]
      .filter(Boolean)
      .join(" ");
    onSubmit({
      nickname: nickname.trim(),
      concernTopic,
      birthInfo: birthInfoSummary,
      birthDate,
      birthTime,
      gender,
      calendarType,
      question: nextQuestion,
    });
  }

  return (
    <section className={styles.questionScene} aria-labelledby="teaQuestionTitle">
      <div className={styles.questionActor}>
        <YeoniDialogueActor mood="comfort" isSpeaking={false} className={styles.yeoniPortrait} priority />
      </div>
      <form className={styles.questionPanel} onSubmit={handleSubmit}>
        <p className={styles.sceneEyebrow}>{selectedCup.name}가 데워지고 있습니다</p>
        <h2 id="teaQuestionTitle">연이에게 오늘의 고민을 들려주세요</h2>
        <p className={styles.sceneDescription}>
          고민 내용은 타로가 읽을 현재 질문이 되고, 출생정보는 사주가 읽을 기본 흐름이 됩니다. 출생시간을 몰라도 상담은 진행할 수 있어요.
        </p>
        <TeaHouseDialogueBox
          speaker="연이"
          text={questionGuideDialogue}
        />

        <section className={styles.questionFormSection} aria-labelledby="tarotQuestionSectionTitle">
          <div className={styles.questionSectionHeader}>
            <span>A</span>
            <div>
              <h3 id="tarotQuestionSectionTitle">타로가 읽을 오늘의 질문</h3>
              <p>지금 가장 궁금한 마음을 적어주세요. 짧아도 괜찮고, 길게 털어놓아도 괜찮아요.</p>
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
              />
            </label>
            <fieldset className={styles.concernTopicGroup}>
              <legend>상담 주제</legend>
              <div>
                {concernTopics.map((topic) => (
                  <button
                    className={styles.concernTopicButton}
                    data-selected={concernTopic === topic ? "true" : "false"}
                    key={topic}
                    type="button"
                    onClick={() => setConcernTopic(topic)}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <label className={styles.questionLabel} htmlFor="fortuneTeaQuestion">
            고민 내용
            <textarea
              id="fortuneTeaQuestion"
              className={styles.questionTextarea}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="예: 이 관계를 계속 기다려도 괜찮을까요?"
              rows={7}
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
              />
            </label>
            <label className={styles.questionLabel} htmlFor="fortuneTeaGender">
              성별
              <select id="fortuneTeaGender" className={styles.questionInput} value={gender} onChange={(event) => setGender(event.target.value)}>
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
        <div className={styles.storyActions}>
          <TeaHouseButton variant="ghost" onClick={onBack}>
            찻잔 다시 고르기
          </TeaHouseButton>
          <TeaHouseButton type="submit">연이에게 건네기</TeaHouseButton>
        </div>
      </form>
    </section>
  );
}
