'use client';

import {useEffect, useRef, type ReactNode} from 'react';

/** Keep the consultation copy usable when an illustration fails to load. */
export default function SampleSurface({children}: {children: ReactNode}) {
  const root = useRef<HTMLDivElement>(null);
  const hideFailedImage = (image: HTMLImageElement) => {
    const figure = image.closest('figure');
    if (figure) figure.hidden = true;
    image.closest('.result-sample')?.classList.add('result-sample--without-art');
  };
  useEffect(() => {
    root.current?.querySelectorAll('img').forEach(image => {
      if (image.complete && !image.naturalWidth) hideFailedImage(image);
    });
  }, []);
  return <div ref={root} onErrorCapture={event => {
    if (event.target instanceof HTMLImageElement) hideFailedImage(event.target);
  }}>{children}</div>;
}
