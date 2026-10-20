import { Check, Circle, ArrowRight, ScrollText } from "lucide-react";
import { KeeperLine } from "../_hq/components";
import { HQ_ART } from "../_hq/art";
import styles from "./content-workshop.module.css";

export default function ContentQuest({ title, body, searchReady }: { title: boolean; body: boolean; searchReady: boolean }) {
  const steps = [
    { title: "질문 정하기", hint: "누구의 어떤 질문에 답할지 제목에 담아주세요.", ready: title, href: "#content-outline" },
    { title: "원문 쓰기", hint: "답변과 근거, 독자가 해볼 행동을 본문에 풀어주세요.", ready: body, href: "#content-body" },
    { title: "검색 안내 채우기", hint: "주소와 검색 제목·설명을 채운 뒤 미리보기로 검토해 주세요.", ready: searchReady, href: "#content-search" },
  ];
  const complete = steps.filter(step => step.ready).length;
  const next = steps.find(step => !step.ready);
  return <section className={styles.quest} aria-label="편집 퀘스트">
    <div className={styles.questGuide}>
      <KeeperLine art={HQ_ART.yeoniLibrary} name="편집 길잡이 · 연이">
        <p>{next?.hint || "작성 재료가 모였어요. 사실과 링크를 확인하고, 미리보기에서 마지막으로 읽어주세요."}</p>
      </KeeperLine>
      <span className={styles.readiness}><ScrollText size={16} aria-hidden="true" /> 작성 준비 {complete}/3</span>
    </div>
    <ol className={styles.steps}>
      {steps.map((step, index) => <li key={step.href}>
        <a href={step.href} aria-current={step === next ? "step" : undefined}>
          {step.ready ? <Check size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}
          <span><small>{index + 1}단계 · {step.ready ? "입력됨" : "작성할 곳"}</small><strong>{step.title}</strong></span>
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </li>)}
    </ol>
    <p className={styles.note}>입력 여부를 안내하는 체크리스트예요. 사실 검수·발행·XP 완료 판정은 별도로 확인하세요.</p>
  </section>;
}
