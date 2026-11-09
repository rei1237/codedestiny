"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { mobileSpriteUrl } from "@/js/core/profile-characters.mjs";
import { trackEvent } from "@/lib/analytics";
import { invalidateProfileCache } from "@/app/_lib/user-session-cache";
import DiaryMoodPicker from "@/app/diary/_components/DiaryMoodPicker";
import DiaryRecordCard from "@/app/diary/_components/DiaryRecordCard";
import { DIARY_SAVE_FAILED_TEXT, useDiarySaveFailed } from "@/app/diary/_components/DiaryStoreProvider";
import { DAILY_CARD_TITLE, WEEKDAY_LABELS, cheerLine, monthCalendar, streakGaugeCount, streakRunReward } from "./daily-progress.mjs";
import { useDailyJourney, type DailyJourney, type HoneyRules, type JourneyHoney, type JourneySurface } from "./useDailyJourney";
import yehwa from "../ServiceIntroSection.module.css";
import masks from "../service-intro/yehwaIntroMasks.generated.module.css";
import styles from "./daily-card.module.css";

export const CARD_MANAGE_HREF = "/ggulggul/?action=dpOpenList";
const LOGIN_RETURN_HASH = "#daily-home-title";
const HONEY_DROP = "/images/fortune-tea-house/honey-drop-jewel-96-v1.webp";
const HONEY_JAR = "/images/fortune-tea-house/honey-jar-bonus-v1.webp";
const MAX_GAUGE = 14;

function loginHref(surface: JourneySurface) {
  return surface === "home" ? "/login/?next=%2F%23daily-home-title" : "/login/?next=%2Fprofile%2Fdiary%2F%23daily-home-title";
}

