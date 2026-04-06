import { readFileSync, writeFileSync } from 'fs';

const BASE = 'https://code-destiny.com';
const periods = ['today','tomorrow','weekly','monthly'];
const animals = ['rat','ox','tiger','rabbit','dragon','snake','horse','goat','monkey','rooster','dog','pig'];
const zodiacs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const vedic   = ['mesha','vrishabha','mithuna','karka','simha','kanya','tula','vrishchika','dhanu','makara','kumbha','meena'];
const ziwei   = ['mingong','hyeongje','bubu','janyeo','jeonaek','noebok','chunyi','jilaek','jaeback','gwanllok','bokdeok','bumo'];
const sukuyo  = Array.from({length:27},(_,i)=>String(i+1));
const today = '2026-04-05';

let entries = '';
for(const p of periods){
  const cf = (p==='today'||p==='tomorrow')?'daily':'weekly';
  for(const id of [...animals,...zodiacs]){
    entries += `  <url>\n    <loc>${BASE}/fortune/${p}/${id}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${cf}</changefreq>\n    <priority>0.75</priority>\n  </url>\n`;
  }
  for(const id of vedic){
    entries += `  <url>\n    <loc>${BASE}/fortune/${p}/vedic/${id}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${cf}</changefreq>\n    <priority>0.72</priority>\n  </url>\n`;
  }
  for(const id of ziwei){
    entries += `  <url>\n    <loc>${BASE}/fortune/${p}/ziwei/${id}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${cf}</changefreq>\n    <priority>0.72</priority>\n  </url>\n`;
  }
  for(const id of sukuyo){
    entries += `  <url>\n    <loc>${BASE}/fortune/${p}/sukuyo/${id}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${cf}</changefreq>\n    <priority>0.70</priority>\n  </url>\n`;
  }
}

writeFileSync('_tmp_fortune_entries.txt', entries, 'utf8');
console.log('Generated lines:', entries.split('\n').filter(l=>l.includes('<loc>')).length);
