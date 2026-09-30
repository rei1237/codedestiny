// Separate from legacy numerology-tarot: this is a versioned, optional birth symbol, never a drawn card.
export const BIRTH_SYMBOL_VERSION='gregorian-digits-rws-v1';
export function birthSymbol(date){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
 const [year,month,day]=date.split('-').map(Number);
 if(year<1||month<1||month>12||day<1||day>31)return null;
 const check=new Date(Date.UTC(year,month-1,day));check.setUTCFullYear(year);
 if(check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||check.getUTCDate()!==day)return null;
 let value=date.replaceAll('-','').split('').reduce((sum,digit)=>sum+Number(digit),0);
 while(value>22)value=String(value).split('').reduce((sum,digit)=>sum+Number(digit),0);
 if(value<1)return null;
 const number=value===22?0:value;
 const names=['바보','마법사','여사제','여황제','황제','교황','연인','전차','힘','은둔자','운명의 수레바퀴','정의','매달린 사람','죽음','절제','악마','탑','별','달','태양','심판','세계'];
 return {version:BIRTH_SYMBOL_VERSION,number,name:names[number],cardCode:`M${String(number).padStart(2,'0')}`};
}
