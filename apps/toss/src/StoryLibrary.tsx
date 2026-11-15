import {useEffect, useRef, useState} from 'react';
import CutReader, {type WebtoonCut} from '../../../app/components/webtoon/CutReader';
import {homeStories} from '../../../app/consultations/home-stories';
import consultationWebtoons, {coverDirectory} from 'virtual:consultation-webtoons';
import {quickGuideStories, guideGroups} from 'virtual:service-guide';
import {Button} from './Button';
import './story-library.css';

type Story = {title:string; cuts:WebtoonCut[]; ending:{action:string;href:string}};
const stories: Record<string, Story> = consultationWebtoons;
// The web guide's original destinations map to the existing miniapp screens.
const quickDestinations: Record<string, string> = {'/saju/free/':'/manse','/fortune/today/':'/today','/tarot/':'/tarot-library','/sukuyo/':'/sukuyo','/yeongnyangi/':'/yeongnyangi/'};
const storyKey = () => new URLSearchParams(location.search).get('story') || '';

export default function StoryLibrary() {
  const [selected, setSelected] = useState(storyKey);
  const [group, setGroup] = useState(() => guideGroups.find(item => item.ids.includes(storyKey()))?.id || 'quick');
  const heading = useRef<HTMLHeadingElement>(null);
  const entry = homeStories.find(item => item.id === selected);
  const quick = quickGuideStories.find(item => 'guide-'+item.id === selected);
  const story: Story | undefined = quick ? {title:quick.title,cuts:quick.cuts as WebtoonCut[],ending:{action:quick.action,href:quickDestinations[quick.href]}} : entry && stories[entry.id];

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

  if (story) return <section className="story-library">
    <header><button onClick={close}>‹ 웹툰 서가</button><h1 tabIndex={-1} ref={heading}>{story.title}</h1>
      <p>{quick?.lead || entry?.lead}</p><small>{quick?'이용 안내':'도입 이야기'} · {story.cuts.length}컷</small></header>
    <p className="story-note">서비스를 설명하는 창작 이야기예요. 등장인물의 대사는 개인 분석 결과나 실제 이용 후기가 아닙니다.</p>
    <CutReader tone={quick?'lantern':entry?.id==='heukwol'?'night':'yehwa'} cuts={story.cuts}/>
    <footer><a href={entry?.id==='heukwol'?'/heukwol/?consult=1':story.ending.href}>{story.ending.action} <span aria-hidden="true">→</span></a>
      <p>필요한 정보는 다음 화면에서 준비해요. 이용권·월정석·단건 결제의 적용 여부와 조건은 각 상담 화면에서 확인해 주세요.</p>
      <Button variant="weak" onClick={close}>다른 이야기 읽기</Button></footer>
  </section>;

  return <section className="story-library"><header><h1 tabIndex={-1} ref={heading}>달빛 상담 웹툰 서가</h1>
    <p>오늘, 어느 문을 열까요?<br/>짧은 이야기를 읽고 나에게 맞는 운세로 이어가요.</p></header>
    <p className="story-note">서비스를 설명하는 창작 이야기예요. 등장인물의 대사는 개인 분석 결과나 실제 이용 후기가 아닙니다.</p>
    <details className="story-group" open={group==='quick'} onToggle={event=>{if(event.currentTarget.open)setGroup('quick');}}><summary>가볍게 시작하는 다섯 이야기<small>사주·오늘의 운세·타로·관계·영냥이</small></summary>
      <ul className="story-index story-quick">{quickGuideStories.map(item=><li key={item.id}><button onClick={()=>open('guide-'+item.id)}>
        <span><small>{item.name} · {item.cuts.length}컷</small><strong>{item.title}</strong><small>{item.lead}</small></span><i aria-hidden="true"/>
      </button></li>)}</ul>
    </details>
    {guideGroups.map(item=><details key={item.id} className="story-group" open={group===item.id} onToggle={event=>{if(event.currentTarget.open)setGroup(item.id);}}><summary>{item.title}<small>{item.ids.length}편의 상담 이야기</small></summary>
      <p className="story-group-intro">{item.intro}</p><ul className="story-index">{item.ids.map(id=>homeStories.find(story=>story.id===id)!).map(story=><li key={story.id}><button onClick={()=>open(story.id)}>
        <img width={96} height={78} loading="lazy" src={coverDirectory+story.id+'.webp'} alt=""/>
        <span><strong>{story.title}</strong><small>{story.lead}</small></span>
      </button></li>)}</ul>
    </details>)}
    <button className="story-afterword" onClick={()=>open('heukwol')}><strong>흑월의 경고</strong><span>불안을 대비로 바꾸는 이야기 <span aria-hidden="true">→</span></span></button>
  </section>;
}
