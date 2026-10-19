"use client";

import styles from "./karma-relationship-guide.module.css";

export type RelationshipContext = { person: string; relationship: string; scene: string; myResponse: string; theirResponse: string; wish: string };
export const emptyRelationshipContext = (): RelationshipContext => ({ person: "", relationship: "", scene: "", myResponse: "", theirResponse: "", wish: "" });

const copy = {
  ko: {
    title: "풀어보고 싶은 인연", note: "선택 입력 · 실명 대신 별칭을 써도 됩니다. 상대의 생년월일 없이, 내 성향과 실제로 겪은 장면을 연결해 살펴봅니다.",
    person: "상대의 별칭", relationship: "나와의 관계", scene: "반복되는 장면", myResponse: "그때 나의 반응", theirResponse: "직접 본 상대의 행동", wish: "이번 상담에서 풀고 싶은 것",
    personHint: "예: A, 오래된 친구", relationshipHint: "예: 연인, 전 연인, 가족, 동료",
    sceneHint: "예: 부탁을 거절하면 멀어질까 봐 계속 떠맡고, 결국 서운함이 쌓여요.",
    myResponseHint: "예: 괜찮다고 말한 뒤 연락을 피하게 돼요.", theirResponseHint: "추측한 속마음보다 실제 말과 행동을 적어 주세요.", wishHint: "예: 관계를 지키면서 거절하기, 거리를 둘 기준 찾기",
    guideTitle: "매듭을 알아야, 실마리가 보입니다", guideText: "타고난 성향을 단정적인 운명 대신 관계를 이해하는 단서로 읽습니다.",
    steps: [["나의 성향", "다섯 운세의 계산 근거에서 강점과 흔들리기 쉬운 지점을 살핍니다."], ["반복되는 고리", "끌림·과한 책임·회피가 어떤 장면에서 소진되는 관계로 이어지는지 짚습니다."], ["풀어갈 실마리", "초기 신호, 경계의 말, 가까이할 때와 거리를 둘 때의 기준을 정리합니다."]],
  },
  en: {
    title: "A relationship to untangle", note: "Optional · A nickname is enough. We connect your own tendencies with the situations you report, without assuming the other person’s birth chart.",
    person: "Their nickname", relationship: "Your relationship", scene: "A recurring situation", myResponse: "How you respond", theirResponse: "Their observed behavior", wish: "What you want to resolve",
    personHint: "e.g. A, an old friend", relationshipHint: "e.g. partner, ex, family, colleague", sceneHint: "What happens repeatedly, and how does it affect you?", myResponseHint: "What do you say or do in that moment?", theirResponseHint: "Describe words and actions rather than guessing their thoughts.", wishHint: "e.g. setting a boundary, deciding on distance",
    guideTitle: "Find the knot. Follow the thread.", guideText: "Read your tendencies as clues to understand relationships, rather than a fixed destiny.",
    steps: [["Your tendencies", "Explore strengths and sensitive points through the available chart evidence."], ["The recurring cycle", "Trace how attraction, over-responsibility or withdrawal can become draining patterns."], ["A way forward", "Identify early signals, words for boundaries and criteria for closeness or distance."]],
  },
};

export function KarmaRelationshipFields({ value, onChange, locale, disabled }: { value: RelationshipContext; onChange: (value: RelationshipContext) => void; locale: string; disabled?: boolean }) {
  const text = locale === "ko" ? copy.ko : copy.en;
  const fields: { key: keyof RelationshipContext; limit: number; hint: string; multiline?: boolean }[] = [
    { key: "person", limit: 60, hint: text.personHint }, { key: "relationship", limit: 80, hint: text.relationshipHint },
    { key: "scene", limit: 500, hint: text.sceneHint, multiline: true }, { key: "myResponse", limit: 300, hint: text.myResponseHint, multiline: true },
    { key: "theirResponse", limit: 300, hint: text.theirResponseHint, multiline: true }, { key: "wish", limit: 240, hint: text.wishHint, multiline: true },
  ];
  return <fieldset className={styles.fields} disabled={disabled}>
    <legend>{text.title}</legend><p>{text.note}</p>
    <div className={styles.grid}>{fields.map(({ key, limit, hint, multiline }) => <label key={key} className={key === "scene" || key === "wish" ? styles.wide : undefined}>
      <span>{text[key]}</span>
      {multiline ? <textarea name={`relationship-${key}`} value={value[key]} maxLength={limit} rows={3} placeholder={hint} onChange={event => onChange({ ...value, [key]: event.target.value })} />
        : <input name={`relationship-${key}`} value={value[key]} maxLength={limit} placeholder={hint} onChange={event => onChange({ ...value, [key]: event.target.value })} />}
    </label>)}</div>
  </fieldset>;
}

export function KarmaRelationshipGuide({ locale }: { locale: string }) {
  const text = locale === "ko" ? copy.ko : copy.en;
  return <div className={styles.guide}>
    <img src="/images/expert-consulting/karma-red-thread-karmic-768.webp" width={768} height={512} alt="" loading="lazy" />
    <h3>{text.guideTitle}</h3><p>{text.guideText}</p>
    <ol>{text.steps.map(([title, description]) => <li key={title}><strong>{title}</strong><p>{description}</p></li>)}</ol>
  </div>;
}
