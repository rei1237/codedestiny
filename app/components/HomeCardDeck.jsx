// Native links are usable on first paint. Navigation never waits for motion.
export default function HomeCardDeck({ children, className }) {
  return <ul className={className} aria-labelledby="homeCardTitle">{children}</ul>;
}
