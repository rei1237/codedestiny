import fs from 'node:fs';
import path from 'node:path';
import ganache from 'ganache';
import solc from 'solc';
import { BrowserProvider, ContractFactory, Contract, randomBytes, hexlify } from 'ethers';

export async function openChain(dir, db) {
  const source = fs.readFileSync(new URL('Edition.sol', import.meta.url), 'utf8');
  const input = { language:'Solidity', sources:{ 'Edition.sol':{content:source} }, settings:{
    evmVersion:'shanghai', outputSelection:{'*':{'*':['abi','evm.bytecode.object']}} }};
  const compiled = JSON.parse(solc.compile(JSON.stringify(input)));
  if (compiled.errors?.some(e => e.severity === 'error')) throw Error('계약 컴파일 실패');
  const {abi,evm} = compiled.contracts['Edition.sol'].Edition;
  const get = k => db.prepare('select value from settings where key=?').get(k)?.value;
  const put = (k,v) => db.prepare('insert into settings values(?,?)').run(k,v);
  if (!get('seed')) put('seed',hexlify(randomBytes(32)));
  const rpc = ganache.provider({database:{dbPath:path.join(dir,'chain')}, logging:{quiet:true},
    chain:{chainId:31337,hardfork:'shanghai'}, wallet:{seed:get('seed'),totalAccounts:2}});
  const provider = new BrowserProvider(rpc,undefined,{cacheTimeout:-1,pollingInterval:30});
  const signer = await provider.getSigner(0);
  let contract;
  if (get('contract')) {
    contract = new Contract(get('contract'),abi,signer);
    if (await contract.issuer() !== await signer.getAddress()) throw Error('발행자 불일치');
  } else {
    contract = await new ContractFactory(abi,evm.bytecode.object,signer).deploy();
    await contract.waitForDeployment(); put('contract',await contract.getAddress());
  }
  return {contract, provider, rpc, close:async()=>{provider.destroy(); await rpc.disconnect();}};
}
