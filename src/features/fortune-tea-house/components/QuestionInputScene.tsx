"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import type { FortuneTeaHouseCalendarType, FortuneTeaHouseConsultMode, FortuneTeaHouseQuestionInput, FortuneTeaHouseSukuyoInput } from "../data/consult";
import { type TeaHouseCup } from "../data/teaCups";
import AssetImage from "./AssetImage";
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
const sukuyoRelationshipTypes = ["연애 중", "썸", "연인", "배우자", "재회 고민", "짝사랑", "친구", "비즈니스", "가족", "기타"] as const;
const sukuyoFocusOptions = ["상대의 마음", "앞으로의 흐름", "재회 가능성", "결혼 가능성", "갈등 해결", "연락 타이밍", "관계 이어가는 방법"] as const;
const consultModeOptions: Array<{
  id: FortuneTeaHouseConsultMode;
  title: string;
  eyebrow: string;
  description: string;
  promise: string;
  reads: string;
  suitedFor: string;
  image: string;
  alt: string;
}> = [
  {
    id: "tarot",
    title: "타로로 보기",
    eyebrow: "카드가 먼저 여는 장면",
    description: "지금 질문 위로 떠오른 한 장의 상징을 깊게 읽습니다.",
    promise: "상대의 마음, 선택의 기류, 바로 움직일 수 있는 한 걸음",
    reads: "현재 질문에 가까운 카드의 상징, 상대 마음, 선택 앞의 기류",
    suitedFor: "연락, 재회, 선택처럼 지금 장면의 흐름이 궁금한 밤",
    image: fortuneTeaHouseAssets.consultModes.tarot,
    alt: "운명의 찻집 타로 상담 이미지",
  },
  {
    id: "saju",
    title: "사주로 보기",
    eyebrow: "태어난 흐름이 밝히는 자리",
    description: "출생정보로 오행과 십성의 결을 차분히 살핍니다.",
    promise: "기질의 반복, 시기의 흐름, 오늘 붙잡을 기준",
    reads: "태어난 흐름, 오행의 균형, 반복되는 기질과 시기의 기준",
    suitedFor: "내 성향과 타이밍, 오래 반복되는 고민의 뿌리를 보고 싶은 때",
    image: fortuneTeaHouseAssets.consultModes.saju,
    alt: "운명의 찻집 사주 상담 이미지",
  },
  {
    id: "sukuyo",
    title: "숙요점 궁합 상담",
    eyebrow: "달빛 아래 피어나는 인연의 흐름",
    description: "두 사람의 27숙 거리와 관계의 리듬을 연이가 조용히 펼칩니다.",
    promise: "끌림의 방식, 조심할 온도, 오늘 건넬 수 있는 한 문장",
    reads: "두 사람의 27숙 거리, 끌림과 부딪힘의 리듬, 관계의 온도",
    suitedFor: "궁합, 재회 가능성, 상대와 나 사이의 흐름을 조용히 보고 싶은 때",
    image: fortuneTeaHouseAssets.consultModes.sukuyo,
    alt: "27숙 인연의 흐름 이미지",
  },
];

const questionPanelUi =
  "rounded-[30px] border border-amber-100/30 bg-[#14091f]/85 shadow-[0_34px_96px_rgba(7,3,18,0.5),0_0_44px_rgba(248,187,221,0.12),inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-amber-100/10 backdrop-blur-2xl";
const questionSectionUi =
  "rounded-[22px] border border-amber-100/15 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_48px_rgba(7,3,18,0.18)]";
const questionHeaderUi =
  "[&>span]:shadow-[0_0_22px_rgba(233,196,106,0.22)] [&_h3]:text-[1.08rem] [&_p]:text-white/68";
const consultModeGridUi = "gap-3 lg:gap-4";
const consultModeCardUi =
  "rounded-[18px] border-white/15 bg-white/[0.055] shadow-[0_18px_52px_rgba(7,3,18,0.28)] transition duration-200 hover:-translate-y-1 hover:border-amber-100/55 hover:shadow-[0_26px_70px_rgba(7,3,18,0.38),0_0_34px_rgba(248,187,221,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-100/80 disabled:cursor-wait disabled:opacity-60";
