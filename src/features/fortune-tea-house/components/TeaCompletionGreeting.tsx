"use client";
import YeoniWaitingPortrait from "./YeoniWaitingPortrait";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import styles from "../styles/tea-brewing.module.css";
const KO = { title: "당신을 위한 차가 준비됐어요", message: "연이가 정성껏 담은 이야기를 천천히 읽어보세요.", action: "상담 결과 읽기", portrait: "완성된 차를 두 손으로 건네는 연이" };
export default function TeaCompletionGreeting({ onDismiss }: { onDismiss: () => void }) {
 const copy = useTeaHouseCopy("completionGreeting", KO);
 return <section className={styles.greeting} aria-label={copy.title}>
   <YeoniWaitingPortrait complete label={copy.portrait} />
   <div><h2>{copy.title}</h2><p>{copy.message}</p><button type="button" className={styles.link} onClick={onDismiss}>{copy.action}</button></div>
 </section>;
}
