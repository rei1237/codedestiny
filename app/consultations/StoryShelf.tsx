'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { trackEvent } from '@/lib/analytics';

export default function StoryShelf({ children, className }: { children: ReactNode; className: string }) {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!section.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        trackEvent('home_story_shelf_seen', { surface: 'home' });
        observer.disconnect();
      }
    });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);
  return <section ref={section} className={className} aria-labelledby="homeStoryTitle" onClick={event => {
    const link = event.target instanceof Element && event.target.closest<HTMLAnchorElement>('a[data-story-id]');
    if (link) trackEvent('home_story_opened', { story: link.dataset.storyId });
  }}>{children}</section>;
}
