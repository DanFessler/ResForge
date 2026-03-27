import type { GalaxyJSONDocument, GalaxySystem } from "./galaxyTypes";

const EMPTY_SYSTEM_STYLE = { fill: "#4a5160", stroke: "#ffffff" } as const;

/** Min/max `stellars.length` among systems that have at least one nav-default body. */
export function computeStellarCountRange(
  doc: GalaxyJSONDocument
): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const s of doc.systems) {
    const c = s.stellars.length;
    if (c === 0) continue;
    min = Math.min(min, c);
    max = Math.max(max, c);
  }
  if (!Number.isFinite(min)) return null;
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

/** Few bodies → cool blue; many → warm yellow (distinct from tech level red → green). */
export function planetCountNodeColors(count: number, rangeMin: number, rangeMax: number): {
  fill: string;
  stroke: string;
} {
  const span = Math.max(1, rangeMax - rangeMin);
  const t = Math.max(0, Math.min(1, (count - rangeMin) / span));
  const hue = 232 - t * 148;
  return {
    fill: `hsl(${hue} 46% 22%)`,
    stroke: `hsl(${hue} 60% 54%)`,
  };
}

export function planetCountNodeStyle(
  system: GalaxySystem,
  range: { min: number; max: number } | null
): { fill: string; stroke: string } {
  const n = system.stellars.length;
  if (n === 0) return { ...EMPTY_SYSTEM_STYLE };
  if (!range) return planetCountNodeColors(n, n - 1, n + 1);
  return planetCountNodeColors(n, range.min, range.max);
}

export function planetCountMapTooltipHtml(system: GalaxySystem): string {
  const n = system.stellars.length;
  const label = n === 1 ? "1 body" : `${n} bodies`;
  return `<div class="meta"><strong>Map color</strong>: ${label} (nav defaults)</div>`;
}

export type PlanetCountLegendSwatch = { label: string; fill: string; stroke: string };

export function buildPlanetCountLegend(
  range: { min: number; max: number } | null
): PlanetCountLegendSwatch[] {
  if (!range) {
    return [{ label: "No bodies in galaxy", fill: EMPTY_SYSTEM_STYLE.fill, stroke: EMPTY_SYSTEM_STYLE.stroke }];
  }
  const span = range.max - range.min;
  /** At most one swatch per integer body count when the range is narrow (avoids duplicate "~3 bodies"). */
  const steps = Math.max(2, Math.min(5, span + 1));
  const out: PlanetCountLegendSwatch[] = [];
  for (let i = 0; i < steps; i++) {
    const u = steps > 1 ? i / (steps - 1) : 0;
    const count = Math.round(range.min + u * (range.max - range.min));
    const { fill, stroke } = planetCountNodeColors(count, range.min, range.max);
    const label =
      i === 0
        ? `${range.min} ${range.min === 1 ? "body" : "bodies"}`
        : i === steps - 1
          ? `${range.max} ${range.max === 1 ? "body" : "bodies"}`
          : `${count} ${count === 1 ? "body" : "bodies"}`;
    out.push({ label, fill, stroke });
  }
  out.push({
    label: "No bodies",
    fill: EMPTY_SYSTEM_STYLE.fill,
    stroke: EMPTY_SYSTEM_STYLE.stroke,
  });
  return out;
}
