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

const concernTopics = ["관계", "선택", "일", "회복", "돈", "기타"] as const;

const questionGuideDialogue =
  "좋아요. 이 찻잔은 오늘 당신의 마음을 비추는 거울이 될 거예요.\n이제 당신의 이야기를 들려주세요. 짧게 적어도 괜찮고, 길게 털어놓아도 괜찮아요.\n꿀… 아, 방금 건 못 들은 걸로 해주세요. 오늘은 괜찮은 척하지 않아도 되는 밤이에요.";

export default function QuestionInputScene({ selectedCup, initialInput, onSubmit, onBack }: QuestionInputSceneProps) {
  const [nickname, setNickname] = useState(initialInput?.nickname || "");
  const [concernTopic, setConcernTopic] = useState(initialInput?.concernTopic || concernTopics[0]);
  const [birthInfo, setBirthInfo] = useState(initialInput?.birthInfo || "");
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
    onSubmit({
      nickname: nickname.trim(),
      concernTopic,
      birthInfo: birthInfo.trim(),
      question: nextQuestion,
    });
  }

  return (
    <section className={styles.questionScene} aria-labelledby="teaQuestionTitle">
      <div className={styles.questionActor}>
        <YeoniDialogueActor mood="comfort" isSpeaking cueText={questionGuideDialogue} className={styles.yeoniPortrait} priority />
      </div>
      <form className={styles.questionPanel} onSubmit={handleSubmit}>
        <p className={styles.sceneEyebrow}>{selectedCup.name}이 데워지고 있습니다</p>
        <h2 id="teaQuestionTitle">오늘은 어떤 마음으로 이 찻집에 오셨나요?</h2>
        <TeaHouseDialogueBox
          speaker="연이"
          text={questionGuideDialogue}
        />

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
          <label className={styles.questionLabel} htmlFor="fortuneTeaBirthInfo">
            출생정보 선택
            <input
              id="fortuneTeaBirthInfo"
              className={styles.questionInput}
              value={birthInfo}
              onChange={(event) => setBirthInfo(event.target.value)}
              placeholder="예: 1994.05.21 오후 3시"
            />
          </label>
        </div>

        <fieldset className={styles.concernTopicGroup}>
          <legend>고민 주제</legend>
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
