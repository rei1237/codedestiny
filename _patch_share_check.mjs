import fs from 'fs';
const c = fs.readFileSync('js/share.js','utf8');
const fns = ['shareKakao','shareTarotKakao','shareAstroKakao','shareSukuyoKakao','shareZiweiKakao'];
fns.forEach(fn => {
  const wrapped = c.includes("shareWithReward(function()") && c.includes(fn + "(){");
  const idx = c.indexOf(fn + "(){");
  const snippet = idx >= 0 ? c.slice(idx, idx+60).replace(/\n/g,' ') : '';
  console.log(fn.padEnd(25), snippet);
});
