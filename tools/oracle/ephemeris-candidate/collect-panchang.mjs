// Record numerical observations only. Site markup, month labels and IST times are validated.
import fs from 'node:fs';
import assert from 'node:assert/strict';
if (!process.argv.includes('--refresh')) throw Error('Pass --refresh to query IMD.');
const base='https://packolkata.imd.gov.in/panchang/en/';
const months=['chaitra','vaishaka','jyaishtha','ashadha','sravana','bhadra','asvina','kartika','agrahayana','pausha','magha','phalguna'];
const names='Asvini|Bharani|Krittika|Rohini|Mrigasiras|Ardra|Punarvasu|Pushya|Aslesha|Magha|Purva Phalguni|Uttara Phalguni|Hasta|Chitra|Svati|Visakha|Anuradha|Jyestha|Mula|Purvashadha|Uttarashadha|Sravana|Dhanistha|Satabhisaj|Purva Bhadrapada|Uttara Bhadrapada|Revati'.split('|');
const fixture={ source:base+'explanation', schema:'imd-panchang-1948-v1', months:[] };
for (const month of months) {
  const url=base+month, response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  assert.ok(response.ok);
  const html=await response.text();
  const ay=html.match(/<strong>Ayanamsa[^<]*<\/strong>\s*(\d+)°\s*(\d+)[′']\s*(\d+)[″"]/i);
  assert.ok(ay,'ayanamsa '+month);
  const data={url, firstDayAyanamsaDeg: Number(ay[1])+Number(ay[2])/60+Number(ay[3])/3600, events:[], allDay:[], dates:[]};
  for (const modal of html.split(/id="dayModal\d+"/).slice(1)) {
    const date=Number(modal.match(/<strong>Julian Day:<\/strong>\s*([\d.]+)/)?.[1]);
    assert.ok(date>=2461121.5 && date<2461500.5, 'publication date '+date);
    data.dates.push(date);
    const entry=modal.match(/<strong>Nakshatra:<\/strong>\s*([^<]+)/)?.[1]?.trim();
    assert.ok(entry,'daily entry '+date);
    if (entry.includes('ahoratra')) {data.allDay.push(date); continue;}
    for (const piece of entry.split(/\s+then\s+/i)) {
      const m=piece.trim().match(/^(.+?)\s+h\.\s*(\d+)-(\d+)$/);
      assert.ok(m,'unknown format: '+piece);
      const i=names.indexOf(m[1].trim());
      assert.ok(i>=0 && +m[2]<32 && +m[3]<60, piece);
      data.events.push([date, i+1, +m[2], +m[3]]);
    }
  }
  assert.ok(data.dates.length>=29 && data.dates.length<=32);
  fixture.months.push(data);
  console.log(month,data.dates.length,data.events.length);
}
fs.writeFileSync(new URL('./panchang-1948.json',import.meta.url), JSON.stringify(fixture)+'\n');
