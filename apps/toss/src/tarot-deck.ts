/** One shuffled deck per reading. Slots stay stable while cards are selected. */
export function shuffleTarotDeck<T>(cards:readonly T[],randomIndex=(size:number)=>{
  const limit=0x100000000-(0x100000000%size);
  const sample=new Uint32Array(1);
  do{crypto.getRandomValues(sample);}while(sample[0]>=limit);
  return sample[0]%size;
}):Array<T&{orientation:'upright'|'reversed'}>{
  const shuffled=cards.map(card=>({...card,orientation:(randomIndex(2)===0?'upright':'reversed') as 'upright'|'reversed'}));
  for(let end=shuffled.length-1;end>0;end--){
    const other=randomIndex(end+1);
    [shuffled[end],shuffled[other]]=[shuffled[other],shuffled[end]];
  }
  return shuffled;
}
