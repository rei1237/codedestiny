import {useState} from 'react';
const careerArt='/images/career-style/yeoni-work-style.webp';
import './career-style-preview.css';

// Only the fixed public example and questions about everyday work belong here.
// The eight personal chapters and their source copy stay on the server.
const conditions = [
  {title:'자율성', question:'최근 과제에서 방법을 직접 골랐을 때, 어느 단계부터 손이 움직였나요?', action:'다음 과제를 시작할 때 스스로 정해 보고 싶은 방법 하나를 골라 보세요.'},
  {title:'구조와 규칙', question:'맡은 일의 마감과 완료 기준을 알고 나서 어떤 일이 쉬워졌나요?', action:'다음 일을 맡으면 무엇을 어디까지 마쳐야 하는지 한 문장으로 정리해 보세요.'},
  {title:'협업', question:'누군가와 의견을 주고받은 뒤 혼자서는 떠올리지 못했던 생각이 있었나요?', action:'다음 회의에서 아직 정리되지 않은 생각 하나를 꺼내고 동료의 의견을 들어 보세요.'},
  {title:'몰입', question:'혼자 한 가지 일을 이어갈 때 어느 순간 가장 깊이 집중했나요?', action:'다음 과제에서 방해받지 않고 집중할 짧은 시간을 정해 보세요.'},
  {title:'변화 속도', question:'일의 방향이 바뀌었을 때 바로 시도해 본 일과 적응할 시간이 필요했던 일은 무엇인가요?', action:'최근 바뀐 일 하나를 골라, 처음 시도한 방법과 다음에 바꾸고 싶은 점을 떠올려 보세요.'},
  {title:'성과 피드백', question:'누군가 건넨 말 가운데 결과물을 실제로 고치는 데 도움이 된 말은 무엇이었나요?', action:'다음에 의견을 구할 때는 만든 결과물에서 궁금한 부분 한 곳을 짚어 보세요.'},
] as const;

export default function CareerStylePreview(){
  const [selected,setSelected]=useState<(typeof conditions)[number]>(conditions[0]);
  return <section className="career-style-preview">
    <h1>나의 일 스타일</h1>
    <p>혼자 차근차근 풀 때와 동료와 이야기할 때, 어느 쪽에서 일이 더 잘 풀렸나요? 최근 경험 하나를 떠올려 보세요.</p>
    <img src={careerArt} width={1536} height={1024} alt="노트와 나침반을 펼치고 일의 방향을 살펴보는 꽃돼지 연이"/>
    <fieldset>
      <legend>어떤 업무 조건을 돌아볼까요?</legend>
      <div className="career-style-options">{conditions.map(condition=><label key={condition.title}>
        <input type="radio" name="career-condition" checked={selected===condition} onChange={()=>setSelected(condition)}/>
        {condition.title}
      </label>)}</div>
    </fieldset>
    <div className="career-style-question" aria-live="polite" aria-atomic="true">
      <h2>{selected.title}에 관한 질문</h2>
      <p>{selected.question}</p>
      <h3>작게 해볼 일</h3>
      <p>{selected.action}</p>
    </div>
    <details>
      <summary>사주 해석 예시 읽기</summary>
      <h2>방향을 세우는 개척형</h2>
      <p>일간은 사주에서 태어난 날의 나를 나타내는 글자예요. 아래는 일간이 갑목(甲木)인 경우의 공개 예시예요.</p>
      <blockquote>큰 방향을 먼저 세우는 방식이 익숙한지 돌아보세요. 방법을 선택할 여지가 있을 때와 명확한 절차가 있을 때, 어느 쪽에서 시작이 쉬웠는지 비교해 볼 수 있습니다.</blockquote>
      <p>이 예시는 개인 출생정보로 계산한 결과가 아니에요. 공감하는 부분을 실제 경험과 비교해 보세요.</p>
    </details>
  </section>;
}
