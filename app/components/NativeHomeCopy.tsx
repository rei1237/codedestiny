'use client';

import Link from 'next/link';
import {createContext, useContext, type ReactNode} from 'react';
import {IS_APP_BUILD} from '@/lib/app-build-target';
import {useLocale, useTPick} from '@/lib/i18n/useT';
import type {RuntimeLocale} from '@/lib/i18n/dictionary';
import copy from '@/lib/i18n/native-home-copy.json';
import {localizeNativeHomeHtml} from '@/lib/i18n/native-home-html.mjs';

// The public Korean home keeps its SEO copy. The packaged app uses the same
// markup and links, with text rendered by React in the selected app language.
const HomeLocale = createContext<RuntimeLocale>('ko');
const rows = copy as Record<string, Record<string, string>>;
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

export function NativeHomeDictionaryText({translationKey, children}: {translationKey: string; children: string}) {
  const locale = useContext(HomeLocale);
  const pick = useTPick();
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
  return external
    ? <a {...props} aria-label={accessibleLabel}>{label}</a>
    : <Link {...props} aria-label={accessibleLabel}>{label}</Link>;
}
