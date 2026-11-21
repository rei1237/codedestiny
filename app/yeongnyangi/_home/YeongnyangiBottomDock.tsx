import { Bookmark, House, MoonStar } from "lucide-react";
import styles from "./yeongnyangi-bottom-dock.module.css";

type HomeSection = "home" | "questions";
type DockProps = {
  active: HomeSection | "room";
  onSection?: (section: HomeSection) => void;
};

const destinations = [
  { id: "home", text: "홈", href: "/yeongnyangi/", icon: House },
  { id: "room", text: "영냥이의 방", href: "/yeongnyangi/room/", icon: MoonStar },
  { id: "questions", text: "상담하기", href: "/yeongnyangi/#questions" },
  { id: "library", text: "내 상담", href: "/yeongnyangi/library/", icon: Bookmark },
] as const;

export default function YeongnyangiBottomDock({ active, onSection }: DockProps) {
  return <nav className={styles.dock} aria-label="영냥이 하단 메뉴">
    {destinations.map(item => {
      const figure = item.id === "questions"
        ? <span className={styles.mascot} aria-hidden="true"><img src="/assets/yeongnyangi/original/avatar.webp" width="39" height="33" alt="" /></span>
        : <item.icon size={21} aria-hidden="true" />;
      const section = item.id === "home" || item.id === "questions" ? item.id : null;
      return <a
        key={item.id}
        href={section && onSection ? `#${section}` : item.href}
        className={styles.item}
        aria-current={active === item.id ? (item.id === "questions" ? "location" : "page") : undefined}
        onClick={section && onSection ? event => {
          if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
          event.preventDefault();
          onSection(section);
        } : undefined}
      >{figure}<span>{item.text}</span></a>;
    })}
  </nav>;
}
