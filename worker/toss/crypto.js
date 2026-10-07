import {TossError, TOSS_APP_NAME} from './policy.js';
const encoder = new TextEncoder();
const base64 = bytes => btoa(String.fromCharCode(...bytes));
const bytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
export const sessionToken = () => base64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
export async function hash(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
}
async function key(env) {
  try {
    const raw = bytes(env.TOSS_DATA_KEY || '');
    if (raw.length !== 32) throw new Error();
    return await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt','decrypt']);
  } catch { throw new TossError('TOSS_DATA_KEY_NOT_CONFIGURED', 503); }
}
export async function seal(env, value, context) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(`${TOSS_APP_NAME}:${context}`)}, await key(env), encoder.encode(JSON.stringify(value)));
  return {v:1,iv:base64(iv),data:base64(new Uint8Array(data))};
}
export async function unseal(env, value, context) {
  if (value?.v !== 1) throw new TossError('TOSS_DATA_INVALID', 503);
  try {
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(value.iv),additionalData:encoder.encode(`${TOSS_APP_NAME}:${context}`)}, await key(env), bytes(value.data))));
  } catch { throw new TossError('TOSS_DATA_INVALID', 503); }
}
export async function identityId(env, userKey) {
  if (typeof env.TOSS_IDENTITY_KEY !== 'string' || env.TOSS_IDENTITY_KEY.length < 32) throw new TossError('TOSS_IDENTITY_KEY_NOT_CONFIGURED', 503);
  const k = await crypto.subtle.importKey('raw',encoder.encode(env.TOSS_IDENTITY_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',k,encoder.encode(`${TOSS_APP_NAME}:${userKey}`))), b => b.toString(16).padStart(2,'0')).join('');
}
export async function callbackAuthorized(actual, expected) {
  if (!expected || !expected.startsWith('Basic ') || !actual) return false;
  const a = await hash(actual), b = await hash(expected);
  let difference = 0;
  for (let i=0;i<a.length;i++) difference |= a.charCodeAt(i)^b.charCodeAt(i);
  return difference === 0;
}
