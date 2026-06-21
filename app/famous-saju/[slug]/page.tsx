import FamousSajuInsightDetailPage, {
  generateMetadata as generateCanonicalMetadata,
  generateStaticParams,
} from "../../insights/famous-saju/[slug]/page";

type PageProps = { params: { slug: string } };

export { generateStaticParams };

export function generateMetadata(props: PageProps) {
  const metadata = generateCanonicalMetadata(props);

  return {
    ...metadata,
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default FamousSajuInsightDetailPage;
