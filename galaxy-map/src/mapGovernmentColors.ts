import { govtDisplayName } from "./govtDisplay";
import type { GalaxyJSONDocument, GalaxySystem } from "./galaxyTypes";

/** Government id for map coloring (-1 = independent / missing system block). */
export function systemGovernmentId(system: GalaxySystem): number {
  const g = system.environment?.govt;
  if (g === undefined) return -1;
  return g;
}

function govtLabelKey(label: string | undefined): string {
  return (label ?? "").toLowerCase();
}

/**
 * Map colors: independent is neutral grey (no white rim). Major factions by name from export.
 * Other ids use a stable hue from `govtId`.
 */
export function governmentNodeStyle(
  govtId: number,
  label?: string
): { fill: string; stroke: string } {
  const L = govtLabelKey(label);

  if (govtId === -1) {
    return { fill: "#3a4048", stroke: "#8b95a8" };
  }

  if (L.includes("pirate")) {
    return { fill: "hsl(0 48% 20%)", stroke: "hsl(0 65% 58%)" };
  }
  if (L.includes("rebellion")) {
    return { fill: "hsl(28 46% 20%)", stroke: "hsl(28 72% 54%)" };
  }
  if (L.includes("confederation") || L.includes("confed")) {
    return { fill: "hsl(218 48% 20%)", stroke: "hsl(218 62% 58%)" };
  }
  if (L.includes("lethean") || L.includes("lethan")) {
    return { fill: "hsl(302 50% 20%)", stroke: "hsl(302 65% 58%)" };
  }

  const hue = ((govtId * 67 + 13) % 360 + 360) % 360;
  return {
    fill: `hsl(${hue} 42% 20%)`,
    stroke: `hsl(${hue} 52% 58%)`,
  };
}

export type GovernmentLegendEntry = {
  govtId: number;
  label: string;
  fill: string;
  stroke: string;
};

export function buildGovernmentLegend(doc: GalaxyJSONDocument): GovernmentLegendEntry[] {
  const ids = new Set<number>();
  for (const s of doc.systems) {
    ids.add(systemGovernmentId(s));
  }
  return [...ids]
    .sort((a, b) => a - b)
    .map((govtId) => {
      const nameLabel = govtDisplayName(doc, govtId === -1 ? undefined : govtId);
      const style = governmentNodeStyle(govtId, nameLabel);
      return {
        govtId,
        label: nameLabel,
        fill: style.fill,
        stroke: style.stroke,
      };
    });
}
