import React from 'react';
type LinkProps = React.ComponentProps<'a'> & { prefetch?: boolean };
export default function Link({href,children,prefetch: _prefetch,...props}: LinkProps) { return <a href={href} {...props}>{children}</a>; }
export function usePathname() { return location.pathname; }
export function useRouter() { return {replace: (path: string) => location.replace(path),push: (path: string) => location.assign(path)}; }
export function getApiBaseUrl() { return ''; }