const questionLabelUi = "text-amber-100/90";
const questionInputUi =
  "min-h-12 rounded-2xl border border-amber-100/25 bg-[#10071c]/75 px-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_12px_28px_rgba(7,3,18,0.12)] outline-none transition placeholder:text-white/35 focus:border-amber-100/70 focus:ring-4 focus:ring-amber-100/15 disabled:cursor-not-allowed disabled:opacity-55";
const questionTextareaUi =
  "rounded-[22px] border border-amber-100/25 bg-[#10071c]/75 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_14px_34px_rgba(7,3,18,0.16)] outline-none transition placeholder:text-white/35 focus:border-amber-100/70 focus:ring-4 focus:ring-amber-100/15 disabled:cursor-not-allowed disabled:opacity-55";
const sukuyoCardUi =
  "rounded-2xl border border-white/15 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_18px_44px_rgba(7,3,18,0.16)]";
const branchNoteUi =
  "rounded-2xl border border-indigo-100/20 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]";
const actionRowUi = "items-stretch sm:items-center";

export default function QuestionInputScene({ selectedCup, initialInput, onSubmit, onBack, isSubmitting = false, submitError = "" }: QuestionInputSceneProps) {
  const [consultationMode, setConsultationMode] = useState<FortuneTeaHouseConsultMode>(initialInput?.consultationMode || "tarot");
  const [nickname, setNickname] = useState(initialInput?.nickname || "");
  const [birthDate, setBirthDate] = useState(initialInput?.birthDate || "");
  const [birthTime, setBirthTime] = useState(initialInput?.birthTime || "");
  const [gender, setGender] = useState(initialInput?.gender || "");
  const [calendarType, setCalendarType] = useState<FortuneTeaHouseCalendarType>(initialInput?.calendarType || "solar");
  const [sukuyoInput, setSukuyoInput] = useState<FortuneTeaHouseSukuyoInput>(() => ({
    user: {
      name: initialInput?.sukuyo?.user?.name || initialInput?.nickname || "",
      birthDate: initialInput?.sukuyo?.user?.birthDate || "",
      calendarType: initialInput?.sukuyo?.user?.calendarType || "solar",
      gender: initialInput?.sukuyo?.user?.gender || "",
    },
    partner: {
      name: initialInput?.sukuyo?.partner?.name || "",
      birthDate: initialInput?.sukuyo?.partner?.birthDate || "",
      calendarType: initialInput?.sukuyo?.partner?.calendarType || "solar",
      gender: initialInput?.sukuyo?.partner?.gender || "",
    },
    relationshipType: initialInput?.sukuyo?.relationshipType || "연애 중",
    focus: initialInput?.sukuyo?.focus || "앞으로의 흐름",
    currentSituation: initialInput?.sukuyo?.currentSituation || "",
  }));
  const [question, setQuestion] = useState(initialInput?.question || "");
  const [error, setError] = useState("");

  function updateSukuyoPerson(target: "user" | "partner", patch: Partial<FortuneTeaHouseSukuyoInput["user"]>) {
    setSukuyoInput((current) => ({
      ...current,
      [target]: {
        ...current[target],
        ...patch,
      },
    }));
  }

  function updateSukuyoMeta(patch: Partial<Omit<FortuneTeaHouseSukuyoInput, "user" | "partner">>) {
    setSukuyoInput((current) => ({
      ...current,
      ...patch,
    }));
  }

  function normalizedSukuyoInput(): FortuneTeaHouseSukuyoInput {
    return {
      user: {
        name: sukuyoInput.user.name?.trim(),
        birthDate: sukuyoInput.user.birthDate,
        calendarType: sukuyoInput.user.calendarType || "solar",
        gender: sukuyoInput.user.gender,
      },
      partner: {
        name: sukuyoInput.partner.name?.trim(),
        birthDate: sukuyoInput.partner.birthDate,
        calendarType: sukuyoInput.partner.calendarType || "solar",
        gender: sukuyoInput.partner.gender,
      },
      relationshipType: sukuyoInput.relationshipType || "연애 중",
      focus: sukuyoInput.focus || "앞으로의 흐름",
      currentSituation: sukuyoInput.currentSituation?.trim(),
    };
  }

  function buildInput(nextQuestion: string): FortuneTeaHouseQuestionInput {
    const nextSukuyoInput = normalizedSukuyoInput();
    const birthInfoSummary = [
      consultationMode === "sukuyo" ? `${nextSukuyoInput.user.name || "나"} ${nextSukuyoInput.user.birthDate || ""}` : birthDate ? birthDate.replaceAll("-", ".") : "",
      consultationMode === "sukuyo" ? `${nextSukuyoInput.partner.name || "상대"} ${nextSukuyoInput.partner.birthDate || ""}` : birthTime ? birthTime : "",
      consultationMode === "sukuyo" ? nextSukuyoInput.relationshipType || "" : gender === "male" ? "남성" : gender === "female" ? "여성" : "",
      consultationMode === "sukuyo" ? nextSukuyoInput.focus || "" : calendarType === "lunar" ? "음력" : "양력",
    ]
      .filter(Boolean)
      .join(" ");
    return {
      consultationMode,
      nickname: consultationMode === "sukuyo" ? nextSukuyoInput.user.name || nickname.trim() : nickname.trim(),
      concernTopic: selectedCup.topic,
      birthInfo: birthInfoSummary,
      birthDate,
      birthTime,
      gender,
      calendarType,
      sukuyo: consultationMode === "sukuyo" ? nextSukuyoInput : undefined,
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
    if (consultationMode === "saju" && !birthDate) {
      setError("사주로 보려면 생년월일을 먼저 찻잔 위에 올려 주세요.");
      return;
    }
    if (consultationMode === "sukuyo") {
      const nextSukuyoInput = normalizedSukuyoInput();
      if (!nextSukuyoInput.user.birthDate || !nextSukuyoInput.partner.birthDate) {
        setError("달빛 궁합을 보려면 두 사람의 생년월일을 모두 올려 주세요.");
        return;
      }
      if (!nextSukuyoInput.user.gender || !nextSukuyoInput.partner.gender) {
        setError("두 사람의 성별을 함께 골라 주세요.");
        return;
      }
      if (!nextSukuyoInput.relationshipType) {
        setError("두 사람이 어떤 인연으로 마주하고 있는지 골라 주세요.");
        return;
      }
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
        <div className={styles.questionOracleStage}>
          <YeoniDialogueActor mood="comfort" isSpeaking={false} className={styles.yeoniPortrait} priority />
          <div className={styles.questionCupAltar} aria-label={`${selectedCup.name} 찻잔 상담`}>
            <TeaCupVisual cup={selectedCup} state="selected" size="large" className={styles.questionSelectedCup} />
          </div>
          <div className={styles.questionCupReading}>
            <span>연이의 찻잔 해석</span>
            <strong>{selectedCup.name}</strong>
            <p>{selectedCup.yeoniSelectLine}</p>
            <em>{selectedCup.selectionComment}</em>
            <small>{selectedCup.description}</small>
          </div>
        </div>
      </div>
      <form className={`${styles.questionPanel} ${questionPanelUi}`} onSubmit={handleSubmit}>
        <p className={styles.sceneEyebrow}>{selectedCup.ritualTitle}</p>
        <h2 id="teaQuestionTitle">{selectedCup.name} 위에 오늘의 질문을 올려주세요</h2>
        <p className={styles.sceneDescription}>
          {selectedCup.summonLine} 오늘은 타로, 사주, 숙요점 궁합 중 손님이 고른 한 가지 길로만 깊게 읽어드릴게요.
        </p>
        <TeaHouseDialogueBox
          speaker="연이"
          text={selectedCup.questionGuideLine}
        />

        <section className={`${styles.questionFormSection} ${questionSectionUi}`} aria-labelledby="consultModeSectionTitle">
          <div className={`${styles.questionSectionHeader} ${questionHeaderUi}`}>
            <span>A</span>
            <div>
              <h3 id="consultModeSectionTitle">오늘 열어 볼 상담 방식</h3>
              <p>타로, 사주, 숙요점 궁합 중 하나만 골라 주세요. 연이는 선택한 길의 상징만 따라갑니다.</p>
            </div>
          </div>
          <div className={`${styles.consultModeGrid} ${consultModeGridUi}`} role="radiogroup" aria-label="상담 방식 선택">
            {consultModeOptions.map((option) => {
              const selected = consultationMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`${styles.consultModeCard} ${consultModeCardUi}`}
                  data-mode={option.id}
                  data-selected={selected ? "true" : "false"}
                  onClick={() => setConsultationMode(option.id)}
                  disabled={isSubmitting}
                >
                  <span className={styles.consultModeVisual}>
                    <AssetImage className={styles.consultModeImage} src={option.image} alt={option.alt} priority={selected} />
                  </span>
                  <span className={styles.consultModeCopy}>
                    <span className={styles.consultModeEyebrow}>{option.eyebrow}</span>
                    <strong>{option.title}</strong>
                    <span>{option.description}</span>
                    <em>{option.promise}</em>
                    <span className={styles.consultModeDetails}>
                      <span>
                        <b>살피는 결</b>
                        {option.reads}
                      </span>
                      <span>
                        <b>잘 어울리는 질문</b>
                        {option.suitedFor}
                      </span>
                    </span>
                  </span>
                  <span className={styles.consultModeMark} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>

        <section className={`${styles.questionFormSection} ${questionSectionUi}`} aria-labelledby="tarotQuestionSectionTitle">
          <div className={`${styles.questionSectionHeader} ${questionHeaderUi}`}>
            <span>B</span>
            <div>
              <h3 id="tarotQuestionSectionTitle">오늘의 질문</h3>
              <p>
                {consultationMode === "tarot"
                  ? "카드가 비춰야 할 장면을 편하게 적어 주세요."
                  : consultationMode === "sukuyo"
                    ? "두 사람의 달빛이 어디로 흐르는지, 가장 궁금한 마음을 남겨 주세요."
                    : "사주가 어느 삶의 흐름을 비춰야 할지 질문을 남겨 주세요."}
              </p>
            </div>
          </div>
          {consultationMode === "sukuyo" ? (
            <div className={`${styles.sukuyoBranchNote} ${branchNoteUi}`}>
              <AssetImage className={styles.sukuyoBranchImage} src={fortuneTeaHouseAssets.consultModes.sukuyo} alt="27숙 인연의 흐름" />
              <div>
                <span>달빛 궁합의 방</span>
                <strong>{selectedCup.name} 위에 두 사람의 생년월일을 나란히 올립니다.</strong>
                <p>연이는 27숙의 거리와 관계 유형을 먼저 확인하고, 보이지 않는 마음은 단정하지 않은 채 지금 질문의 흐름만 살펴요.</p>
              </div>
            </div>
          ) : (
            <div className={styles.questionFieldGrid}>
              <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaNickname">
                닉네임
                <input
                  id="fortuneTeaNickname"
                  className={`${styles.questionInput} ${questionInputUi}`}
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
          )}

          <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaQuestion">
            고민 내용
            <textarea
              id="fortuneTeaQuestion"
              className={`${styles.questionTextarea} ${questionTextareaUi}`}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={consultationMode === "sukuyo" ? "그 사람과 앞으로 어떻게 될지 궁금해요." : selectedCup.questionPlaceholder}
              rows={7}
              disabled={isSubmitting}
            />
          </label>
        </section>

        {consultationMode === "saju" ? (
        <section className={`${styles.questionFormSection} ${questionSectionUi}`} aria-labelledby="sajuBirthSectionTitle">
          <div className={`${styles.questionSectionHeader} ${questionHeaderUi}`}>
            <span>C</span>
            <div>
              <h3 id="sajuBirthSectionTitle">사주가 읽을 나의 기본 흐름</h3>
              <p>사주 상담은 생년월일을 바탕으로 엽니다. 출생시간을 모르면 시주 없이 큰 흐름 중심으로 읽습니다.</p>
            </div>
          </div>
          <div className={styles.questionFieldGrid}>
            <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaBirthDate">
              생년월일
              <input
                id="fortuneTeaBirthDate"
                className={`${styles.questionInput} ${questionInputUi}`}
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                disabled={isSubmitting}
              />
            </label>
            <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaBirthTime">
              출생시간
              <input
                id="fortuneTeaBirthTime"
                className={`${styles.questionInput} ${questionInputUi}`}
                type="time"
                value={birthTime}
                onChange={(event) => setBirthTime(event.target.value)}
                disabled={isSubmitting}
              />
            </label>
            <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaGender">
              성별
              <select id="fortuneTeaGender" className={`${styles.questionInput} ${questionInputUi}`} value={gender} onChange={(event) => setGender(event.target.value)} disabled={isSubmitting}>
                <option value="">선택 안 함</option>
                <option value="female">여성</option>
                <option value="male">남성</option>
              </select>
            </label>
            <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaCalendarType">
              양력/음력
              <select
                id="fortuneTeaCalendarType"
                className={`${styles.questionInput} ${questionInputUi}`}
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
            사주는 보이는 정보만 읽습니다. 모르는 시간이나 기운은 연이가 지어내지 않아요.
          </p>
        </section>
        ) : consultationMode === "sukuyo" ? (
          <section className={`${styles.questionFormSection} ${questionSectionUi}`} aria-labelledby="sukuyoBirthSectionTitle">
            <div className={`${styles.questionSectionHeader} ${questionHeaderUi}`}>
              <span>C</span>
              <div>
                <h3 id="sukuyoBirthSectionTitle">달빛 궁합의 방에 놓을 두 사람</h3>
                <p>숙요점 궁합은 두 사람의 생년월일과 달력 기준으로 27숙의 거리와 관계 유형을 먼저 확인합니다.</p>
              </div>
            </div>

            <div className={styles.sukuyoPairGrid}>
              <article className={`${styles.sukuyoPersonCard} ${sukuyoCardUi}`}>
                <span>나의 달빛</span>
                <div className={styles.questionFieldGrid}>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoUserName">
                    이름 또는 닉네임
                    <input
                      id="fortuneTeaSukuyoUserName"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sukuyoInput.user.name || ""}
                      onChange={(event) => updateSukuyoPerson("user", { name: event.target.value })}
                      placeholder="나"
                      autoComplete="nickname"
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoUserBirthDate">
                    생년월일
                    <input
                      id="fortuneTeaSukuyoUserBirthDate"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      type="date"
                      value={sukuyoInput.user.birthDate || ""}
                      onChange={(event) => updateSukuyoPerson("user", { birthDate: event.target.value })}
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoUserCalendar">
                    양력/음력
                    <select
                      id="fortuneTeaSukuyoUserCalendar"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sukuyoInput.user.calendarType || "solar"}
                      onChange={(event) => updateSukuyoPerson("user", { calendarType: event.target.value === "lunar" ? "lunar" : "solar" })}
                      disabled={isSubmitting}
                    >
                      <option value="solar">양력</option>
                      <option value="lunar">음력</option>
                    </select>
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoUserGender">
                    성별
                    <select
                      id="fortuneTeaSukuyoUserGender"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sukuyoInput.user.gender || ""}
                      onChange={(event) => updateSukuyoPerson("user", { gender: event.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">선택</option>
                      <option value="female">여성</option>
                      <option value="male">남성</option>
                    </select>
                  </label>
                </div>
              </article>

              <article className={`${styles.sukuyoPersonCard} ${sukuyoCardUi}`}>
                <span>상대의 달빛</span>
                <div className={styles.questionFieldGrid}>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoPartnerName">
                    이름 또는 닉네임
                    <input
                      id="fortuneTeaSukuyoPartnerName"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sukuyoInput.partner.name || ""}
                      onChange={(event) => updateSukuyoPerson("partner", { name: event.target.value })}
                      placeholder="상대"
                      autoComplete="off"
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoPartnerBirthDate">
                    생년월일
                    <input
                      id="fortuneTeaSukuyoPartnerBirthDate"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      type="date"
                      value={sukuyoInput.partner.birthDate || ""}
                      onChange={(event) => updateSukuyoPerson("partner", { birthDate: event.target.value })}
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoPartnerCalendar">
                    양력/음력
                    <select
                      id="fortuneTeaSukuyoPartnerCalendar"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sukuyoInput.partner.calendarType || "solar"}
                      onChange={(event) => updateSukuyoPerson("partner", { calendarType: event.target.value === "lunar" ? "lunar" : "solar" })}
                      disabled={isSubmitting}
                    >
                      <option value="solar">양력</option>
                      <option value="lunar">음력</option>
                    </select>
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoPartnerGender">
                    성별
                    <select
                      id="fortuneTeaSukuyoPartnerGender"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sukuyoInput.partner.gender || ""}
                      onChange={(event) => updateSukuyoPerson("partner", { gender: event.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">선택</option>
                      <option value="female">여성</option>
                      <option value="male">남성</option>
                    </select>
                  </label>
                </div>
              </article>
            </div>

            <div className={styles.sukuyoMetaGrid}>
              <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoRelationship">
                관계 유형
                <select
                  id="fortuneTeaSukuyoRelationship"
                  className={`${styles.questionInput} ${questionInputUi}`}
                  value={sukuyoInput.relationshipType || "연애 중"}
                  onChange={(event) => updateSukuyoMeta({ relationshipType: event.target.value })}
                  disabled={isSubmitting}
                >
                  {sukuyoRelationshipTypes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoFocus">
                가장 궁금한 지점
                <select
                  id="fortuneTeaSukuyoFocus"
                  className={`${styles.questionInput} ${questionInputUi}`}
                  value={sukuyoInput.focus || "앞으로의 흐름"}
                  onChange={(event) => updateSukuyoMeta({ focus: event.target.value })}
                  disabled={isSubmitting}
                >
                  {sukuyoFocusOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoSituation">
              지금 관계의 분위기
              <textarea
                id="fortuneTeaSukuyoSituation"
                className={`${styles.questionTextarea} ${questionTextareaUi}`}
                value={sukuyoInput.currentSituation || ""}
                onChange={(event) => updateSukuyoMeta({ currentSituation: event.target.value })}
                placeholder="요즘 연락이 줄었고, 서로 마음은 남아 있는지 알고 싶어요."
                rows={4}
                disabled={isSubmitting}
              />
            </label>
            <p className={styles.birthOptionalNotice}>
              숙요점 궁합은 계산된 27숙과 관계 거리만 근거로 삼습니다. 모르는 마음과 결말은 연이가 단정하지 않아요.
            </p>
          </section>
        ) : (
          <p className={styles.birthOptionalNotice}>
            타로 상담으로 열면 출생정보 없이, 지금 질문과 선택된 카드의 상징만 깊게 읽습니다.
          </p>
        )}
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
        <div className={`${styles.storyActions} ${actionRowUi}`}>
          <TeaHouseButton variant="ghost" onClick={onBack} disabled={isSubmitting}>
            찻잔 다시 고르기
          </TeaHouseButton>
          <TeaHouseButton type="submit" loading={isSubmitting}>
            {consultationMode === "tarot" ? "타로로 연이에게 묻기" : consultationMode === "sukuyo" ? "달빛 궁합을 연이에게 묻기" : "사주로 연이에게 묻기"}
          </TeaHouseButton>
        </div>
      </form>
    </section>
  );
}
