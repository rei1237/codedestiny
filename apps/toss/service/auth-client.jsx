export * from '../../../app/_lib/auth-client.ts';
import {authFetch as sharedAuthFetch} from '../../../app/_lib/auth-client.ts';
import {getTossLoginAttempt,getTossSessionRevision} from '../src/platform';
// Toss has no web refresh cookie. Preserve a real 401 instead of attempting the web refresh endpoint.
export async function authFetch(input,init={},options={}){
 const authStore=options.clientSource==='app:auth-store',revision=authStore?getTossSessionRevision():0,attempt=authStore?getTossLoginAttempt():0;
 const response=await sharedAuthFetch(input,init,{...options,retryOn401:false});
 if(authStore&&(response.status===401||response.status===403)){
  const currentRevision=getTossSessionRevision();
  if(getTossLoginAttempt()!==attempt||(response.status===403&&currentRevision!==revision)||(response.status===401&&currentRevision!==revision&&currentRevision!==revision+1))throw Object.assign(new Error('SESSION_CHANGED'),{code:'SESSION_CHANGED',status:409});
  if((response.status===403||getTossSessionRevision()===revision)&&typeof window!=='undefined')window.dispatchEvent(new window.Event('code-destiny:toss-auth-denied'));
  const code=response.status===403?'ACCESS_DENIED':'LOGIN_REQUIRED';throw Object.assign(new Error(code),{code,status:response.status});
 }
 return response;
}
