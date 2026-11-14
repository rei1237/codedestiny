import {ALL_TESTS} from '../../../src/features/psychotest/data/testData';
import {tossPsychotestMeta} from '../../../src/features/psychotest/toss-psychotest-copy.mjs';

// Follow the web gallery's reading guide while retaining Toss-reviewed names.
export default function PsychotestGuide({onSelect}:{onSelect:(id:string)=>void}){
 const test=(id:string)=>{const item=ALL_TESTS.find(row=>row.id===id)!;return <a href={'/psychotest/'+id+'/'} onClick={event=>{event.preventDefault();onSelect(id);}}>{tossPsychotestMeta(item).name}</a>;};
 return <aside className="psy-editorial" aria-label="테스트 선택과 해석 안내">
  <h2>어떤 심리테스트부터 해볼까요?</h2>
  <p>평소 선택 습관은 {test('mbti')}, 주변 자극을 받아들이는 방식은 {test('hsp')}에서 돌아보세요. {test('mental')}은 일상 속 사고 습관을, {test('empathy')}는 타인의 마음에 반응하는 방식을 살펴보는 질문입니다.</p>
  <h3>연애와 일의 고민으로 이어가기</h3>
  <p>{test('romance')}로 표현 취향을 살핀 뒤 <a href="/mbti/animals/">MBTI 연애 궁합</a>에서 서로의 차이를 이야기해 보세요. 회사에서의 반응은 {test('office')}, 출생정보로 보는 작업 성향은 <a href="/saju/career-style/">가입 후 무료인 나의 일 스타일 리포트</a>에서 탐색할 수 있습니다.</p>
  <h3>출생정보로 나를 읽고 싶다면</h3>
  <p><a href="/human-design/">휴먼 디자인 무료 차트</a>에서 바디그래프·타입·권위를 살펴보세요. 질문에 답하는 심리테스트와 출생정보를 쓰는 상징 해석은 서로 다른 방식입니다.</p>
  <h3>결과는 꼬리표보다, 대화의 시작.</h3>
  <p>지금의 기분이나 상황에 따라 답은 달라질 수 있어요. 나와 닮은 설명과 다른 설명을 함께 살펴보세요. 이 테스트는 자기이해를 위한 콘텐츠이며, 공식 MBTI 검사나 임상 심리검사·진단을 대신하지 않습니다.</p>
 </aside>;
}
