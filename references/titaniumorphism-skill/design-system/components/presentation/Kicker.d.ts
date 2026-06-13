import React from "react";

export interface KickerProps {
  /** Label text (ignored if children provided). Keep it short. */
  text?: string;
  /** Text color. @default "var(--text-steel)" */
  color?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Uppercase monospace section label with wide tracking — the "evidence voice".
 * Place above a heading/statement to name the beat (e.g. "EL PROBLEMA").
 */
export function Kicker(props: KickerProps): JSX.Element;
