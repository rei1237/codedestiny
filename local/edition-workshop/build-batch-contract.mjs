import fs from 'node:fs/promises';
import solc from 'solc';
const content=(await fs.readFile(new URL('BatchRegistry.sol',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
const input={language:'Solidity',sources:{'BatchRegistry.sol':{content}},settings:{
  optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['evm.bytecode.object','evm.deployedBytecode.object']}}}};
const built=JSON.parse(solc.compile(JSON.stringify(input)));
if(built.errors?.some(error=>error.severity==='error'))throw Error('묶음 계약 컴파일 실패');
const {evm}=built.contracts['BatchRegistry.sol'].BatchRegistry;
const artifact='export default '+JSON.stringify({deploy:'0x'+evm.bytecode.object,runtime:'0x'+evm.deployedBytecode.object})+'\n';
const url=new URL('../../lib/editions/batch-contract.mjs',import.meta.url);
if(process.argv.includes('--check')){
  if(await fs.readFile(url,'utf8')!==artifact)throw Error('묶음 계약과 배포 코드 불일치');
}else await fs.writeFile(url,artifact);
