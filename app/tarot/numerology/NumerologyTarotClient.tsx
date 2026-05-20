"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCoinGate } from "../../hooks/useCoinGate";
import { showSubscriptionIncludedNotice } from "../../components/subscriptionNotice";
import { showToast } from "../../components/Toast";
import styles from "./numerology-tarot.module.css";
import {
  NUMEROLOGY_DATA,
  TOPIC_LABELS,
  buildNumerologyContext,
  selectCards,
} from "../../../lib/tarot/numerology-tarot.mjs";

type TopicKey = keyof typeof TOPIC_LABELS;

type DrawnCard = {
  card: {
    id: number;
    nameKr: string;
    name: string;
    emoji?: string;
    upright?: string;
    reversed?: string;
  };
  orientation: "upright" | "reversed";
  position: number;
  positionLabel: string;
};

type ReadingResponse = {
  ok: boolean;
  source?: string;
  topic?: string;
  model?: string;
  interpretation?: {
    numerologyReading: string;
    coreMessage: string;
    cardReadings: Array<{ title: string; keywordFocus?: string; interpretation: string; actionTip?: string }>;
    conclusion: {
      summary: string;
      doThis: string[];
      avoidThis: string[];
      finalWord: string;
    };
  };
  message?: string;
};

type NumerologyContext = {
  lifePathNumber: number;
  personalDayNumber: number;
  questionNumber: number;
  topic: string;
  topicLabel: string;
  birthDate: string;
};

const TOPIC_OPTIONS: Array<{ value: TopicKey; label: string }> = Object.entries(TOPIC_LABELS).map(([value, label]) => ({
  value: value as TopicKey,
  label,
}));

const STEP_LABELS = ["정보 입력", "타로 뽑기", "해석 준비", "결과 확인"];

const PREVIEW_PLACEHOLDERS = [
  { title: "과거", icon: "✶" },
  { title: "현재", icon: "☽" },
  { title: "미래", icon: "☀" },
];

const YEARS = Array.from({ length: 91 }, (_, idx) => String(new Date().getFullYear() - idx));
const MONTHS = Array.from({ length: 12 }, (_, idx) => String(idx + 1).padStart(2, "0"));

const TAROT_IMAGE_MAP: Record<number, string> = {
  0: "thefool.webp",
  1: "themagician.webp",
  2: "thehighpriestess.webp",
  3: "theempress.webp",
  4: "theemperor.webp",
  5: "thehierophant.webp",
  6: "TheLovers.webp",
  7: "thechariot.webp",
  8: "thestrength.webp",
  9: "thehermit.webp",
  10: "wheeloffortune.webp",
  11: "justice.webp",
  12: "thehangedman.webp",
  13: "death.webp",
  14: "temperance.webp",
  15: "thedevil.webp",
  16: "thetower.webp",
  17: "thestar.webp",
  18: "themoon.webp",
  19: "thesun.webp",
  20: "judgement.webp",
  21: "theworld.webp",
};

const FREE_TALENT_MAP: Record<number, { trait: string; aptitude: string[]; growthTip: string }> = {
  1: { trait: "독립성과 추진력이 강한 개척형", aptitude: ["기획/창업", "리더십 직무", "브랜딩"], growthTip: "시작은 빠르니 중간 점검 루틴을 붙이면 성과가 오래갑니다." },
  2: { trait: "감정 조율과 공감력이 뛰어난 연결형", aptitude: ["상담/코칭", "HR/협업 직무", "파트너십 운영"], growthTip: "관계 피로를 줄이기 위해 경계선 설정을 함께 연습하세요." },
  3: { trait: "표현력과 창의성이 강한 콘텐츠형", aptitude: ["콘텐츠 제작", "마케팅/PR", "디자인/크리에이티브"], growthTip: "아이디어를 주간 단위 실험으로 쪼개면 성장이 빨라집니다." },
  4: { trait: "구조화와 책임감이 강한 빌더형", aptitude: ["운영/PM", "재무/관리", "프로세스 설계"], growthTip: "완벽주의보다 반복 개선 중심으로 가면 스트레스가 줄어듭니다." },
  5: { trait: "변화 적응력과 실행력이 좋은 탐험형", aptitude: ["세일즈/사업개발", "트렌드 리서치", "프로젝트 런칭"], growthTip: "핵심 1가지를 고정하면 변동성 속에서도 성과가 유지됩니다." },
  6: { trait: "돌봄과 조화 감각이 강한 하모니형", aptitude: ["교육/멘토링", "브랜드 경험 설계", "커뮤니티 운영"], growthTip: "타인 기대와 본인 목표를 분리해 우선순위를 정하세요." },
  7: { trait: "분석력과 통찰력이 깊은 탐구형", aptitude: ["데이터/리서치", "전략/기획", "심층 상담"], growthTip: "혼자 정리한 통찰을 작은 피드백 루프로 외부 검증하세요." },
  8: { trait: "성과지향과 현실 감각이 강한 매니지형", aptitude: ["경영/재무", "비즈니스 운영", "영업 전략"], growthTip: "단기 성과와 장기 평판 지표를 동시에 관리하면 더 강해집니다." },
  9: { trait: "치유와 통합 감각이 강한 완성형", aptitude: ["심리/헬스케어", "사회 공헌", "스토리텔링"], growthTip: "과거 정리 루틴을 두면 새로운 기회를 더 빠르게 잡습니다." },
  11: { trait: "직관과 영감 수신력이 높은 인사이트형", aptitude: ["브랜드 전략", "창작/예술", "코칭/가이드"], growthTip: "번뜩임을 문서화해 실행 구조로 바꾸면 영향력이 커집니다." },
  22: { trait: "큰 그림을 현실화하는 아키텍트형", aptitude: ["대형 프로젝트 리드", "시스템 설계", "조직 구축"], growthTip: "큰 목표를 분기별 마일스톤으로 분해해 실행하세요." },
  33: { trait: "치유적 공감과 헌신이 큰 케어형", aptitude: ["치유/복지", "교육 콘텐츠", "공익 기획"], growthTip: "과몰입 방지를 위한 회복 루틴을 성과 루틴만큼 중요하게 두세요." },
};

