"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Heart, Moon, Sparkles } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import type { FortuneTeaHouseConsultMode, FortuneTeaHouseConsultResponse } from "../data/consult";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import styles from "../styles/tea-library.module.css";
import { useLocale } from "@/lib/i18n/useT";

type TeaHouseHistoryItem = {
  resultId: string;
  consultationMode: FortuneTeaHouseConsultMode;
  questionSummary: string;
  createdAt?: string;
};

type TeaHouseHistoryPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onResume: () => void;
  onSelectResult: (result: FortuneTeaHouseConsultResponse) => void;
};

const CONSULTATION_MODE_META: Record<FortuneTeaHouseConsultMode, { label: string; icon: typeof Sparkles }> = {
  tarot: { label: "타로", icon: Sparkles },
  saju: { label: "사주", icon: Moon },
  sajuCompatibility: { label: "사주 궁합", icon: Heart },
  sukuyo: { label: "숙요점 궁합", icon: Heart },
  // label 은 아래 render 에서 copy.mode 로 갈아끼운다 — 여기 값은 사전이 비었을 때의 원문이다.
};

// 🔴 예전에는 마지막 줄이 "ko-KR" 로 고정돼 있어, 어떤 로케일로 들어와도 날짜만 한국식으로 나왔다.
// 활성 로케일을 받아 쓴다. 상대 시간 문구의 {n} 은 런타임 치환 자리다.
function formatRelativeDate(iso: string | undefined, copy: typeof KO, locale: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return copy.relative.justNow;
  if (diffMinutes < 60) return copy.relative.minutes.replace("{n}", String(diffMinutes));
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return copy.relative.hours.replace("{n}", String(diffHours));
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return copy.relative.days.replace("{n}", String(diffDays));
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    {n} 은 경과 시간 숫자로 치환된다 — 모든 로케일에서 그대로 둘 것. */
const KO = {
  pending: "완성 중인 상담", resume: "저장된 부분부터 이어보기", pendingHelp: "질문과 결제 권한을 확인해 같은 상담을 이어갑니다.",
  login: "로그인하고 상담함 열기", openError: "상담을 열지 못했어요. 다시 선택해 주세요.",
  closeAria: "상담 기록 닫기",
  title: "지난 상담 기록",
  subtitle: "연이와 나눈 이야기를 다시 펼쳐볼 수 있어요.",
  loadError: "상담 기록을 불러오지 못했어요.",
  retry: "다시 시도",
  empty: "아직 완료된 상담이 없어요. 찻집에서 첫 상담을 시작해 보세요.",
  noSummary: "질문 요약이 없어요",
  opening: "여는 중…",
  mode: {
    tarot: "타로",
    saju: "사주",
    sajuCompatibility: "사주 궁합",
    sukuyo: "숙요점 궁합",
  },
  relative: {
    justNow: "방금 전",
    minutes: "{n}분 전",
    hours: "{n}시간 전",
    days: "{n}일 전",
  },
};

export default function TeaHouseHistoryPanel({ isOpen, onClose, onSelectResult, onResume }: TeaHouseHistoryPanelProps) {
  const copy = useTeaHouseCopy("historyPanel", KO);
  const locale = useLocale();
  const [items, setItems] = useState<TeaHouseHistoryItem[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready" | "login">("loading");
  const [pending, setPending] = useState(false);
  const [openingResultId, setOpeningResultId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const loadHistory = useCallback(async () => {
    setStatus("loading");setError("");
    try {
      const [response, pendingResponse] = await Promise.all([
        authFetch("/api/fortune-tea-house/results", { cache: "no-store" }),
        authFetch("/api/fortune-tea-house/pending", { cache: "no-store" }),
      ]);
      if(response.status === 401){setStatus("login");return;}
      const payload = await response.json();
      if(!response.ok || !payload?.ok){setStatus("error");return;}
      const progress = pendingResponse.ok ? await pendingResponse.json() : null;
      setPending(Boolean(progress?.requestPayload));
      setItems(Array.isArray(payload.items) ? payload.items : []);setStatus("ready");
    }catch{setStatus("error");}
  },[]);
  useEffect(() => {
    if(!isOpen)return;
    const previous=document.activeElement as HTMLElement|null;
    void loadHistory();closeButtonRef.current?.focus();
    const overflow=document.body.style.overflow;document.body.style.overflow="hidden";
    return()=>{document.body.style.overflow=overflow;previous?.focus();};
  },[isOpen,loadHistory]);
  if(!isOpen)return null;
  async function openResult(resultId:string){
    if(openingResultId)return;setOpeningResultId(resultId);setError("");
    try{
      const response=await authFetch(`/api/fortune-tea-house/results/${encodeURIComponent(resultId)}`,{cache:"no-store"});
      const payload=await response.json();
      if(!response.ok||!payload?.ok||!payload.result)throw new Error();
      onSelectResult(payload.result);
    }catch{setError(copy.openError);}finally{setOpeningResultId(null);}
  }
  function keyDown(event:KeyboardEvent<HTMLDivElement>){
    if(event.key==="Escape"){onClose();return;}
    if(event.key!=="Tab")return;
    const targets=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]'));
    const first=targets[0],last=targets[targets.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
  return <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="fortuneTeaHistoryTitle" onKeyDown={keyDown}>
    <section className={styles.library}>
      <button ref={closeButtonRef} type="button" className={styles.close} onClick={onClose}>{copy.closeAria}</button>
      <header><p>YEONI'S TEA HOUSE</p><h2 id="fortuneTeaHistoryTitle">{copy.title}</h2><p>{copy.subtitle}</p></header>
      {status==="loading"&&<p role="status">{copy.opening}</p>}
      {status==="login"&&<a href="/login/?next=%2Ffortune-tea-house%2F%3Fhistory%3D1">{copy.login}</a>}
      {status==="error"&&<div role="alert"><img src="/images/fortune-tea-house/renewal/state-retry.webp" width="140" height="150" alt=""/><p>{copy.loadError}</p><button onClick={()=>void loadHistory()}>{copy.retry}</button></div>}
      {pending&&<article className={styles.pending}><img src="/images/fortune-tea-house/renewal/state-brewing.webp" width="80" height="90" alt=""/><div><h3>{copy.pending}</h3><p>{copy.pendingHelp}</p><button onClick={onResume}>{copy.resume}</button></div></article>}
      {status==="ready"&&items.length===0&&<div className={styles.empty}><img src="/images/fortune-tea-house/renewal/state-empty.webp" width="200" height="190" alt=""/><p>{copy.empty}</p></div>}
      <ul>{items.map(item=><li key={item.resultId}><button disabled={!!openingResultId} onClick={()=>void openResult(item.resultId)}><span>{copy.mode[item.consultationMode]||copy.mode.tarot} · {formatRelativeDate(item.createdAt,copy,locale)}</span><strong>{item.questionSummary||copy.noSummary}</strong>{openingResultId===item.resultId&&<span>{copy.opening}</span>}</button></li>)}</ul>
      {error&&<p role="alert">{error}</p>}
    </section>
  </div>;
}
