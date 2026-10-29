'use client';

import Link from 'next/link';
import {createContext, useContext, type ReactNode} from 'react';
import english from '../../content/novel/hub-en.json';
import japanese from '../../content/novel/hub-ja.json';
import simplifiedChinese from '../../content/novel/hub-zh-CN.json';
import traditionalChinese from '../../content/novel/hub-zh-TW.json';

const editions: Record<string, Record<string,string>> = {en:english, ja:japanese, 'zh-CN':simplifiedChinese, 'zh-TW':traditionalChinese};
const HubEdition = createContext<{locale:string; titles:Record<string,string>}>({locale:'ko',titles:{}});

export function StoryHubLocaleProvider({locale, episodes, children}: {locale:string; episodes?:{id:string;title:string}[]; children:ReactNode}) {
  return <HubEdition.Provider value={{locale,titles:Object.fromEntries((episodes||[]).map(episode=>[episode.id,episode.title]))}}>{children}</HubEdition.Provider>;
}

export function StoryHubText({children}: {children:string}) {
  const {locale}=useContext(HubEdition);
  if(locale==='ko')return children;
  const key=children.replace(/\s+/g,' ').trim();
  const translated=editions[locale]?.[key];
  if(!translated)return children;
  // Korean word-unit wrapping can clip an entire Japanese or Chinese sentence.
  return <bdi style={{wordBreak:'normal',overflowWrap:'anywhere'}}>{`${/^\s/.test(children)?' ':''}${translated}${/\s$/.test(children)?' ':''}`}</bdi>;
}

export function StoryHubEpisodeTitle({id,children}: {id:string;children:string}) {
  const {locale,titles}=useContext(HubEdition);
  return locale==='ko'?children:<bdi style={{wordBreak:'normal',overflowWrap:'anywhere'}}>{titles[id]||children}</bdi>;
}

export function StoryHubLink({href,children,className}: {href:string;children:ReactNode;className?:string}) {
  const {locale}=useContext(HubEdition);
  const target=locale!=='ko'&&href.startsWith('/stories/')?`${href}?novelLang=${encodeURIComponent(locale)}`:href;
  return <Link href={target} className={className}>{children}</Link>;
}
