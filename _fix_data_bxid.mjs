import { readFileSync, writeFileSync } from 'fs';
const f = String.raw`c:\Users\Neo\Desktop\Code Destiny Main\public\js\saju-engine.js`;
let c = readFileSync(f, 'utf8');
// Check the button line
const lines = c.split('\n');
const idx = lines.findIndex(l => l.includes('data-bxid=') && l.includes('sbxToggle'));
if (idx >= 0) {
  console.log('Line', idx+1, ':', lines[idx].trim().slice(0, 150));
  // Fix: data-bxid="" should be data-bxid="'+id+'"
  if (lines[idx].includes('data-bxid=""')) {
    lines[idx] = lines[idx].replace('data-bxid=""', "data-bxid=\"'+id+'\"");
    writeFileSync(f, lines.join('\n'), 'utf8');
    console.log('Fixed!');
    console.log('After:', lines[idx].trim().slice(0, 150));
  } else {
    console.log('Already OK or different pattern');
  }
} else {
  console.log('Line not found');
}
