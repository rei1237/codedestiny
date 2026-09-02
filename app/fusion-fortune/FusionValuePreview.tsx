/**
 * 결제 결정 지점의 가치 전달 (서버 컴포넌트 — 클라이언트 번들에 실리지 않는다).
 *
 * 왜 있는가: 이 화면은 결과 미리보기도 샘플도 없이 ₩30,000 결제창을 띄웠다. 사용자는
 * 무엇을 받는지 모른 채 "초융합 운세 생성하기" 를 눌렀고, 그제서야 금액을 처음 봤다.
 *
 * 🔴 문구 정본은 정적 셸의 `FEATURE_MARKETING_COPY['/fusion-fortune']` 이고, 이 파일은
 *    `npm run sync:marketing-copy` 가 옮겨 둔 생성 JSON 을 읽는다. 예전에는 여기에
 *    `answersQuestions` · `valueCompare` · `trustNotes` · `previewText` 를 손으로 베낀
 *    사본이 있었고, 셸만 고치는 동안 그 사본이 낡아 같은 상품이 홈 상세 시트와 결제 화면에서
 *    서로 다른 말을 했다. 이제 두 화면이 한 데이터를 본다 — 문구를 고칠 자리는 셸이다.
 *
 * 🔴 서버 컴포넌트라서 정적 import 로 읽는다. 400KB 짜리 생성 JSON 은 빌드 시점에만 필요하고
 *    클라이언트 번들에는 실리지 않는다 — 이 파일에 `"use client"` 를 붙이지 말 것.
 *
 * 🔴 결과 구성 목록은 마케팅 문구가 아니라 **실제 렌더 순서**다 — FusionResultThread.tsx 가
 *    그리는 블록 순서이고, 본문 키의 정본은 fusion-thread.tsx 의 SECTION_KEYS 와
 *    worker/lib/fusion-fortune-prompt.js 의 FUSION_SECTION_GROUP_SPECS 다. 셸 카피의
 *    `analysisSteps`(7개 체계 요약)와는 다른 목록이므로 아래 상수로 남는다.
 *
 * 🔴 개인화된 가짜 분석 문장을 지어내지 않는다. 여기서 보여 주는 것은 "결과가 어떤 구조로
 *    오는가" 까지이며, 실제 해석은 결제 후 본인 명식으로만 생성된다.
 */

import marketingBook from "@/lib/marketing/feature-marketing-copy.generated.json";

import styles from "./fusion-fortune.module.css";

/**
 * 셸 정본 카피.
 *
 * 🔴 `tsconfig.json` 의 `strict:false` 로 `noImplicitAny` 가 꺼져 있어, 없는 키를 넣어도
 *    타입 검사는 조용히 통과한다(2026-09-03 실측). 키가 사라졌을 때의 방어는 두 겹이다 —
 *    `__tests__/ui/fusion-value-preview.static.test.js` 가 먼저 잡고, 놓쳐도 정적 프리렌더가
 *    TypeError 로 죽는다. 빈 화면이 조용히 배포되지는 않는다.
 */
const COPY = marketingBook.items["/fusion-fortune"].copy;

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

export function FusionValuePreview() {
  return (
    <section className={styles.valuePreview} aria-labelledby="fusionValuePreviewHeading">
      <h2 id="fusionValuePreviewHeading" className={styles.valueHeading}>결제하면 받는 것</h2>
      <p className={styles.valueLead}>{COPY.previewText}</p>

      <h3 className={styles.valueSubheading}>이 상담이 답하는 질문</h3>
      <ul className={styles.valueQuestions}>
        {COPY.answersQuestions.map((question) => <li key={question}>{question}</li>)}
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
            {COPY.valueCompare.rows.map((row) => (
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
        {COPY.trustNotes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    </section>
  );
}
