// 계산과 판정은 evidence.mjs에 둔다. 이 파일은 같은 근거를 연이(존댓말)와 영냥이(반말) 목소리로 옮긴다.
// 문장 조각은 두 목소리에 함께 쓰이므로 명사구나 '~서'로 끝나는 이유절로만 적는다.
import { EL_KO } from '../natal-core/tables.mjs';

export const CAREER_TITLES=['한눈에 보는 나','타고난 장점','타고난 재능','단점과 보완','일하는 방식과 잘 맞는 환경','잘 맞는 직종·업종','피하면 좋은 일과 환경','작은 진로 실험'];

const DAY_STORY={
 甲:{strengths:['큰 방향을 먼저 세우는 힘','맡은 일을 끝까지 밀고 가는 뚝심'],scene:'아무도 방향을 못 잡은 첫 회의',
  talents:['흩어진 의견을 목표 한 줄로 묶는 일','처음 해 보는 프로젝트의 뼈대를 짜는 일'],
  weakness:'한번 정한 방향을 쉽게 내려놓지 못하는 고집',weakScene:'중간 점검에서 더 나은 다른 안이 나왔을 때',
  fix:'회의 전에 바꿔도 되는 것 하나를 미리 정해 두는 습관',jobs:'기획자, 프로젝트 매니저, 신사업 담당',
  avoid:{name:'정해진 매뉴얼을 그대로 반복하는 일',why:'방향을 고민할 여지가 없으면 일의 의미부터 놓치기 쉬워서',alt:'목표 설정부터 함께하는 기획 업무'}},
 乙:{strengths:['사람 사이의 온도를 읽는 감각','막힌 길을 돌아서라도 찾아내는 유연함'],scene:'의견이 갈려 분위기가 굳은 회의',
  talents:['서로 다른 요구를 일정 하나로 엮는 일','고객의 불만을 풀어 관계를 다시 잇는 일'],
  weakness:'남의 사정을 먼저 챙기다 내 일정을 뒤로 미루는 습관',weakScene:'부탁이 한꺼번에 몰린 마감 주간에',
  fix:'부탁을 받으면 바로 답하지 않고 하루 뒤에 답하는 습관',jobs:'고객 성공 매니저, 서비스 코디네이터, 인사·교육 담당',
  avoid:{name:'사람을 만나지 않고 혼자 숫자만 붙잡는 일',why:'조율할 상대가 없으면 강점을 쓸 곳이 사라져서',alt:'사람과 일정 사이를 잇는 운영 업무'}},
 丙:{strengths:['생각을 사람들 앞에 꺼내 보이는 힘','처음 보는 사람도 끌어들이는 밝은 설명'],scene:'새 아이디어를 처음 공개하는 발표',
  talents:['복잡한 내용을 한 장짜리 이야기로 바꾸는 일','팀 분위기를 띄워 일을 굴러가게 하는 일'],
  weakness:'알리는 데 힘을 다 써서 마무리 점검이 비는 버릇',weakScene:'발표가 끝나고 세부 수정만 남았을 때',
  fix:'발표 날과 따로 점검하는 날을 달력에 잡아 두는 습관',jobs:'마케터, 홍보 담당, 강사, 콘텐츠 기획자',
  avoid:{name:'하루 종일 말없이 같은 서류만 검토하는 일',why:'반응을 주고받을 사람이 없으면 힘이 금방 꺼져서',alt:'검토 결과를 직접 발표까지 맡는 업무'}},
 丁:{strengths:['남이 놓친 작은 신호를 알아채는 눈','한 가지를 오래 붙잡고 다듬는 집중력'],scene:'모두 퇴근한 뒤 혼자 하는 정리 작업',
  talents:['거친 초안을 읽기 좋은 문장으로 다듬는 일','사용자 한 사람의 불편을 깊게 파고드는 일'],
  weakness:'조금만 더 다듬고 싶어 공개를 미루는 완벽주의',weakScene:'보고 기한이 하루 남았는데 마음에 안 드는 부분이 보일 때',
  fix:'제출 전날을 내 마감으로 잡고 마지막 날은 손대지 않는 습관',jobs:'에디터, 리서처, UX 라이터, 상담 직무',
  avoid:{name:'즉석에서 결정을 쏟아내야 하는 현장 지휘',why:'생각을 고를 시간이 없으면 실수가 늘고 스스로를 탓하기 쉬워서',alt:'준비 시간이 보장된 분석·편집 업무'}},
 戊:{strengths:['흩어진 일을 한곳에 모아 틀을 세우는 힘','흔들리는 상황에서도 버티는 무게감'],scene:'일정과 자료가 뒤엉킨 프로젝트 중반',
  talents:['여러 사람이 오래 쓸 운영 규칙을 만드는 일','예산과 일정을 표 하나에 정리하는 일'],
  weakness:'잘 굴러가는 방식을 지키느라 변화를 늦추는 신중함',weakScene:'새 도구를 도입하자는 말이 나왔을 때',
  fix:'분기마다 바꿔 볼 절차 하나를 정해 시험하는 습관',jobs:'운영 매니저, 총무·관리 직무, 프로젝트 관리자',
  avoid:{name:'매주 방향이 바뀌는 초기 실험 조직',why:'기반을 다질 틈 없이 뒤집히면 쌓은 것이 남지 않아서',alt:'성장기에 운영 틀을 세우는 역할'}},
 己:{strengths:['작은 불편을 먼저 알아보는 감각','손이 많이 가는 일도 꼼꼼히 챙기는 성실함'],scene:'고객 문의가 쌓인 월요일 아침',
  talents:['현장의 불편을 모아 절차를 고치는 일','처음 온 사람이 헤매지 않게 안내를 정리하는 일'],
  weakness:'남의 빈틈까지 메우다 내 몫이 넘치는 습관',weakScene:'동료가 놓친 일을 말없이 대신 처리할 때',
  fix:'대신 해 준 일을 적어 두고 일주일에 한 번 나누는 습관',jobs:'서비스 운영 담당, 품질 개선 담당, 고객 지원 매니저',
  avoid:{name:'성과는 남이 가져가고 뒷정리만 남는 자리',why:'돌본 만큼 인정받지 못하면 소리 없이 지쳐서',alt:'개선 결과가 내 이름으로 남는 운영 업무'}},
 庚:{strengths:['복잡한 문제에서 핵심을 바로 짚는 판단력','정한 일을 빠르게 밀어붙이는 실행력'],scene:'일이 꼬여 누군가 결론을 내야 하는 회의',
  talents:['막힌 일을 다음 단계로 쪼개는 일','기준을 세우고 일을 나눠 맡기는 일'],
  weakness:'결론이 빨라 상대가 이해할 때까지 기다리지 못하는 급함',weakScene:'설명을 다 듣기 전에 답이 보일 때',
  fix:'결론을 말하기 전에 상대 의견을 한 문장으로 되짚는 습관',jobs:'프로젝트 리더, 생산·현장 관리자, 문제 해결 컨설턴트',
  avoid:{name:'결정권 없이 합의만 끝없이 도는 자리',why:'판단하는 힘을 쓰지 못하면 답답함이 날카로움으로 바뀌어서',alt:'판단 권한이 주어진 실행 관리 업무'}},
 辛:{strengths:['결과물의 작은 흠을 찾아내는 정확함','기준을 높게 잡고 지키는 끈기'],scene:'최종 보고서를 내기 직전의 검수',
  talents:['남이 만든 결과물의 품질을 끌어올리는 일','헷갈리는 기준을 표로 정리하는 일'],
  weakness:'기준이 높아 시작과 제출이 늦어지는 버릇',weakScene:'덜 다듬은 초안부터 보여 달라는 요청을 받았을 때',
  fix:'초안에 70점이라고 이름을 붙여 먼저 보여 주는 습관',jobs:'품질 관리자, 디자이너, 검수·감사 담당, 설계 엔지니어',
  avoid:{name:'빨리 많이 찍어 내는 물량 위주 업무',why:'품질을 볼 시간이 없으면 일에서 자부심을 느끼지 못해서',alt:'완성도로 평가받는 설계·검수 업무'}},
 壬:{strengths:['넓게 정보를 모아 연결하는 시야','낯선 분야에도 겁 없이 들어가는 호기심'],scene:'아무도 답을 모르는 새 시장 조사',
  talents:['서로 다른 사례를 묶어 새 선택지를 만드는 일','큰 흐름을 읽고 다음 수를 그리는 일'],
  weakness:'흥미로운 갈래가 많아 하나를 끝맺기 어려운 산만함',weakScene:'조사하다가 더 재미있는 주제가 보일 때',
  fix:'조사마다 끝나는 날짜와 결론 한 줄을 먼저 적어 두는 습관',jobs:'전략 기획자, 시장 조사 연구원, 해외 영업, 데이터 분석가',
  avoid:{name:'같은 자리에서 같은 일만 몇 년씩 하는 정형 업무',why:'새로 연결할 거리가 없으면 생각이 고여 버려서',alt:'주제가 주기적으로 바뀌는 조사·기획 업무'}},
 癸:{strengths:['조용히 듣고 맥락을 읽는 관찰력','작은 단서를 꾸준히 쌓는 차분함'],scene:'고객 인터뷰를 듣고 메모를 정리하는 시간',
  talents:['겉말 뒤에 있는 진짜 필요를 찾아내는 일','흩어진 기록에서 패턴을 뽑아내는 일'],
  weakness:'확신이 설 때까지 의견을 아끼는 조심성',weakScene:'회의에서 좋은 질문이 떠올랐는데 분위기를 살필 때',
  fix:'회의마다 질문 하나는 꼭 말하기로 정해 두는 습관',jobs:'사용자 연구원, 데이터 분석가, 상담 직무, 연구 보조',
  avoid:{name:'즉흥 발표와 순발력만으로 평가받는 자리',why:'정리할 시간 없이 말해야 하면 관찰한 것을 다 꺼내지 못해서',alt:'관찰 결과를 글로 먼저 공유하는 연구 업무'}},
};

