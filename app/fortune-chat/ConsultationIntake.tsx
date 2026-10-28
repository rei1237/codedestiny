"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, PencilLine } from "lucide-react";
import { PriceBadge } from "@/app/components/PriceBadge";
import type { ChatDomain, ChatTarotKind } from "./consultation-api";
import { TAROT_KINDS } from "./consultation-world";
import { HONEY_COST } from "./consultation-access";
import styles from "./yeoni-salon.module.css";
import YeoniIllustratedGuide from './YeoniIllustratedGuide';

const METHODS: { id: ChatDomain; label: string; description: string }[] = [
  { id: "saju", label: "사주", description: "타고난 기질과 시기의 흐름" },
  { id: "ziwei", label: "자미두수", description: "열두 궁으로 살피는 삶의 방향" },
  { id: "sukuyo", label: "숙요", description: "달의 별자리로 읽는 성향" },
  { id: "vedic", label: "베다점", description: "인도 점성술로 보는 삶의 리듬" },
  { id: "astrology", label: "서양 점성술", description: "출생 천궁도로 살피는 선택" },
  { id: "tarot", label: "타로", description: "출생정보 없이, 지금의 고민" },
];
const EXAMPLES = ["올해 이직해도 괜찮을까요?", "지금 관계를 이어가도 될까요?", "요즘 돈 흐름은 어떤가요?"];
const TITLES = ["어떤 이야기를 나누고 싶나요?", "어떤 관점으로 살펴볼까요?", "이 질문으로 상담을 준비할까요?"];

type Props = {
  question: string; onQuestion: (value: string) => void;
  domain: ChatDomain; onDomain: (value: ChatDomain) => void;
  tarotKind: ChatTarotKind; onTarotKind: (value: ChatTarotKind) => void;
  profile: ReactNode; profileName: string; ready: boolean;
  busy: boolean; guest: boolean; enabled: boolean | null; onCreate: () => void;
};

export default function ConsultationIntake(props: Props) {
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const changedStep = useRef(false);
  const method = METHODS.find((item) => item.id === props.domain)!;
  const move = (next: number) => { changedStep.current = true; setStep(next); };
  useEffect(() => {
    if (changedStep.current) heading.current?.focus({ preventScroll: true });
  }, [step]);

  return <section className={styles.intake} aria-label="연이와 상담 준비">
    <nav className={styles.steps} aria-label="상담 준비 단계">
      {["질문 작성", "해석 방식", "내용 확인"].map((label, index) =>
        <button key={label} type="button" disabled={index > step} aria-current={index === step ? "step" : undefined} onClick={() => move(index)}>
          <span>{index < step ? <Check size={14} aria-hidden="true" /> : index + 1}</span>{label}
        </button>)}
    </nav>
    <div className={styles.prompt}>
      <Image src="/images/fortune-chat/yeoni/salon-companion-v1.webp" alt="" width={320} height={451} className={styles.companion} />
      <div><span className={styles.speaker}>꽃돼지 연이</span>
        <h2 ref={heading} tabIndex={-1}>{TITLES[step]}</h2>
        <p>{step === 0 ? "잘 정리된 말이 아니어도 괜찮아요. 가장 궁금한 한 가지부터 들려주세요." : step === 1 ? "같은 고민도 바라보는 관점이 달라요. 하나를 골라 주세요." : "질문과 해석 방식을 확인해 주세요. 이용 방법은 상담 준비 후 선택해요."}</p>
      </div>
    </div>
    {step === 0 && <div className={styles.answer}>
      <label htmlFor="yeoni-question">나의 질문</label>
      <textarea id="yeoni-question" rows={4} maxLength={300} value={props.question} onChange={(event) => props.onQuestion(event.target.value)}
        placeholder="예: 지금 회사에 남을지, 새로운 일을 시작할지 고민돼요." aria-describedby="yeoni-question-help" />
      <div className={styles.inputMeta}><p id="yeoni-question-help">현재 상황과 고민하는 선택을 함께 적으면 좋아요.</p><span>{props.question.length}/300</span></div>
      <details className={styles.examples}><summary>질문이 떠오르지 않나요?</summary>
        <YeoniIllustratedGuide kind="question"/>
        <div>{EXAMPLES.map((text) => <button type="button" key={text} onClick={() => props.onQuestion(text)}>{text}<ArrowRight size={15} aria-hidden="true" /></button>)}</div>
      </details>
    </div>}
    {step === 1 && <div className={styles.answer}>
      <details className={styles.examples}><summary>처음 상담한다면, 진행 방법 살펴보기</summary><YeoniIllustratedGuide kind="steps"/></details>
      <fieldset className={styles.methods}><legend>해석 방식</legend>
        {METHODS.map((item) => <button key={item.id} type="button" aria-pressed={item.id === props.domain} onClick={() => props.onDomain(item.id)}>
          <span><strong>{item.label}</strong><small>{item.description}</small></span><span className={styles.selectionDot} aria-hidden="true">{item.id === props.domain && <Check size={13} />}</span>
        </button>)}
      </fieldset>
      {props.domain === "tarot" ? <fieldset className={styles.topics}><legend>타로로 살펴볼 고민</legend>
        {TAROT_KINDS.map((kind) => <button type="button" key={kind.id} aria-pressed={props.tarotKind === kind.id} onClick={() => props.onTarotKind(kind.id)}>{kind.label}</button>)}
      </fieldset> : <section className={styles.profile} aria-label="상담할 프로필"><h3>누구의 흐름을 볼까요?</h3>{props.profile}</section>}
    </div>}
    {step === 2 && <div className={styles.answer}>
      <blockquote className={styles.reviewQuestion}>{props.question}</blockquote>
      <button type="button" className={styles.edit} onClick={() => move(0)}><PencilLine size={14} aria-hidden="true" />질문 수정</button>
      <dl className={styles.review}><div><dt>해석 방식</dt><dd>{method.label}{props.domain === "tarot" ? ` · ${TAROT_KINDS.find((kind) => kind.id === props.tarotKind)?.label}` : ""}</dd></div>
        <div><dt>상담 대상</dt><dd>{props.domain === "tarot" ? "출생정보 없이 진행" : props.profileName || "로그인 후 프로필 선택"}</dd></div></dl>
      <div className={styles.priceNote}><PriceBadge featureKey="fortune-chat-consultation" prefix="단건 결제 · " className={styles.price} /><p>이용권 또는 꿀방울 {HONEY_COST}개로도 열 수 있어요.<br />사용 가능한 이용 방법은 다음 화면에서 확인해요.</p></div>
    </div>}
    <div className={styles.intakeFooter}>
      {step > 0 && <button type="button" className={styles.previous} onClick={() => move(step - 1)} disabled={props.busy}><ArrowLeft size={16} aria-hidden="true" />이전</button>}
      <button type="button" className={styles.continue} disabled={props.busy || !props.question.trim() || (step > 0 && !props.ready) || (step === 2 && props.enabled === false)}
        onClick={() => step < 2 ? move(step + 1) : props.onCreate()}>
        {props.busy ? "상담을 준비하고 있어요" : step === 2 ? props.guest ? "로그인하고 상담 준비하기" : "상담 준비하기" : "계속하기"}<ArrowRight size={18} aria-hidden="true" />
      </button>
    </div>
    {props.enabled === false && <p className={styles.note} role="status">새 상담 준비가 잠시 멈췄어요. 지난 상담은 그대로 읽을 수 있어요.</p>}
    <p className={styles.disclosure}>AI가 작성하는 상담이에요. 미래나 상대의 마음을 확정하지 않아요.</p>
  </section>;
}
