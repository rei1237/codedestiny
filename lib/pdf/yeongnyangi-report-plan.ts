import type {ChapterBody,ChapterSpec} from '@/worker/yeongnyangi/fortune/book-contracts';
import type {ReadingChart} from '@/worker/yeongnyangi/fortune/reading-presentation';

export type ReadingReportInput={manifest:ChapterSpec[];chapters:ChapterBody[];charts?:ReadingChart[];consultation?:{question?:string;asOf?:string};createdAt:string;completedAt?:string;locale?:string;product:{name:string;readingKind:string};conversation?:{exchanges:{id:string;question:string;kind:string;text:string}[]}};
export type ReadingReportBlock={kind:'heading'|'body'|'lead'|'table';text:string;rows?:{label:string;value:string}[]};
export type ReadingReportChapter={id:string;title:string;part:string;blocks:ReadingReportBlock[]};
const text=(value:unknown)=>typeof value==='string'?value.trim():'';
const systems:Record<string,string>={saju:'사주',ziwei:'자미두수',sukuyo:'숙요점',vedic:'베다점',astrology:'서양점성술',tarot:'타로'};

/** The same canonical body feeds the reader and PDF: structured blocks replace the legacy analysis copy. */
export function readingBodyBlocks(chapter:ChapterBody){
 return chapter.blocks?.length?chapter.blocks:[{id:'analysis',title:'',paragraphs:chapter.analysis||[]}];
}
export function readingPartHeading(manifest:ChapterSpec[],index:number){
 const part=manifest[index]?.part;
 return part&&part!==manifest[index-1]?.part?part:undefined;
}
export function readingChapterBlocks(chapter:ChapterBody):ReadingReportBlock[]{
 const blocks:ReadingReportBlock[]=[];
 const add=(kind:ReadingReportBlock['kind'],value:unknown)=>{const clean=text(value);if(clean)blocks.push({kind,text:clean});};
 add('lead',chapter.summary);
 for(const answer of chapter.questionAnswers||[]){
  add('heading','질문에 대한 답');add('body',answer.answer);
  for(const [label,value] of [['그렇게 보는 이유',answer.reason],['시기와 조건',answer.timing],['지금 할 행동',answer.action],['판단을 바꿀 조건',answer.review]])if(text(value)){add('heading',label);add('body',value);}
 }
 for(const block of readingBodyBlocks(chapter)){add('heading',block.title);for(const paragraph of block.paragraphs)add('body',paragraph);}
 if(chapter.highlights?.length){add('heading','기억할 핵심');for(const value of chapter.highlights)add('body',value);}
 for(const [label,value] of [['생활 속 예시',chapter.example],['실천과 점검',chapter.advice],['영냥이의 한마디',chapter.persona]])if(text(value)){add('heading',label);add('body',value);}
 return blocks;
}

