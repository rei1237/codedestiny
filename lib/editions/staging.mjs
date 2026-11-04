// The printed URL is not derived from request headers, window.location or a caller-supplied origin.
export const STAGING_ORIGIN = 'https://staging.code-destiny.com';
export const RECORDS = '/assets/edition-proofs/v1';
export const VALID_CODE = /^[a-f0-9]{24}$/;
export const issueUrl = code => {
  if (typeof code !== 'string' || !VALID_CODE.test(code)) throw Error('확인 코드 형식이 맞지 않아요.');
  return STAGING_ORIGIN + '/editions/verify/?code=' + code;
};
export function stagingRecordPath(code) {
  issueUrl(code);
  return RECORDS + '/' + code + '.json';
}
export async function readStagingRecord(code) {
  if (!VALID_CODE.test(code)) throw Error('등록된 발행 기록을 찾을 수 없어요.');
  const response=await fetch(stagingRecordPath(code),{credentials:'omit',cache:'no-store',redirect:'error'});
  if (response.status===404) throw Error('등록된 발행 기록을 찾을 수 없어요.');
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw Error('스테이징 발행 기록을 읽지 못했어요. 잠시 후 다시 확인해 주세요.');
  }
  const proof=await response.json();
  if (proof.environment!=='staging-rehearsal' || proof.code!==code || proof.chainId!==31337 ||
      !['verified','void'].includes(proof.status) || !/^0x[0-9a-f]{64}$/i.test(proof.tx) ||
      !Number.isSafeInteger(proof.serial) || proof.serial<1 || proof.serial>proof.cap) {
    throw Error('발행 기록과 확인 코드가 일치하지 않아요.');
  }
  return proof;
}
