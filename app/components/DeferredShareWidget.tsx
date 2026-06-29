"use client";

import dynamic from "next/dynamic";

type ShareWidgetProps = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  contentType?: "website" | "article" | "collection" | "software" | "result";
  contentId?: string;
};

const ShareWidget = dynamic(() => import("./ShareWidget"), {
  ssr: false,
  loading: () => null,
});

export default function DeferredShareWidget(props: ShareWidgetProps) {
  return <ShareWidget {...props} />;
}