function HoneyIcon({ size = 24, jar = false }: { size?: number; jar?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={jar ? HONEY_JAR : HONEY_DROP} width={size} height={size} alt="" loading="lazy" decoding="async" />;
}

/** 내 캐릭터: 선택한 프로필 카드의 일주 동물·장착 정령, 레벨과 경험치. 카드 바꾸기는 기존 카드 편집기를 그대로 띄운다. */
function ProfileHeader({ journey }: { journey: DailyJourney }) {
  const { status, profile, progress, portrait, portraitFailed } = journey;
  const [editing, setEditing] = useState(false);
  const [frameStatus, setFrameStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreTrigger = useRef(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const retry = useRef(journey.retry);
  useEffect(() => { retry.current = journey.retry; }, [journey.retry]);
  useEffect(() => {
    if (!editing) return;
    restoreTrigger.current = true;
    closeButton.current?.focus();
    const timer = window.setTimeout(() => setFrameStatus("error"), 25000);
    // 🔴 편집기(js/destiny-profile.js)와 맞춘 메시지 이름이라 바꾸지 않는다.
    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== "cd:forest-card") return;
      window.clearTimeout(timer);
      if (event.data.state === "saved") trackEvent("daily_home_card_saved", { surface: journey.surface });
      switch (event.data.state) {
        case "ready": setSaving(false); setFrameStatus("ready"); break;
        case "busy": setSaving(true); break;
        case "error": setFrameStatus("error"); break;
        case "saved":
        case "closed":
          setSaving(false); setEditing(false);
          invalidateProfileCache("forest-card-saved");
          retry.current();
          break;
      }
    }
    window.addEventListener("message", receive);
    return () => { window.clearTimeout(timer); window.removeEventListener("message", receive); };
  }, [editing, attempt, journey.surface]);
  const unavailable = status === "error" || (status === "ready" && journey.profileStatus === "error");
  const loading = status === "loading" || (status === "ready" && journey.profileStatus === "loading");
  useEffect(() => {
    if (!editing && !loading && !saving && restoreTrigger.current) {
      restoreTrigger.current = false;
      trigger.current?.focus({ preventScroll: true });
    }
  }, [editing, loading, saving]);
  const example = status === "guest" || (status === "ready" && !profile && !loading && !unavailable);
  const avatar = example ? "animal-rabbit" : loading || unavailable ? null : portrait?.id;
  const name = example ? "프로필 카드 예시" : profile ? `${profile.name || "나의"} 카드` : "내 프로필 카드";
  const ratio = progress ? Math.min(100, Math.round((progress.currentLevelExp / Math.max(1, progress.nextLevelExp)) * 100)) : 0;
  return <div className={styles.profile} data-daily-profile={example ? "example" : profile?.id || profile?.profileId}>
    <div className={styles.profileHead}>
      <span className={styles.portrait}>
        {avatar && <span role="img" aria-label={example ? "예시 토끼" : portrait?.name}
          data-character-id={avatar} style={{ backgroundImage: `url("${mobileSpriteUrl(avatar)}")` }} />}
        {progress && <b className={styles.level}>Lv.{progress.currentLevel}</b>}
      </span>
      <div className={styles.identity}>
        <strong>{name}</strong>
        {example ? <small>일주 동물 · 토끼<br />을묘 · 목</small> : avatar && portrait ?
          <small>일주 동물 · {portrait.animal}{portrait.equipped && <> · 장착 정령 · {portrait.name}</>}<br />{portrait.ganji} · {portrait.element}</small> :
          <small role="status">{loading ? "카드를 확인하고 있어요." : "카드를 불러오지 못했어요."}</small>}
        {progress && <div className={styles.xp}>
          <div className={styles.xpTrack} role="progressbar" aria-label="다음 레벨까지의 경험치" aria-valuemin={0} aria-valuemax={Math.max(1, progress.nextLevelExp)} aria-valuenow={progress.currentLevelExp}><span className={styles.xpFill} style={{ width: `${ratio}%` }} /></div>
          <small>{progress.currentLevelExp} / {progress.nextLevelExp} XP</small>
        </div>}
        <div className={styles.profileActions}>
          {status !== "guest" && <button type="button" ref={trigger} className={styles.ghost} aria-expanded={editing} aria-disabled={loading || saving}
            onClick={() => {
              if (loading || saving) return;
              if (unavailable) { journey.retry(); return; }
              setFrameStatus("loading"); setEditing(!editing);
            }}>{unavailable ? "카드 다시 불러오기" : profile ? "카드 바꾸기" : "첫 카드 만들기"}</button>}
          {portraitFailed && !loading && !unavailable && <button type="button" className={styles.ghost} onClick={journey.retry}>캐릭터 다시 불러오기</button>}
          {status === "guest" && <a className={styles.ghost} href={loginHref(journey.surface)} onClick={() => trackEvent("daily_home_card_login", { surface: journey.surface })}>가입하고 카드 만들기 <ArrowRight size={15} aria-hidden="true" /></a>}
        </div>
      </div>
    </div>
    {editing && <section className={styles.cardEditor} aria-label="프로필 카드 편집">
      <button ref={closeButton} type="button" disabled={saving} onClick={() => setEditing(false)}>{saving ? "카드 저장 중" : "출석부로 돌아가기"}</button>
      {frameStatus === "loading" && <p role="status">프로필 카드를 펼치고 있어요.</p>}
      {frameStatus === "error" && <button type="button" onClick={() => { setFrameStatus("loading"); setAttempt(i => i + 1); }}>카드 다시 불러오기</button>}
      <iframe key={attempt} ref={frame} title="프로필 카드 작성과 선택" hidden={frameStatus !== "ready"}
        src={CARD_MANAGE_HREF + "&forestCard=" + (profile ? "select" : "create")} />
    </section>}
  </div>;
}

/** 꿀단지 잔액과 연속 출석 게이지. 마지막 칸이 보너스 꿀단지다. 숫자는 전부 서버 값이다. */
function HoneyStatus({ journey }: { journey: DailyJourney }) {
  const { honey, status, rules } = journey;
  const total = Math.min(Math.max(1, rules?.streakEvery || 5), MAX_GAUGE);
  const filled = honey ? streakGaugeCount(honey.streak, honey.streakEvery, honey.attended) : 0;
  return <div className={styles.honey}>
    <div className={styles.jar}>
      <HoneyIcon size={48} jar />
      <span>내 꿀단지<strong data-daily-balance>{status === "ready" && honey ? `${honey.balance}방울` : status === "guest" ? "로그인 후 확인" : status === "error" ? "확인하지 못했어요" : "확인 중"}</strong></span>
    </div>
    <div className={styles.streak}>
      <ol className={styles.gauge} aria-label={honey ? `연속 출석 ${honey.streak}일, 다음 보너스까지 ${honey.nextBonusIn}일` : "연속 출석 게이지"}>
        {Array.from({ length: total }, (_, index) => {
          const isJar = index === total - 1;
          return <li key={index} data-filled={index < filled || undefined} data-jar={isJar || undefined}
            data-just-filled={(honey?.awarded && index === filled - 1) || undefined}>
            {isJar ? <><HoneyIcon size={26} jar />{rules && <small>+{rules.streakBonus}</small>}</> : <span aria-hidden="true" />}
          </li>;
        })}
      </ol>
      <small>{honey ? (filled >= total && honey.attended ? `${honey.streakEvery}일 연속 달성! 보너스 ${honey.streakBonus}방울` : `연속 ${honey.streak}일 · 보너스까지 ${honey.nextBonusIn}일`) : rules ? `${rules.streakEvery}일 연속 출석하면 보너스 ${rules.streakBonus}방울` : "연속 출석하면 보너스 꿀방울"}</small>
    </div>
  </div>;
}

/** 이번 달 출석 달력. 출석한 날은 꿀방울 도장, 연속 보너스를 받은 날은 꿀단지 도장이다. */
function AttendanceCalendar({ honey, ymd }: { honey: JourneyHoney | null; ymd: string }) {
  const calendar = monthCalendar(honey?.day || ymd, honey?.monthDays);
  if (!calendar) return null;
  const stampedCount = calendar.cells.filter(cell => cell.stamped).length;
  return <div className={styles.calendar}>
    <div className={styles.calendarHead}>
      <h3>{calendar.month}월 출석 도장</h3>
      <small>{honey ? `이번 달 ${stampedCount}일 출석` : "출석하면 도장이 찍혀요"}</small>
    </div>
    <ol className={styles.weekdays} aria-hidden="true">{WEEKDAY_LABELS.map(label => <li key={label}>{label}</li>)}</ol>
    <ol className={styles.days} aria-label={`${calendar.year}년 ${calendar.month}월 출석 달력`}>
      {calendar.cells.map((cell, index) => <li key={cell.ymd} style={index === 0 && calendar.leading ? { gridColumnStart: calendar.leading + 1 } : undefined}
        data-stamped={cell.stamped || undefined} data-bonus={cell.bonus || undefined} data-today={cell.isToday || undefined} data-future={cell.isFuture || undefined}
        data-just-stamped={(cell.isToday && honey?.awarded) || undefined}
        aria-label={`${cell.day}일${cell.isToday ? " 오늘" : ""}${cell.bonus ? " 보너스 출석" : cell.stamped ? " 출석" : ""}`}>
        <span>{cell.day}</span>
        {cell.stamped && <i aria-hidden="true"><HoneyIcon size={cell.bonus ? 26 : 22} jar={cell.bonus} /></i>}
      </li>)}
    </ol>
  </div>;
}

/** 오늘 실천 퀘스트 두 개. 작은 실천은 로그인 시 기존 성장 규칙으로 경험치를 쌓고, 한 줄 기록은 이 기기에 저장된다. */
function TodayQuests({ journey }: { journey: DailyJourney }) {
  const { ymd, entry, quest, picked, savedAction, questDone, hasRecord, status } = journey;
  const [recordOpen, setRecordOpen] = useState(false);
  useEffect(() => {
    const openLinked = () => { if (window.location.hash === "#diary-today-record") setRecordOpen(true); };
    openLinked();
    window.addEventListener("hashchange", openLinked);
    return () => window.removeEventListener("hashchange", openLinked);
  }, []);
  return <div className={styles.quests}>
    <h3>오늘의 퀘스트</h3>
    <ol>
      <li className={styles.quest} data-done={questDone || undefined}>
        <span className={styles.check} aria-hidden="true" />
        <div>
          <small>작은 실천{status === "ready" ? " · 경험치" : ""}</small>
          <strong>{quest ? savedAction?.name || quest.text : picked?.action.name || "오늘의 행동을 고르고 있어요"}</strong>
          <p>{quest ? savedAction?.tip || "오늘 고른 작은 행동을 실천해 보세요." : picked?.action.tip || "잠시만 기다려 주세요."}</p>
          <div className={styles.questActions}>
            {quest
              ? <button type="button" className={questDone ? styles.ghostDark : styles.solid} aria-pressed={Boolean(quest.done)} onClick={journey.toggleQuest}>{quest.done ? "완료 · 되돌리기" : "실천 완료하기"}</button>
              : <>
                  <button type="button" className={styles.solid} disabled={!picked} onClick={journey.selectQuest}>이 퀘스트 받기</button>
                  <button type="button" className={styles.ghostDark} disabled={!picked} onClick={journey.rerollQuest}>다른 퀘스트</button>
                </>}
          </div>
        </div>
      </li>
      <li className={styles.quest} data-done={hasRecord || undefined}>
        <span className={styles.check} aria-hidden="true" />
        <div>
          <small>한 줄 기록</small>
          <strong>{hasRecord ? "오늘의 한 줄을 남겼어요" : "오늘 마음에 남은 장면 한 줄"}</strong>
          {!recordOpen && <div className={styles.questActions}>
            <button type="button" className={hasRecord ? styles.ghostDark : styles.solid} aria-expanded={false} onClick={() => setRecordOpen(true)}>{hasRecord ? "기록 다시 보기" : "한 줄 쓰기"}</button>
          </div>}
          {recordOpen && <div className={styles.paper}>
            <DiaryMoodPicker ymd={ymd} mood={entry?.moodEmoji || ""} label="오늘의 기분" />
            <DiaryRecordCard embedded />
            <p>기록은 이 기기의 브라우저에 저장돼요.</p>
            {journey.surface === "home" && <a href="/?action=dpOpenList&view=diary&section=today" onClick={() => trackEvent("daily_home_diary_opened", { surface: journey.surface })}>운기 기록 더 보기 <span aria-hidden="true">→</span></a>}
          </div>}
        </div>
      </li>
    </ol>
  </div>;
}

/** 출석 한 번·연속 보너스를 서버 규칙 그대로 한 문장으로. 규칙을 못 받았으면 숫자 없이 말한다. */
function attendLine(rules: HoneyRules | null) {
  if (!rules) return "출석 도장 한 번마다 꿀방울";
  return rules.attendanceEvery === 1 ? `출석 도장 한 번에 꿀방울 1개` : `출석 ${rules.attendanceEvery}번마다 꿀방울 1개`;
}

/** 비회원 가입 권유. 혜택 숫자는 공개 카탈로그의 지급 규칙(서버 상수)으로만 계산한다 — 가입 보상·현금 가치는 약속하지 않는다. */
function GuestInvite({ journey }: { journey: DailyJourney }) {
  const { rules, products, surface } = journey;
  // 연속 주기를 채운 날 하루치 = 평소 1방울 + 보너스. 출석 N번마다 1방울 규칙이면 하루치가 날마다 달라 말하지 않는다.
  const streakDay = rules && rules.attendanceEvery === 1 ? 1 + rules.streakBonus : null;
  const month = streakRunReward(30, rules);
  const cheapest = products.reduce<number | null>((min, item) => (min === null || item.honeyCost < min ? item.honeyCost : min), null);
  return <aside className={styles.invite} aria-labelledby="daily-invite-title">
    <p className={styles.eyebrow}>가입하면 생기는 것</p>
    <h3 id="daily-invite-title">들를 때마다 꿀방울이 쌓이는<br />나만의 출석부</h3>
    <ul className={styles.perks}>
      <li><HoneyIcon size={34} /><div><strong>{attendLine(rules)}</strong><small>하루 한 번, 이 달력에 내 도장이 남아요.</small></div></li>
      <li><HoneyIcon size={34} jar /><div><strong>{rules ? `${rules.streakEvery}일 이어 오면 보너스 ${rules.streakBonus}방울` : "닷새 이어 오면 보너스 꿀단지"}</strong>
        <small>{rules && streakDay ? `${rules.streakEvery}일째 되는 날은 그날만 꿀방울 ${streakDay}개.` : "연속 출석이 이어질수록 꿀단지가 채워져요."}</small></div></li>
      <li><span className={styles.perkMark} aria-hidden="true" /><div><strong>내 캐릭터 카드와 레벨</strong><small>고른 정령과 일주 동물이 카드 캐릭터가 되고, 출석과 퀘스트로 경험치가 올라요.</small></div></li>
      <li><span className={styles.perkMark} aria-hidden="true" /><div><strong>모은 꿀방울로 운세 열기</strong><small>{products.length ? `${products.map(item => item.title).slice(0, 2).join("·")} 같은 상세 해석을 꿀방울로 열 수 있어요.` : "꿀꿀 운세의 지정된 상세 해석을 꿀방울로 열 수 있어요."}</small></div></li>
    </ul>
    {month !== null && <p className={styles.forecast}><span>30일을 빠짐없이 이으면</span><b>꿀방울 {month}개</b>{cheapest !== null && month >= cheapest && <small>{cheapest}방울 해석 하나를 열고도 남아요</small>}</p>}
    <a className={styles.joinButton} href={loginHref(surface)} onClick={() => trackEvent("daily_home_card_login", { surface, from: "invite" })}>
      <HoneyIcon size={28} />가입하고 첫 꿀방울 받기<ArrowRight size={18} aria-hidden="true" />
    </a>
    <small className={styles.joinNote}>이미 회원이라면 같은 버튼으로 로그인해 오늘 도장을 찍어요.</small>
  </aside>;
}

/** 꿀방울 사용처. 접어 두지 않고 상품 이름과 필요 방울 수를 공개 카탈로그 그대로 보여 준다. */
function HoneyUses({ journey }: { journey: DailyJourney }) {
  const { products, rules } = journey;
  return <section className={styles.uses} aria-labelledby="daily-uses-title">
    <div className={styles.usesHead}>
      <h3 id="daily-uses-title">꿀방울은 이렇게 써요</h3>
      {rules && <small>운세 프롬프트 1회 · {rules.promptCost}방울</small>}
    </div>
    {products.length > 0 && <ul>{products.map(item => <li key={item.productId}>
      <span>{item.group}</span><strong>{item.title}</strong><b><HoneyIcon size={18} />{item.honeyCost}</b>
    </li>)}</ul>}
    <p>하루 한 번 출석하면 꿀방울을 받아요. 하루를 놓치면 연속 출석은 다시 시작해요. 작은 실천과 한 줄 기록에는 꿀방울이 지급되지 않아요. 사용 가능한 상품과 필요 방울 수는 각 상품에서 확인해 주세요.</p>
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
    <a href="/ggulggul/?action=cdOpenAllFortunes">꿀꿀 운세 전체 보기 <ArrowRight size={15} aria-hidden="true" /></a>
  </section>;
}

/**
 * 내 캐릭터 출석부: 프로필 카드·꿀단지·출석 달력·오늘의 퀘스트를 한 장에 둔다(팝업 없음).
 * 🔴 출석·꿀방울·경험치 규칙은 서버(`/api/honey/attendance`, `/api/rpg/*`)에만 있다.
 */
export default function DailyCard({ surface }: { surface: JourneySurface }) {
  const [enabled, setEnabled] = useState(surface === "diary");
  const journey = useDailyJourney({ surface, enabled });
  const sectionRef = useRef<HTMLElement>(null);
  const saveFailed = useDiarySaveFailed();

  useEffect(() => {
    if (enabled) return;
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") { setEnabled(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setEnabled(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  // 로그인 복귀(`/login/?next=/#daily-home-title`)는 이 카드로 바로 내려온다.
  useEffect(() => {
    const fromLogin = () => {
      if (window.location.hash !== LOGIN_RETURN_HASH) return;
      trackEvent("daily_home_login_return", { surface });
      setEnabled(true);
      sectionRef.current?.scrollIntoView({ block: "start" });
    };
    fromLogin();
    window.addEventListener("hashchange", fromLogin);
    return () => window.removeEventListener("hashchange", fromLogin);
  }, [surface]);

  const { honey, status, busy, message, stepsDone, hydrated, ymd } = journey;
  const cheer = cheerLine(ymd, stepsDone >= 3 ? "done" : journey.attended ? "stamped" : "ready");
  // 달빛 예화(연이 Dark) 카드 표면: 위 초승달·꽃가지 띠와 아래 맺음 가지는 기능 소개 카드의 생성 마스크를 그대로 쓴다.
  return <section id={surface === "home" ? "homeDailyCard" : undefined} ref={sectionRef} className={`${styles.card} ${masks.masks}`} aria-labelledby="daily-home-title" data-daily-card={surface}>
    <span className={yehwa.crest} aria-hidden="true"><span className={yehwa.halo}><span className={yehwa.moon} /></span></span>
    <header className={styles.head}>
      <div>
        <p className={styles.eyebrow}>매일 한 번 · 꿀방울 도장</p>
        <h2 id="daily-home-title">{DAILY_CARD_TITLE}</h2>
      </div>
      <span className={styles.today} aria-label={`오늘 도장 ${hydrated ? stepsDone : 0}개 중 3개`}>오늘 도장 <b>{hydrated ? stepsDone : 0}</b>/3</span>
    </header>
    <ProfileHeader journey={journey} />
    <HoneyStatus journey={journey} />
    <AttendanceCalendar honey={honey} ymd={ymd} />
    <div className={styles.attend}>
      <p className={styles.cheer}><b>영냥이</b>{cheer}</p>
      {status === "ready" && honey
        ? <button type="button" className={styles.stampButton} data-attended={honey.attended || undefined} disabled={busy || honey.attended} onClick={journey.attend}>
            <HoneyIcon size={28} />{busy ? "도장 찍는 중" : honey.attended ? "오늘 출석 도장 완료" : "출석 도장 찍기"}
          </button>
        : status === "guest"
          ? <GuestInvite journey={journey} />
          : status === "error"
            ? <button type="button" className={styles.stampButton} onClick={journey.retry}>다시 확인하기</button>
            : <p className={styles.note} role="status">출석 정보 확인 중</p>}
      {message && <p className={styles.notice} role="status">{message}{honey?.awarded && honey.bonus ? ` ${honey.streakEvery}일 연속 보너스 ${honey.bonus}방울이 포함됐어요.` : ""}</p>}
      {saveFailed && <p className={styles.notice} role="status">{DIARY_SAVE_FAILED_TEXT}</p>}
    </div>
    <TodayQuests journey={journey} />
    <HoneyUses journey={journey} />
    <span className={yehwa.sprig} aria-hidden="true" />
  </section>;
}