// 유일한 신규 근거 표: 십성 갈래와 오행을 직종·업종군과 부담 조건에 잇는다. 적합도 점수를 만들지 않는다.
export const WORK_FIELDS={
 family:{
  self:{label:'내 몫이 분명한 독립형 직무',jobs:'프리랜서 디자이너·개발자, 현장 영업, 1인 브랜드 운영',why:'내 몫과 결정권이 분명한 구조',
   avoid:{name:'성과를 팀 전체로만 평가해 내 몫이 보이지 않는 자리',why:'기여가 묻히면 비교와 서운함이 먼저 쌓여서',alt:'개인 담당 영역이 정해진 팀 프로젝트'}},
  parent:{label:'배우고 정리해서 전하는 직무',jobs:'교육 기획자, 리서처, 테크니컬 라이터, 사서·아키비스트',why:'충분히 이해한 뒤 움직일 수 있는 구조',
   avoid:{name:'준비 시간 없이 즉석 대응만 이어지는 자리',why:'맥락을 이해할 틈이 없으면 실수가 늘고 자신감도 깎여서',alt:'매뉴얼과 사례를 먼저 받고 시작하는 지원 업무'}},
  output:{label:'만들고 보여 주는 직무',jobs:'콘텐츠 제작자, 마케터, UX 디자이너, 강사',why:'만든 것을 바로 보여 주고 반응을 받는 구조',
   avoid:{name:'결과물 없이 결재와 보고만 오가는 자리',why:'직접 만들고 반응을 보는 맛이 없으면 금방 시들해져서',alt:'초안을 자주 공유하는 제작 업무'}},
  wealth:{label:'숫자와 자원을 굴리는 직무',jobs:'영업 관리, 구매·MD, 사업 운영 매니저, 회계 담당',why:'목표와 결과가 숫자로 보이는 구조',
   avoid:{name:'목표와 성과 기준이 끝까지 모호한 자리',why:'얼마나 해냈는지 보이지 않으면 힘을 어디에 쓸지 흐려져서',alt:'목표 수치를 함께 정하는 운영 업무'}},
  officer:{label:'기준과 책임이 분명한 직무',jobs:'공공 행정, 품질 관리, 컴플라이언스 담당, 프로젝트 매니저',why:'역할과 결재선이 분명한 구조',
   avoid:{name:'역할 구분 없이 모두가 모든 일을 하는 자리',why:'책임 범위가 흐리면 혼자 다 떠안기 쉬워서',alt:'담당과 결재선이 문서로 정해진 조직'}},
 },
 el:{
  wood:{label:'교육·출판·기획 업종',field:'교육 서비스, 출판, 기획사, 성장 중인 스타트업',why:'새로 시작하고 키우는 일이 많은 곳이라서',lack:'새 일을 벌이고 계획을 세우는 일',
   excess:{name:'계획만 새로 세우고 마무리 담당은 없는 판',why:'목 기운이 많으면 벌이는 힘에 비해 거두는 힘이 달리기 쉬워서',alt:'마감 담당자가 따로 있는 프로젝트'}},
  fire:{label:'미디어·브랜드·공연 업종',field:'미디어, 브랜드 마케팅, 공연·행사, 강연',why:'드러내고 알리는 일이 하루의 중심이라서',lack:'앞에 나서서 알리고 설득하는 일',
   excess:{name:'쉬는 틈 없이 사람들 앞에 서야 하는 일정',why:'화 기운이 많으면 확 타오른 뒤 빨리 지치기 쉬워서',alt:'발표 뒤 회복 시간이 일정에 들어간 업무'}},
  earth:{label:'운영·관리·공공 서비스 업종',field:'공공 서비스, 물류·유통 관리, 시설 관리, 인사 관리',why:'사람과 자원을 오래 받쳐 주는 일이 많아서',lack:'꾸준히 관리하고 지켜 내는 일',
   excess:{name:'매주 방향이 뒤집히는 조직',why:'토 기운이 많으면 익숙한 틀을 지키려는 힘이 세서',alt:'변경 주기가 분기 단위로 정해진 조직'}},
  metal:{label:'IT·제조·품질 업종',field:'IT 개발, 제조·품질 관리, 금융 운영, 감사·검수',why:'기준을 세우고 정확히 가르는 일이 많아서',lack:'끊고 고르고 정리하는 일',
   excess:{name:'기준 없이 분위기로 결정하는 회의 문화',why:'금 기운이 많으면 날 선 판단이 관계를 먼저 다치게 하기 쉬워서',alt:'판단 근거를 문서로 남기는 팀'}},
  water:{label:'연구·데이터·무역 업종',field:'연구소, 데이터 분석, 무역·해외 영업, 여행·언어 서비스',why:'흐름을 읽고 연결하는 일이 중심이라서',lack:'정보를 모으고 깊이 따져 보는 일',
   excess:{name:'정보는 쏟아지는데 결정할 사람이 없는 자리',why:'수 기운이 많으면 생각이 넓게 퍼져 한곳에 모으기 어려워서',alt:'조사 기한과 결론 담당이 정해진 업무'}},
 },
};

