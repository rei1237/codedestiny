import example from './sukuyo-past-life-examples.json' with {type:'json'};
export function privateSukuyoPastLife(body){
 if(body?.profileId)return Response.json({error:'INVALID_PROFILE'},{status:403});
 if(!Object.hasOwn(example.purposes,body?.purpose)||Object.entries(example.input).some(([key,value])=>body?.[key]!==value))return Response.json({error:'SUKUYO_PAST_EXAMPLE_REQUIRED'},{status:422});
 return Response.json({...example.purposes[body.purpose],css:example.css});
}
