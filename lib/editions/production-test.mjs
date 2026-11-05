import {VALID_CODE} from './staging.mjs';
export const TEST_ORIGIN='https://code-destiny.com';
export const TEST_RECORDS='/api/edition-workshop/test';
export const TEST_PREFIX='edition-workshop/test-v1/';
export const TEST_ENVIRONMENT='production-test-rehearsal';
export function testIssueUrl(code) {
  if(typeof code!=='string'||!VALID_CODE.test(code)) throw Error('확인 코드 형식이 맞지 않아요.');
  return TEST_ORIGIN+'/editions/verify/?code='+code;
}
export async function readTestRecord(code) {
  testIssueUrl(code);
  const response=await fetch(TEST_RECORDS+'/'+code+'.json',{credentials:'omit',cache:'no-store',redirect:'error'});
  if(!response.ok) throw Error('등록된 테스트 발행 기록을 찾을 수 없어요.');
  const proof=await response.json();
  if(proof.environment!==TEST_ENVIRONMENT||proof.code!==code||proof.chainId!==31337||
    !['verified','void'].includes(proof.status)||!/^0x[0-9a-f]{64}$/i.test(proof.tx)||
    !Number.isSafeInteger(proof.serial)||proof.serial<1||proof.serial>proof.cap) throw Error('발행 기록이 일치하지 않아요.');
  return proof;
}

