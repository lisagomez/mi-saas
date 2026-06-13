Brushed-titanium graph node with a glowing accent core — the building block of the graph motif.

```jsx
<MetalNode size={160} glow={0.8} label="Art. 28 LISR" sub="norma vigente a la fecha" />
```

Compose a chain by placing nodes and drawing SVG `<line>` edges between their centers (accent, ~4px, `drop-shadow` glow); animate edges with `stroke-dashoffset` and send a white pulse `<circle>` along them. Make the focal node larger with higher `glow`; set `glow={0}` + a steel `accent` for inert/derogated nodes. Reserve amber only for the risk "tangle".
