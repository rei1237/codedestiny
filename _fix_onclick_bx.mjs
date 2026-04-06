import { readFileSync, writeFileSync } from 'fs';
const B = String.raw`c:\Users\Neo\Desktop\Code Destiny Main`;

for (const f of [B + String.raw`\js\saju-engine.js`, B + String.raw`\public\js\saju-engine.js`]) {
  let c = readFileSync(f, 'utf8');
  const lines = c.split('\n');
  let fixed = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('chr39')) {
      // Replace the broken onclick with clean data attribute approach
      lines[i] = lines[i].replace(
        /onclick="sbxToggle\(this\.getAttribute\(chr39\+chr39\+chr39\+chr39\),this\)"/,
        'onclick="sbxToggle(this.dataset.bxid,this)"'
      );
      console.log('[FIX] Line', i+1, ':', lines[i].trim().slice(0, 90));
      fixed = true;
    }
  }
  if (fixed) {
    writeFileSync(f, lines.join('\n'), 'utf8');
    console.log('Saved:', f);
  } else {
    console.log('No chr39 found in:', f);
    // Check the onclick line
    const idx = lines.findIndex(l => l.includes("sbxToggle('") || l.includes("data-bxid"));
    if (idx >= 0) console.log('sbxToggle at line', idx+1, ':', lines[idx].trim().slice(0,120));
  }
}
console.log('Done.');
