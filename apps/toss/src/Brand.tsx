/** Existing Code Destiny art and voice; this map never defines sale products. */
export const advisers = {
  yeongnyangi: {name:'영냥이',place:'사주보는 고양이',image:'/assets/yeongnyangi.webp',message:'궁금한 마음을 하나씩 풀어봐요.',description:'계산된 흐름에서 찾는 나의 이야기'},
  yeoni: {name:'연이',place:'꽃빛 상담실',image:'/assets/yeoni-flower-pig.webp',message:'마음부터 천천히 들려주세요.',description:'관계와 감정을 다정한 편지로'},
  neo: {name:'네오',place:'별빛 전략실',image:'/assets/neo.webp',message:'복잡한 고민, 다음 수부터 정하자.',description:'판세를 읽고 현실적인 전략으로'},
} as const;
export type AdviserId=keyof typeof advisers;
export function CharacterWelcome(){
  return <div className="character-welcome"><img src="/assets/yeoni-yeongnyangi-garden.webp" alt="달빛 꽃 정원에서 차와 책을 함께 보는 꽃돼지 연이와 영냥이" width={480} height={720} loading="lazy" decoding="async"/><div><h2>오늘은 누구와<br/>이야기할까요?</h2><p>꽃돼지 연이의 다정함,<br/>영냥이의 차분한 해석,<br/>네오의 현실적인 조언.</p></div></div>;
}
export function FloralInputWelcome(){
  return <div className="floral-input-welcome"><img src="/assets/yeoni-flower-guide.webp" alt="꽃을 든 꽃돼지 연이" width={500} height={500} decoding="async"/><div><h2>마음 가는 속도로,<br/>하나씩 들려주세요.</h2><p>꽃돼지 연이가 곁에서 안내할게요.<br/>아는 정보부터 차근차근 적어 주세요.</p></div></div>;
}
export function AdviserPortrait({id,className='portrait',decorative=false}:{id:string;className?:string;decorative?:boolean}){
  const adviser=advisers[id as AdviserId]||advisers.yeongnyangi;
  return <img className={className} src={adviser.image} alt={decorative?'':adviser.name} width={240} height={360} decoding="async"/>;
}
export function AdviserChoices({selected,onChoose}:{selected?:string;onChoose:(id:AdviserId)=>void}){
  return <div className="adviser-choices" role="group" aria-label="상담가 선택">{(Object.entries(advisers) as [AdviserId,typeof advisers[AdviserId]][]).map(([id,adviser])=><button type="button" className={`adviser-choice adviser-${id}`} key={id} aria-pressed={selected===id} onClick={()=>onChoose(id)}><span className="adviser-art"><AdviserPortrait id={id} className="adviser-image" decorative/></span><strong>{adviser.name}</strong><small>{adviser.place}</small>{selected===id&&<span className="adviser-selected">선택됨</span>}</button>)}</div>;
}
export function TarotCover({flowId='tarot'}:{flowId?:string}){
  return <img className="tarot-cover" src={`/assets/${flowId}-320.webp`} alt="" width={320} height={213} decoding="async"/>;
}

export function FishPortrait({fish}:{fish:string}){
  const names:Record<string,string>={mackerel:'고등어',salmon:'연어',flounder:'광어',tuna:'참치'};
  if(!names[fish])return null;
  return <img className="fish-portrait" src={'/assets/fish/'+fish+'.webp'} alt="" width={96} height={96} loading="lazy" decoding="async"/>;
}
