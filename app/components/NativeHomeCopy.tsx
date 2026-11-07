'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {createContext, useContext, useEffect, type ReactNode} from 'react';
import {IS_APP_BUILD} from '@/lib/app-build-target';
import {useLocale, useTPick} from '@/lib/i18n/useT';
import type {RuntimeLocale} from '@/lib/i18n/dictionary';
import {localizeNativeHomeHtml} from '@/lib/i18n/native-home-html.mjs';

// The public Korean home keeps its SEO copy. The packaged app uses the same
// markup and links, with text rendered by React in the selected app language.
const HomeLocale = createContext<RuntimeLocale>('ko');
// The public web home is Korean. Keep the native-only dictionary out of its
// initial bundle; the literal build target lets webpack discard the require.
const rows: Record<string, Record<string, string>> = process.env.NEXT_PUBLIC_RUNTIME_TARGET === 'mobile-app'
  ? require('@/lib/i18n/native-home-copy.json') : {};
function translate(source: string, locale: RuntimeLocale) {
  return locale === 'ko' ? source : rows[source]?.[locale] || source;
}

export function NativeHomeRoot({className, children}: {className: string; children: ReactNode}) {
  const selected = useLocale();
  const locale = IS_APP_BUILD ? selected : 'ko';
  return <HomeLocale.Provider value={locale}><div className={className} lang={locale} data-cd-no-trans>{children}</div></HomeLocale.Provider>;
}

export function NativeHomeText({children}: {children: string}) {
  return translate(children, useContext(HomeLocale));
}

export function NativeHomeNav({children, className, 'aria-label': label}: {children: ReactNode; className: string; 'aria-label': string}) {
  return <nav className={className} aria-label={translate(label, useContext(HomeLocale))}>{children}</nav>;
}

export function NativeHomeDictionaryText({translationKey, children}: {translationKey: string; children: string}) {
  const locale = useContext(HomeLocale);
  const pick = useTPick(undefined, 'ko');
  return locale === 'ko' ? children : pick(translationKey, children);
}

export function NativeHomeHtml({html, className}: {html: string; className?: string}) {
  const locale = useContext(HomeLocale);
  return <div className={className} dangerouslySetInnerHTML={{__html: localizeNativeHomeHtml(html, locale, rows)}} />;
}

export function NativeHomeCardLink({name, action, external, ...props}: {
  name: string; action: string; external?: boolean; href: string; className: string;
  'aria-describedby': string; 'data-cd-cross-sell': string;
  'data-cd-target-service': string; 'data-cd-cta-placement': string;
}) {
  const locale = useContext(HomeLocale);
  const label = translate(name, locale);
  const accessibleLabel = `${label} ${translate(action, locale)}`;
  const router = useRouter();
  // App: nothing loads at render; the route starts loading when a finger lands, not after it lifts.
  const onPointerDown = IS_APP_BUILD && !external ? () => router.prefetch(props.href) : undefined;
  // App: once the home is idle, warm the in-app route from the bundle too (local files, no server call),
  // so a tap does not wait for its chunks. The web home keeps prefetch off.
  const idleHref = IS_APP_BUILD && !external ? props.href : null;
  useEffect(() => {
    if (!idleHref) return;
    const run = () => router.prefetch(idleHref);
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, {timeout: 4000});
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(run, 2000);
    return () => window.clearTimeout(timer);
  }, [idleHref, router]);
  return external
    ? <a {...props} aria-label={accessibleLabel}>{label}</a>
    : <Link {...props} prefetch={false} onPointerDown={onPointerDown} aria-label={accessibleLabel}>{label}</Link>;
}
