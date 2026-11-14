import examples from './sukuyo-yearly-examples.json' with {type:'json'};
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';
// Original Swiss/yearly builder output for the visible, synthetic private-test profile.
// No fallback to a live API or to a different person's/profile's calculation.
export function privateSukuyoYearly(person,profiles,input){
 if(!isFreeFortuneFeatureKey('sukyo_yearly_fortune_unlock'))return Response.json({error:'TOSS_PRODUCT_NOT_APPROVED'},{status:503});
 const profile=profiles.find(p=>p.profileId===input?.profileId);
 if(!profile)return Response.json({error:'INVALID_PROFILE'},{status:403});
 const example=examples[person+'-'+input?.year];
 const birth=profile.birth||{};
 if(profile.profileId!=='mock-profile'||profile.name!=='테스트 프로필'||profile.gender!=='F'||birth.year!==1990||birth.month!==1||birth.day!==1||birth.calType!=='solar'||birth.hour!==undefined||birth.minute!==undefined||!example)return Response.json({error:'PRIVATE_YEARLY_EXAMPLE_ONLY'},{status:422});
 return Response.json({ok:true,stored:false,accessSource:'public',profileId:profile.profileId,year:Number(input.year),result:example});
}
