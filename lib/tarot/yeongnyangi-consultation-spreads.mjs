// New Yeongnyangi spreads only; legacy Ggulggul definitions remain unchanged.
const spread=(id,title,questionType,rows)=>({id,title,questionType,
  positions:rows.map(([key,label,role])=>({key,label,role,weight:1}))});
export const yeongnyangiConsultationSpreads={
  yeongnyangi_contact_five:spread('yeongnyangi_contact_five','연락의 흐름','relationship',[
    ['distance','현재의 거리','현재 소통에서 관찰할 거리와 속도'],
    ['barrier','소통을 막는 것','연락을 어렵게 하는 조건의 상징'],
    ['opening','다가갈 조건','서로 동의하는 소통이 열릴 조건'],
    ['direction','가까운 흐름','현재 조건이 이어질 때의 가능성; 연락 날짜를 예언하지 않는다'],
    ['next_step','행동 조언','한 번의 정중한 의사 표현 또는 기다림, 거절과 무응답을 존중하는 기준'],
  ]),
  yeongnyangi_money_five:spread('yeongnyangi_money_five','돈과 생활','money',[
    ['habit','현재의 돈 습관','지출과 자원 관리에서 살필 습관'],
    ['resource','활용할 자원','현재 확인할 수 있는 역량과 자원의 상징'],
    ['risk','주의할 부담','과도한 기대와 생활의 부담을 점검할 조건'],
    ['adjustment','조정할 선택','예산과 지출 우선순위에서 바꿀 수 있는 행동'],
    ['direction','가까운 흐름','습관을 유지하거나 조정할 때의 가능성; 수익이나 투자 성공을 예언하지 않는다'],
  ]),
};
