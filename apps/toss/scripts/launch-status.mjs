// Read-only inventory report. This command cannot enable sales, upload or deploy.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {APPROVED_TOSS_PRODUCTS,APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS,APPROVED_TOSS_NATIVE_PRODUCTS} from '../../../worker/toss/catalog.js';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const inventory=JSON.parse(fs.readFileSync(path.join(root,'docs/toss/full-service-inventory.json'),'utf8'));
const knownStatuses=new Set(['local-partial','verified-full-flow','not-ported','requires-full-flow-port-and-verification','excluded']);
if(inventory.canonicalCandidates.some(item=>!knownStatuses.has(item.status)))throw new Error('Unknown inventory candidate status');
const local=inventory.canonicalCandidates.filter(item=>item.status==='local-partial');
const complete=inventory.canonicalCandidates.filter(item=>item.status==='verified-full-flow');
const excluded=inventory.canonicalCandidates.filter(item=>item.status==='excluded');
if(excluded.some(item=>typeof item.exclusionReason!=='string'||!item.exclusionReason.trim()))throw new Error('Every exclusion needs a documented reason');
const remaining=inventory.canonicalCandidates.filter(item=>!['local-partial','verified-full-flow','excluded'].includes(item.status));
const approvedSkus=items=>new Set(items.filter(item=>item.approved===true&&typeof item.sku==='string'&&item.sku.length>0&&item.sku.trim()===item.sku).map(item=>item.sku));
const approvedEntries=[...APPROVED_TOSS_PRODUCTS,...APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS,...APPROVED_TOSS_NATIVE_PRODUCTS].filter(item=>item.approved===true);
const skuCounts=new Map();for(const item of approvedEntries)if(typeof item.sku==='string'&&item.sku.length>0&&item.sku.trim()===item.sku)skuCounts.set(item.sku,(skuCounts.get(item.sku)||0)+1);
const report={
 scope:'전체 서비스 이식. 후보 수는 완성된 서비스 수가 아닙니다.',
 inventorySourceCommit:inventory.sourceCommit,
 canonicalCandidates:inventory.canonicalCandidates.length,
 completed:complete.map(item=>item.id),
 partiallyImplemented:local.map(item=>item.id),
 excluded:excluded.map(item=>({id:item.id,reason:item.exclusionReason})),
 remainingPorts:remaining.map(item=>item.id),
 approvedConsultationSkus:approvedSkus(APPROVED_TOSS_PRODUCTS).size,
 approvedTarotSkus:approvedSkus(APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS).size,
 approvedNativeSkus:approvedSkus(APPROVED_TOSS_NATIVE_PRODUCTS).size,
 approvedUniqueSkus:skuCounts.size,
 approvedEntriesMissingValidSku:approvedEntries.filter(item=>typeof item.sku!=='string'||!item.sku.length||item.sku.trim()!==item.sku).length,
 duplicateApprovedSkus:[...skuCounts].filter(([,count])=>count>1).map(([sku,count])=>({sku,count})),
 releaseConfiguration:fs.readFileSync(path.join(root,'apps/toss/src/release.ts'),'utf8').match(/SERVICE_AVAILABLE\s*=\s*(true|false)/)?.[1]||'unknown',
 nextSteps:'docs/toss/2026-10-28-launch-plan.md',
 limitation:'로컬 코드 목록입니다. 콘솔 승인, 실기기, CI, 업로드 및 출시 상태를 증명하지 않습니다.',
};
console.log(JSON.stringify(report,null,2));
