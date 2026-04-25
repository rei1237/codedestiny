import React, { useState } from "react";

interface Chapter {
  id: number;
  title: string;
  content: string;
}

interface LifebookChapterViewerProps {
  chapters: Chapter[];
}

const LifebookChapterViewer: React.FC<LifebookChapterViewerProps> = ({ chapters }) => {
  const [selected, setSelected] = useState(0);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {chapters.map((ch, idx) => (
          <button
            key={ch.id}
            onClick={() => setSelected(idx)}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: selected === idx ? "2px solid #fcd34d" : "1px solid #888",
              background: selected === idx ? "#23210a" : "#18181b",
              color: selected === idx ? "#fcd34d" : "#e2e8f0",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "1rem",
              transition: "all .18s"
            }}
          >
            {ch.title}
          </button>
        ))}
      </div>
      <div style={{ background: "#18181b", borderRadius: 12, padding: 24, color: "#e2e8f0", minHeight: 320 }}>
        <h2 style={{ color: "#fcd34d", fontSize: "1.2rem", marginBottom: 18 }}>{chapters[selected].title}</h2>
        <div style={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>{chapters[selected].content}</div>
      </div>
    </div>
  );
};

export default LifebookChapterViewer;
