// The original FPTI engine runs against a synthetic profile. Never send these fixtures to a service.
import {analyzeFptiFromBirth} from '../../../../lib/fpti/fpti-adapter.ts';
import {buildFptiDeepReport} from '../../../../lib/fpti/premium-report.ts';
export async function fixtureFptiReport(profile){
 const result=await analyzeFptiFromBirth({name:profile.name||'',gender:'F',birthDate:profile.birthDate,birthTime:profile.timeUnknown?'':profile.birthTime,calendarType:profile.calendarType,timeUnknown:profile.timeUnknown,birthRegion:''});
 const report=buildFptiDeepReport({result},{unlocked:true});
 return {reportType:'FPTI_DEEP_REPORT',summary:report.summary.preview,chapters:report.chapters};
}
