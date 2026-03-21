'use client';

import Link from 'next/link';
import Image from 'next/image';
import { SERVICE_MAP } from '../_lib/serviceMap';

export default function RelatedServices({ currentSlug }) {
  const current = SERVICE_MAP[currentSlug];
  if (!current?.related?.length) return null;

  const relatedServices = current.related
    .map((slug) => SERVICE_MAP[slug])
    .filter(Boolean);

  if (relatedServices.length === 0) return null;

  return (
    <section 
      className="mx-auto max-w-4xl px-4 py-12 border-t border-slate-700"
      aria-labelledby="related-services-heading"
    >
      <h2 
        id="related-services-heading"
        className="mb-8 text-2xl font-bold text-slate-100"
      >
        관련 서비스
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {relatedServices.map(({ title, ogImage, cardTitle }, idx) => {
          // Find the slug for this service
          const relatedSlug = Object.entries(SERVICE_MAP).find(
            ([_, service]) => service.title === title
          )?.[0];

          if (!relatedSlug) return null;

          return (
            <Link
              key={idx}
              href={`/${relatedSlug}`}
              className="group overflow-hidden rounded-lg border border-slate-600 bg-slate-800 transition-all hover:border-amber-400 hover:shadow-lg hover:shadow-amber-400/20"
            >
              <div className="relative h-40 w-full overflow-hidden bg-slate-700">
                {ogImage ? (
                  <Image
                    src={ogImage}
                    alt={cardTitle || title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    이미지 없음
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-sm font-medium text-amber-300 group-hover:text-amber-200">
                  {cardTitle || title.split(' - ')[0]}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
