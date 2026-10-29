"use client";

import { useEffect, useState, type ReactNode } from "react";
import copy from "../../content/novel/ui-copy.json";
import { NOVEL_LOCALES, NOVEL_LANGUAGE_LABELS, resolveNovelLocale } from "../../lib/stories/vn/locales.mjs";

type Beat = { id: string; s: string; t: string; nm?: string; bg?: string; sceneBreak?: boolean; choice?: { options: { id: string; label: string; target: string }[] } };
type Episode = { id: string; no: string; title: string; tag: string; path: string; sourceHash?: string; beats?: Beat[] };
type Manifest = { sourceHash: string; locale?: string; availableLocales?: string[]; episodes: Episode[] };
const names: Record<string,string> = {yeon:"연이",neo:"네오",mu:"무성",geo:"거울 속 연이",moka:"모카",crow:"까마귀",luna:"루나블룸",ln:"루나",lns:"루나 언니",rab:"청토끼",pje:"서한비",tiger:"검은 호랑이",god:"운명의 신",yun:"윤달",heuk:"흑월"};
const dictionary: Record<string,string[]> = copy.copy;

function preferredEdition() {
  const params=new URLSearchParams(window.location.search);
  const cookie=(name:string)=>document.cookie.split(';').map(value=>value.trim()).find(value=>value.startsWith(name+'='))?.slice(name.length+1)||'';
  let saved='';try{saved=localStorage.getItem('cd:novel:language')||'';}catch{}
  return resolveNovelLocale(params.get('novelLang')||saved||params.get('lang')||(cookie('cd_locale_explicit')==='1'?cookie('cd_locale'):'')||cookie('cd_geo_locale')||cookie('cd_locale')||navigator.language);
}

