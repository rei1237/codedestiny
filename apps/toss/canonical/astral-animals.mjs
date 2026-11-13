import {parse} from 'acorn';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Export the authored profiles, palette and pair reader from the static web app.
// Keep the modal, payment entry and page-global event listeners in the web shell.
const source=fileURLToPath(new URL('../../../js/astral-soul.js',import.meta.url));
export function astralAnimalModule(){
  const code=readFileSync(source,'utf8');
  const names=new Set(['ASTRAL_SOUL_TEXT_TRANSLATIONS','_astralSoulText','ASTRAL_DATA','getPairScore','getSynergyText','buildMbtiCompatibilityMap']);
  const declarations=[];
  for(const node of parse(code,{ecmaVersion:'latest'}).body){
    const name=node.id?.name||node.declarations?.[0]?.id?.name;
    if(names.delete(name))declarations.push(code.slice(node.start,node.end));
  }
  if(names.size)throw new Error('Missing web animal compatibility source: '+[...names].join(', '));
  return declarations.join('\n')+'\nexport {ASTRAL_DATA as animals,getSynergyText as readPair,buildMbtiCompatibilityMap as compatibility};';
}
export default function astralAnimals(){
  const id='virtual:toss-astral-animals';
  return {name:'toss-astral-animals',resolveId(key){if(key===id)return '\0'+id;},load(key){if(key==='\0'+id){this.addWatchFile(source);return astralAnimalModule();}}};
}
