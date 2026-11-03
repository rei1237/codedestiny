export * from '../../../app/_lib/auth-client.ts';
import {authFetch as sharedAuthFetch} from '../../../app/_lib/auth-client.ts';
// Toss has no web refresh cookie. Preserve a real 401 instead of attempting the web refresh endpoint.
export function authFetch(input,init={},options={}){
 return sharedAuthFetch(input,init,{...options,retryOn401:false});
}
