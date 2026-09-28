/** @jest-environment node */
import { recoverClippedLlmResponse } from '../../worker/lib/llm-local-recovery.js';
const body='지금의 선택에서는 상대의 반응을 먼저 확인하고 대화의 간격을 조절하는 편이 좋습니다. 작은 약속을 정해 실천한 뒤 다음 선택을 검토해 보세요.';
test('complete prose survives a truncated transport response while an unfinished tail is removed',()=>{
 const raw=body+' 아직 끝나지 않은';
 const result=recoverClippedLlmResponse({ok:true,text:raw,truncated:true});
 expect(result.text).toBe(body);expect(result.rawText).toBe(raw);expect(result.recoveredLocally).toBe(true);
});
test('partial JSON is restored locally without inventing missing prose',()=>{
 const raw=JSON.stringify({sections:{answer:{body}}}).slice(0,-2);
 const result=recoverClippedLlmResponse({ok:true,text:raw,finishReason:'MAX_TOKENS'});
 expect(JSON.parse(result.text)).toEqual({sections:{answer:{body}}});expect(result.rawText).toBe(raw);
});
test.each(['','미완성','{"evidenceId":"reference-only"}'])('no usable narrative keeps its original failure signal: %s',text=>{
 const result={ok:true,text,truncated:true};expect(recoverClippedLlmResponse(result)).toBe(result);
});
