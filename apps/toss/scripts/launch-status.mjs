// Read-only inventory report. This command cannot enable sales, upload or deploy.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {APPROVED_TOSS_PRODUCTS,APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS} from '../../../worker/toss/catalog.js';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const inventory=JSON.parse(fs.readFileSync(path.join(root,'docs/toss/full-service-inventory.json'),'utf8'));
const local=inventory.canonicalCandidates.filter(item=>item.status==='local-partial');
const remaining=inventory.canonicalCandidates.filter(item=>item.status!=='local-partial'&&item.status!=='verified-full-flow');
const report={
 scope:'전체 서비스 이식. 후보 수는 완성된 서비스 수가 아닙니다.',
 inventorySourceCommit:inventory.sourceCommit,
 canonicalCandidates:inventory.canonicalCandidates.length,
 partiallyImplemented:local.map(item=>item.id),
 remainingPorts:remaining.map(item=>item.id),
 approvedConsultationSkus:APPROVED_TOSS_PRODUCTS.length,
 approvedTarotSkus:APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS.length,
 releaseConfiguration:fs.readFileSync(path.join(root,'apps/toss/src/release.ts'),'utf8').match(/SERVICE_AVAILABLE\s*=\s*(true|false)/)?.[1]||'unknown',
 nextSteps:'docs/toss/2026-10-28-launch-plan.md',
 limitation:'로컬 코드 목록입니다. 콘솔 승인, 실기기, CI, 업로드 및 출시 상태를 증명하지 않습니다.',
};
console.log(JSON.stringify(report,null,2));
