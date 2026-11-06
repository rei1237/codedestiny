import type {ComponentType} from 'react';
// Ephemeral checkout evidence: the price the user saw immediately before starting.
export type TossTeaPriceSelection={featureKey:string;sku:string;displayAmount:string;owner:string};
export type TossTeaPriceComponent=ComponentType<{featureKey:string;onPrice:(value:TossTeaPriceSelection|null)=>void}>;
let selected:TossTeaPriceSelection|null=null;
export function rememberTossTeaPrice(value:TossTeaPriceSelection|null){selected=value;}
export function consumeTossTeaPrice(expected:TossTeaPriceSelection){
 const previous=selected;selected=null;
 return Boolean(previous&&previous.owner===expected.owner&&previous.featureKey===expected.featureKey&&previous.sku===expected.sku&&previous.displayAmount===expected.displayAmount);
}
