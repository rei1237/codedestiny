import { readFileSync } from 'fs';
const buf = readFileSync('c:/Users/Neo/Desktop/Code Destiny Main/js/services/animal-totem-content-engine.js');
// Find all instances of emoji field
let pos = 0;
let count = 0;
while (true) {
  const idx = buf.indexOf(Buffer.from('emoji: "'), pos);
  if (idx === -1) break;
  const slice = buf.slice(idx, idx + 20);
  console.log(`emoji at byte ${idx}:`, slice.toString('hex'), '->', JSON.stringify(slice.toString('utf8').substring(0, 15)));
  pos = idx + 1;
  count++;
  if (count > 20) break;
}
