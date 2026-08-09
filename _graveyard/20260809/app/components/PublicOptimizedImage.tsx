import Image, { type ImageProps } from "next/image";

/** Neutral 10×10 JPEG — stable layout; swap for per-asset blur on hero images if needed. */
const PUBLIC_IMAGE_BLUR =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrSzmTW0mFZ59a4RqvB3B0vNN1laPqsKP9W1sAJHVe37HToBxhXK9tPI5tgzbHKq+1QOXwiZFxKizs7l1pZUn9V7VpVD6SPOb7Kfhug1LrKNvFe8YacfCPRatKyMMuEROUpZLKiYmeWmxDf/9k=";

export type PublicOptimizedImageProps = Omit<ImageProps, "placeholder" | "blurDataURL">;

/** `next/image` + shared blur placeholder for `/public` paths (no static import required). */
export default function PublicOptimizedImage(props: PublicOptimizedImageProps) {
  return (
    <Image
      {...props}
      placeholder="blur"
      blurDataURL={PUBLIC_IMAGE_BLUR}
    />
  );
}
