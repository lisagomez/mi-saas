import React from "react";

/**
 * Kicker — uppercase monospace section label (the "evidence voice").
 * Sits above a MetalHeading or statement.
 */
export function Kicker({ text, color = "var(--text-steel)", style = {}, children }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--fs-kicker)",
        letterSpacing: "var(--track-kicker)",
        textTransform: "uppercase",
        color,
        ...style,
      }}
    >
      {children || text}
    </div>
  );
}
