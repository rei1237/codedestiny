const bodies=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu'];
const wrap=value=>((value%360)+360)%360;
// Adapt strict server-calculated Swiss samples to the exact synchronous calls
// made by the authored web reader. No approximate ephemeris is accepted.
export function vedicSourceBridge(samples){
 if(!Array.isArray(samples)||samples.length!==3||samples.some(sample=>!Number.isFinite(sample?.jd)||sample?.fallbackUsed!==false||sample?.engineQuality!=='swiss'||!Number.isFinite(sample.ayanamsa)||!Number.isFinite(sample.ascendantSidereal)||bodies.some(body=>!Number.isFinite(sample.planets?.[body]))))throw Error('VEDIC_SOURCE_INVALID');
 const find=jd=>{const sample=samples.find(item=>Math.abs(item.jd-jd)<1e-7);if(!sample)throw Error('VEDIC_SOURCE_DATE_MISSING');return sample;};
 const bridge={SEFLG_SWIEPH:2,SEFLG_SPEED:256,SE_TRUE_NODE:7,
  swe_get_ayanamsa_ut:jd=>find(jd).ayanamsa,
  swe_calc_ut:(jd,index)=>{const sample=find(jd),body=bodies[index];if(!body)throw Error('VEDIC_SOURCE_BODY_INVALID');return [wrap(sample.planets[body]+sample.ayanamsa)];},
  swe_houses_ex:jd=>{const sample=find(jd);return {ascmc:[wrap(sample.ascendantSidereal+sample.ayanamsa)]};},
 };
 bodies.forEach((body,index)=>{bridge['SE_'+body.toUpperCase()]=index;});
 return bridge;
}
export function buildOriginalVedicReading(createReader,payload){
 const reader=createReader(vedicSourceBridge(payload.samples));
 const chart=reader.buildChart(payload.input,undefined,payload.natal||null);
 if(reader.usedFallback())throw Error('VEDIC_SOURCE_FALLBACK_REJECTED');
 const report=reader.analyze(chart),insights=reader.generateInsights(chart,report);
 const sections=reader.buildVedicSections(chart,report,insights),deep=reader.buildVedicDeepDetails(chart,report);
 reader.setReading(chart,report,insights,sections,deep);
 const details={personality:reader.renderPersonality(report.personality,chart,insights),wealth:reader.renderWealth(report.wealth,insights),career:reader.renderCareer(report.career,insights),romance:reader.renderRomance(report.romance,chart,insights),chakra:reader.renderChakra(report.chakra,insights),yoga:reader.renderYoga(report.yoga),remedies:reader.renderRemedies(report.remedies,chart,insights),vimshottari:reader.renderVimshottari(chart,insights)};
 return {chart,report,insights,sections,deep,details:Object.fromEntries(Object.entries(details).map(([key,value])=>[key,reader.decorateBhavaTerms(value)])),glossary:Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,reader.renderBhavaMeaningPanel(i+1)])),dasha:{maha:reader.planetName(chart.maha.p),anta:reader.planetName(chart.anta.p)},sectionCards:Object.fromEntries(Object.entries(sections).map(([key,value])=>[key,reader.renderVedicSectionCards(value)])),south:reader.renderSouthChart(chart.rasi),north:reader.renderNorthChart(chart.rasi)};
}
