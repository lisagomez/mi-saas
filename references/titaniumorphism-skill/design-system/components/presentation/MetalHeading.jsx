import React from "react";

/**
 * MetalHeading — display text filled with the brushed-titanium gradient.
 * Use for the wordmark, scene titles, and big statements.
 */
export function MetalHeading({
  text,
  size = "h1",     // 'mega' | 'h1' | 'h2' | 'h3'
  as = "div",
  align = "left",
  style = {},
  children,
}) {
  const SIZES = {
    mega: "var(--fs-mega)",
    h1: "var(--fs-h1)",
    h2: "var(--fs-h2)",
    h3: "var(--fs-h3)",
  };
  const Tag = as;
  return (
    <Tag
      style={{
        margin: 0,
        fontFamily: "var(--font-display)",
        fontWeight: size === "mega" ? "var(--weight-display-black)" : "var(--weight-display)",
        fontSize: SIZES[size] || SIZES.h1,
        letterSpacing: size === "mega" ? "var(--track-mega)" : "var(--track-tight)",
        lineHeight: 0.98,
        textAlign: align,
        backgroundImage: "var(--metal)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
        filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.5))",
        ...style,
      }}
    >
      {children || text}
    </Tag>
  );
}
