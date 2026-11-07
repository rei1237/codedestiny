import {computePetBlueprint,petSajuCatalog,stripPaidSections} from '../routes/pet-saju.js';
import {kstDateString} from '../lib/pet/pet-input.js';
import {TossError} from './policy.js';

// The original deterministic chart is free; AI reports and compatibility are
// separate paid features and are never returned by this endpoint.
const fields=new Set(['name','species','breed','birthDate','birthTime','birthTimeUnknown','gender','neutered','activityLevel','environment','companion','traits']);
export function tossPetCatalog(){return {catalog:petSajuCatalog()};}
export function calculateTossPet(body,{calculate=computePetBlueprint,today=kstDateString()}={}){
  const pet=body?.pet;
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>key!=='pet')
    ||!pet||typeof pet!=='object'||Array.isArray(pet)||Object.keys(pet).some(key=>!fields.has(key))
    ||typeof pet.species!=='string'||typeof pet.birthDate!=='string'
    ||['name','breed','birthTime','gender','activityLevel','environment','companion'].some(key=>pet[key]!==undefined&&typeof pet[key]!=='string')
    ||['birthTimeUnknown','neutered'].some(key=>pet[key]!==undefined&&typeof pet[key]!=='boolean')
    ||pet.traits!==undefined&&(!Array.isArray(pet.traits)||pet.traits.some(value=>typeof value!=='string')))throw new TossError('PET_INPUT_INVALID',400);
  let blueprint;
  try{({blueprint}=calculate(pet,today));}
  catch(error){
    if(error?.status===401||error?.status===403)throw new TossError(typeof error.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(error.code)?error.code:error.status===401?'LOGIN_REQUIRED':'ACCESS_DENIED',error.status);
    if(error?.status===400)throw new TossError('PET_INPUT_INVALID',400);
    throw new TossError('PET_CHART_UNAVAILABLE',503);
  }
  if(!blueprint||!Array.isArray(blueprint.elements)||!Array.isArray(blueprint.metrics)||!Array.isArray(blueprint.daily)||!blueprint.natal||!blueprint.summary)throw new TossError('PET_CHART_UNAVAILABLE',503);
  return {stored:false,blueprint:stripPaidSections(blueprint)};
}
