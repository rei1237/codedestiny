import engine from '../../js/services/animal-totem-content-engine.js';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {animalTotemNarrativeAdapter,seedAnimalTotemNarrative,animalTotemModeSpec} from '../routes/animal-totem.js';
import {hash} from './crypto.js';
import {TossError} from './policy.js';
import {ownedNarrative} from './owned-narrative.js';

const invalid=()=>{throw new TossError('INVALID_INPUT',400);};
export function totemFor(featureKey){
  if(!['animal-totem-basic','animal-totem-deep'].includes(featureKey))invalid();
  const service=featureKey.slice('animal-'.length);
  function canonicalCards(input){
    const spec=Object.hasOwn(animalTotemModeSpec,input.mode)&&animalTotemModeSpec[input.mode];
    if(!spec||spec.featureKey!==featureKey||!Array.isArray(input.animalIds)||input.animalIds.length!==spec.size||new Set(input.animalIds).size!==spec.size)invalid();
    const cards=input.animalIds.map((id,i)=>{
      if(typeof id!=='string'||!engine.animals.some(animal=>animal.id===id))invalid();
      return {slot:spec.slots[i],card:engine.getAnimalById(id)};
    });
    return engine.buildReadingCards({cards});
  }
  async function contractFor(body){
    if(!body||Object.keys(body).some(k=>!['requestId','mode','question','animalIds','birth'].includes(k))||
      !/^totem-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(body.requestId)||
      typeof body.question!=='string'||body.question.length>300)invalid();
    canonicalCards(body);
    const input={requestId:body.requestId,mode:body.mode,question:body.question.trim(),animalIds:body.animalIds};
    if(body.birth){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(body.birth.birthDate)||!['male','female',''].includes(body.birth.gender))invalid();
      input.birth={birthDate:body.birth.birthDate,gender:body.birth.gender};
    }
    return {input,contract:{requestId:input.requestId,resultId:input.requestId,featureKey,inputHash:await hash(JSON.stringify(input)),pricing:getBillingFeaturePricing({featureKey}).pricing}};
  }
  return ownedNarrative({service,featureKey,reportType:'animal-totem',route:'/animal-totem/'+service+'/',contractFor,adapter:animalTotemNarrativeAdapter,
    seed:(input,env)=>seedAnimalTotemNarrative(env,{...input,cards:canonicalCards(input)}),question:i=>i.question||'애니멀 토템'});
}
