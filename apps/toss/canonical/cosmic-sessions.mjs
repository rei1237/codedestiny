import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';

const id='virtual:toss-cosmic-sessions';
const path=fileURLToPath(new URL('../../../cosmic-soul-meditation.html',import.meta.url));
export default function cosmicSessions(){return {
  name:'toss-cosmic-sessions',
  resolveId(name){if(name===id)return '\0'+id;},
  load(name){
    if(name!=='\0'+id)return;
    if(!isFreeFortuneFeatureKey('cosmic-soul-meditation'))throw new Error('Cosmic meditation is no longer free');
    this.addWatchFile(path);
    const shell=readFileSync(path,'utf8');
    function source(rx){const match=rx.exec(shell);if(!match)throw new Error('Missing cosmic meditation source '+rx);return match[0];}
    const data=['INTENT_PHASE_LINES','PHASES_30','PHASES_60','ACTION_CODES','ACTION_DESCS','JOURNAL_PROMPTS','R2_TRACK_GROUPS'];
    const values=data.map(key=>source(new RegExp('^var '+key+'=[\\s\\S]*?^[}\\]];','m')));
    const scheduling=['_scheduleLines','_composePhaseLines','_buildSchedule'].map(key=>source(new RegExp('^function '+key+'\\([\\s\\S]*?^}','m')));
    return [...values,`export {ACTION_CODES,ACTION_DESCS,JOURNAL_PROMPTS,R2_TRACK_GROUPS};
      export function getCourse(minutes,intent){
        const _intent=intent,_phases=minutes===60?PHASES_60:PHASES_30;
        let _schedule=[];
        ${scheduling.join('\n')}
        _buildSchedule();
        return {phases:_phases,messages:_schedule};
      }`].join('\n');
  }
};}
