"use client";

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
    cardReadings: Array<{ title: string; interpretation: string }>;
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
                              <div style={{ fontSize: 30 }}>{entry.card.emoji || "✦"}</div>
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

            {reading ? (
              <section className={styles.resultCard}>
                <h3>수비학 타로 해석</h3>
                <p style={{ color: "rgba(247, 241, 225, 0.9)", lineHeight: 1.7 }}>{reading.numerologyReading}</p>
                <p style={{ marginTop: 8, color: "#f4dca5" }}>핵심 메시지: {reading.coreMessage}</p>

                <div className={styles.resultGrid}>
                  {reading.cardReadings.map((item, idx) => (
                    <article key={`${item.title}-${idx}`} className={styles.resultBox}>
                      <h4>{item.title}</h4>
                      <p>{item.interpretation}</p>
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
              <h3>MOBILE EXPERIENCE FLOW</h3>
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
                        {picked ? (open ? picked.card.emoji || "✦" : "🂠") : "🂠"}
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

        <section className={styles.flowGrid}>
          <article className={styles.flowBlock}>
            <h2 className={styles.blockTitle}>USER FLOW</h2>
            <div className={styles.userFlowRow}>
              <div className={styles.flowNode}>
                <strong>1 입력</strong>
                <p>생년월일과 이름 또는 핵심 질문을 설정하고 리딩 조건을 고정합니다.</p>
              </div>
              <div className={styles.flowNode}>
                <strong>2 숫자 분석</strong>
                <p>생명수, 개인수, 질문수가 계산되어 카드 선택의 기준 축이 됩니다.</p>
              </div>
              <div className={styles.flowNode}>
                <strong>3 카드 뽑기</strong>
                <p>과거, 현재, 미래 3장 카드가 배치되고 탭하여 순차 공개됩니다.</p>
              </div>
              <div className={styles.flowNode}>
                <strong>4 해석 결과</strong>
                <p>숫자와 카드 의미를 통합한 실전형 행동 가이드가 생성됩니다.</p>
              </div>
            </div>
          </article>

          <article className={styles.designBlock}>
            <h2 className={styles.blockTitle}>DESIGN KEY POINT</h2>
            <div className={styles.keyList}>
              <div className={styles.keyItem}>신비로운 우주 톤</div>
              <div className={styles.keyItem}>직관적 4단계 UX</div>
              <div className={styles.keyItem}>프리미엄 카드 질감</div>
              <div className={styles.keyItem}>개인화 인사이트</div>
            </div>
            <div className={styles.palette} aria-label="color palette">
              <span className={styles.swatch} style={{ background: "#080D1A" }} />
              <span className={styles.swatch} style={{ background: "#1B1433" }} />
              <span className={styles.swatch} style={{ background: "#2F1B4F" }} />
              <span className={styles.swatch} style={{ background: "#6F3DFF" }} />
              <span className={styles.swatch} style={{ background: "#D4AF37" }} />
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
