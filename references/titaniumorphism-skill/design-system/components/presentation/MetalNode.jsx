import React from "react";

/**
 * MetalNode — a brushed-titanium graph node with a glowing accent core.
 * The atom of the graph motif. Compose several with SVG edges between them.
 */
export function MetalNode({ size = 116, accent = "var(--accent)", glow = 0.6, label, sub, style = {} }) {
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 14, ...style }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--metal)",
          padding: Math.max(2, size * 0.026),
          boxSizing: "border-box",
          boxShadow: `var(--shadow-metal), 0 0 ${glow * 52}px rgba(124,180,255,${glow * 0.85})`,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: "var(--metal-face)",
            border: "1px solid var(--hairline)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: size * 0.4,
              height: size * 0.4,
              borderRadius: "50%",
              background: accent,
              opacity: 0.9,
              boxShadow: `0 0 ${9 + glow * 26}px ${accent}`,
            }}
          />
        </div>
      </div>
      {label && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 25, color: "var(--text-hi)" }}>
            {label}
          </div>
          {sub && (
            <div style={{ marginTop: 5, fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-steel)" }}>
              {sub}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
