import type { Metadata } from "next";
import { buildSeoMetadata, toAbsoluteUrl } from "../seo";
import { SEO_SITE_CONFIG } from "./siteConfig";

type CreateMetadataOptions = {
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  noindex?: boolean;
  image?: string;
};

export function createMetadata(options: CreateMetadataOptions): Metadata {
  return buildSeoMetadata({
    path: options.path,
    title: options.title,
    description: options.description,
    keywords: options.keywords || [],
    noindex: options.noindex,
    ogImage: options.image || SEO_SITE_CONFIG.defaultOgImage,
  });
}

export function createCanonical(path: string) {
  return toAbsoluteUrl(path);
}
