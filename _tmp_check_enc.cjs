const fs = require('fs');
const c = fs.readFileSync('public/index.html', 'utf8');
// replacement char U+FFFD 찾기
const REPL = '\uFFFD';
let pos = 0;
let count = 0;
while (true) {
  const idx = c.indexOf(REPL, pos);
  if (idx === -1) break;
  const ctx = c.slice(Math.max(0, idx-50), idx+50).replace(/\n/g,' ');
  console.log(`[idx=${idx}] ...${ctx}...`);
  pos = idx + 1;
  count++;
  if (count > 20) { console.log('...more'); break; }
}
console.log('Total replacement chars:', count);
