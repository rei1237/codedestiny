/** @jest-environment node */
import { buildSibylAnnual, sibylPreview, validateSibylYear, kstYear } from '../../worker/lib/sibyl-annual.js';
import { profileCardSolarBirth } from '../../worker/lib/paid-content-read-access.js';
import { nodeTerms } from '../../lib/korean-calendar/index.js';
const birth={date:'1990-05-17',time:'09:30',timeKnown:true,gender:'M'};
describe('Sibyl annual calculation',()=>{
  test('birth immediately before and after Ipchun changes the actual pillars',()=>{
    const term=nodeTerms(2000).find(t=>t.index===2);
    const at=Date.UTC(term.year,term.month-1,term.day,term.hour,term.minute);
    const read=offset=>{const stamp=new Date(at+offset).toISOString();return buildSibylAnnual({...birth,date:stamp.slice(0,10),time:stamp.slice(11,16)},2026);};
    const before=read(-60000),after=read(60000);
    expect(before.pillars.slice(0,2)).not.toEqual(after.pillars.slice(0,2));
  });
  test('stable same input, distinct year, twelve exact node-term periods',()=>{
    const a=buildSibylAnnual(birth,2026);expect(a).toEqual(buildSibylAnnual(birth,2026));
    expect(a.annual.pillar).not.toBe(buildSibylAnnual(birth,2027).annual.pillar);
    expect(a.months).toHaveLength(12);expect(a.months[0].start).toMatch(/^2026-02/);
    expect(a.months[11].end).toMatch(/^2027-02/);
    a.months.slice(0,11).forEach((m,i)=>expect(m.end).toBe(a.months[i+1].start));
    expect(a.domains.map(d=>d.id)).toEqual(['money','love','relationships','work']);
    for(const d of a.domains){expect(d.reasons.length).toBeGreaterThan(0);expect(d.periods.length).toBeGreaterThan(0);expect(d.action).toBeTruthy();expect(d.change).toBeTruthy();}
  });
  test('unknown time never supplies an invented hour or major luck',()=>{
    const a=buildSibylAnnual({...birth,time:'',timeKnown:false},2026);
    expect(a.major).toBeNull();expect(a.uncertainty.join('')).toMatch(/출생시간|시주/);
    expect(a.pillars).toHaveLength(3);
  });
  test('KST year and allowed future range',()=>{
    const now=new Date('2026-12-31T15:01:00Z');expect(kstYear(now)).toBe(2027);
    expect(validateSibylYear(2036,now)).toBe(2036);
    for(const value of [2026,2037,2027.5,'bad']) expect(()=>validateSibylYear(value,now)).toThrow('SIBYL_INVALID_YEAR');
  });
  test('free projection contains no premium chapters or full monthly analysis',()=>{
    const preview=sibylPreview(buildSibylAnnual(birth,2026));
    expect(preview.action).toBeTruthy();expect(preview.months).toBeUndefined();expect(preview.domains).toBeUndefined();
  });
  test('lunar input uses canonical profile conversion including leap month',()=>{
    const card={gender:'F',birth:{year:2023,month:2,day:1,calType:'lunar_leap',hour:10,minute:0}};
    const converted=profileCardSolarBirth(card);expect(converted.date).toBe('2023-03-22');
    expect(buildSibylAnnual(converted,2026).pillars).toHaveLength(4);
  });
});
