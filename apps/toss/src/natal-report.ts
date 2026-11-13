const labels={ilju:'일주 풀이',ten:'십성 풀이',climate:'조후 풀이',strength:'억부 풀이',terms:'절기 풀이'} as const;
export type NatalParts=Record<keyof typeof labels,string>;
type Fragment=(doc:Document,html:string)=>DocumentFragment;

// The response uses the same inert templates as the web section client.
export function renderNatalReport(doc:Document,parts:NatalParts,fragment:Fragment){
  const body=doc.createElement('section');
  const godDetails=new Map<string,string>();
  for(const [group,title] of Object.entries(labels)){
    const part=doc.createElement('template');
    part.innerHTML=parts[group as keyof NatalParts]||'';
    const chapter=doc.createElement('details'),heading=doc.createElement('summary');
    heading.textContent=title;
    chapter.className='natal-chapter';
    chapter.dataset.chapter=group;
    chapter.open=group==='ilju';
    chapter.append(heading);
    for(const template of part.content.querySelectorAll<HTMLTemplateElement>('template[data-natal-slot]')){
      const id=template.getAttribute('data-natal-slot')!;
      const slot=doc.createElement(id.endsWith('List')?'ul':'div');
      slot.id=id;slot.append(fragment(doc,template.innerHTML));chapter.append(slot);
    }
    for(const template of part.content.querySelectorAll<HTMLTemplateElement>('template[data-natal-god]')){
      godDetails.set(template.getAttribute('data-natal-god')!,template.innerHTML);
    }
    if(chapter.children.length>1)body.append(chapter);
  }
  const detail=doc.createElement('dialog'),close=doc.createElement('button'),title=doc.createElement('h2'),content=doc.createElement('div');
  close.type='button';close.textContent='닫기';
  title.id='natal-god-title';detail.setAttribute('aria-labelledby',title.id);
  detail.append(close,title,content);body.append(detail);
  close.onclick=()=>detail.close();
  body.addEventListener('click',event=>{
    const god=(event.target as HTMLElement)?.closest('[data-saju-god]')?.getAttribute('data-saju-god');
    const html=god&&godDetails.get(god);
    if(!god||!html)return;
    title.textContent=god;content.replaceChildren(fragment(doc,html));detail.showModal();close.focus();
  });
  return body;
}

const nature=import.meta.glob('../../../public/images/saju/nature/*-480.webp',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const portraits=import.meta.glob('../../../public/images/fortune-chat/persona/{yeoni,neo}-greet.webp',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export function natalImage(source:string){
  const path=source.replace(/-960\.webp$/,'-480.webp');
  return nature['../../../public'+path]||portraits['../../../public'+path];
}
