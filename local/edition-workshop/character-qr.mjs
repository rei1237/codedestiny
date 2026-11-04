import sharp from 'sharp';
import QRCode from 'qrcode';
import {fileURLToPath} from 'node:url';

const designs = {
  yeoni:{art:'mascot/yeoni-reading-guide-v1.webp', paper:'#fff0ef', ink:'#472537', accent:'#c57184', name:'YEONI'},
  cat:{art:'yeongnyangi/original/hero-800.webp', paper:'#edeefa', ink:'#282445', accent:'#7471ab', name:'YEONGNYANGI'},
};

export async function characterQR(url, character, serial) {
  const design = designs[character];
  const art = fileURLToPath(new URL('../../public/assets/'+design.art,import.meta.url));
  const portrait = await sharp(art).resize(106,106,{fit:'contain',background:'#ffffff00'}).png().toBuffer();
  const matrix = QRCode.create(url,{errorCorrectionLevel:'Q'});
  // Render at a whole number of pixels per module, including the four-module quiet zone.
  const size = (matrix.modules.size+8)*Math.floor(384/(matrix.modules.size+8));
  const code = await QRCode.toBuffer(url,{width:size,margin:4,errorCorrectionLevel:'Q',color:{dark:design.ink,light:'#ffffff'}});
  const frame = Buffer.from(`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="30" fill="${design.paper}"/>
    <rect x="12" y="12" width="488" height="488" rx="24" fill="none" stroke="${design.accent}" stroke-width="3"/>
    <text x="148" y="63" font-family="sans-serif" font-weight="bold" font-size="28" fill="${design.ink}">${design.name}</text>
    <text x="150" y="90" font-family="sans-serif" font-size="18" fill="${design.ink}">EDITION No. ${String(serial).padStart(3,'0')}</text>
    <path d="M451 38q7 17 18 18-13 3-18 18-4-15-16-18 12-3 16-18" fill="${design.accent}"/>
    <rect x="48" y="108" width="416" height="382" rx="20" fill="white"/>
  </svg>`);
  return sharp(frame).composite([{input:portrait,left:36,top:9},{input:code,left:(512-size)>>1,top:108+((382-size)>>1)}]).png().toBuffer();
}
