// Display rules only: the server still decides whether a chosen method can fund the request.
export type CheckoutMethod='pass'|'stones'|'direct'|`pack:${string}`;

// Packs carry an expiry and the pot does not, so the pack goes first.
export function defaultCheckoutMethod({firstPackId,passUsable}:{firstPackId?:string;passUsable:boolean}):CheckoutMethod{
 if(firstPackId)return `pack:${firstPackId}`;
 return passUsable?'pass':'direct';
}

// 'family' is what this page saved in the browser before every tier could pay here.
export function readSavedCheckoutMethod(saved:unknown):CheckoutMethod|null{
 if(saved==='family'||saved==='pass')return 'pass';
 if(saved==='stones'||saved==='direct')return saved;
 return typeof saved==='string'&&/^pack:.+/.test(saved)?saved as CheckoutMethod:null;
}

// A snapshot holds null until the server reports usage, and Number(null) would read as an empty pot.
export function passRemainingCoin(snapshot:{state?:string;monthlySpendRemainingCoin?:number|null}|null|undefined):number|null{
 const remaining=snapshot?.state==='active'?snapshot.monthlySpendRemainingCoin:null;
 return typeof remaining==='number'&&Number.isFinite(remaining)?remaining:null;
}

export function passMethodNote({pass,coinCost,remainingWon,upgradeName}:{pass:{canUse:boolean;label:string|null;limit:number|null};coinCost:number;remainingWon:string;upgradeName:string}){
 if(pass.canUse)return remainingWon?`사용 가능 · 남은 한도 ${remainingWon}`:'사용 가능 · 추가 결제 없음';
 const overCap=Number(pass.limit)>0&&coinCost>Number(pass.limit);
 if(overCap&&upgradeName&&upgradeName!==pass.label)return `이 상담은 ${upgradeName}부터 쓸 수 있어요`;
 return '이번 상담에 적용할 수 없어요. 이용 한도와 등급을 확인해 주세요.';
}
