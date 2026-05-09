import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildOrganizationJsonLd,
  buildServiceJsonLd,
  buildWebPageJsonLd,
  buildWebsiteJsonLd,
} from "../structured-data";

export const schemaFactory = {
  organization: buildOrganizationJsonLd,
  website: buildWebsiteJsonLd,
  webpage: buildWebPageJsonLd,
  service: buildServiceJsonLd,
  article: buildArticleJsonLd,
  faq: buildFaqPageJsonLd,
  breadcrumb: buildBreadcrumbJsonLd,
};
