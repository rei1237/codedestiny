import { NEO_EMAIL_SALE_ENABLED } from '../../lib/neo-consultation/contract.js';
import { createPaymentContext, withPaymentDb } from '../payments/db.js';
import { NeoEmailConsultation } from './repository.js';
import { createNeoRuntime } from './runtime.js';

export async function runNeoConsultationTasks(env) {
  if (!NEO_EMAIL_SALE_ENABLED) return;
  const rows = await withPaymentDb(env,createPaymentContext({route:'neo-outbox'}),db => db.find(NeoEmailConsultation,{
    'data.contentDeletedAt':{$exists:false},
  },{limit:100,sort:{'data.maintenanceAt':1}}));
  const {service} = createNeoRuntime(env);
  for (const document of rows) {
    try {
      await service.maintenance(document._id);
      await service.purgeExpiredContent(document._id);
      const row = await service.adminGet({id:'neo-outbox'},document._id);
      for (const job of row.mailJobs.filter(j => ['pending','retry'].includes(j.state) && j.attempt<5)) {
        if (job.lastAttemptAt && Date.now()-Date.parse(job.lastAttemptAt)<600000) continue;
        await service.deliver(row.id,job.key);
      }
    } catch { /* 상태 경쟁·환불·취소 주문은 다음 검사 또는 관리자 확인으로 남긴다. 본문을 로그에 남기지 않는다. */ }
  }
}
