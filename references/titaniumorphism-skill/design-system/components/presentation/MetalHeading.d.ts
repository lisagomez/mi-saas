import React from "react";

export interface MetalHeadingProps {
  /** Heading text (ignored if children are provided). */
  text?: string;
  /** Display scale. @default "h1" */
  size?: "mega" | "h1" | "h2" | "h3";
  /** Element to render. @default "div" */
  as?: keyof JSX.IntrinsicElements;
  /** Text alignment. @default "left" */
  align?: "left" | "center" | "right";
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Display text filled with the brushed-titanium gradient — the system's hero typographic move.
 * Use ONLY for display roles (wordmark, scene titles, big statements); never body copy.
 */
export function MetalHeading(props: MetalHeadingProps): JSX.Element;
