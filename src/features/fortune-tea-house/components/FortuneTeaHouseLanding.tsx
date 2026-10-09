"use client";
import TeaHouseAlbumInvitation from "./TeaHouseAlbumInvitation";
import type { FortuneTeaHouseHoneyDropsState } from "../data/consult";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { readEntryBookmark } from "../lib/entryBookmark";
import Link from "next/link";
import { ArrowRight, BookOpen, Flower2, UserRound } from "lucide-react";
import type { FortuneTeaHouseConsultMode } from "../data/consult";
import { getFortuneTeaHouseConsultPriceLabel } from "../data/consultPricing";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import styles from "../styles/tea-house-home.module.css";
const KO = {
 title:"연이의 운명 찻집",library:"내 상담함",account:"계정",back:"꿀꿀 사주로",
 heading:"달빛이 머무는 밤,\n당신을 위한 한 잔",lead:"꽃돼지의 인사로 시작해, 연이와 마주 앉는 이야기.",
 intro:"사주로 삶의 흐름을, 타로로 지금의 선택을, 숙요점으로 관계의 거리감을 살펴봐요.",
 start:"연이의 이야기 읽기",resume:"이야기 이어 읽기",restart:"처음부터 읽기",sample:"상담 예시 보기",heroAlt:"달빛 찻집에서 차를 건네는 인간형 연이",
 concerns:"오늘은 어떤 마음으로 오셨나요?",concernsHelp:"질문을 고르면 어울리는 상담을 안내해요. 질문도, 상담 방식도 바꿀 수 있어요.",
 questions:["그 사람과 나는 왜 자꾸 엇갈릴까?","다시 연락해도 괜찮을까?","지금 이 일을 계속해도 될까?","내 재물 흐름에서 무엇을 조심해야 할까?","두 선택 중 무엇을 먼저 살펴봐야 할까?","내 마음을 나도 모르겠어요"],
 methods:"나에게 맞는 상담 자리",choose:"이 상담 시작하기",
 saju:"사주",sajuLine:"내 삶의 계절과 흐름",sajuInfo:"출생 정보로 기질과 시기의 흐름을 읽어요. 명식·해석 근거·행동 조언을 받아요.",
 tarot:"타로",tarotLine:"지금의 선택과 마음",tarotInfo:"생년월일 없이 질문과 선택한 카드로 살펴봐요. 카드별 근거와 조합 해석을 받아요.",
 sukuyo:"숙요점",sukuyoLine:"두 사람의 관계와 거리",sukuyoInfo:"두 사람의 출생 정보로 숙과 관계 방향을 읽어요. 끌림·오해·대화 방법을 살펴봐요.",
 compat:"두 사람의 사주 궁합도 볼 수 있어요",priceNote:"단건 기준 · 이용권과 월정석 적용 여부는 상담 확인 단계에서 안내해요.",
 previewTitle:"상담은 이렇게 남아요",example:"구성 예시 · 실제 고객 상담이 아닙니다",
 exampleQuestion:"지금 이 일을 계속해도 될까요?",exampleAnswer:"결정을 서두르기 전에, 지친 이유와 계속하고 싶은 이유를 나누어 살펴봐요.",
 exampleBody:"실제 상담에서는 선택한 방식의 계산 데이터 또는 카드에 근거해 질문에 답해요. 이 예시에는 개인의 계산 결과가 들어 있지 않아요.",
 resultParts:["내 질문에 대한 핵심 답변","그렇게 읽은 근거와 해석의 한계","지금 할 수 있는 행동","연이가 전하는 마무리 편지"],
 historyTitle:"지난 마음도, 이어지는 이야기도",historyBody:"저장된 상담을 다시 읽고, 생성 중이거나 복구가 필요한 상담을 이어가세요.",
 welcomeHuman:"더 깊은 이야기를 나눌 때는, 같은 연이가 사람의 모습으로 곁에 앉아요.",
 optional:"찻집을 천천히 둘러보기",prologue:"연이의 이야기",cups:"찻잔 고르기",album:"달빛 타로 앨범",
 guideTitle:"상담 전에 알아두세요",guide:"질문과 필요한 정보를 확인한 뒤 제공 내용과 가격을 안내해요. 상담은 선택을 돕는 해석이며, 미래나 상대의 마음을 확정하지 않아요.",
};
const modes=["saju","tarot","sukuyo"] as const;
const questionModes:FortuneTeaHouseConsultMode[]=["sukuyo","tarot","saju","saju","tarot","tarot"];
type Props={honeyDrops?:FortuneTeaHouseHoneyDropsState|null;soundControl?:ReactNode;hasSeenPrologue:boolean;onEnter:(mode?:FortuneTeaHouseConsultMode,question?:string)=>void;onReplayPrologue:()=>void;onResumePrologue?:()=>void;onShowHistory:()=>void;onChooseCup?:()=>void;onOpenAlbum?:()=>void};
export default function FortuneTeaHouseLanding({onEnter,onReplayPrologue,onShowHistory,onChooseCup,onOpenAlbum,soundControl,onResumePrologue,honeyDrops=null}:Props){
 const copy=useTeaHouseCopy("homeV2",KO);
 const [hasBookmark,setHasBookmark]=useState(false);
 useEffect(()=>setHasBookmark(Boolean(readEntryBookmark())),[]);
 return <div className={styles.home}>
 <header className={styles.header}><Link href="/fortune-tea-house/" className={styles.brand}><Flower2 aria-hidden size={24}/>{copy.title}</Link><nav aria-label={copy.title}><button onClick={onShowHistory}><BookOpen size={18} aria-hidden/>{copy.library}</button><Link href="/login/?next=%2Ffortune-tea-house%2F"><UserRound size={18} aria-hidden/>{copy.account}</Link><Link href="/ggulggul/">{copy.back}</Link>{soundControl}</nav></header>
 <section className={styles.hero}><div className={styles.heroCopy}><h1>{copy.heading}</h1><p className={styles.lead}>{copy.lead}</p><p>{copy.intro}</p><div className={styles.actions}><button className={styles.primary} onClick={hasBookmark ? onResumePrologue : onReplayPrologue}>{hasBookmark ? copy.resume : copy.start}<ArrowRight aria-hidden size={18}/></button><a className={styles.secondary} href="#tea-example">{copy.sample}</a><button className={styles.secondary} onClick={onChooseCup}>{copy.cups}</button>{hasBookmark && <button onClick={onReplayPrologue}>{copy.restart}</button>}</div></div><Image src="/images/fortune-tea-house/yeoni-moonlight-novel.webp" width={1536} height={1024} alt={copy.heroAlt} priority sizes="(max-width:700px) 100vw,60vw" className={styles.heroImage}/></section>
 {onOpenAlbum && <TeaHouseAlbumInvitation honeyDrops={honeyDrops} onOpen={onOpenAlbum}/>}
 <section className={styles.section} id="tea-concerns"><h2>{copy.concerns}</h2><p>{copy.concernsHelp}</p><div className={styles.questions}>{copy.questions.map((q,i)=><button key={i} onClick={()=>onEnter(questionModes[i],q)}>{q}<ArrowRight aria-hidden size={18}/></button>)}</div></section>
 <section className={`${styles.section} ${styles.preview}`} id="tea-example"><div><h2>{copy.previewTitle}</h2><p>{copy.welcomeHuman}</p><Image src="/images/fortune-tea-house/renewal/yeoni-human-welcome.webp" width={720} height={720} alt="" sizes="(max-width:700px) 100vw,40vw"/></div><article className={styles.letter}><span>{copy.example}</span><h3>{copy.exampleQuestion}</h3><p className={styles.answer}>{copy.exampleAnswer}</p><p>{copy.exampleBody}</p><ol>{copy.resultParts.map(p=><li key={p}>{p}</li>)}</ol></article></section>
 <section className={styles.section}><h2>{copy.methods}</h2><div className={styles.methods}>{modes.map(mode=><article key={mode}><Image src={`/images/fortune-tea-house/renewal/human-${mode === "saju" ? "explaining" : mode === "tarot" ? "advice" : "listening"}.webp`} alt="" width={720} height={480} sizes="(max-width:700px) 100vw,33vw"/><h3>{copy[mode]}</h3><strong>{copy[`${mode}Line`]}</strong><p>{copy[`${mode}Info`]}</p><span>{getFortuneTeaHouseConsultPriceLabel(mode)}</span><button onClick={()=>onEnter(mode)}>{copy.choose}<ArrowRight size={16} aria-hidden/></button></article>)}</div><p className={styles.note}>{copy.priceNote}</p><button className={styles.textButton} onClick={()=>onEnter("sajuCompatibility")}>{copy.compat}<ArrowRight size={16} aria-hidden/></button></section>
 <section className={`${styles.section} ${styles.history}`}><div><h2>{copy.historyTitle}</h2><p>{copy.historyBody}</p></div><button className={styles.primary} onClick={onShowHistory}>{copy.library}<ArrowRight size={18} aria-hidden/></button></section>
 <footer className={`${styles.section} ${styles.visit}`}><h2>{copy.guideTitle}</h2><p>{copy.guide}</p><h3>{copy.optional}</h3><div className={styles.actions}><button onClick={onReplayPrologue}>{copy.prologue}</button><button onClick={onChooseCup}>{copy.cups}</button><button onClick={onOpenAlbum}>{copy.album}</button></div></footer>
 </div>;
}
