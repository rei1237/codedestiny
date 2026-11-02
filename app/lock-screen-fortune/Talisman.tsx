"use client";
import {useEffect,useRef,useState} from 'react';
import {resolveTalisman,TALISMAN_CATEGORIES,TALISMAN_CHARACTERS,TALISMAN_GROUPS,talismanCopy} from './talisman-data';

export function TalismanArt({id,locale}:{id:string;locale:string}) {
 const {category,character}=resolveTalisman(id);
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[character.image]);
 const art=failed?TALISMAN_CHARACTERS[0]:character;
 return <figure className="cd-talisman" style={{backgroundColor:category.color}}>
  <img key={art.image} src={art.image} width={320} height={320} alt={locale==='ko'?art.alt:art.en} onError={()=>setFailed(true)}/>
  <figcaption><strong>{locale==='ko'?category.label:category.en}</strong><span>{locale==='ko'?character.name:character.en}</span><p>{locale==='ko'?category.line:category.english}</p></figcaption>
 </figure>;
}

export function TalismanPicker({id,locale,onApply,onClose}:{id:string;locale:string;onApply:(id:string)=>void;onClose:()=>void}) {
 const [draft,setDraft]=useState(id);
 const selected=resolveTalisman(draft);
 const [group,setGroup]=useState<string>(selected.character.group);
 const dialog=useRef<HTMLDivElement>(null);
 const copy=talismanCopy(locale);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const element=dialog.current;
  const items=()=>Array.from(element?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')||[]);
  items()[0]?.focus();
  const trap=(e:KeyboardEvent)=>{
   if(e.key!=='Tab')return;
   const buttons=items(),first=buttons[0],last=buttons[buttons.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  };
  element?.addEventListener('keydown',trap);
  return()=>{document.body.style.overflow=overflow;element?.removeEventListener('keydown',trap);if(previous?.isConnected)previous.focus();else document.querySelector<HTMLButtonElement>('.cd-talisman-change button')?.focus();};
 },[]);
 return <div className="cd-talisman-backdrop" onClick={onClose}>
  <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="talisman-picker-title" className="cd-talisman-picker" onClick={e=>e.stopPropagation()}>
   <header><h2 id="talisman-picker-title">{copy.change}</h2><button type="button" onClick={onClose}>{copy.close}</button></header>
   <div className="cd-talisman-picker-body">
    <h3>{copy.category}</h3>
    <div className="cd-talisman-options">{TALISMAN_CATEGORIES.map(c=><button type="button" key={c.id} aria-pressed={selected.category.id===c.id} onClick={()=>setDraft(c.id+':'+selected.character.id)}>{locale==='ko'?c.label:c.en}</button>)}</div>
    <h3>{copy.character}</h3>
    <div className="cd-talisman-options">{TALISMAN_GROUPS.map(g=><button type="button" key={g.id} aria-pressed={group===g.id} onClick={()=>setGroup(g.id)}>{locale==='ko'?g.label:g.en}</button>)}</div>
    <div className="cd-talisman-characters">{TALISMAN_CHARACTERS.filter(c=>c.group===group).map(c=><button type="button" key={c.id} aria-pressed={selected.character.id===c.id} onClick={()=>setDraft(selected.category.id+':'+c.id)}><img src={c.image} width={100} height={100} alt="" loading="lazy"/><span>{locale==='ko'?c.name:c.en}</span></button>)}</div>
    <h3>{copy.preview}</h3><TalismanArt id={draft} locale={locale}/><p className="cd-talisman-note">{copy.note}</p>
   </div>
   <footer><button type="button" onClick={onClose}>{copy.cancel}</button><button type="button" className="cd-talisman-apply" onClick={()=>onApply(draft)}>{copy.apply}</button></footer>
  </div>
 </div>;
}