export default function StoryEdition({ children, episodeId }: { children: ReactNode; episodeId?: string }) {
  const [locale,setLocale]=useState('ko');
  const [available,setAvailable]=useState<string[]>(['ko']);
  const [manifest,setManifest]=useState<Manifest|null>(null);
  const [episode,setEpisode]=useState<Episode|null>(null);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  const [unavailable,setUnavailable]=useState(false);
  const [request,setRequest]=useState<string|null>(null);
  const [retry,setRetry]=useState(0);
  const t=(source:string)=>locale==='ko'?source:dictionary[source]?.[copy.locales.indexOf(locale)]||source;
  const href=(id?:string)=>`/stories/${id?id+'/':''}?novelLang=${encodeURIComponent(locale)}`;

  useEffect(()=>{
    const controller=new AbortController();
    const read=async(path:string)=>{
      const response=await fetch(path,{cache:'no-cache',signal:controller.signal});
      if(!response.ok)throw new Error('Novel unavailable');
      return response.json();
    };
    const load=async()=>{
      setPending(true);setError('');setEpisode(null);
      const root:Manifest=await read('/data/novel/manifest.json');
      const choices=root.availableLocales||['ko'];setAvailable(choices);
      const requested=request||preferredEdition();
      const selected=choices.includes(requested)?requested:'ko';
      setUnavailable(requested!==selected);setLocale(selected);
      if(selected==='ko'){setManifest(root);return;}
      const edition:Manifest=await read(`/data/novel/${selected}/manifest.json`);
      if(edition.sourceHash!==root.sourceHash||edition.locale!==selected||edition.episodes.length!==root.episodes.length)throw new Error('Novel revision mismatch');
      setManifest(edition);
      if(episodeId){
        const meta=edition.episodes.find(item=>item.id===episodeId);
        if(!meta)throw new Error('Chapter unavailable');
        const chapter:Episode=await read(meta.path);
        if(chapter.id!==episodeId||chapter.sourceHash!==edition.sourceHash||!Array.isArray(chapter.beats))throw new Error('Chapter revision mismatch');
        let background='';
        chapter.beats=chapter.beats.map(beat=>{
          const sceneBreak=Boolean(beat.bg&&background&&beat.bg!==background);
          if(beat.bg)background=beat.bg;
          return {...beat,sceneBreak};
        });
        setEpisode(chapter);
      }
    };
    load().catch(()=>{if(!controller.signal.aborted)setError('소설 데이터를 불러오지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.');}).finally(()=>{if(!controller.signal.aborted)setPending(false);});
    return ()=>controller.abort();
  },[episodeId,request,retry]);

  const select=(value:string)=>{
    if(!available.includes(value))return;
    try{localStorage.setItem('cd:novel:language',value);}catch{}
    const url=new URL(window.location.href);url.searchParams.set('novelLang',value);window.history.replaceState(null,'',url);
    setRequest(value);
  };
  const index=manifest?.episodes.findIndex(item=>item.id===episodeId)??-1;
  const previous=index>0?manifest?.episodes[index-1]:null;
  const next=index>=0?manifest?.episodes[index+1]:null;

  return <div lang={locale}>
    <div className="mx-auto w-full max-w-4xl px-4 pt-8 text-slate-100 md:px-6">
      <label className="flex flex-wrap items-center gap-3">
        <span className="text-sm">{t('언어 · Language')}</span>
        <select aria-label={t('언어 · Language')} value={locale} onChange={event=>select(event.target.value)} className="min-h-11 max-w-full rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
          {NOVEL_LOCALES.map((value:string)=><option key={value} value={value} disabled={!available.includes(value)}>{NOVEL_LANGUAGE_LABELS[value as keyof typeof NOVEL_LANGUAGE_LABELS]}</option>)}
        </select>
      </label>
      {unavailable&&<p role="status" className="mt-3 text-sm">This edition is being prepared. The Korean original is shown.</p>}
      {pending&&<p role="status" className="mt-3 text-sm">{t('여는 중…')}</p>}
      {error&&<div role="alert" className="mt-3"><p>{t(error)}</p><button className="mt-2 min-h-11 underline" onClick={()=>setRetry(value=>value+1)}>{t('불러오기')}</button></div>}
    </div>
    {locale==='ko'?children:!pending&&!error&&manifest&&<main className="mx-auto w-full max-w-3xl px-4 py-10 text-slate-100 md:px-6 md:py-14">
      <header className="border-b border-white/10 pb-6">
        <h1 className="break-words text-3xl font-bold leading-tight text-amber-50">{episode?`${episode.no} · ${episode.title}`:t('연이의 운명 노벨')}</h1>
        <p className="mt-4 leading-8 text-slate-300">{episode?.tag||t('꽃돼지가 된 연이와 비밀을 품은 영냥이. 낯선 세계를 건너며, 정해진 운명 너머의 답을 함께 찾아가는 이야기.')}</p>
      </header>
      {episode?<article className="mt-8">
        {episode.beats?.map(beat=><div key={beat.id}>
          {beat.sceneBreak&&<p aria-hidden="true" className="my-8 text-center">＊ ＊ ＊</p>}
          <p className="mt-5 whitespace-pre-line break-words text-base leading-8 text-slate-300">{(beat.nm||names[beat.s])&&<><strong className="text-amber-100">{beat.nm||t(names[beat.s])}</strong><span className="mx-2">—</span></>}{beat.t}</p>
          {beat.choice&&<div className="mt-6 grid gap-3 sm:grid-cols-2">{beat.choice.options.map(option=><a className="min-h-11 rounded-xl border border-amber-200/30 px-4 py-3 text-amber-100" key={option.id} href={href(option.target)}>{option.label}</a>)}</div>}
        </div>)}
      </article>:<ol className="mt-8 space-y-2">{manifest.episodes.map(item=><li key={item.id}><a href={href(item.id)} className="block rounded-xl border border-white/10 px-4 py-3 hover:border-amber-200/40"><span className="text-sm text-slate-400">{item.no}</span><p className="mt-1 font-semibold">{item.title}</p></a></li>)}</ol>}
      <nav className="mt-10 flex flex-wrap justify-between gap-4 border-t border-white/10 pt-6">
        {previous&&<a className="min-h-11 max-w-full break-words" href={href(previous.id)}>← {previous.no} {previous.title}</a>}
        {next&&<a className="min-h-11 max-w-full break-words" href={href(next.id)}>{next.no} {next.title} →</a>}
        {episode&&<a className="min-h-11" href={href()}>{t('목차 · 화 선택')}</a>}
        <a className="min-h-11" href={`/codedestiny-novel.html?novelLang=${encodeURIComponent(locale)}`}>{t('소설 읽기')} · Visual Novel</a>
      </nav>
      <aside className="mt-10 border-t border-white/10 pt-6 text-sm leading-7 text-slate-300">
        <h2 className="font-semibold text-amber-100">{t('창작·집필 안내')}</h2>
        <p className="mt-3">{t('창작 안내 본문')}</p>
        <a href="/contact/" className="mt-2 inline-block min-h-11 text-amber-100 underline">{t('문의')}</a>
      </aside>
    </main>}
  </div>;
}
