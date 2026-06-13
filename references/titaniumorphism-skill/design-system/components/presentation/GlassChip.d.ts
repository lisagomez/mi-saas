import React from "react";

export interface GlassChipProps {
  /** Big metric value, e.g. "5–10" or "20–100". Rendered in metal mono. */
  value?: string | number;
  /** Small unit beside the value, e.g. "h / sem" or "%". */
  unit?: string;
  /** Caption line under the metric. */
  label?: string;
  /** Plate width in px. @default 340 */
  width?: number;
  style?: React.CSSProperties;
  /** Override the default value/label layout entirely. */
  children?: React.ReactNode;
}

/**
 * Frosted-titanium plate for a single metric + caption (the "what it costs" card).
 * Lives on a graphite background so the blur and top inset highlight read.
 */
export function GlassChip(props: GlassChipProps): JSX.Element;
