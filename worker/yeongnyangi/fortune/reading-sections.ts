import type { ChapterSpec, ReadingSectionSpec } from './book-contracts';
import { tokensRequiredForChars } from '../../lib/llm-budget.js';

export function withReadingSections(chapter: ChapterSpec): ChapterSpec {
  const tier=chapter.tier;
  const premium=['tuna','assorted','omakase'].includes(tier || '');
  const comparison=premium || tier==='flounder';
  const multiple=(chapter.systems?.length || 0)>1;
  const action=chapter.key==='action';
  type Row=Pick<ReadingSectionSpec,'id'|'title'|'role'|'instruction'>;
  const rows:Row[]=[
    {id:'meaning',title:'이 흐름이 말해주는 것',role:'interpretation',instruction:'이번 장의 고유 질문에 답하고 강점과 부담을 함께 설명한다.'},
    {id:'evidence',title:multiple?'체계마다 바라보는 이유':'그렇게 읽는 이유',role:'interpretation',instruction:'제공된 근거의 관계를 쉬운 말로 설명한다. 여러 체계라면 각각 구분한다. 자료가 없는 체계는 판단하지 않는다.'},
    ...(tier!=='mackerel'?[{id:'conditions',title:'상황에 따라 달라지는 모습',role:'interpretation' as const,instruction:'반복 원인과 조건이 바뀌면 해석이 달라지는 이유를 설명한다.'}]:[]),
    ...(premium?[{id:'limits',title:multiple?'겹치는 신호와 다른 해석':'상충하는 신호와 예외',role:'interpretation' as const,instruction:'상충·예외·근거의 한계를 다룬다. 독립되지 않은 관측을 여러 증거로 세거나 적중 확률을 만들지 않는다.'}]:[]),
    ...Array.from({length:tier==='mackerel'?1:premium?3:2},(_,i)=>({id:`example-${i+1}`,title:`생활 속 장면 ${i+1}`,role:'example' as const,instruction:'실제 경험으로 단정하지 않는 가상 사례. 다른 장면과 관계·환경·선택 조건이 달라야 하며 관찰 가능한 행동을 묘사한다.'})),
    ...(comparison?[
      {id:'choice-1',title:'첫 번째 선택의 조건',role:'action' as const,instruction:'첫 대안의 이점·부담과 이 선택이 적합한 조건을 함께 제시한다.'},
      {id:'choice-2',title:'다른 선택의 조건',role:'action' as const,instruction:'첫 대안과 다른 행동을 제시하고 두 대안의 판단 기준을 비교한다.'},
    ]:[]),
    {id:'action',title:action?'실행 우선순위':'지금 해볼 일',role:'action',instruction:'시작할 행동과 구체적 실행 방법을 제시한다. 계산되지 않은 시기는 예측하지 않고 실천 기간이라고 밝힌다.'},
    ...(premium?[{id:'checkpoint',title:'다시 살펴볼 신호',role:'action' as const,instruction:'행동 후 관찰할 변화와 선택을 수정할 조건을 제시한다.'}]:[]),
  ];
  const shares={interpretation:action ? .25 : .6,example:action ? .25 : .2,action:action ? .5 : .2};
  const sections=rows.map(row=>{
    const weight=shares[row.role]/rows.filter(r=>r.role===row.role).length;
    return {...row,minimumChars:Math.ceil((chapter.minimumChars || 0)*weight),targetChars:(chapter.targetChars || [0,0]).map(n=>Math.ceil(n*weight)) as [number,number]};
  });
  return {...chapter,requiredSections:undefined,sections,outputTokens:tokensRequiredForChars((chapter.targetChars?.[1] || 0)+600)};
}
