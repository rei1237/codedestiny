import {flowerBirthInput} from './flower.js';

// Reuse the existing birth adapter and canonical screen engine; no paid generation or persistence.
export async function calculateTossManse(body,engine){
  const input=engine.validateInput(flowerBirthInput(body?.birth));
  const context=await engine.calculate(input);
  const facts=Object.fromEntries(context.facts.map(fact=>[fact.label,fact.value]));
  return {
    stored:false,engineVersion:context.engineVersion,limitations:context.limitations,
    pillars:['year','month','day','hour'].map(key=>({key,ganji:facts.pillars?.[key]??null,
      tenGod:facts.tenGodsByPillar?.[key]?.stemTenGod??null})),
    elements:facts.fiveElements?.counts??{},
    elementBasis:facts.fiveElements?.countBasis??null,
    // The engine owns exact boundary dates and age conventions. Do not reconstruct them in the UI.
    cycles:(facts.majorLuck?.cycles??[]).filter(cycle=>typeof cycle.label==='string').map(cycle=>({label:cycle.label})),
  };
}
