import { notFound } from 'next/navigation';
import { ILJU } from '../../../../../lib/famous-saju/cycle';
import { getIljuReading } from '../../../../../lib/famous-saju/ilju-reading';
import { getFamousArchive } from '../../../../../lib/famous-saju/archive';
export const dynamicParams = false;
export function generateStaticParams(){return ILJU.map(x=>({slug:x.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;const x=ILJU.find(x=>x.slug===slug);
  return {title:`${x?.name || ''}일주 인물 탐색 | 꿀꿀운세`,description:`${x?.name || ""}일주의 상징과 월령·계절에 따른 차이를 읽고, 공개 생일로 계산한 인물 후보와 관련 명리 입문 글을 살펴보세요. 출생시각 미확인 자료는 확정 분류와 구분합니다.`,robots:{index:false,follow:true,googleBot:{index:false,follow:true}},alternates:{canonical:`https://code-destiny.com/insights/famous-saju/ilju/${slug}/`}};
}
export default async function IljuPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;const cycle=ILJU.find(x=>x.slug===slug);if(!cycle)notFound();
  const reading=getIljuReading(cycle.name)!;
  const candidates=getFamousArchive().filter(p=>p.dayPillar===cycle.name);
  return <main className="moon-library"><article className="moon-container moon-ilju-reading">
    <a href="/insights/famous-saju/?view=ilju">60일주 탐색으로</a>
    <img className="moon-ilju-cover" src={`/images/saju/ilju/${cycle.slug}.svg`} width="720" height="360" alt=""/>
    <h1>{cycle.name}일주</h1><h2>{reading.title}</h2>
    <p>일간 {cycle.stem}은 전통 명리에서 {reading.stemReading}으로 설명합니다. 일지 {cycle.name[1]}는 {reading.branchReading}으로 읽습니다. 이 그림은 개념을 기억하기 위한 표지이며 실제 성격이나 성공을 입증하는 자료는 아닙니다.</p>
    <h2>두 글자에서 명식 전체로</h2><p>{reading.question}을 질문으로 삼아 보세요. 일주의 상징만으로 답을 내리지 않고, 태어난 달의 기운인 월령과 계절부터 확인합니다. 같은 힘도 계절에 따라 도움을 받거나 지나치게 강해질 수 있습니다.</p>
    <p>일지에 들어 있다고 해석하는 천간, 지장간은 {reading.hiddenStems}입니다. 이 글자들이 다른 기둥에 드러나는지(투간), 일간이 뿌리를 얻는지(통근)를 함께 살핍니다. 합·충은 관계를 바꾸는 조건으로 보며, 특정 사건을 일으킨 원인으로 단정하지 않습니다.</p>
    <h2>같은 일주의 인물</h2><p>확인된 인물 자료를 준비하고 있어요. 출생시각과 날짜 경계까지 확인되지 않은 기록은 확정 인물 수에 포함하지 않습니다.</p>
    {candidates.length>0 && <details><summary>공개 날짜로 계산한 후보 {candidates.length}명 · 검토 중</summary><p>아래는 확정 분류가 아닙니다. 현지 역법·출처·자시 경계를 검토하면 일주가 달라질 수 있습니다.</p><div className="moon-chips">{candidates.map(p=><a key={p.slug} href={`/insights/famous-saju/${p.slug}/`}>{p.name} · 월주 {p.month || '미확인'}</a>)}</div></details>}
    <h2>같은 일주, 다른 삶</h2><p>{candidates.length>1 ? `${candidates[0].name}의 계산 후보 월주는 ${candidates[0].month || '미확인'}, ${candidates[1].name}의 계산 후보 월주는 ${candidates[1].month || '미확인'}입니다. 이 값도 출생 자료 검토를 전제로 합니다. ` : ''}월지가 같더라도 연주·시주와 살아온 환경, 교육과 선택은 다릅니다. 인물의 알려진 이력을 먼저 확인한 뒤 명리적 해석을 별도로 읽어 주세요.</p>
    <h2>이어서 읽기</h2><ul><li><a href="/insights/saju-without-birth-time-three-pillars-guide/">출생시간 없이 삼주 읽기</a></li><li><a href="/insights/midnight-birth-day-pillar/">자정 전후에는 왜 일주가 달라질까요?</a></li><li><a href="/insights/ten-gods-beginner-map/">십성의 관계 이해하기</a></li></ul>
    <a className="moon-primary" href="/saju/animal-destiny/">내 일주 확인</a>
    <p className="moon-muted">계산 후보·해설 초안입니다. 검토가 끝나기 전 검색 색인과 사이트맵에 포함하지 않습니다. <a href="/contact/">자료 수정 문의</a></p>
  </article></main>;
}