/** Appendices select existing conclusions; they never generate a new prediction or expose internal source IDs. */
export function readingReportAppendices(row:ReadingReportInput):ReadingReportChapter[]{
 const pair=row.chapters.map((body,i)=>({body,spec:row.manifest.find(spec=>body.chapterId&&spec.id===body.chapterId)||row.manifest[i]})).filter(x=>x.spec);
 const comparison=pair.filter(x=>x.spec.layoutRole==='foundation'&&x.spec.systems?.length===1).map(x=>({kind:'body' as const,text:`${systems[x.spec.systems![0]]||x.spec.title}: ${x.body.summary}`}));
 const actions=pair.filter(x=>x.spec.layoutRole==='synthesis'||x.spec.layoutRole==='application').flatMap(x=>{
  const ids=new Set(x.spec.sections?.filter(section=>section.role==='action').map(section=>section.id));
  const values=text(x.body.advice)?[x.body.advice]:(x.body.blocks||[]).filter(block=>block.id&&ids.has(block.id)).flatMap(block=>block.paragraphs);
  return values.length?[{kind:'heading' as const,text:x.spec.title},...values.map(text=>({kind:'body' as const,text}))]:[];
 });
 const terms:Record<string,string>={'오행':'목·화·토·금·수로 기질과 균형을 설명하는 분류','십성':'일간과 다른 글자의 관계를 역할과 행동으로 읽는 분류','용신':'원국의 균형을 해석할 때 도움을 주는 조건','명궁':'자미두수에서 기본 성향을 살피는 궁','신궁':'자미두수에서 삶의 활동 방향을 함께 살피는 궁','사화':'별의 작용을 기회와 부담의 변화로 읽는 네 가지 분류','본명숙':'숙요점에서 출생 기준으로 정해진 숙','라그나':'베다점에서 출생 시 동쪽 지평선에 놓인 상승점','다샤':'베다점에서 행성별 과제를 살피는 시기 체계','하우스':'점성술에서 삶의 영역을 구분하는 구역','상승점':'출생 시 동쪽 지평선의 지점으로 읽는 삶을 대하는 태도','정방향':'펼쳐진 카드의 기본 방향','역방향':'뒤집힌 카드의 방향으로, 지연·내면화 등은 위치와 함께 해석'};
 const corpus=pair.flatMap(x=>readingChapterBlocks(x.body).map(b=>b.text)).join('\n');
 const glossary=Object.entries(terms).filter(([term])=>corpus.includes(term)).map(([term,meaning])=>({kind:'body' as const,text:`${term}: ${meaning}`}));
 return [
  {id:'appendix-comparison',title:'체계별 핵심 해석 비교',part:'다시 펼치는 상담 노트',blocks:comparison},
  {id:'appendix-actions',title:'나의 실행·점검표',part:'다시 펼치는 상담 노트',blocks:[{kind:'lead' as const,text:'아래는 본문에 제안된 행동입니다. 실행 여부와 관찰한 변화를 기록해 보세요. 점검일은 예측된 사건 날짜가 아닙니다.'},...actions]},
  {id:'appendix-glossary',title:'내 리포트에 나온 용어',part:'다시 펼치는 상담 노트',blocks:glossary},
 ].filter(chapter=>chapter.blocks.length&&(chapter.id!=='appendix-actions'||actions.length));
}
export function buildYeongnyangiReportPlan(row:ReadingReportInput,{includeQuestion=false,includeFollowups=false}={}):ReadingReportChapter[]{
 const chapters=row.chapters.map((body,i)=>{
  const spec=row.manifest.find(spec=>body.chapterId&&spec.id===body.chapterId)||row.manifest[i];
  if(!spec)throw new Error('상담 본문과 목차를 연결할 수 없어요. 다시 열어 주세요.');
  return {id:spec.id,title:row.locale&&row.locale!=='ko'?body.title||spec.title:spec.title,part:spec.part,blocks:readingChapterBlocks(body)};
 });
 const question=includeQuestion?text(row.consultation?.question):'';
 const charts=(row.charts||[]).map(chart=>({id:'chart-'+chart.domain,title:chart.title,part:'계산 근거',blocks:[...chart.groups.flatMap(group=>[{kind:'heading' as const,text:group.label},{kind:'table' as const,text:group.label,rows:group.items}]),...chart.limitations.map(text=>({kind:'body' as const,text}))]}));
 const placed=new Set<string>();
 const body=chapters.flatMap(chapter=>{
  const spec=row.manifest.find(spec=>spec.id===chapter.id);
  const chart=spec?.systems?.length===1&&spec.layoutRole==='foundation'?charts.find(chart=>chart.id==='chart-'+spec.systems![0]):undefined;
  if(!chart||placed.has(chart.id))return [chapter];
  placed.add(chart.id);return [chapter,{...chart,part:chapter.part}];
 });
 return [...(question?[{id:'question',title:'내가 남긴 질문',part:'상담의 시작',blocks:[{kind:'body' as const,text:question}]}]:[]),...body,...charts.filter(chart=>!placed.has(chart.id)),...readingReportAppendices(row),...(includeFollowups?(row.conversation?.exchanges||[]).filter(exchange=>exchange.kind==='answer').map(exchange=>({id:'followup-'+exchange.id,title:'추가 질문과 답변',part:'영냥이와 이어 나눈 상담',blocks:[{kind:'heading' as const,text:'나의 질문'},{kind:'body' as const,text:exchange.question},{kind:'heading' as const,text:'영냥이의 답변'},{kind:'body' as const,text:exchange.text}]})):[])];
}
