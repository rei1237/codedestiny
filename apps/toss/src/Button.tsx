import {Button as TdsButton} from '@toss/tds-mobile';
import type {ComponentProps,CSSProperties} from 'react';

// Keep TDS loading/disabled/native interaction; own only this miniapp's visual surface.
export function Button({className='',variant,style,...props}:ComponentProps<typeof TdsButton>){
  const weak=variant==='weak';
  const theme={
    '--button-background-color':weak?'var(--moon-paper)':'var(--moon-accent)',
    '--button-color':weak?'var(--moon-accent)':'#fff9ef',
    '--button-gradient-color':'transparent',
    '--button-disabled-background-color':'#eee8df',
    '--button-disabled-text-color':'#8c7c8a',
    '--button-min-height':'52px',
    '--button-padding':'12px 18px',
  } as CSSProperties;
  return <TdsButton {...props} variant={variant} style={{...theme,...style}} className={`moon-button ${weak?'moon-button-secondary':'moon-button-primary'} ${className}`}/>;
}
