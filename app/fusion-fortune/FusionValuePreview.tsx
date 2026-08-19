/**
 * 결제 결정 지점의 가치 전달 (서버 컴포넌트 — 클라이언트 번들에 실리지 않는다).
 *
 * 왜 있는가: 이 화면은 결과 미리보기도 샘플도 없이 ₩30,000 결제창을 띄웠다. 사용자는
 * 무엇을 받는지 모른 채 "초융합 운세 생성하기" 를 눌렀고, 그제서야 금액을 처음 봤다.
 *
 * 🔴 문구 출처는 정적 셸의 `FEATURE_MARKETING_COPY['/fusion-fortune']`(index.html:35445)다.
 *    그 레지스트리는 홈 상세 시트에서만 렌더돼 결제 화면에는 도달하지 못했다. 여기 있는
 *    `answersQuestions` · `valueCompare` · `trustNotes` · `previewText` 는 그 값을 옮긴 것이라,
 *    한쪽만 고치면 같은 상품이 두 화면에서 다른 말을 한다. 함께 고칠 것.
 *
 * 🔴 결과 구성 목록은 마케팅 문구가 아니라 **실제 렌더 순서**다 — FusionResultThread.tsx 가
 *    그리는 블록 순서이고, 본문 키의 정본은 fusion-thread.tsx 의 SECTION_KEYS 와
 *    worker/lib/fusion-fortune-prompt.js 의 FUSION_SECTION_GROUP_SPECS 다.
 *
 * 🔴 개인화된 가짜 분석 문장을 지어내지 않는다. 여기서 보여 주는 것은 "결과가 어떤 구조로
 *    오는가" 까지이며, 실제 해석은 결제 후 본인 명식으로만 생성된다.
 */

import styles from "./fusion-fortune.module.css";

/** FusionResultThread 가 그리는 순서 그대로. 한 줄 설명은 각 체계가 맡는 축이다. */
const RESULT_BLOCKS: { name: string; detail: string }[] = [
  { name: "결론 요약", detail: "여섯 체계가 공통으로 가리키는 주제 하나를 먼저 못박고, 그것이 관계·일·마음에서 각각 어떻게 나타나는지까지." },
  { name: "체계별 신호 강도", detail: "여섯 체계가 각각 얼마나 강하게 같은 방향을 가리키는지 도표로." },
  { name: "사주", detail: "타고난 기질과 계절의 흐름." },
  { name: "자미두수", detail: "삶의 무대와 그 안에서 맡는 역할." },
  { name: "베다점", detail: "겉으로 잘 드러나지 않는 무의식의 리듬." },
  { name: "숙요점", detail: "사람과 사람 사이에서 유지되는 거리." },
  { name: "서양 점성술", detail: "표현하는 방식과 감당하는 책임." },
  { name: "타로", detail: "서버가 뽑은 여섯 장으로 읽는 지금의 선택." },
  { name: "교차 통합", detail: "여섯 해석을 나란히 두지 않고, 겹치는 신호와 엇갈리는 신호로 갈라 하나로 엮는다." },
  { name: "12개월 시기와 행동", detail: "앞으로 열두 달의 시기 라인과, 시기마다 준비할 일·시험할 일·정리할 일." },
  { name: "최종 판정", detail: "체계별 입장과 확신도, 그리고 지금 할 일과 지금은 피할 일." },
];

/** 출처: FEATURE_MARKETING_COPY['/fusion-fortune'].answersQuestions */
const ANSWERS_QUESTIONS = [
  "여러 운세가 서로 다른 말을 하는데 무엇을 따라야 할까요?",
  "올해 남은 기간에 무엇을 준비해야 할까요?",
  "지금 이 결정을 밀어붙여도 될까요?",
];

/** 출처: FEATURE_MARKETING_COPY['/fusion-fortune'].valueCompare.rows */
const VALUE_COMPARE = [
  { axis: "체계 수", free: "한 번에 하나", premium: "여섯 체계를 한 상담 안에서" },
  { axis: "교차 검증", free: "없음", premium: "겹치는 신호와 엇갈리는 신호를 나눠 정리" },
  { axis: "시기", free: "오늘 중심", premium: "앞으로 12개월 시기 라인" },
  { axis: "분량", free: "요약 수준", premium: "본문 20,000자 이상" },
];

/** 출처: FEATURE_MARKETING_COPY['/fusion-fortune'].trustNotes */
const TRUST_NOTES = [
  "서버가 계산한 값에 없는 별·궁·카드·시기는 만들지 않습니다.",
  "타인의 마음이나 결과를 확정하지 않습니다.",
  "완성된 결과는 계정에 남고, 다시 여는 데에는 추가 결제가 없습니다.",
  "생성이 실패하면 같은 요청으로 다시 시도할 때 추가 결제가 없습니다.",
];

export function FusionValuePreview() {
  return (
    <section className={styles.valuePreview} aria-labelledby="fusionValuePreviewHeading">
      <h2 id="fusionValuePreviewHeading" className={styles.valueHeading}>결제하면 받는 것</h2>
      <p className={styles.valueLead}>
        초융합은 여섯 개의 운세를 나란히 늘어놓지 않습니다. 서로 무엇을 함께 말하고 어디서 갈라지는지를
        먼저 정리한 뒤, 그 위에서 지금의 선택을 봅니다.
      </p>

      <h3 className={styles.valueSubheading}>이 상담이 답하는 질문</h3>
      <ul className={styles.valueQuestions}>
        {ANSWERS_QUESTIONS.map((question) => <li key={question}>{question}</li>)}
      </ul>

      <h3 className={styles.valueSubheading}>결과 문서에 담기는 것</h3>
      <p className={styles.valueNote}>
        아래는 결과가 어떤 순서와 구조로 오는지를 보여 주는 목록입니다. 실제 해석 문장은 결제 후
        본인의 생년 정보로만 생성되므로, 여기에 예시 해석을 지어 두지 않았습니다.
      </p>
      <ol className={styles.valueBlocks}>
        {RESULT_BLOCKS.map((block) => (
          <li key={block.name}>
            <strong>{block.name}</strong>
            <span>{block.detail}</span>
          </li>
        ))}
      </ol>

      <h3 className={styles.valueSubheading}>무료 운세와 무엇이 다른가</h3>
      <div className={styles.valueTableScroll}>
        <table className={styles.valueTable}>
          <thead>
            <tr>
              <th scope="col">비교 기준</th>
              <th scope="col">무료 운세</th>
              <th scope="col">초융합 심층 리딩</th>
            </tr>
          </thead>
          <tbody>
            {VALUE_COMPARE.map((row) => (
              <tr key={row.axis}>
                <th scope="row">{row.axis}</th>
                <td>{row.free}</td>
                <td>{row.premium}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className={styles.valueSubheading}>미리 밝혀 두는 것</h3>
      <ul className={styles.valueNotes}>
        {TRUST_NOTES.map((note) => <li key={note}>{note}</li>)}
      </ul>
    </section>
  );
}
