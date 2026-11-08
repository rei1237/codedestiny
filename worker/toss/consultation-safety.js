import {TossError} from './policy.js';
import {consultationInputCode} from '../../lib/fortune/toss-consultation-safety.mjs';
export {consultationSafetyMessages,consultationSafetyCode} from '../../lib/fortune/toss-consultation-safety.mjs';

export function checkedConsultationInput(body){
  const code=consultationInputCode(body);
  if(code)throw new TossError(code,422);
  return body;
}
