import type { Metadata } from "next";
import StoriesIndex from "@/components/stories/StoriesIndex";
import styles from "./stories.module.css";

export const metadata: Metadata = {
  title: "CODE DESTINY NOVEL | Code Destiny",
  description: "운명, 사주, 별자리, 타로를 주제로 한 무료 웹소설을 읽는 CODE DESTINY NOVEL입니다.",
  alternates: {
    canonical: "/stories",
  },
};

export default function StoriesPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <StoriesIndex />
      </div>
    </main>
  );
}
