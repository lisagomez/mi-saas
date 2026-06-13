import React from "react";

/**
 * GlassChip — frosted-titanium plate holding a metric + caption.
 * The "what it costs" / stat card of the system.
 */
export function GlassChip({ value, unit, label, width = 340, style = {}, children }) {
  return (
    <div
      style={{
        width,
        boxSizing: "border-box",
        padding: "30px",
        borderRadius: "var(--r-lg)",
        background: "var(--glass-fill)",
        WebkitBackdropFilter: "var(--blur-glass)",
        backdropFilter: "var(--blur-glass)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-glass)",
        ...style,
      }}
    >
      {children || (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: 54,
                backgroundImage: "var(--metal)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
              }}
            >
              {value}
            </span>
            {unit && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: "var(--text-steel)" }}>
                {unit}
              </span>
            )}
          </div>
          <div style={{ marginTop: 12, fontFamily: "var(--font-body)", fontSize: 18, lineHeight: 1.4, color: "var(--text)" }}>
            {label}
          </div>
        </>
      )}
    </div>
  );
}
