const { execSync } = require('child_process');
const buf = execSync('git cat-file blob HEAD:js/services/animal-totem-content-engine.js', {
  cwd: 'c:/Users/Neo/Desktop/Code Destiny Main'
});
let pos = 0;
let count = 0;
while (count < 5) {
  const idx = buf.indexOf(Buffer.from('emoji: "'), pos);
  if (idx < 0) break;
  console.log(`emoji at byte ${idx} hex: ${buf.slice(idx, idx + 15).toString('hex')}`);
  pos = idx + 1;
  count++;
}
console.log('total emoji fields found:', count);
