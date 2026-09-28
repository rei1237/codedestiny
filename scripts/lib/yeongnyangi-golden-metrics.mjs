// Same normalization and denominators as the Phase 0 read-only baseline.
const norm=text=>String(text).normalize('NFC').replace(/[^\p{L}\p{N}]/gu,'');
const grams=(text,n)=>{const clean=norm(text);return new Set(Array.from({length:Math.max(0,clean.length-n+1)},(_,i)=>clean.slice(i,i+n)));};
const shared=(a,b)=>{let n=0;for(const v of a)if(b.has(v))n++;return n;};
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
export function goldenMetrics(bodies){
 const texts=bodies.map(body=>(body.blocks||[]).flatMap(b=>b.paragraphs).join(' '));
 const sentences=texts.map(text=>text.split(/[.!?。]+\s*/u).map(s=>s.trim()).filter(s=>s.length>=20));
 const g5=texts.map(t=>grams(t,5)),g8=texts.map(t=>grams(t,8));
 const pairs=[];for(let i=0;i<g5.length;i++)for(let j=0;j<i;j++){const n=shared(g5[i],g5[j]);pairs.push(n/(g5[i].size+g5[j].size-n||1));}
 const seen8=new Map();for(const set of g8)for(const value of set)seen8.set(value,(seen8.get(value)||0)+1);
 const repeated8=new Set([...seen8].filter(([,n])=>n>=3).map(([v])=>v));
 const earlierFacts=new Set(),earlier5=new Set(),earlierSentences=[];
 const novelty=[];let repeatedSentences=0;
 for(let i=0;i<bodies.length;i++){
  const facts=new Set([...(bodies[i].sources||[]),...(bodies[i].blocks||[]).flatMap(b=>b.sources||[])]);
  novelty.push({chapter:i+1,newFacts:facts.size?[...facts].filter(f=>!earlierFacts.has(f)).length/facts.size:0,new5gram:g5[i].size?[...g5[i]].filter(g=>!earlier5.has(g)).length/g5[i].size:0});
  for(const sentence of sentences[i]){const set=grams(sentence,3);if(earlierSentences.some(prior=>2*shared(set,prior)/(set.size+prior.size||1)>=.5))repeatedSentences++;}
  for(const f of facts)earlierFacts.add(f);for(const g of g5[i])earlier5.add(g);earlierSentences.push(...sentences[i].map(s=>grams(s,3)));
 }
 const sentenceCount=sentences.flat().length;
 return {bodyChars:texts.reduce((n,t)=>n+t.length,0),pairJaccardMean:mean(pairs),pairJaccardMax:Math.max(0,...pairs),repeated8gramRatio:mean(g8.map(g=>shared(g,repeated8)/(g.size||1))),sentenceCount,repeatedSentences,repeatedSentenceRatio:repeatedSentences/(sentenceCount||1),uniqueFacts:earlierFacts.size,citationCount:bodies.reduce((n,b)=>n+(b.blocks||[]).reduce((x,v)=>x+(v.sources||[]).length,0),0),hedgesPerSentence:texts.join(' ').match(/수\s*(?:도\s*)?있(?:습니다|음을|어요|을\s*것)/g)?.length/(sentenceCount||1)||0,anchorChapterCounts:Object.fromEntries(['일간','오행','일주'].map(term=>[term,texts.filter(text=>text.includes(term)).length])),novelty};
}