function createDays(month: string): string[] {
  const monthNumber = Number(month || "1");
  const max = [1, 3, 5, 7, 8, 10, 12].includes(monthNumber)
    ? 31
    : [4, 6, 9, 11].includes(monthNumber)
      ? 30
      : 29;
  return Array.from({ length: max }, (_, idx) => String(idx + 1).padStart(2, "0"));
}

function toText(value: unknown): string {
  return String(value || "").trim();
}

function getCardImageUrl(cardId?: number): string {
  const file = Number.isFinite(Number(cardId)) ? TAROT_IMAGE_MAP[Number(cardId)] : "";
  return `/tarot-cards/${file || "thefool.webp"}`;
}

function extractQuestionKeywords(question: string): string[] {
  const stopWords = new Set(["오늘", "이번", "어떻게", "될까요", "해주세요", "저의", "나의", "그리고", "대한", "관련", "문제", "고민"]);
  const words = (question || "")
    .toLowerCase()
    .match(/[가-힣a-zA-Z0-9]{2,}/g) || [];

  const unique: string[] = [];
  for (const word of words) {
    if (stopWords.has(word)) continue;
    if (!unique.includes(word)) unique.push(word);
    if (unique.length >= 5) break;
  }
  return unique;
}

export default function NumerologyTarotClient() {
  const router = useRouter();
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const screenRef = useRef<HTMLElement | null>(null);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [topic, setTopic] = useState<TopicKey>("love");
  const [question, setQuestion] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [numerology, setNumerology] = useState<NumerologyContext | null>(null);
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [reading, setReading] = useState<ReadingResponse["interpretation"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lifeData = useMemo(() => {
    const key = Number(numerology?.lifePathNumber || 0);
    return NUMEROLOGY_DATA[key as keyof typeof NUMEROLOGY_DATA] || null;
  }, [numerology]);

  const questionKeywords = useMemo(() => extractQuestionKeywords(question), [question]);

  const freeProfile = useMemo(() => {
    const lifePath = Number(numerology?.lifePathNumber || 0);
    if (!lifePath) return null;
    return FREE_TALENT_MAP[lifePath] || FREE_TALENT_MAP[(lifePath % 9) || 9] || null;
  }, [numerology]);

  const dayOptions = useMemo(() => createDays(birthMonth), [birthMonth]);

  const activeStep = useMemo(() => {
    if (reading) return 3;
    if (cards.length && revealed.length === cards.length) return 2;
    if (cards.length) return 1;
    return 0;
  }, [cards.length, reading, revealed.length]);

  const revealProgress = `${Math.min(revealed.length, 3)}/3`;

  const readingEnabled = cards.length > 0 && revealed.length === cards.length;

  useEffect(() => {
    if (birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      const [y, m, d] = birthDate.split("-");
      setBirthYear(y);
      setBirthMonth(m);
      setBirthDay(d);
    }
  }, [birthDate]);

  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      setBirthDate(`${birthYear}-${birthMonth}-${birthDay}`);
    }
  }, [birthDay, birthMonth, birthYear]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  async function toggleFullscreen() {
    if (typeof document === "undefined") return;
    const root = screenRef.current;
    if (!root) return;
    try {
      if (!document.fullscreenElement) {
        await root.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      showToast("브라우저 정책으로 전체화면 전환이 제한되었습니다.", "warning");
    }
  }

  function startDraw() {
    if (!birthDate) {
      setError("생년월일을 입력해 주세요.");
      return;
    }

    const context = buildNumerologyContext({
      birthDate,
      topic,
    }) as NumerologyContext;

    const selected = selectCards({
      birthDate,
      topic,
      name,
      numerology: context,
    }) as DrawnCard[];

    setNumerology(context);
    setCards(selected);
    setReading(null);
    setError("");
    setRevealed([]);
  }

  function revealCard(index: number) {
    if (revealed.includes(index)) return;
    setRevealed((prev) => [...prev, index]);
  }

  async function requestReading() {
    const res = await fetch("/api/tarot/numerology-reading", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: toText(name),
        birthDate,
        topic,
        question: toText(question),
        questionKeywords,
        numerology,
        cards,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as ReadingResponse;
    if (!res.ok || !data?.ok || !data?.interpretation) {
      throw new Error(data?.message || "리딩 생성에 실패했습니다.");
    }
    setReading(data.interpretation);
  }

  async function payAndRead() {
    if (!cards.length || !numerology) {
      setError("먼저 카드 뽑기를 진행해 주세요.");
      return;
    }
    if (revealed.length < cards.length) {
      setError("카드 3장을 모두 열어야 해석을 볼 수 있습니다.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const paymentResult = await ensurePaidAccess({
        featureKey: "tarot-numerology-reading",
        reason: "수비학 타로 리딩",
        forceDeduct: true,
        requestId: `tarot-numerology-reading:req:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        onPaid: async ({ chargedCoins, requiredCoins, balanceAfter }) => {
          await requestReading();
          if (chargedCoins <= 0 && requiredCoins > 0) {
            showSubscriptionIncludedNotice({
              message: "구독 혜택이 적용되어 코인이 차감되지 않았습니다.",
              reason: "수비학 타로 리딩",
            });
            return;
          }
          if (chargedCoins > 0) {
            showToast(`수비학 타로 리딩 이용으로 ${chargedCoins}코인이 차감되었습니다. 남은 코인: ${balanceAfter.toLocaleString("ko-KR")}`, "info");
          }
        },
      });

      if (!paymentResult.ok) {
        if (paymentResult.code === "AUTH_REQUIRED") {
          setError("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
          if (typeof window !== "undefined") {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.setTimeout(() => {
              window.location.href = `/login?next=${next}`;
            }, 600);
          }
          return;
        }
        if (paymentResult.code === "INSUFFICIENT_COINS") {
          setError(`코인이 부족합니다. ${paymentResult.requiredCoins}코인이 필요합니다.`);
          return;
        }
        setError(paymentResult.message || "코인 결제에 실패했습니다.");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "리딩 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main ref={screenRef} className={styles.screen}>
      <div className={styles.container}>
        <header className={styles.topBar}>
          <strong className={styles.brand}>수비학 타로</strong>
          <nav className={styles.topNav} aria-label="수비학 타로 메뉴">
            <button type="button">홈</button>
            <button type="button">리딩하기</button>
            <button type="button">나의 리딩</button>
            <button type="button">숫자 해석</button>
            <button type="button">타로 가이드</button>
            <button type="button">프리미엄</button>
          </nav>
          <div className={styles.actions}>
            <button type="button" className={styles.ghostBtn} onClick={() => router.push("/index.html")}>메인으로</button>
            <button type="button" className={styles.lightBtn} onClick={toggleFullscreen}>{isFullscreen ? "전체화면 해제" : "전체화면"}</button>
          </div>
        </header>

        <section className={styles.heroGrid}>
          <div className={styles.mainPanel}>
            <h1 className={styles.title}>수비학 타로</h1>
            <p className={styles.subtitle}>숫자와 카드가 들려주는 운명의 메시지</p>

            <div className={styles.stepRail}>
              {STEP_LABELS.map((label, idx) => (
                <div key={label} className={`${styles.stepItem} ${activeStep >= idx ? styles.stepActive : ""}`}>
                  {idx + 1}. {label}
                </div>
              ))}
            </div>

            <div className={styles.stage}>
              <section className={styles.formCard}>
                <h2 className={styles.formTitle}>당신에 대해 알려주세요</h2>

                <div className={styles.topicTabs}>
                  {TOPIC_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`${styles.topicTab} ${topic === option.value ? styles.topicTabActive : ""}`}
                      onClick={() => setTopic(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className={styles.formGrid}>
                  <label className={`${styles.field} ${styles.fieldWide}`}>
                    <span className={styles.label}>이름 (선택)</span>
                    <input
                      className={styles.input}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="이름"
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>출생연도</span>
                    <select
                      className={styles.select}
                      value={birthYear}
                      onChange={(event) => setBirthYear(event.target.value)}
                    >
                      <option value="">연도</option>
                      {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>월</span>
                    <select
                      className={styles.select}
                      value={birthMonth}
                      onChange={(event) => {
                        setBirthMonth(event.target.value);
                        setBirthDay("");
                      }}
                    >
                      <option value="">월</option>
                      {MONTHS.map((month) => <option key={month} value={month}>{month}</option>)}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>일</span>
                    <select
                      className={styles.select}
                      value={birthDay}
                      onChange={(event) => setBirthDay(event.target.value)}
                    >
                      <option value="">일</option>
                      {dayOptions.map((day) => <option key={day} value={day}>{day}</option>)}
                    </select>
                  </label>

                  <label className={`${styles.field} ${styles.fieldWide}`}>
                    <span className={styles.label}>질문 (선택)</span>
                    <input
                      className={styles.input}
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="예: 오늘 이 관계의 흐름은 어떻게 전개될까요?"
                    />
                  </label>
                </div>

                <div className={styles.actions} style={{ marginTop: 12 }}>
                  <button type="button" onClick={startDraw} className={styles.mainBtn}>리딩 시작하기 ✦</button>
                  <button type="button" onClick={payAndRead} disabled={!readingEnabled || loading || isPaying} className={styles.lightBtn}>
                    {loading || isPaying ? "결제/리딩 진행 중..." : "해석 보기 (30코인)"}
                  </button>
                </div>

                {error ? <p className={styles.error}>{error}</p> : null}
              </section>

              <section className={styles.stageVisual}>
                <div className={styles.moon} aria-hidden="true" />
                <div className={styles.wheel} aria-hidden="true">
                  <div className={styles.orbitCenter}>☾</div>
                </div>

                <div className={styles.previewSpread}>
                  {(cards.length ? cards : PREVIEW_PLACEHOLDERS).map((entry, idx) => {
                    const isRealCard = "card" in entry;
                    const isOpen = revealed.includes(idx);
                    return (
                      <button
                        type="button"
                        key={isRealCard ? `${entry.card.id}-${idx}` : `${entry.title}-${idx}`}
                        className={`${styles.previewCard} ${isRealCard && !isOpen ? styles.previewCardLocked : ""}`}
                        onClick={() => {
                          if (isRealCard) revealCard(idx);
                        }}
                      >
                        {isRealCard ? (
                          isOpen ? (
                            <>
                              <p className={styles.previewPosition}>{entry.positionLabel}</p>
                              <div className={styles.previewCardImageWrap}>
                                <Image
                                  src={getCardImageUrl(entry.card.id)}
                                  alt={entry.card.nameKr || entry.card.name}
                                  width={158}
                                  height={248}
                                  className={styles.previewCardImage}
                                />
                              </div>
                              <p className={styles.previewName}>{entry.card.nameKr || entry.card.name}</p>
                              <p className={styles.previewMeta}>{entry.orientation === "reversed" ? "역방향" : "정방향"}</p>
                            </>
                          ) : (
                            <span>OPEN</span>
                          )
                        ) : (
                          <>
                            <p className={styles.previewPosition}>{entry.title}</p>
                            <div style={{ fontSize: 30 }}>{entry.icon}</div>
                            <p className={styles.previewMeta}>카드 대기</p>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            {numerology ? (
              <section className={styles.infoRail}>
                <article className={styles.infoItem}>
                  <h4>생명수</h4>
                  <p>{numerology.lifePathNumber} · {lifeData?.keyword || "핵심 파동"}</p>
                </article>
                <article className={styles.infoItem}>
                  <h4>개인수</h4>
                  <p>{numerology.personalDayNumber} · 오늘의 흐름</p>
                </article>
                <article className={styles.infoItem}>
                  <h4>질문수</h4>
                  <p>{numerology.questionNumber} · {numerology.topicLabel}</p>
                </article>
                <article className={styles.infoItem}>
                  <h4>해석 키워드</h4>
                  <p>{lifeData?.meaning || "이번 흐름은 정리와 재배치가 핵심입니다."}</p>
                </article>
              </section>
            ) : null}

            {numerology && freeProfile ? (
              <section className={styles.freeProfileCard}>
                <h3>무료 타고난 성향 · 적성 리포트</h3>
                <p className={styles.freeProfileLead}>
                  생년월일 기준 생명수 {numerology.lifePathNumber} ({lifeData?.keyword || "핵심 기질"})의 기본 성향입니다.
                </p>
                <div className={styles.freeProfileGrid}>
                  <article className={styles.resultBox}>
                    <h4>타고난 성향</h4>
                    <p>{freeProfile.trait}</p>
                  </article>
                  <article className={styles.resultBox}>
                    <h4>적성 영역</h4>
                    <p>{freeProfile.aptitude.join(" / ")}</p>
                  </article>
                  <article className={styles.resultBox}>
                    <h4>성장 힌트</h4>
                    <p>{freeProfile.growthTip}</p>
                  </article>
                </div>
              </section>
            ) : null}

            {reading ? (
              <section className={styles.resultCard}>
                <h3>수비학 타로 해석</h3>
                <p style={{ color: "rgba(247, 241, 225, 0.9)", lineHeight: 1.7 }}>{reading.numerologyReading}</p>
                <p style={{ marginTop: 8, color: "#f4dca5" }}>핵심 메시지: {reading.coreMessage}</p>
                {questionKeywords.length ? (
                  <p className={styles.keywordLine}>질문 키워드 초점: {questionKeywords.join(" · ")}</p>
                ) : null}

                <div className={styles.resultGrid}>
                  {reading.cardReadings.map((item, idx) => (
                    <article key={`${item.title}-${idx}`} className={styles.resultBox}>
                      <h4>{item.title}</h4>
                      {item.keywordFocus ? <p className={styles.keywordChip}>키워드: {item.keywordFocus}</p> : null}
                      <p>{item.interpretation}</p>
                      {item.actionTip ? <p className={styles.actionTip}>실행 팁: {item.actionTip}</p> : null}
                    </article>
                  ))}
                </div>

                <div className={styles.resultGrid} style={{ marginTop: 10 }}>
                  <article className={styles.resultBox}>
                    <h4>흐름 요약</h4>
                    <p>{reading.conclusion.summary}</p>
                  </article>
                  <article className={styles.resultBox}>
                    <h4>지금 실행할 것</h4>
                    <p>{reading.conclusion.doThis.join(" / ")}</p>
                  </article>
                  <article className={styles.resultBox}>
                    <h4>피할 것</h4>
                    <p>{reading.conclusion.avoidThis.join(" / ")}</p>
                  </article>
                </div>
              </section>
            ) : null}
          </div>

          <aside className={styles.sidePanel}>
            <div className={styles.sideTitle}>
              <h3>MOBILE READING PREVIEW</h3>
              <p>간결하고 몰입감 있는 모바일 리딩 동행</p>
            </div>

            <div className={styles.phoneGrid}>
              <article className={styles.phone}>
                <h4>1. 정보 입력</h4>
                <div className={styles.miniField}>이름: {name || "이름"}</div>
                <div className={styles.miniField}>생년월일: {birthDate || "YYYY-MM-DD"}</div>
                <div className={styles.miniField}>주제: {TOPIC_LABELS[topic]}</div>
                <div className={styles.miniField}>질문: {question || "질문을 입력하세요"}</div>
              </article>

              <article className={styles.phone}>
                <h4>2. 타로 뽑기</h4>
                <div className={styles.miniCardStack}>
                  {[0, 1, 2].map((idx) => {
                    const picked = cards[idx];
                    const open = revealed.includes(idx);
                    return (
                      <div key={`mini-card-${idx}`} className={styles.miniCard}>
                        {picked ? (
                          open ? (
                            <Image
                              src={getCardImageUrl(picked.card.id)}
                              alt={picked.card.nameKr || picked.card.name}
                              width={70}
                              height={112}
                              className={styles.miniCardImage}
                            />
                          ) : "🂠"
                        ) : "🂠"}
                      </div>
                    );
                  })}
                </div>
                <div className={styles.miniField}>공개 진행률: {revealProgress}</div>
                <div className={styles.miniField}>결제 준비: {readingEnabled ? "완료" : "카드 공개 필요"}</div>
              </article>

              <article className={styles.phone}>
                <h4>3. 결과 확인</h4>
                <div className={styles.statPill}>생명수: {numerology?.lifePathNumber ?? "-"}</div>
                <div className={styles.statPill}>개인수: {numerology?.personalDayNumber ?? "-"}</div>
                <div className={styles.statPill}>질문수: {numerology?.questionNumber ?? "-"}</div>
                <div className={styles.miniField}>{reading?.coreMessage || "결과가 준비되면 핵심 메시지가 표시됩니다."}</div>
              </article>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
