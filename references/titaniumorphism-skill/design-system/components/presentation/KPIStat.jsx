import React from "react";

/**
 * KPIStat — oversized metal numeral + accent underline + label/note.
 * The climax "value in numbers" element.
 */
export function KPIStat({ value, label, note, underline = true, align = "center", style = {} }) {
  return (
    <div style={{ width: 460, textAlign: align, ...style }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          fontSize: "var(--fs-stat)",
          lineHeight: 1,
          letterSpacing: "-0.03em",
          backgroundImage: "var(--metal)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.5))",
        }}
      >
        {value}
      </div>
      {underline && (
        <div
          style={{
            height: 3,
            width: "64%",
            margin: align === "center" ? "20px auto 0" : "20px 0 0",
            borderRadius: 2,
            background: "linear-gradient(90deg, var(--accent), var(--accent-hi))",
            boxShadow: "var(--glow-accent-strong)",
          }}
        />
      )}
      {label && (
        <div style={{ marginTop: 28, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 27, color: "var(--text-hi)" }}>
          {label}
        </div>
      )}
      {note && (
        <div style={{ marginTop: 9, fontFamily: "var(--font-body)", fontSize: 18, color: "var(--text-steel)", lineHeight: 1.35 }}>
          {note}
        </div>
      )}
    </div>
  );
}
