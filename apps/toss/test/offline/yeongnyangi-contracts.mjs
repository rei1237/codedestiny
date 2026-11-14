import {getYeongnyangiSpread,tierAllowsSpread} from '../../../../lib/tarot/yeongnyangi-spread-catalog.mjs';
import {selectDeckSlots} from '../../../../lib/tarot/committed-deck.mjs';
import {TAROT_CARDS} from '../../../../lib/tarot/tarot-cards.mjs';
export const systems={saju:'사주',astrology:'서양 점성술',vedic:'베다점',ziwei:'자미두수',sukuyo:'숙요점',tarot:'타로'};
export const fishNames={mackerel:'고등어',salmon:'연어',flounder:'광어',tuna:'참치',assorted:'생선 모둠 세트',omakase:'생선 오마카세'};
const tiers=['mackerel','salmon','flounder','tuna'];
const fusions={fusion_saju_ziwei:['saju','ziwei'],fusion_sukuyo_vedic:['sukuyo','vedic'],fusion_astrology_tarot:['astrology','tarot'],fusion_all:['saju','ziwei','sukuyo','vedic','astrology','tarot']};
function fixture(id,domains,fishId){
 const sku=id.endsWith('_mackerel')?domains[0]:id.replaceAll('_','-');
 return {id,sku:'mock-unregistered-'+sku,name:'테스트 '+domains.map(d=>systems[d]).join(' + ')+' · '+fishNames[fishId],featureKey:'yeongnyangi-'+id.replaceAll('_','-'),approvedPriceKRW:1,available:true,chapters:1};
}
export const unsoldFixtureProducts=[
 ...Object.keys(systems).filter(d=>d!=='saju').flatMap(d=>tiers.map(f=>fixture(d+'_'+f,[d],f))),
 ...Object.entries(fusions).map(([id,domains])=>fixture(id,domains,domains.length===2?'assorted':'omakase')),
];
export function productView(p){
 const parts=p.id.split('_'),domains=fusions[p.id]||[parts[0]];
 const fishId=domains.length===2?'assorted':domains.length>2?'omakase':parts[1];
 return {id:p.id,name:p.name,priceKRW:p.approvedPriceKRW,currency:'KRW',cdFeatureKey:p.featureKey,domain:domains[0],
   image:`/assets/yeongnyangi/fish/${fishId}.webp`,reactionAsset:`/assets/yeongnyangi/fish/reaction-${fishId}.webp`,
   systems:domains,fishId,fishName:fishNames[fishId],readingKind:domains.length===1?'single':domains.length===2?'pair':'all',chapterCount:1,available:true};
}
export function prepareSpread(fortune,input){
 if(!input.productId.startsWith('tarot_')||input.consultationKind!=='spread')return;
 const spread=getYeongnyangiSpread(input.tarotSpreadId);
 if(!spread||!tierAllowsSpread(fortune.product.fishId,spread))throw Error('INVALID_TAROT_SPREAD');
 fortune.state='AWAITING_DRAW';
 fortune.tarotSpread={id:spread.id,title:spread.title,positions:spread.positions,cardCount:spread.cardCount,layout:spread.layout,links:spread.links,version:spread.version,purpose:spread.purpose,summary:spread.summary,deckSize:TAROT_CARDS.length,drawn:false};
}
export async function drawFixture(request,row,save){
 const spread=row?.fortune.tarotSpread;
 if(!spread||row.fortune.paid)return Response.json({error:'RESULT_NOT_FOUND'},{status:404});
 if(!spread.drawn){
   let selection;try{selection=selectDeckSlots(await request.json(),spread.cardCount);}catch{return Response.json({error:'INVALID_TAROT_PICKS'},{status:400});}
   row.fortune={...row.fortune,state:'CREATED',tarotSpread:{...spread,drawn:true,drawMethod:selection.method,picks:selection.picks}};save();
 }
 return Response.json({fortune:row.fortune});
}
