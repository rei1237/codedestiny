import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const root=path.resolve(import.meta.dirname,'../../..');
const bundle=await build({stdin:{contents:`export {buildChemiReport} from './app/saju/destiny-bias/engine/chemiReportBridge'; export {runChemi,listRosterGroups,listGroupMembers,resolvePartner} from './lib/idol-chemi/index.js'; export {default as BiasReport} from './apps/toss/src/BiasReport';`,resolveDir:root},bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',alias:{'@':root},external:['react','react/jsx-runtime']});
const loaded=new Module(path.join(root,'apps/toss/bias-report-check.cjs'));loaded.paths=Module._nodeModulePaths(path.join(root,'apps/toss'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
const api=loaded.exports,React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const partner=api.resolvePartner({kind:'roster',id:api.listGroupMembers(api.listRosterGroups()[0].id)[0].id});

for(const [birthDate,calendarType] of [['1995-05-15','solar'],['1995-05-15','lunar'],['1995-08-10','lunar_leap']]){
 test(`Toss full report preserves canonical chart and score: ${calendarType}`,()=>{
  const user={birthDate,calendarType},referenceDate='2026-10-08';
  const report=api.buildChemiReport({user,partner,referenceDate});
  const canonical=api.runChemi({user,partner:{kind:partner.kind,id:partner.id},referenceDate});
  assert.deepEqual(report.result.pillars,canonical.result.pillars);
  assert.equal(report.totalScore,canonical.result.score.total);
  assert.equal(report.vm.userBirthDate,'');assert.equal(report.vm.biasBirthDate,'');
  assert.equal(report.vm.cardSvg,'');
  assert.equal(report.vm.detailedTabs.length,5);
  const html=renderToStaticMarkup(React.createElement(api.BiasReport,{report}));
  for(const tab of report.vm.detailedTabs)assert.ok(html.includes(tab.title));
  assert.ok(html.includes(renderToStaticMarkup(React.createElement('p',null,report.vm.fandomProfile.finalPhilosophy))));
  assert.ok(!html.includes(birthDate));assert.ok(!html.includes('NaN'));
 });
}
test('minor report uses existing minor rules and consent-age rejection',()=>{
 const report=api.buildChemiReport({user:{birthDate:'2010-05-15',calendarType:'solar'},partner,referenceDate:'2026-10-08'});
 assert.equal(report.minorMode,true);
 assert.throws(()=>api.buildChemiReport({user:{birthDate:'2015-05-15',calendarType:'solar'},partner,referenceDate:'2026-10-08'}),/UNDER_CONSENT_AGE/);
});
