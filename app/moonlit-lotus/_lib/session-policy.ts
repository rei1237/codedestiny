import type { Session } from '../model-review/bow-session';
export type StoredSession={scope:string;revision:number;owner:string;leaseUntil:number;updatedAt:number;session:Session;day:string};
export const LEASE_MS=12000;
export function canClaim(row:StoredSession|undefined,owner:string,now:number){return !row||!row.owner||row.owner===owner||row.leaseUntil<=now;}
export function canWrite(row:StoredSession|undefined,owner:string,revision:number,now:number){return Boolean(row&&row.owner===owner&&row.revision===revision&&row.leaseUntil>now);}
export function resumeSaved(row:StoredSession):Session {
 return {...row.session,elapsed:0,status:row.session.status==='running'?'paused':row.session.status};
}
export type Character='yeoni'|'cat'|'custom';
export function defaultCharacter(manual:Character|null,_gender:string):Character|null{ return manual||'yeoni'; }
