/** Editorial interpretation, not a psychometric score. IDs also identify artwork. */
export const hatHouses = [
 {id:'moon-library',name:'달빛서가',trait:'탐구',motto:'생각이 깊어질수록, 길은 선명해져.',
  admission:'답장은 짧아도 머릿속에서는 세 번 퇴고하는 사람들. 남들이 지나친 단서에서 자기 길을 찾는 이들이 모이는 곳이야. 궁금한 것을 오래 들여다보는 시간이, 언젠가 너만의 안목으로 돌아오는 흐름이지.',
  points:['답장 하나에 뇌내 회의 세 번','검색하다 보니 새벽, 탭은 열일곱 개','혼자 있는 시간도 나름 바쁜 일정'],
  strength:'쉽게 결론 내리지 않고 맥락을 읽어. 복잡한 일을 차분히 이해하는 힘이 있어.',shadow:'충분히 알아야 시작할 수 있다는 마음에 첫걸음이 늦어질 수 있어.',action:'오늘은 더 찾기 전에 지금 아는 것으로 작은 결정을 하나 내려봐.',symbol:'초승달과 열린 책',scene:'달빛 창가와 떠 있는 책들'},
 {id:'star-forge',name:'별불공방',trait:'창작',motto:'재밌겠다는 한마디가, 첫 번째 주문.',
  admission:'“이거 재밌겠다”가 시작 버튼인 사람들. 떠오른 생각을 자기만의 작품으로 바꾸는 이들이 모이는 곳이야. 남의 정답을 잘 따라가는 것보다, 익숙한 재료를 새롭게 엮을 때 길이 열리는 흐름이지.',
  points:['일단 저장, 실행은 미래의 나','취미를 시작하는 게 취미','아이디어는 이미 시즌 3'],
  strength:'감각과 생각을 밖으로 꺼내는 힘이 있어. 평범한 일에도 너만의 재미를 더해.',shadow:'하고 싶은 일이 동시에 늘어나면 끝맺음보다 새 시작에 마음이 갈 수 있어.',action:'새 아이디어는 메모해 두고, 벌여 둔 것 하나를 작은 완성품으로 만들어봐.',symbol:'깃펜과 별불',scene:'별불 화로와 마법 작업대'},
 {id:'dawn-tower',name:'새벽첨탑',trait:'개척',motto:'완벽한 지도보다, 너의 첫걸음.',
  admission:'겁이 없어서는 아니고, 궁금해서 한 발 먼저 나가는 사람들. 새로운 시작에서 자기 가능성을 발견하는 이들이 모이는 곳이야. 직접 부딪쳐 얻은 경험이 다음 선택의 나침반이 되는 흐름이지.',
  points:['일단 해보고 후기 남길게','내 인생 결재권은 나한테','안 가본 길에 자꾸 눈이 감'],
  strength:'선택의 주도권을 잡고 움직여. 낯선 상황에서도 시작점을 찾아내는 편이야.',shadow:'속도가 빨라질수록 함께 가는 사람의 준비 상태를 놓칠 수 있어.',action:'출발 전에 네 계획과 필요한 도움을 한 사람에게 구체적으로 알려줘.',symbol:'새벽 해와 나침반',scene:'열린 문과 새벽빛 탑'},
 {id:'gold-vault',name:'금실금고',trait:'실리',motto:'작은 기회를 엮어, 오래 갈 내 편으로.',
  admission:'낭만도 챙기지만 계산기는 끄지 않는 사람들. 작은 기회를 모아 오래 갈 기반을 만드는 이들이 모이는 곳이야. 한 번의 큰 승부보다 시간과 자원을 알맞게 배치할 때 자기 길이 단단해지는 흐름이지.',
  points:['좋은데… 그래서 가성비는?','장바구니에도 나름의 전략이 있음','쉬는 날도 계획은 있어야 함'],
  strength:'아이디어를 실제로 가능한 일로 바꿔. 꾸준히 관리하고 마무리하는 감각이 있어.',shadow:'시간마다 성과를 계산하다 보면 쉬는 순간에도 마음이 바빠질 수 있어.',action:'아무것도 남기지 않아도 되는 시간을 오늘 일정에 한 칸 넣어봐.',symbol:'열쇠와 금실',scene:'금실 지도와 보물 서랍'},
 {id:'wind-gallery',name:'바람회랑',trait:'연결',motto:'너와 나 사이에서, 새로운 길이 불어와.',
  admission:'단톡방 온도와 사람 사이의 거리를 잘 읽는 사람들. 서로 다른 사람과 생각을 연결하는 이들이 모이는 곳이야. 대화 속에서 뜻밖의 가능성을 발견하고, 좋은 연결을 통해 자기 세계를 넓혀가는 흐름이지.',
  points:['단톡방 공기 읽기 만렙','너희 둘 왠지 잘 맞을 것 같은데','약속은 좋은데 귀가도 소중함'],
  strength:'다른 관점을 이어주고 말의 온도를 조절해. 혼자서는 못 찾던 선택지를 함께 만들어.',shadow:'분위기를 챙기다 정작 네 의견을 뒤로 미룰 수 있어.',action:'오늘 대화에서는 상대의 답을 듣기 전에 네가 원하는 것도 한 문장으로 말해봐.',symbol:'깃털과 이어진 고리',scene:'공중 회랑과 떠다니는 편지'},
 {id:'star-greenhouse',name:'별숲온실',trait:'돌봄',motto:'오래 자라는 것들은, 다정한 자리가 필요해.',
  admission:'모두가 달릴 때 “우리 잠깐 쉬자”를 말하는 사람들. 관계와 일상을 돌보며 오래가는 성장을 만드는 이들이 모이는 곳이야. 작은 변화를 알아보고 알맞은 환경을 마련하는 손길이 너의 길을 풍성하게 하는 흐름이지.',
  points:['남의 컨디션은 잘 보면서 내 건 나중에','집에 가면 일단 충전부터','괜찮다는 말 뒤의 표정을 보는 편'],
  strength:'사람과 일상이 버틸 수 있는 리듬을 만들어. 작지만 꾸준한 보살핌이 강점이야.',shadow:'필요한 사람이 되려다 네 에너지가 바닥난 뒤에야 알아차릴 수 있어.',action:'누군가를 챙기기 전에 오늘 네가 받을 도움 한 가지부터 정해봐.',symbol:'잎사귀와 별',scene:'별빛 온실과 따뜻한 찻자리'},
] as const;
export type HatHouseId=typeof hatHouses[number]['id'];
export type HatSystem='saju'|'ziwei'|'vedic'|'astrology'|'human-design'|'sukuyo';
export const hatSystems:Record<HatSystem,string>={saju:'사주',ziwei:'자미두수',vedic:'베다점',astrology:'서양 점성술','human-design':'휴먼 디자인',sukuyo:'숙요점'};
export interface HatEvidence {source:HatSystem;label:string;meaning:string;houseId:HatHouseId;weight:number}
export interface HatSystemResult {id:HatSystem;status:'used'|'omitted';reason?:string;engineVersion?:string;evidence:HatEvidence[]}
export interface HatResult {version:string;houseId:HatHouseId;mode:'complete'|'reference';usedCount:number;systems:HatSystemResult[];reasons:HatEvidence[]}
export const hatImage=(id:HatHouseId|'invitation')=>`/assets/yeongnyangi/hat/${id}-v1.webp`;
