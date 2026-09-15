import {type ChapterRequest,type FortuneChapterProvider,validateChapter} from '../../worker/yeongnyangi/providers/chapter';
import {FortuneError} from '../../worker/yeongnyangi/fortune/shared/contracts';
import {type ChapterBody} from '../../worker/yeongnyangi/fortune/book-contracts';
import {selectChapterFacts} from '../../worker/yeongnyangi/fortune/chapter-facts';
import {READING_VERSION} from '../../worker/yeongnyangi/fortune/reading-policy';
export class MockChapterProvider implements FortuneChapterProvider {
  readonly receipt = { provider: "mock", model: "chapter-fixture-v2" };
  constructor(private failAt?: string) {}
  async generateChapter(input: ChapterRequest): Promise<ChapterBody> {
    const c = input.chapter;
    if (this.failAt === c.id) throw new FortuneError("MOCK_CHAPTER_FAILURE");
    const facts = Object.values(input.analysis.contexts).filter(c=>!input.chapter.systems||input.chapter.systems.includes(c.domain)).flatMap(
      (c) => selectChapterFacts(c,input.chapter,input.analysis.topicId),
    );
    if(c.version===READING_VERSION)return mockReading(input,facts.map(f=>f.id));
    const f = facts[c.ordinal % facts.length];
    return validateChapter(
      {
        summary: `${c.title}: 내 선택의 기준을 한 가지씩 확인해 보는 장입니다.`,
        analysis: [
          `이 문장은 ${c.title} 화면과 저장 흐름을 확인하는 모의 해설입니다. 실제 개인 해석이 아닙니다.`,
          `계산 근거 ${f.label}를 연결했습니다. 실제 해설은 제공된 사실과 제약을 함께 설명하도록 구성되어 있습니다.`,
        ],
        example: `${c.title}을 살펴볼 때는 최근 한 달의 경험 중 이 주제와 관련한 장면을 적어 보세요.`,
        advice: `오늘은 '${c.title}'에 관해 바꿀 수 있는 행동 하나만 정해 보세요.`,
        highlights: [`${c.title}의 관찰과 행동을 구분하기`],
        sources: [f.id],
        persona: `${c.title}, 결론보다 네 선택을 먼저 보자냥.`,
        topics: [c.title],
      },
      input,
    );
  }
}
// Long fixtures exercise pagination/length contracts only; they are not personal readings.
function mockReading(input:ChapterRequest,sources:string[]):ChapterBody {
 const c=input.chapter;
 const scenes=['새 일을 시작하기 전 기준을 적는 순간','예상과 다른 말을 듣고 답을 고르는 순간','작은 지출이 겹쳐 우선순위를 살피는 순간','가까운 사람과 서로의 기대를 확인하는 순간','혼자 쉬는 시간과 함께하는 시간을 나누는 순간','익숙한 방식 대신 다른 순서를 시도하는 순간','좋아하는 일과 잘하는 일을 구별하는 순간','결정을 미루는 이유를 돌아보는 순간','도움을 요청할 범위를 정하는 순간','작은 성과를 다음 계획에 반영하는 순간','부담이 커지기 전에 속도를 낮추는 순간','다른 해석도 가능하다는 점을 확인하는 순간'];
 const situations=['빈 공책 앞에서 좋아하는 것과 피하고 싶은 것을 각각 적어 보는 장면','처음 만나는 모임에서 말하기 전 주변 분위기를 살피는 장면','쉬는 날 약속을 잡을지 혼자 시간을 보낼지 생각하는 장면','낯선 도구를 배우면서 쉽게 익히는 부분을 발견하는 장면','여러 부탁이 한꺼번에 들어왔을 때 순서를 나누는 장면','호감을 표현하려다가 어떤 말이 편안할지 고르는 장면','친구와 함께 여행 일정을 정하면서 서로의 기대를 듣는 장면','약속한 연락 시간이 달라 오해를 풀 방법을 찾는 장면','생활 습관이 다른 두 사람이 공동 규칙을 적는 장면','혼자 끝내기 어려운 일에 필요한 도움을 구하는 장면','업무 목록에서 잘하는 역할을 골라 담당하는 장면','조용한 공간과 활기찬 공간 중 집중할 곳을 고르는 장면','스스로 만든 결과물을 다른 사람에게 설명하는 장면','한 달 기록에서 충동적으로 쓴 항목을 되돌아보는 장면','새로운 제안을 받고 현재 계획과 비교하는 장면','일을 마친 뒤 휴식 시간을 따로 확보하는 장면','방을 정리하면서 계속 가지고 있을 물건을 고르는 장면','부족하게 느끼던 조건을 어떤 지원으로 보완할지 적는 장면','여러 방향에서 받은 의견을 종이에 펼쳐 놓는 장면','큰 그림과 작은 단서를 나란히 비교하는 장면','서로 다른 욕구가 생긴 이유를 차분히 확인하는 장면','지금 맡은 책임과 다음 단계의 준비를 구분하는 장면','변화가 다가오기 전 미리 정리할 일을 찾아보는 장면','달력에 예정된 일과 아직 확정되지 않은 일을 표시하는 장면','짧은 질문 한 줄에서 정말 알고 싶은 부분을 찾는 장면','두 가지 경로의 장점과 부담을 나란히 적어 보는 장면','일치하는 설명과 서로 다른 설명을 구별하는 장면','오늘 할 일 한 가지와 나중에 점검할 질문을 정하는 장면'];
 const situation=situations[c.ordinal%situations.length];
 const blocks=(c.requiredSections||['해석','선택']).map(title=>({title,paragraphs:[] as string[]}));
 const target=c.targetChars?.[0]||1000;
 let size=0,j=0;
 while(size<target){
  const scene=scenes[(c.ordinal*3+j)%scenes.length];
  const section=blocks[j%blocks.length];
  const text=`${c.title}의 ${section.title}을 확인하는 모의 해설입니다. ${scene}을 가정하되, 실제 사용자의 경험으로 판정하지 않습니다. ${section.title}의 검증 사례 ${j+1}에서 다룰 질문은 '${c.title}에서 어떤 선택 기준을 확인할 수 있는가'입니다. ${situation}을 중심으로 검증 장면 ${c.ordinal+1}-${j+1}에서는 관찰한 사실과 아직 확인하지 않은 추측을 따로 적습니다. ${scene}의 선택도 환경과 상대의 의사에 따라 달라질 수 있으므로 ${section.title}의 결론을 모든 상황에 적용하지 않습니다. ${situation}과 ${scene}에 떠오르는 선택을 두 개 적고, ${section.title}에 필요한 정보가 무엇인지 비교하는 연습을 합니다. ${scene}을 다룬 이 문단은 문장 품질이나 운세 적중을 입증하는 결과가 아니라, '${c.title}'에서 ${section.title}의 분량과 저장·독서 화면을 검사하기 위한 자료입니다.`;
  const sentences=text.split(/(?<=[.!?])\s+/);for(let k=0;k<sentences.length;k+=2)section.paragraphs.push(sentences.slice(k,k+2).join(' '));size+=text.length;j++;
 }
 for(const section of blocks)if(!section.paragraphs.length)section.paragraphs.push(`${c.title}에서 ${section.title}을 확인합니다. ${section.title} 구간은 ${situation}을 다루는 모의 검증 자료이며, 근거를 실제 개인의 경험으로 바꾸지 않습니다.`);
 const value:ChapterBody={summary:`${c.title} · 모의 상담 구성 확인`,analysis:[],blocks,example:`${c.title}의 사례: ${scenes[c.ordinal%scenes.length]}에 무엇을 확인할지 적어 보는 가상 연습입니다.`,advice:`${c.title}의 실행: 판단에 필요한 정보와 확인할 질문을 나누고, 이번 장의 선택 기준을 한 문장으로 기록합니다.`,highlights:[c.title],sources:sources.slice(0,2),persona:'이 화면은 모의 상담이야. 실제 해석과는 구분해서 살펴봐.',topics:[c.title]};
 return validateChapter(value,input);
}
