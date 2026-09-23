import { connectDb, withMongoRetry } from '../lib/db.js';
import { YeongnyangiRequest } from './repository.js';

const hasRequestAccess=row=>Boolean(row?.paymentId||row?.accessMethod==='FAMILY'||row?.passEvidenceId);

const terminal = row => !row || ['COMPLETED','REFUNDED'].includes(row.state) || ['PAYMENT_NOT_ACTIVE','GENERATION_REVIEW_REQUIRED'].includes(row.errorCode) ||
  (row.errorCode==='AUTOMATIC_RECOVERY_STOPPED' && !(row.snapshot?.manifest?.length && row.chapters.length===row.snapshot.manifest.length));

// Payment confirmation only publishes an identifier. The consumer re-reads the
// owner, original input and payment proof; no browser context is trusted here.
export async function enqueuePaidConsultation(env, order) {
  if (!env.YEONGNYANGI_QUEUE || !/^yn-[a-f0-9]{64}$/.test(order?.requestId || '') ||
      !['paid','success','fulfilled'].includes(order?.status) || order.purchaseType === 'GIFT') return;
  try { await env.YEONGNYANGI_QUEUE.send({requestId:order.requestId.slice(3)}); }
  catch { console.warn('[yeongnyangi-queue]', JSON.stringify({outcome:'enqueue_failed'})); }
  // The durable paid order is the outbox if publishing fails. Cron repairs it.
}

export async function enqueueConsultation(env, row) {
  if (!env.YEONGNYANGI_QUEUE || terminal(row) || !hasRequestAccess(row)) return false;
  const now = new Date();
  const claimed = await withMongoRetry(env, () => YeongnyangiRequest.findOneAndUpdate({
    _id:row._id, state:{$in:['PAID','GENERATING','FORTUNE_FAILED']},
    $or:[{queuedUntil:null},{queuedUntil:{$lte:now}},{queuedChapter:{$ne:row.chapters.length}}],
  }, {$set:{queuedChapter:row.chapters.length,queuedUntil:new Date(now.getTime()+180000)}}, {new:true}).lean());
  if (!claimed) {
    const pending=await withMongoRetry(env,()=>YeongnyangiRequest.findOne({
      _id:row._id,queuedChapter:row.chapters.length,queuedUntil:{$gt:now},
    }).select('_id').lean());
    return Boolean(pending);
  }
  try {
    const delaySeconds = Math.max(0, Math.ceil((new Date(row.nextAttemptAt || 0).getTime()-now.getTime())/1000));
    await env.YEONGNYANGI_QUEUE.send({requestId:String(row._id)}, {delaySeconds});
    return true;
  } catch {
    // Release only this dispatch marker; a newer chapter's dispatch wins.
    await withMongoRetry(env, () => YeongnyangiRequest.updateOne({_id:row._id,queuedChapter:row.chapters.length,queuedUntil:claimed.queuedUntil},{$set:{queuedUntil:null}}));
    console.warn('[yeongnyangi-queue]', JSON.stringify({outcome:'enqueue_failed'}));
    return false;
  }
}

export async function consumeConsultationQueue(batch, env, dependencies = {}) {
  const service = dependencies.service || await import('./service');
  const read = dependencies.read || (async id => {
    await connectDb(env);
    return withMongoRetry(env, () => YeongnyangiRequest.findById(id).lean());
  });
  const enqueue = dependencies.enqueue || enqueueConsultation;
  for (const message of batch.messages) {
    const id = message.body?.requestId;
    if (!/^[a-f0-9]{64}$/.test(id || '')) { message.ack(); continue; }
    try {
      let row = await read(id);
      if (terminal(row)) { message.ack(); continue; }
      if (!hasRequestAccess(row)) row = await service.activateFortune(env,String(row.userId),id);
      if (terminal(row)) { message.ack(); continue; }
      const due = Math.max(new Date(row.nextAttemptAt || 0).getTime(), new Date(row.leaseUntil || 0).getTime());
      if (due > Date.now()) { message.retry({delaySeconds:Math.max(1,Math.ceil((due-Date.now())/1000))}); continue; }
      row = await service.generateNextChapter(env,String(row.userId),id);
      if (!terminal(row)) {
        // Requeue after *every* saved chapter. No single invocation owns a book.
        if (!await enqueue(env,row)) { message.retry({delaySeconds:30}); continue; }
      }
      message.ack();
    } catch (error) {
      let row;
      try { row = await read(id); }
      catch { message.retry({delaySeconds:30}); continue; }
      console.warn('[yeongnyangi-queue]',JSON.stringify({requestId:id,chapter:row?.chapters?.length || 0,outcome:String(error?.code || 'GENERATION_FAILED')}));
      if (terminal(row) || ['PAYMENT_REQUIRED','PAYMENT_NOT_ACTIVE','FORTUNE_NOT_FOUND'].includes(error?.code || error?.payload?.code)) message.ack();
      else message.retry({delaySeconds:Math.max(30,Math.ceil((new Date(row?.nextAttemptAt || 0).getTime()-Date.now())/1000))});
    }
  }
}
