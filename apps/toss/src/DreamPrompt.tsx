import {useEffect, useRef, useState} from 'react';
import {Clipboard} from '@apps-in-toss/web-framework';
import {buildDreamTarotConsultPrompt, chooseFallbackDreamCards, normalizeDreamText, normalizeDreamPromptCards} from '../../../lib/tarot/dream-prompt.mjs';
import {Button} from './Button';
import {isToss} from './platform';
import './dream-prompt.css';

type Reading = {selection: ReturnType<typeof chooseFallbackDreamCards>; prompt: string};

export default function DreamPrompt() {
  const [dream, setDream] = useState('');
  const [count, setCount] = useState(3);
  const [reading, setReading] = useState<Reading | null>(null);
  const [notice, setNotice] = useState('');
  const output = useRef<HTMLTextAreaElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!reading) return;
    title.current?.focus();
    const back = (event: Event) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      setReading(null);
      setNotice('');
    };
    window.addEventListener('code-destiny:toss-back', back);
    return () => window.removeEventListener('code-destiny:toss-back', back);
  }, [reading]);

  function draw() {
    const input = normalizeDreamText({dreamText: dream});
    if (!input.text) { setNotice(input.message || '꿈의 장면을 입력해 주세요.'); return; }
    const selection = chooseFallbackDreamCards(input.text, count);
    const prompt = buildDreamTarotConsultPrompt({dreamText: input.text, dreamThemes: selection.dreamThemes, cards: normalizeDreamPromptCards(selection.cards)});
    setReading({selection, prompt});
    setNotice('');
  }

  async function copy() {
    if (!reading) return;
    try {
      if (isToss()) await Clipboard.setText(reading.prompt);
      else await navigator.clipboard.writeText(reading.prompt);
      setNotice('해몽 프롬프트를 복사했어요.');
    } catch {
      output.current?.select();
      setNotice('선택한 프롬프트를 길게 눌러 복사해 주세요.');
    }
  }
  return <section className="dream-prompt">
    <header><h1 ref={title} tabIndex={-1}>{reading ? '꿈이 남긴 카드' : '드림 타로'}</h1>
      <p>{reading ? reading.selection.dreamThemes.join(' · ') : '기억에 남은 꿈을 적어 주세요. 꿈의 상징을 담은 카드와 해몽에 쓸 질문을 함께 펼쳐요.'}</p></header>
    {reading ? <div className="dream-body">
      <p>{reading.selection.analysisNote}</p>
      <ol>{reading.selection.cards.map(card => <li key={card.code}>
        <img src={card.imageUrl} alt="" loading="lazy" onError={e=>{e.currentTarget.hidden=true;}}/>
        <div><h2>{card.nameKo} · {card.isReversed ? '역방향' : '정방향'}</h2><p>{card.dreamMeaning}</p></div>
      </li>)}</ol>
      <div><label htmlFor="dream-output">해몽 프롬프트</label><textarea id="dream-output" ref={output} readOnly value={reading.prompt} rows={8}/></div>
      <Button onClick={copy}>프롬프트 복사하기</Button>
      <Button variant="weak" onClick={()=>{setReading(null);setNotice('');}}>꿈의 장면 다시 적기</Button>
    </div> : <form className="dream-body" onSubmit={e=>{e.preventDefault(); draw();}}>
      <div><label htmlFor="dream-scene">꿈의 장면</label><textarea id="dream-scene" rows={5} value={dream} maxLength={6000} onChange={e=>setDream(e.target.value)} placeholder="꿈에서 만난 존재와 깨어났을 때의 기분을 들려주세요."/></div>
      <fieldset><legend>펼칠 카드 수</legend><div>{[1,2,3,4,5].map(n=><label key={n}><input type="radio" name="count" value={n} checked={count===n} onChange={()=>setCount(n)}/><span>{n}장</span></label>)}</div></fieldset>
      <button className="dream-submit" type="submit">꿈의 카드 펼치기</button>
    </form>}
    {notice && <p className="dream-notice" role="status">{notice}</p>}
  </section>;
}
