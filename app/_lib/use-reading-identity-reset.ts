"use client";
import { useEffect, useRef } from 'react';
import { AUTH_SESSION_INVALIDATED_EVENT } from './auth-client';
/** Remove completed private readings as well as invalidating pending work. */
export function useReadingIdentityReset(reset: () => void) {
  const latest = useRef(reset); latest.current = reset;
  useEffect(() => {
    const clear = () => latest.current();
    const events = ['cd:auth-changed', AUTH_SESSION_INVALIDATED_EVENT, 'cd:profile-changed', 'destiny:profile-changed', 'cd:current-profile-changed', 'popstate'];
    const storage = (event: StorageEvent) => { if (!event.key || /auth|profile|cdToken/.test(event.key)) clear(); };
    events.forEach(event => window.addEventListener(event, clear));
    window.addEventListener('storage', storage);
    document.addEventListener('destinyProfileChanged', clear);
    return () => { document.removeEventListener('destinyProfileChanged', clear); events.forEach(event => window.removeEventListener(event, clear)); window.removeEventListener('storage', storage); };
  }, []);
}
