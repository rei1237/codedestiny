import React, { lazy, Suspense } from 'react';

// Framework hosting only. Product components, hooks and billing client are real.
export function Link({ prefetch: _prefetch, ...props }: any) { return <a {...props} />; }
export function Image({ fill, priority: _priority, quality: _quality, unoptimized: _unoptimized, ...props }: any) {
  return <img {...props} style={{ ...(fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%' } : {}), ...props.style }} />;
}
export function dynamic(loader: any, options: any = {}) {
  const Component = lazy(() => loader().then((loaded: any) => ({ default: loaded.default || loaded })));
  return function Dynamic(props: any) { return <Suspense fallback={options.loading ? <options.loading /> : null}><Component {...props} /></Suspense>; };
}
export function usePathname() { return location.pathname; }
export function useSearchParams() { return new URLSearchParams(location.search); }
export function useRouter() { return { push: (path: string) => location.assign(path), replace: (path: string) => location.replace(path), refresh: () => location.reload() }; }
