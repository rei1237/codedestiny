import {writeFile} from 'node:fs/promises';
import {readSpring} from '../../lib/editions/spring-testnet.mjs';
import {characterQR} from './character-qr.mjs';
const [tx,output]=process.argv.slice(2);
if(!output) throw Error('사용법: node spring-qr.mjs <발행 거래 해시> <PNG 저장 경로>');
const proof=await readSpring(tx);
const url='https://code-destiny.com/editions/spring/?tx='+encodeURIComponent(tx);
await writeFile(output,await characterQR(url,proof.character,proof.serial),{flag:'wx'});
console.log(proof.title,proof.cap,proof.issued,proof.serial,url,proof.explorer);
