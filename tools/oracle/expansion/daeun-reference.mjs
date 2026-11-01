// Independent sect-1 specification expressed as absolute two-hour ticks, not service code.
// Astronomy comes only from the captured official sign brackets. No package or engine imports.
const pad=n=>String(n).padStart(2,'0');
export function civilAt(ms){const d=new Date(ms+32400000);return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),hour:d.getUTCHours(),minute:d.getUTCMinutes(),second:d.getUTCSeconds()};}
export function inputAt(ms,gender){const b=civilAt(ms);return {birthDate:`${b.year}-${pad(b.month)}-${pad(b.day)}`,birthTime:`${pad(b.hour)}:${pad(b.minute)}`,gender,calendarType:'solar'};}
export function reference(input,data){
 const [y,m,d]=input.birthDate.split('-').map(Number),[h,min]=input.birthTime.split(':').map(Number),instant=Date.UTC(y,m-1,d,h-9,min);
 if(data.terms.some(t=>instant>t.lowerUtcMs&&instant<t.upperUtcMs))throw new Error('REFERENCE_UNCERTAIN');
 const prev=data.terms.filter(t=>t.upperUtcMs<=instant).at(-1),next=data.terms.find(t=>t.lowerUtcMs>=instant);if(!prev||!next)throw new Error('REFERENCE_OUT_OF_RANGE');
 const cycleYear=prev.index>=2?prev.year:prev.year-1,yearStem=((cycleYear-4)%10+10)%10;
 const forward=(yearStem%2===0)===(input.gender==='male'),term=forward?next:prev;
 const tick=p=>Date.UTC(p.year,p.month-1,p.day)/86400000*12+(p.hour===23?11:Math.floor((p.hour+1)/2)%12);
 const birth={year:y,month:m,day:d,hour:h,minute:min};
 const ticks=forward?tick(civilAt(term.utcMs))-tick(birth):tick(birth)-tick(civilAt(term.utcMs));
 if(ticks<0)throw new Error('NEGATIVE_SECT1_INTERVAL');const lifeDays=ticks*10;
 const years=Math.floor(lifeDays/360),months=Math.floor(lifeDays%360/30),days=lifeDays%30;
 const monthLength=(year,month)=>new Date(Date.UTC(year,month,0)).getUTCDate();
 const afterYear=y+years,dayAfterYear=Math.min(d,monthLength(afterYear,m)),totalMonths=afterYear*12+(m-1)+months,afterMonthYear=Math.floor(totalMonths/12),afterMonth=totalMonths%12+1;
 const startDate=new Date(Date.UTC(afterMonthYear,afterMonth-1,Math.min(dayAfterYear,monthLength(afterMonthYear,afterMonth)))+days*86400000);
 const startSolar={year:startDate.getUTCFullYear(),month:startDate.getUTCMonth()+1,day:startDate.getUTCDate()};
 const mb=(prev.index/2+1)%12,ms=([2,4,6,8,0][yearStem%5]+(mb-2+12)%12)%10;
 return {direction:forward?'forward':'reverse',start:{years,months,days},startSolar,age:startSolar.year-y+1,baseTermUtcMs:term.utcMs,yearStem,month:{stemIndex:ms,branchIndex:mb},firstCycle:{stemIndex:(ms+(forward?1:9))%10,branchIndex:(mb+(forward?1:11))%12}};
}
