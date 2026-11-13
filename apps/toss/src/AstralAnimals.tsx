import {useState} from 'react';
import {animals,compatibility,readPair} from 'virtual:toss-astral-animals';
import {Button} from './Button';

const pairs=compatibility();
export default function AstralAnimals(){
  const [first,setFirst]=useState(''),[second,setSecond]=useState(''),[show,setShow]=useState(false);
  const types=Object.values(animals);
  const result=show&&first&&second?readPair(animals[first],animals[second]):null;
  return <section><h1>MBTI 동물 궁합</h1>
    <form className="form floral-form" onSubmit={event=>{event.preventDefault();setShow(true);}}>
      <label>본캐 MBTI<select required value={first} onChange={event=>{setFirst(event.target.value);setSecond('');setShow(false);}}>
        <option value="">동물 고르기</option>{types.map(row=><option key={row.code} value={row.code}>{row.animal} {row.code} · {row.title}</option>)}</select></label>
      {first&&<><details><summary>{animals[first].code} 동물 이야기</summary>{[animals[first].layer1,animals[first].layer2,animals[first].layer3].map(line=><p key={line}>{line}</p>)}</details>
        <label>부캐 MBTI<select required value={second} onChange={event=>{setSecond(event.target.value);setShow(false);}}>
          <option value="">함께 볼 동물 고르기</option>{types.filter(row=>row.code!==first).map(row=><option key={row.code} value={row.code}>{row.animal} {row.code} · {pairs[first].good.includes(row.code)?'GOOD':pairs[first].bad.includes(row.code)?'BAD':'SOSO'}</option>)}</select></label></>}
      <Button type="submit" display="block" disabled={!second}>궁합 보기</Button>
    </form>
    {result&&<article className="paper" aria-live="polite"><h2>{first} · {second}</h2><h3>{result.title}</h3>
      <dl>{result.statsItems.map(row=><div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
      <h3>GOOD 포인트</h3><p>{result.pros}</p><h3>주의 포인트</h3><p>{result.cons}</p><h3>관계 유지 팁</h3><p>{result.advice}</p></article>}
  </section>;
}
