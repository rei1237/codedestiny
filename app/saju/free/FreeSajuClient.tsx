"use client";
/**
 * `/saju/free` 초간단 만세력 폼·결과(설계 docs/superpowers/specs/2026-11-08-free-viral-funnel-design.md §4).
 *
 * - 입력란 포커스 때 엔진(@/lib/korean-calendar)을 미리 받아 두고, 제출하면 기기 안에서만 계산한다(서버 저장 없음).
 * - 결과 70%: 올해 키워드 · 타고난 무기 · 오행 밸런스 · 12운성 한 줄.
 * - 블러 30%: PremiumBlurGate 로 재물 시기(신년운세) · 히든 매칭(최애 운명 · 운명의 꽃)에 잇는다.
 * - 공유 미션: ViralShareBar 의 아무 채널이 onShared 를 부르면 "재물 시크릿 키워드"를 연다.
 *   코인·금전 보상 없음, 카카오 없음, 팝업 아님(사용자 결정 2026-11-08).
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { m, useReducedMotion } from "framer-motion";
import PremiumBlurGate from "@/app/components/PremiumBlurGate";
import ViralShareBar from "@/app/components/ViralShareBar";
import { useAnalytics } from "@/app/hooks/useAnalytics";
import { computeFreeSaju, preloadFreeSajuEngine, seoulToday } from "@/lib/free-saju/engine";
import { ELEMENTS, type ElementKey, type FreeSajuReading } from "@/lib/free-saju/compute";
import {
  ELEMENT_LABEL,
  LIFE_STAGE_LINE,
  WEALTH_SECRET_BY_DAY_STEM,
  WEAPON_BY_DAY_STEM,
  YEAR_KEYWORD_BY_TEN_GOD,
  elementBalanceLine,
  wealthPresenceLine,
} from "@/lib/free-saju/copy";
import { wealthUnlockStore } from "@/lib/free-saju/unlock";
import { normalizeFreeBirthDate } from "@/lib/free-saju/birth-date";
import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import styles from "./free-saju.module.css";

const FUNNEL = "free_saju";
const SHARE_PATH = "/saju/free/";
const NEW_YEAR_HREF = "/new-year-ai-consultation/";
const DESTINY_BIAS_HREF = "/saju/destiny-bias/?from=free-saju";
const FLOWER_HREF = "/flower/?from=free-saju";

type Gender = "female" | "male";
type CalendarKind = "solar" | "lunar";

function friendlyError(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  if (/INVALID_(BIRTH_DATE|LUNAR_DATE|CALENDAR_TYPE)|CALENDAR_OUT_OF_RANGE/.test(code)) return "날짜를 다시 확인해 주세요. 1900년부터 2100년까지, 음력이면 그해에 있는 날짜만 계산할 수 있어요.";
  if (/INVALID_BIRTH_TIME/.test(code)) return "태어난 시간을 다시 확인해 주세요. 모르면 '모름'을 눌러 주세요.";
  return "계산 화면을 불러오지 못했어요. 연결을 확인하고 한 번 더 눌러 주세요.";
}

export default function FreeSajuClient() {
  const { trackFunnelStep, trackClick } = useAnalytics();
  const reduceMotion = useReducedMotion();
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [gender, setGender] = useState<Gender>("female");
  const [calendar, setCalendar] = useState<CalendarKind>("solar");
  const [leapMonth, setLeapMonth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState<FreeSajuReading | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const preloadStarted = useRef(false);

  useEffect(() => {
    trackFunnelStep({ funnel: FUNNEL, step: "form_view", stepIndex: 0 });
    setUnlocked(wealthUnlockStore.isUnlocked());
  }, [trackFunnelStep]);

  const preload = useCallback(() => {
    if (preloadStarted.current) return;
    preloadStarted.current = true;
    preloadFreeSajuEngine().catch(() => {
      preloadStarted.current = false; // 제출 때 다시 시도한다
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const normalizedBirthDate = normalizeFreeBirthDate(birthDate, calendar);
    if (!normalizedBirthDate) {
      setError(birthDate ? "생년월일을 YYYY-MM-DD 로 다시 확인해 주세요." : "생년월일을 넣어 주세요.");
      return;
    }
    if (normalizedBirthDate < "1900-01-01" || (calendar === "solar" && normalizedBirthDate > seoulToday())) {
      setError("1900년부터 오늘까지의 날짜만 계산할 수 있어요.");
      return;
    }
    if (normalizedBirthDate !== birthDate) setBirthDate(normalizedBirthDate);
    setBusy(true);
    setError("");
    trackFunnelStep({ funnel: FUNNEL, step: "submit", stepIndex: 1 });
    try {
      const next = await computeFreeSaju({
        birthDate: normalizedBirthDate,
        birthTime: timeUnknown || !birthTime ? null : birthTime,
        calendarType: calendar,
        leapMonth: calendar === "lunar" && leapMonth,
      });
      setReading(next);
      trackFunnelStep({ funnel: FUNNEL, step: "result", stepIndex: 2 });
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }));
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusy(false);
    }
  };

  const goGate = (target: "new_year" | "destiny_bias" | "flower", href: string) => {
    trackFunnelStep({ funnel: FUNNEL, step: "blur_click", stepIndex: 3 });
    trackClick("free-saju-blur-gate", { destination: target });
    window.location.assign(href);
  };

  const handleShared = () => {
    if (unlocked) return;
    wealthUnlockStore.unlock();
    setUnlocked(true);
    trackFunnelStep({ funnel: FUNNEL, step: "share_unlock", stepIndex: 4 });
  };

  const flip = (index: number) =>
    reduceMotion
      ? { initial: false as const }
      : {
          initial: { opacity: 0, rotateY: 80, y: 12 },
          animate: { opacity: 1, rotateY: 0, y: 0 },
          transition: { duration: 0.55, delay: 0.12 * index, ease: [0.22, 1, 0.36, 1] as const },
        };

  const keyword = reading ? YEAR_KEYWORD_BY_TEN_GOD[reading.yearTenGod] : null;
  const weapon = reading ? WEAPON_BY_DAY_STEM[reading.dayStem] : null;
  const stage = reading ? LIFE_STAGE_LINE[reading.lifeStage] : null;
  const secret = reading ? WEALTH_SECRET_BY_DAY_STEM[reading.dayStem] : null;
  const total = reading ? ELEMENTS.reduce((sum, key) => sum + reading.elements[key], 0) : 0;

  return (
    <section className={styles.root} aria-labelledby="free-saju-form-title">
      <p className={styles.eyebrow}>생일만 넣으면 끝</p>
      <h2 id="free-saju-form-title" className={styles.heading}>내 여덟 글자, 지금 바로 펼쳐 볼까요? 🌸</h2>

      <form className={styles.form} onSubmit={handleSubmit} onFocusCapture={preload} onPointerDownCapture={preload} noValidate>
        <label className={styles.field}>
          생년월일
          <input
            className={styles.input}
            {...birthDateTextInputProps(birthDate, setBirthDate)}
            // 음력 2월 30일처럼 양력에 없는 날이 지워지지 않게, 떠날 때는 달력 종류에 맞춰 정규화한다.
            onBlur={(event) => setBirthDate(normalizeFreeBirthDate(event.target.value, calendar) || event.target.value)}
            autoComplete="bday"
            required
          />
        </label>

        <fieldset className={styles.field} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 6 }}>양력 · 음력</legend>
          <div className={styles.choices}>
            {(["solar", "lunar"] as const).map((kind) => (
              <label key={kind} className={styles.choice}>
                <input type="radio" name="free-saju-calendar" value={kind} checked={calendar === kind} onChange={() => setCalendar(kind)} />
                {kind === "solar" ? "양력" : "음력"}
              </label>
            ))}
            {calendar === "lunar" ? (
              <label className={styles.choice}>
                <input type="checkbox" checked={leapMonth} onChange={(event) => setLeapMonth(event.target.checked)} />
                윤달
              </label>
            ) : null}
          </div>
        </fieldset>

        <div className={styles.field}>
          <label htmlFor="free-saju-time">태어난 시간 (선택)</label>
          <div className={styles.choices}>
            <input
              id="free-saju-time"
              className={styles.input}
              style={{ flex: "1 1 10rem", width: "auto" }}
              type="time"
              value={birthTime}
              disabled={timeUnknown}
              onChange={(event) => setBirthTime(event.target.value)}
            />
            <label className={styles.choice}>
              <input type="checkbox" checked={timeUnknown} onChange={(event) => setTimeUnknown(event.target.checked)} />
              모름
            </label>
          </div>
        </div>

        <fieldset className={styles.field} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 6 }}>성별</legend>
          <div className={styles.choices}>
            {(["female", "male"] as const).map((value) => (
              <label key={value} className={styles.choice}>
                <input type="radio" name="free-saju-gender" value={value} checked={gender === value} onChange={() => setGender(value)} />
                {value === "female" ? "여성" : "남성"}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" className={styles.submit} disabled={busy} aria-busy={busy}>
          {busy ? "펼치는 중…" : reading ? "다시 보기" : "내 결과 펼치기"}
        </button>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <p className={`${styles.muted}`} style={{ margin: 0, fontSize: "0.8rem" }}>
          입력한 생일은 이 기기에서만 계산하고 저장하지 않아요. 로그인 없이 볼 수 있어요.
        </p>
      </form>

      {reading && keyword && weapon && stage && secret ? (
        <div ref={resultRef} className={styles.result} aria-live="polite">
          <div className={styles.pillars} aria-label="나의 만세력 여덟 글자">
            {([
              ["시", reading.pillars.hour],
              ["일", reading.pillars.day],
              ["월", reading.pillars.month],
              ["년", reading.pillars.year],
            ] as const).map(([label, value]) => (
              <div key={label} className={styles.pillar}>
                <span>{label}</span>
                <strong>{value || "??"}</strong>
              </div>
            ))}
          </div>
          {reading.timeUnknown ? <p className={styles.muted} style={{ margin: 0, fontSize: "0.8rem" }}>시간을 모르면 시주는 비워 두고 여섯 글자로 읽어요.</p> : null}

          <m.article className={styles.card} {...flip(0)}>
            <p className={styles.cardLabel}>올해 키워드</p>
            <h3 className={styles.cardTitle}>{keyword.title}</h3>
            <p className={styles.cardLine}>{keyword.line}</p>
          </m.article>

          <m.article className={styles.card} {...flip(1)}>
            <p className={styles.cardLabel}>타고난 무기 · {weapon.symbol}</p>
            <h3 className={styles.cardTitle}>{weapon.title}</h3>
            <p className={styles.cardLine}>{weapon.line}</p>
          </m.article>

          <m.article className={styles.card} {...flip(2)}>
            <p className={styles.cardLabel}>오행 밸런스</p>
            <div className={styles.bars}>
              {ELEMENTS.map((key: ElementKey) => (
                <div key={key} className={styles.barRow}>
                  <span>{ELEMENT_LABEL[key].name}({ELEMENT_LABEL[key].hanja})</span>
                  <div className={styles.barTrack} role="img" aria-label={`${ELEMENT_LABEL[key].name} ${reading.elements[key]}개`}>
                    <m.div
                      className={`${styles.barFill} ${styles[key]}`}
                      initial={reduceMotion ? false : { width: 0 }}
                      animate={{ width: `${total ? (reading.elements[key] / total) * 100 : 0}%` }}
                      transition={{ duration: reduceMotion ? 0 : 0.7, delay: reduceMotion ? 0 : 0.3 }}
                    />
                  </div>
                  <span>{reading.elements[key]}</span>
                </div>
              ))}
            </div>
            <p className={styles.cardLine}>{elementBalanceLine(reading.elements)}</p>
          </m.article>

          <m.article className={styles.card} {...flip(3)}>
            <p className={styles.cardLabel}>12운성 한 줄 · {reading.lifeStage}</p>
            <h3 className={styles.cardTitle}>{stage.title}</h3>
            <p className={styles.cardLine}>{stage.line}</p>
          </m.article>

          <div className={styles.gates}>
          <PremiumBlurGate
            lockedTitle="재물운 상세 시기"
            subDesc="올해 돈 흐름이 열리고 닫히는 달은 신년운세 상담에서 달별로 풀어 드려요."
            lockedItems={["재물 흐름이 열리는 달", "지출을 아껴야 하는 달", "새 수입 줄기를 시험하기 좋은 시기"]}
            lockIcon="🦁"
            badgeLabel="HIDDEN"
            ctaLabel="신년운세에서 재물 시기 보기"
            footnote="신년운세 상담 화면으로 이동해요. 이용 조건은 그 화면에서 확인할 수 있어요."
            onUnlock={() => goGate("new_year", NEW_YEAR_HREF)}
          />

          <PremiumBlurGate
            lockedTitle="히든 매칭 · 최애와 꽃"
            subDesc="내 일간과 맞물리는 최애 케미, 사주가 고른 운명의 꽃 한 송이가 숨어 있어요."
            lockedItems={["내 최애와 나의 케미 유형", "사주가 고른 운명의 꽃", "둘이 만나면 생기는 한 줄 시너지"]}
            lockIcon="🌸"
            badgeLabel="HIDDEN"
            ctaLabel="최애 케미 무료로 보기"
            footnote="최애 운명과 운명의 꽃은 결과 카드까지 무료예요."
            onUnlock={() => goGate("destiny_bias", DESTINY_BIAS_HREF)}
          />
          </div>
          <div className={styles.gateLinks}>
            <button type="button" className={styles.textLink} onClick={() => goGate("flower", FLOWER_HREF)}>
              내 운명의 꽃 먼저 보기
            </button>
          </div>

          <section className={`${styles.mission} border border-cd-border bg-cd-surface text-cd-text`} aria-labelledby="free-saju-mission-title">
            <h3 id="free-saju-mission-title" className="m-0 text-base font-bold">
              {unlocked ? "재물 시크릿 키워드가 열렸어요 🦁" : "공유하면 재물 시크릿 키워드가 열려요"}
            </h3>
            <p className={`mb-3 mt-1 ${styles.missionMuted}`}>
              {unlocked ? "친구 결과도 궁금하다면 링크를 한 번 더 보내 보세요." : "아래 버튼 중 하나만 눌러도 바로 열려요. 생일은 공유 링크에 들어가지 않아요."}
            </p>
            <ViralShareBar
              url={SHARE_PATH}
              text={`올해 내 키워드는 「${keyword.title}」, 타고난 무기는 「${weapon.title}」 🌸 너는 뭐 나와? #초간단만세력`}
              title="초간단 만세력 — 올해 키워드와 타고난 무기"
              feature="free-saju"
              imageRef={shareCardRef}
              imageFileName="free-manse-card"
              imageWidth={1080}
              imageHeight={1350}
              onShared={handleShared}
            />
            <div className={`${styles.secret} bg-cd-surface-2`} aria-live="polite">
              <p className={`m-0 ${styles.missionAccent}`}>
                재물 시크릿 키워드 · 재성 {ELEMENT_LABEL[reading.wealthElement].name}({ELEMENT_LABEL[reading.wealthElement].hanja})
              </p>
              {unlocked ? (
                <>
                  <p className={`mb-0 mt-1 ${styles.missionStrong}`}>{secret.title}</p>
                  <p className="mb-0 mt-1">{secret.line}</p>
                  <p className={`mb-0 mt-1 ${styles.missionMuted}`}>{wealthPresenceLine(reading.wealthCount)}</p>
                </>
              ) : (
                <div className={styles.secretLocked} aria-hidden="true">
                  <p className={`mb-0 mt-1 ${styles.missionStrong}`}>당신의 돈이 붙는 자리</p>
                  <p className="mb-0 mt-1">공유 버튼을 누르면 이 문장이 선명해져요.</p>
                </div>
              )}
            </div>
          </section>

          <div className={styles.shareStage} aria-hidden="true">
            <div ref={shareCardRef} className={`${styles.root} ${styles.shareCard}`}>
              <div>
                <p className={styles.shareKicker}>CODE DESTINY · 초간단 만세력</p>
                <p className={styles.shareKeyword}>{keyword.title}</p>
                <p className={styles.shareLine}>타고난 무기 「{weapon.title}」 · {stage.title}</p>
              </div>
              <div className={styles.shareBars}>
                {ELEMENTS.map((key) => (
                  <div key={key} className={styles.shareBarRow}>
                    <span>{ELEMENT_LABEL[key].name} {reading.elements[key]}</span>
                    <div className={styles.barTrack}>
                      <div className={`${styles.barFill} ${styles[key]}`} style={{ width: `${total ? (reading.elements[key] / total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.shareTeaser}>
                내 운명의 꽃은 무슨 색일까? 🌸<br />
                내 최애와 나는 무슨 케미일까? <strong>히든 매칭은 링크에서</strong>
              </div>
              <p className={styles.shareFoot}>code-destiny.com/saju/free</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
