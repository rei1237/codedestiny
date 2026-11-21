import {useTossConsultationCopy} from '../../../app/_lib/toss-consultation-copy';

// Defined by the serviceCompat Vite plugin; the preview-fixtures build runs without it.
declare const __TOSS_BUILD_ID__:string|undefined;
const buildId=typeof __TOSS_BUILD_ID__==='string'?__TOSS_BUILD_ID__:'';

export default function BuildStamp(){
 const {copy}=useTossConsultationCopy();
 if(!buildId)return null;
 return <p className="muted" style={{fontSize:12,textAlign:'center',margin:'16px 0 0'}}>{copy.buildLabel} {buildId}</p>;
}
