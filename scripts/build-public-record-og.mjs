// A factual timeline graphic derived from the same visible record data.
import sharp from 'sharp';
import { publicRecordCopy } from '../lib/seo/public-record-copy.mjs';
const copy = publicRecordCopy.ko;
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#191423"/><path d="M64 56H1136V574H64Z" fill="none" stroke="#b2a180"/>
<g font-family="Malgun Gothic, sans-serif" fill="#fff9ee">
<text x="96" y="118" font-size="25" fill="#d5bc91">꿀꿀운세 · CODE DESTINY</text>
<text x="96" y="196" font-size="49" font-weight="700">대통령 사주 공개 분석 기록</text>
<text x="96" y="249" font-size="26" fill="#e8d9bd">${escape(copy.link)}</text>
<path d="M112 338H1080" stroke="#d5bc91" stroke-width="2"/>
${copy.rows.map((r,i)=>`<circle cx="${132+i*345}" cy="338" r="7" fill="#d5bc91"/><text x="${102+i*345}" y="387" font-size="29">${r.date}</text><text x="${102+i*345}" y="427" font-size="23" fill="#d5bc91">공개일 표시</text>`).join('')}
<text x="96" y="502" font-size="25">2025년 실제 사건과 시점·방식을 따로 비교</text>
<text x="96" y="545" font-size="20" fill="#c7bdd2">과거 해석 사례 · 방식의 불일치와 확인 한계도 공개</text>
</g></svg>`;
await sharp(Buffer.from(svg)).png().toFile('public/og/presidential-public-records.png');
console.log('public/og/presidential-public-records.png 1200x630');
