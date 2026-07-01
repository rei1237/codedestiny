import { redirect } from "next/navigation";

export const metadata = {
  alternates: {
    canonical: "https://code-destiny.com/life-book-ai",
  },
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
};

export default function SajuLifebookPage() {
  redirect("/life-book-ai");
}
