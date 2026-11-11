"use client";
import { useEffect, useRef } from 'react';
import { AUTH_SESSION_INVALIDATED_EVENT } from './auth-client';
/** Reject late local-reading work after account, profile, route or input changes. */
export function useFreeReadingGuard(inputKey: string) {
  const state = useRef({ revision: 0, busy: false, inputKey, mounted: true });
  if (state.current.inputKey !== inputKey) {
    state.current.inputKey = inputKey; state.current.revision++; state.current.busy = false;
  }
  useEffect(() => {
    state.current.mounted = true;
    const cancel = () => { state.current.revision++; state.current.busy = false; };
    const events = ['cd:auth-changed', AUTH_SESSION_INVALIDATED_EVENT, 'cd:profile-changed', 'destiny:profile-changed', 'cd:current-profile-changed', 'popstate'];
    events.forEach(name => window.addEventListener(name, cancel));
    document.addEventListener('destinyProfileChanged', cancel);
    const storage = (event: StorageEvent) => { if (!event.key || /auth|profile|cdToken/.test(event.key)) cancel(); };
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener('storage', storage); document.removeEventListener('destinyProfileChanged', cancel); cancel(); state.current.mounted = false; events.forEach(name => window.removeEventListener(name, cancel)); };
  }, []);
  return () => {
    if (state.current.busy || !state.current.mounted) return null;
    state.current.busy = true;
    const revision = state.current.revision;
    const valid = () => state.current.mounted && state.current.revision === revision;
    return { valid, finish: () => { if (valid()) state.current.busy = false; } };
  };
}
