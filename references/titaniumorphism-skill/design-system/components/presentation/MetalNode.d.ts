import React from "react";

export interface MetalNodeProps {
  /** Diameter in px. @default 116 */
  size?: number;
  /** Core dot + glow color. @default "var(--accent)" */
  accent?: string;
  /** Glow intensity 0–1 (0 = inert, ~0.7 = hero/active). @default 0.6 */
  glow?: number;
  /** Optional label under the node. */
  label?: string;
  /** Optional sub-label under the label. */
  sub?: string;
  style?: React.CSSProperties;
}

/**
 * Brushed-titanium graph node with a glowing accent core — the atom of the graph motif.
 * Position several absolutely and connect them with SVG <line> edges (draw via stroke-dashoffset).
 */
export function MetalNode(props: MetalNodeProps): JSX.Element;