const ENVIRONMENT={
 self:{wish:'내 몫을 믿고 맡겨 주는 곳',rhythm:'혼자 정할 일과 함께 맞출 일을 나누는 리듬'},
 parent:{wish:'질문할 수 있고 배울 시간이 있는 곳',rhythm:'이해한 것을 작은 결과로 옮겨 보는 리듬'},
 output:{wish:'초안을 보여 주고 반응을 나눌 수 있는 곳',rhythm:'만들고 보여 주고 다시 고치는 리듬'},
 wealth:{wish:'시간과 결과의 기준이 함께 보이는 곳',rhythm:'가능한 범위를 정하고 약속한 결과를 남기는 리듬'},
 officer:{wish:'기준은 분명하고 책임은 나눌 수 있는 곳',rhythm:'역할을 확인하고 중요한 지점에서 함께 점검하는 리듬'},
};

const NEO_AXIS_STATUS={matched:'월령이랑 천간이 같은 쪽을 가리켜. 믿고 써도 돼.',mixed:'월령이랑 천간 무게가 달라. 섞어서 써.',latent:'지장간에만 숨어 있어. 작게 시험부터 해.',open:'아직 확정 못 해. 직접 비교해 봐야 알아.'};
const NEO_AXIS_QUESTIONS={
 autonomy:'방법을 네가 정할 때 시작이 쉬워, 고를 게 많아서 부담돼?',
 structure:'완료 기준이 보이면 편해, 세세한 절차가 숨 막혀?',
 team:'같이 맞추는 과정이랑 혼자 끝내는 과정 중 어디서 힘이 나?',
 focus:'방해 없는 시간이 도움 돼, 짧은 대화가 생각을 다시 굴려?',
 pace:'수정이 잦을 때 더 배워, 정한 흐름을 지킬 때 더 잘 끝내?',
 feedback:'빠른 반응이랑 오래 검토한 의견 중 뭐가 다음 행동을 정해 줘?',
};

