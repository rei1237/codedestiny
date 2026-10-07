// A shop context carries navigation only; the server still owns prices and access.
export type ConsultationContext={context:'yeongnyangi';featureKey:string;requestId:string;lang:string};
const feature=/^yeongnyangi-(saju|ziwei|sukuyo|vedic|astrology|tarot)-(mackerel|salmon|flounder|tuna)$/;
export function readConsultationContext(query:URLSearchParams):ConsultationContext|null{
 if(query.get('context')!=='yeongnyangi'||!feature.test(query.get('featureKey')||''))return null;
 const id=query.get('requestId')||'',lang=query.get('lang')||'ko';
 return {context:'yeongnyangi',featureKey:query.get('featureKey')!,requestId:/^[a-f0-9]{64}$/.test(id)?id:'',lang:/^(ko|en|ja|zh-CN|zh-TW|es|fr|de|vi|hi|nl|ms)$/.test(lang)?lang:'ko'};
}
export function consultationShopPath(value:ConsultationContext){
 return '/points/?'+new URLSearchParams(value)+'#fish-packs';
}
export function consultationResumePath(value:ConsultationContext|null){
 if(!value?.requestId)return '/yeongnyangi/fortune/';
 return '/checkout/?'+new URLSearchParams({featureKey:value.featureKey,requestId:value.requestId,lang:value.lang});
}
