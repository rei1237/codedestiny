import {Fragment,useSyncExternalStore,type ReactNode} from 'react';
import {getTossSessionRevision,onTossSessionRevisionChanged} from './platform';

// Every new credential starts a fresh subtree, even when loggedIn stays true.
export default function TossSessionScope({children}:{children:ReactNode}){
 const revision=useSyncExternalStore(onTossSessionRevisionChanged,getTossSessionRevision,getTossSessionRevision);
 return <Fragment key={revision}>{children}</Fragment>;
}
