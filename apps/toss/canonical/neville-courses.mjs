import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';

const moduleId='virtual:toss-neville-courses';
const shell=new URL('../../../neville-meditation.html',import.meta.url);
export default function nevilleCourses(){
  return {
    name:'toss-neville-courses',
    resolveId(id){if(id===moduleId)return '\0'+id;},
    load(id){
      if(id!=='\0'+moduleId)return;
      if(!isFreeFortuneFeatureKey('neville-meditation'))throw new Error('Neville courses require a registered entitlement');
      const source=readFileSync(shell,'utf8');
      const course=/^const COURSES = \{[\s\S]*?^\};/m.exec(source)?.[0];
      const presets=/^const THETA_PRESETS = \{[\s\S]*?^\};/m.exec(source)?.[0];
      const audio=/^const R2_MEDITATION_BASE = 'https:\/\/music\.code-destiny\.com\/Meditation\/';/m.exec(source)?.[0];
      if(!course||!presets||!audio)throw new Error('Missing canonical meditation guidance');
      this.addWatchFile(fileURLToPath(shell));
      return [course,presets,audio,'export {COURSES, THETA_PRESETS, R2_MEDITATION_BASE};'].join('\n');
    }
  };
}
