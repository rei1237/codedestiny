import { nativeLoveSecretContract } from '../../worker/routes/love-secret-ai.js';

const input={idempotencyKey:'native-love-original-request',myInfo:{name:'검수',gender:'female',birthDate:'1990-05-15',birthTime:'08:30',calendarType:'solar'},relationshipStatus:'single',focusArea:'overall',userQuestion:'관계에서 반복하는 습관을 알고 싶어요'};
test('Toss Love Secret uses the original normalized inputs and price registry',()=>{
 const contract=nativeLoveSecretContract(input);
 expect(contract.featureKey).toBe('love-secret-ai-consultation');
 expect(contract.pricing.amountKRW).toBeGreaterThan(0);
 expect(contract.requestId).toBe(input.idempotencyKey);
 expect(nativeLoveSecretContract({...input,paymentId:'untrusted',accessToken:'untrusted'}).inputHash).toBe(contract.inputHash);
 expect(nativeLoveSecretContract({...input,userQuestion:'새로운 질문'}).inputHash).not.toBe(contract.inputHash);
 expect(()=>nativeLoveSecretContract({...input,myInfo:{...input.myInfo,birthDate:'invalid'}})).toThrow();
 expect(()=>nativeLoveSecretContract({...input,idempotencyKey:'short'})).toThrow();
});