const EL_ORDER=['wood','fire','earth','metal','water'];

const HANJA_KO={甲:'갑',乙:'을',丙:'병',丁:'정',戊:'무',己:'기',庚:'경',辛:'신',壬:'임',癸:'계',子:'자',丑:'축',寅:'인',卯:'묘',辰:'진',巳:'사',午:'오',未:'미',申:'신',酉:'유',戌:'술',亥:'해'};

export function josa(word,pair){
 const [withFinal,withoutFinal]=pair.split('/');
 const last=String(word).replace(/[\s’'”"」)\].,!?]+$/,'').slice(-1);
 const ch=HANJA_KO[last]||last;
 const code=ch.charCodeAt(0);
 let final;
 if(code>=0xAC00&&code<=0xD7A3){const jong=(code-0xAC00)%28;final=jong!==0&&!(withFinal==='으로'&&jong===8);}
 else final=/[013678]$/.test(ch);
 return word+(final?withFinal:withoutFinal);
}

export function voiceAxis(axis,mode){
 if(mode!=='neo')return axis;
 return {...axis,reading:`${NEO_AXIS_STATUS[axis.mode]} ${NEO_AXIS_QUESTIONS[axis.id]}`,support:''};
}

// 같은 명식은 같은 근거를 고른다. 순서는 표의 고정 순서와 천간 자리 순서(년→월→시)만 쓴다.
export function careerPicks(evidence,core,dayStem,dayCopy){
 const S=DAY_STORY[dayStem];
 const byEl=core.counts.byEl;
 const ranked=[...EL_ORDER].sort((a,b)=>byEl[b]-byEl[a]||EL_ORDER.indexOf(a)-EL_ORDER.indexOf(b));
 const top=ranked[0],second=ranked[1];
 const missing=EL_ORDER.filter(el=>!byEl[el]);
 const visibleOther=evidence.visible.find(v=>v.family!==evidence.selectedFamily);
 const visibleGod=evidence.visible.find(v=>v.god!==evidence.selectedGod)||evidence.visible[0];
 const fam=WORK_FIELDS.family[evidence.selectedFamily];
 const dayEl=EL_KO[core.dayMaster.el];
 const jobs=[
  {id:'day',title:dayCopy[4],examples:S.jobs,basis:`일간 ${dayStem}(${dayEl})`,source:'day'},
  {id:`family-${evidence.selectedFamily}`,title:fam.label,examples:fam.jobs,basis:`월령에서 취한 ${evidence.selectedGod}`,source:'family',why:fam.why},
  {id:`el-${top}`,title:WORK_FIELDS.el[top].label,examples:WORK_FIELDS.el[top].field,basis:`오행 ${EL_KO[top]} ${byEl[top]}개로 가장 많음`,source:'el',why:WORK_FIELDS.el[top].why},
 ];
 if(visibleOther){const f=WORK_FIELDS.family[visibleOther.family];
  jobs.push({id:`family-${visibleOther.family}`,title:f.label,examples:f.jobs,basis:`${{y:'년',m:'월',h:'시'}[visibleOther.pos]}간 ${visibleOther.stem} ${visibleOther.god}`,source:'visible',why:f.why});}
 if(byEl[second]>=2)jobs.push({id:`el-${second}`,title:WORK_FIELDS.el[second].label,examples:WORK_FIELDS.el[second].field,basis:`오행 ${EL_KO[second]} ${byEl[second]}개`,source:'el2',why:WORK_FIELDS.el[second].why});
 const avoid=[
  {id:'day-shadow',...S.avoid,basis:`일간 ${dayStem}의 그림자`},
  {id:`family-${evidence.selectedFamily}`,...fam.avoid,basis:`월령 ${josa(evidence.selectedGod,'이/가')} 부담을 느끼는 조건`},
 ];
 if(byEl[top]>=3)avoid.push({id:`el-${top}-excess`,...WORK_FIELDS.el[top].excess,basis:`오행 ${EL_KO[top]} ${byEl[top]}개로 한쪽에 몰림`});
 return {S,top,missing,visibleGod,jobs,avoid,dayEl,env:ENVIRONMENT[evidence.selectedFamily]};
}

function strengthLine(core,mode){
 const neo=mode==='neo';
 if(core.special.decision==='special')return neo?'특수격이라 보통 쓰는 강약 판단은 안 썼어.':'특수격으로 읽혀서 보통 쓰는 강약 판단은 쓰지 않았어요.';
 if(!core.strength.complete)return neo?'태어난 시간이 없어서 기운 세기는 판단 안 했어. 모르는 걸 아는 척하진 않을게.':'출생 시각이 없어서 기운의 세기는 판단하지 않았어요. 모르는 부분을 채워 넣지 않으려고요.';
 if(core.strength.isStrong)return neo?'기운도 센 편이라 혼자 밀어붙여도 잘 안 꺾여.':'기운이 강한 편이라 혼자 밀고 가는 일에서도 덜 지쳐요.';
 return neo?'대신 기운은 약한 편이야. 혼자 다 하려 들지 마. 자료랑 도와줄 사람을 붙여 놓으면 장점이 훨씬 잘 나와.':'기운은 약한 편이에요. 좋은 자료와 도와줄 사람이 곁에 있을 때 장점이 훨씬 잘 살아나요.';
}

export function careerStory({evidence,core,dayStem,dayCopy,monthBranch,monthCopy,godWork,picks,mode}){
 const neo=mode==='neo';
 const {S,top,missing,visibleGod,jobs,avoid,dayEl,env}=picks;
 const [s0,s1]=S.strengths,[t0,t1]=S.talents;
 const focus=godWork.focus;
 const combo=evidence.combinations[0];
 const vFocus=visibleGod?`${visibleGod.stem} ${visibleGod.god}`:'';
 const lack=missing.length?WORK_FIELDS.el[missing[0]].lack:'';
 const missingKo=missing.map(el=>EL_KO[el]).join('·');
 const [season,demand,method]=monthCopy;
 const jobItems=jobs.map(job=>({...job,body:jobBody(job,{neo,dayStem,s0,t0,evidence})}));
 const avoidItems=avoid.map(item=>({id:item.id,title:item.name,basis:item.basis,
  body:neo?`${item.why}. 피할 수 없으면 ${josa(item.alt,'으로/로')} 방향을 틀어.`:`${item.why}요. 비슷한 일을 해야 한다면 ${josa(item.alt,'으로/로')} 방향을 틀어 보세요.`}));
 const chapters=neo?[
  [`솔직히 말할게. 너는 ${josa(`‘${dayCopy[0]}’`,'이야/야')}. 일간 ${dayStem}(${dayEl}) 기준으로 월지 ${josa(monthBranch,'이랑/랑')} 오행 분포까지 같이 봤어.`,
   `제일 센 무기는 ${s0}. 약점은 ${S.weakness}. 맞는 판은 ‘${jobs[0].title}’ 쪽이고, ${josa(avoid[0].name,'은/는')} 오래 하면 너만 닳아.`,
   '좋은 말만 늘어놓을 생각 없어. 단점이랑 피할 일까지 다 짚을게.',
   '끝까지 읽어. 손해는 없다냥.'],
  [`장점부터 갈게. 첫째, ${s0}. ${S.scene}에서 이건 티가 확 나.`,
   `둘째, ${s1}. 일간이 ${dayEl} 기운이라 그래. 너한테는 너무 당연해서 장점인 줄도 몰랐을걸.`,
   vFocus?`천간에 ${vFocus}도 떠 있어. ${GOD_FOCUS(visibleGod.god,godWork,focus)}까지 얹혔다는 뜻이야. 회의나 보고처럼 남들 보는 자리에서 이게 먹혀.`:`월령에서 취한 ${josa(evidence.selectedGod,'도/도')} ${josa(focus,'을/를')} 보태.`,
   strengthLine(core,mode)],
  [`재능 얘기. 장점이 일로 굳으면 재능이 돼. 너는 ${t0}에 소질 있어.`,
   `근거도 있어. 월지 ${monthBranch}에서 ${josa(evidence.selectedGod,'을/를')} 취했거든. ${josa(focus,'이라는/라는')} 뜻이야. 그래서 ${t1}도 남들보다 빨리 감 잡아.`,
   combo?`‘${combo.title}’ 흐름까지 있어. 두 재능을 따로 놀리지 마. 한 과제에 붙여 써야 값이 올라가.`:`재능은 안 쓰면 그냥 취미야. 이번 달엔 이런 쪽 업무 하나는 네가 먼저 가져가.`],
  [`이제 아픈 얘기. 네 단점은 ${josa(S.weakness,'이야/야')}. ${S.weakScene} 꼭 이게 나와. 본인도 알지?`,
   missing.length?`오행에서 ${josa(missingKo,'이/가')} 비었어. 그래서 ${lack}엔 손이 잘 안 가. 억지로 붙잡지 말고 도구나 사람을 써.`:'오행은 크게 비는 데가 없어. 그러니까 단점은 성격 탓보다 상황 탓일 때가 많아. 바쁠 때 뭘 반복해서 놓치는지 적어 봐.',
   `처방은 간단해. ${S.fix}. 한 달만 해 봐. 단점이 없어지진 않아도 일을 망치진 않게 돼.`],
  [`일하는 방식 봐줄게. 월지가 ${monthBranch}, ${josa(season,'이야/야')}. 월지는 일터에서 받는 요구를 보여 주는 자리야. 너한테 오는 건 ${josa(demand,'이야/야')}. 그러니까 ${method} 방식으로 움직여.`,
   `너한테 맞는 데는 ${josa(env.wish,'이야/야')}. ${josa(env.rhythm,'이/가')} 없는 회사면 일이 좋아도 금방 질려. 면접 때 하루가 어떻게 돌아가는지 꼭 물어봐.`,
   '밑에 여섯 개는 점수 아니야. 회의나 마감 같은 조건을 너한테 하나씩 대 보는 체크표야.'],
  ['직종 찍어 줄게. 일간, 월령, 오행에서 근거를 하나씩 잡고 골랐어. 대충 고른 거 아니야.',
   '목록에 없어도 조건이 겹치면 맞아. 공고 볼 땐 업무 설명부터 읽어. 회사 이름에 홀리지 말고.'],
  ['피할 일 말할게. 못 한다는 뜻 아니야. 오래 하면 너만 먼저 닳는 일이야.',
   '지금 이런 데 있다고 당장 때려치우라는 거 아니야. 하루 한 시간만이라도 네 방식으로 바꿔 봐.'],
  ['마지막. 이번 주엔 실험 하나만 해. 이틀 동안 시간이 빨리 간 순간이랑 진이 빠진 순간을 하나씩 적어.',
   `다음 사흘은 ${josa(t0,'을/를')} 하루 30분씩 해 봐. 회사 일 아니어도 돼. 끝나고 또 하고 싶은지만 체크해.`,
   `마지막 이틀은 ‘${jobs[0].title}’ 쪽에서 일하는 사람의 글이나 영상을 하나 찾아봐. 그 하루가 부러우면 맞는 거고, 피곤해 보이면 아닌 거야.`,
   '팩폭 많이 했지만 결론은 하나야. 너 꽤 쓸 만한 사람이야. 이제 맞는 데 가서 써먹어.'],
 ]:[
  [`당신의 일 스타일을 한마디로 하면 ${josa(`‘${dayCopy[0]}’`,'이에요/예요')}. 일간 ${josa(`${dayStem}(${dayEl})`,'을/를')} 기준으로 월지 ${josa(monthBranch,'과/와')} 오행 분포를 함께 읽었어요.`,
   `가장 큰 장점은 ${josa(s0,'이에요/예요')}. 조심할 부분은 ${josa(S.weakness,'이고요/고요')}. 일로 보면 ‘${jobs[0].title}’ 쪽이 잘 맞는 편이고, ${josa(avoid[0].name,'은/는')} 오래 하면 쉽게 지칠 수 있어요.`,
   '읽다가 고개가 끄덕여지는 문장에 표시해 두세요. 마지막 장의 실험에서 그 문장을 다시 꺼내 써요.'],
  [`첫 번째 장점은 ${josa(s0,'이에요/예요')}. ${S.scene} 같은 자리에서 특히 잘 보여요.`,
   `두 번째는 ${josa(s1,'이에요/예요')}. 일간의 ${dayEl} 기운에서 나오는 성질이라 당신은 오히려 당연하게 여겼을지 몰라요. 동료가 “그거 어떻게 했어요?” 하고 물었던 일을 떠올려 보세요. 그 일에 이 장점이 들어 있어요.`,
   vFocus?`천간에 드러난 ${josa(vFocus,'은/는')} ${josa(GOD_FOCUS(visibleGod.god,godWork,focus),'을/를')} 더해 줘요. 회의나 보고처럼 남에게 보이는 자리에서 이 힘이 겉으로 나오는 편이에요.`:`월령에서 취한 ${josa(evidence.selectedGod,'도/도')} ${josa(focus,'을/를')} 보태요.`,
   strengthLine(core,mode)],
  [`재능은 장점이 실제 일로 옮겨진 모습이에요. 당신에게서는 ${josa(t0,'이/가')} 먼저 보여요.`,
   `월지 ${monthBranch}에서 취한 ${josa(evidence.selectedGod,'은/는')} ${josa(focus,'을/를')} 뜻해요. 그래서 ${t1}에서도 손이 빠른 편이에요. 처음 해 보는데도 금방 감을 잡은 과제가 있었다면 대개 이쪽이에요.`,
   combo?`명식 안에는 ‘${combo.title}’ 흐름도 있어요. 두 재능을 따로 쓰기보다 한 과제 안에 이어 붙일 때 결과가 좋아지는 편이에요.`:`재능은 써 본 만큼 또렷해져요. 이번 달 업무 가운데 이런 쪽에 가까운 과제 하나를 골라 먼저 맡아 보세요.`],
  [`장점이 지나치면 단점이 돼요. 당신에게는 ${josa(S.weakness,'이/가')} 그래요. ${S.weakScene} 이 모습이 자주 나와요.`,
   missing.length?`오행 가운데 ${josa(missingKo,'이/가')} 비어 있어요. 그래서 ${lack}에는 손이 덜 가는 편이에요. 이 부분은 도구나 동료의 도움을 받는 쪽이 덜 지쳐요.`:'오행이 한쪽으로 크게 비지는 않았어요. 그래서 단점은 성향보다 상황에서 더 크게 드러나요. 바쁜 주간에 어떤 실수가 반복되는지 적어 보면 금방 보여요.',
   `보완은 작게 시작하면 돼요. ${josa(S.fix,'을/를')} 한 달만 들여 보세요. 단점이 사라지지는 않아도 일이 덜 흔들려요.`],
  [`월지 ${josa(monthBranch,'은/는')} 절기로 ${season}에 해당해요. 월지는 일터에서 받는 요구를 보여 주는 자리인데, 당신에게는 ${josa(demand,'이/가')} 크게 와요. ${method} 방식을 쓰면 이 요구가 덜 버거워요.`,
   `잘 맞는 환경은 ${josa(env.wish,'이에요/예요')}. ${josa(env.rhythm,'이/가')} 하루에 들어 있으면 같은 일도 덜 지쳐요. 면접이나 첫 미팅에서 “보통 하루가 어떻게 흘러가요?” 하고 물어보면 이 조건을 미리 확인할 수 있어요.`,
   '아래 여섯 가지 조건은 점수가 아니에요. 회의 방식이나 피드백 받는 법처럼 실제 하루를 이루는 조건을 당신에게 하나씩 대어 보는 표예요.'],
  ['직종은 하나로 정하지 않았어요. 일간과 월령, 오행에서 근거를 하나씩 찾아 잘 맞는 편인 쪽을 골랐어요. 직업 이름보다 그 일의 평범한 하루를 먼저 그려 보세요.',
   '목록에 없는 직업도 아래 조건이 겹치면 잘 맞을 수 있어요. 관심 가는 공고가 있다면 업무 설명에 이런 일이 들어 있는지 확인해 보세요.'],
  ['피하면 좋은 일은 못 하는 일이 아니에요. 오래 하면 유난히 빨리 지치는 쪽이에요.',
   '이미 이런 자리에 있다면 당장 그만둘 필요는 없어요. 하루 중 한 시간만이라도 잘 맞는 방식으로 바꿔 보는 데서 시작해 보세요.'],
  ['이번 주에는 큰 결정을 미뤄 두고 작은 실험 하나만 해 보세요. 이틀 동안 일하며 시간이 빨리 간 순간과 유난히 지친 순간을 하나씩 적어요.',
   `다음 사흘은 ${josa(t0,'을/를')} 하루 30분씩 해 보세요. 회사 일이 아니어도 괜찮아요. 끝나고 나서 한 번 더 하고 싶은지만 체크해요.`,
   `마지막 이틀에는 ‘${jobs[0].title}’ 쪽에서 일하는 사람의 글이나 영상을 하나 찾아보세요. 그 사람의 하루가 부러운지 피곤해 보이는지가 이 리포트보다 솔직한 답을 줘요.`,
   '연이는 당신이 오래 좋아할 수 있는 일을 조금씩 알아 가길 바라요.'],
 ];
 return chapters.map((paragraphs,i)=>({title:CAREER_TITLES[i],paragraphs,
  ...(i===5?{items:jobItems}:{}),...(i===6?{items:avoidItems}:{})}));
}

function GOD_FOCUS(god,godWork,fallback){return GOD_WORK_FOCUS[god]||godWork.focus||fallback;}
const GOD_WORK_FOCUS={비견:'자기 기준을 세우는 힘',겁재:'동료와 자원을 움직이는 힘',식신:'꾸준히 만들어 내는 힘',상관:'기존 방식을 질문하는 힘',정재:'정해진 자원을 관리하는 힘',편재:'기회와 자원을 연결하는 힘',정관:'기준을 지키며 신뢰를 쌓는 힘',편관:'압박 속에서 우선순위를 정하는 힘',정인:'이해한 내용을 체계로 남기는 힘',편인:'다른 관점에서 단서를 찾는 힘'};

function jobBody(job,{neo,s0,t0,evidence}){
 if(job.source==='day')return neo?`${josa(s0,'이/가')} 그대로 쓰이는 일이야. ${josa(t0,'이/가')} 하루 업무 한가운데 있어.`:`${josa(s0,'이/가')} 그대로 쓰이는 직종이에요. ${josa(t0,'이/가')} 하루 업무의 한가운데 있어요.`;
 if(job.source==='family')return neo?`월령 ${josa(evidence.selectedGod,'은/는')} ${josa(job.why,'이어야/여야')} 힘이 나. 그래서 맞아.`:`월령의 ${josa(evidence.selectedGod,'은/는')} ${job.why}에서 힘이 나는 편이라 잘 맞아요.`;
 if(job.source==='visible')return neo?`천간에 드러난 기운도 ${josa(job.why,'을/를')} 원해. 두 번째 후보로 비교해 봐.`:`천간에 드러난 기운도 ${josa(job.why,'을/를')} 원해요. 두 번째 선택지로 비교해 볼 만해요.`;
 return neo?`${job.why} 네 판이 될 수 있어.`:`${job.why} 당신의 힘을 쓰기 좋은 편이에요.`;
}
