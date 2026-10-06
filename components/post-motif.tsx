import type { CSSProperties } from "react";

type PostMotifProps = {
  seed: string;
  /** Index within the archive, used only to vary the layer count. */
  depth?: number;
  style?: CSSProperties;
};

/* Curated washes that sit inside the paper/terracotta palette — a random hue
   would fight the journal, so each post draws from one of these. */
const PALETTES = [
  {
    sky: ["#f6e7d2", "#e8cfb0"],
    ridges: ["#c9a884", "#a8886a", "#6f5a46", "#3a3128"],
    accent: "#e45f32",
  },
  {
    sky: ["#eae4d6", "#cfd6cf"],
    ridges: ["#a9b0a4", "#808a7c", "#565f54", "#2c332d"],
    accent: "#d4713f",
  },
  {
    sky: ["#f1dcd4", "#d9b4ac"],
    ridges: ["#c08f88", "#966866", "#66474b", "#31242b"],
    accent: "#b73c2f",
  },
  {
    sky: ["#e3e6ee", "#c2c8d8"],
    ridges: ["#9aa2b8", "#727a92", "#4d5468", "#282c38"],
    accent: "#e08a4e",
  },
] as const;

/** Deterministic per-post so a refresh does not restyle the archive. */
function randomFrom(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    return ((hash < 0 ? ~hash + 1 : hash) % 10000) / 10000;
  };
}

function ridgePath(
  random: () => number,
  baseY: number,
  amplitude: number,
  segments: number
) {
  const step = 400 / segments;
  let d = `M 0 300 L 0 ${baseY.toFixed(1)}`;
  for (let index = 1; index <= segments; index += 1) {
    const x = index * step;
    const peak = baseY - random() * amplitude;
    const controlX = x - step / 2;
    const controlY = peak - random() * amplitude * 0.55;
    d += ` Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${x.toFixed(1)} ${peak.toFixed(1)}`;
  }
  return `${d} L 400 300 Z`;
}

/**
 * Generated landscape used as a cover when a catatan has no photo yet, so an
 * empty archive still reads as a place rather than a placeholder.
 */
export function PostMotif({ seed, depth = 4, style }: PostMotifProps) {
  const random = randomFrom(seed);
  const palette = PALETTES[Math.floor(random() * PALETTES.length)];
  const layers = Array.from({ length: Math.max(3, Math.min(depth, 4)) }, (_, index) => {
    const baseY = 132 + index * 42;
    return {
      d: ridgePath(random, baseY, 58 - index * 6, 5 + index),
      fill: palette.ridges[index % palette.ridges.length],
      opacity: 0.55 + index * 0.15,
    }
  });
  const sunX = 70 + random() * 260;
  const sunY = 58 + random() * 46;
  const id = `motif-${seed.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="none"
      style={style}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.sky[0]} />
          <stop offset="100%" stopColor={palette.sky[1]} />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0%" stopColor={palette.accent} stopOpacity="0.95" />
          <stop offset="70%" stopColor={palette.accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={palette.accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${id}-sky)`} />
      <circle cx={sunX} cy={sunY} r="46" fill={`url(#${id}-sun)`} />
      <circle cx={sunX} cy={sunY} r="13" fill={palette.accent} opacity="0.75" />
      {layers.map((layer, index) => (
        <path
          key={index}
          d={layer.d}
          fill={layer.fill}
          opacity={layer.opacity}
        />
      ))}
    </svg>
  );
}
