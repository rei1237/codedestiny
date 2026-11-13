import {useEffect, useRef, useState} from 'react';
import CutReader, {type WebtoonCut} from '../../../app/components/webtoon/CutReader';
import {homeStories} from '../../../app/consultations/home-stories';
import consultationWebtoons from 'virtual:consultation-webtoons';
import {Button} from './Button';
import './story-library.css';

const coverDirectory = 'https://code-destiny.com/images/consultation-webtoons/covers/mobile/';
const stories: Record<string, {title:string; cuts:WebtoonCut[]; ending:{action:string;href:string}}> = consultationWebtoons;
const readyRooms = new Set(['tea','neo','love-secret','fusion','new-year','life-book','ziwei','astrology','vedic','sukuyo-compat','karma']);
const storyKey = () => new URLSearchParams(location.search).get('story') || '';

export default function StoryLibrary() {
  const [selected, setSelected] = useState(storyKey);
  const heading = useRef<HTMLHeadingElement>(null);
  const entry = homeStories.find(item => item.id === selected);
  const story = entry && stories[entry.id];

  function open(id: string) {
    const url = new URL(location.href);
    if (id) url.searchParams.set('story', id);
    else url.searchParams.delete('story');
    history.pushState({studioStory:id}, '', url);
    setSelected(id);
    window.scrollTo(0, 0);
  }
  function close() {
    if (history.state?.studioStory) history.back();
    else open('');
  }
  useEffect(() => {
    const pop = () => setSelected(storyKey());
    const back = (event: Event) => {
      if (!story || event.defaultPrevented) return;
      event.preventDefault();
      close();
    };
    window.addEventListener('popstate', pop);
    window.addEventListener('code-destiny:toss-back', back);
    return () => {
      window.removeEventListener('popstate', pop);
      window.removeEventListener('code-destiny:toss-back', back);
    };
  }, [story]);
  useEffect(() => { heading.current?.focus({preventScroll:true}); }, [selected]);

  if (story && entry) return <section className="story-library">
    <header><button onClick={close}>‹ 웹툰 서가</button><h1 tabIndex={-1} ref={heading}>{story.title}</h1>
      <p>{entry.lead}</p><small>도입 이야기 · {story.cuts.length}컷</small></header>
    <CutReader tone={entry.id==='heukwol'?'night':'yehwa'} cuts={story.cuts}/>
    <footer>{readyRooms.has(entry.id) && <a href={story.ending.href}>{story.ending.action} →</a>}
      <Button variant="weak" onClick={close}>다른 이야기 읽기</Button></footer>
  </section>;

  return <section className="story-library"><header><h1 tabIndex={-1} ref={heading}>달빛 상담 웹툰 서가</h1></header>
    <ul className="story-index">{homeStories.map(item=><li key={item.id}><button onClick={()=>open(item.id)}>
      <img width={96} height={78} loading="lazy" src={coverDirectory+item.id+'.webp'} alt=""/>
      <span><strong>{item.title}</strong><small>{item.lead}</small></span>
    </button></li>)}</ul>
  </section>;
}
