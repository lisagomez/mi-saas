import React from "react";

export interface KPIStatProps {
  /** The headline number, pre-formatted, e.g. "<45 s", "80%", "≥70%". */
  value: string;
  /** Bold label under the number. */
  label?: string;
  /** Small steel note under the label (the qualifier, e.g. "−90% vs. manual"). */
  note?: string;
  /** Show the accent underline. @default true */
  underline?: boolean;
  /** @default "center" */
  align?: "left" | "center";
  style?: React.CSSProperties;
}

/**
 * Oversized metal numeral with an accent underline and label/note — the "value in numbers" climax.
 * Use 3 across on a graphite slide. In motion, count the number up and grow the underline.
 */
export function KPIStat(props: KPIStatProps): JSX.Element;
