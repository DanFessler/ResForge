import { escapeHtml } from "./domUtils";
import type { GalaxyJSONDocument, GalaxySpobDetail, GalaxySystem } from "./galaxyTypes";
import {
  canPlayerLandAtSpob,
  SPOB_FLAG_BUY_SHIPS,
  SPOB_FLAG_COMMODITY_EXCHANGE,
  SPOB_FLAG_OUTFIT_SHIP,
} from "./spobFlags";

const EMPTY_SYSTEM_STYLE = { fill: "#4a5160", stroke: "#ffffff" } as const;
const NO_TECH_DATA_STYLE = { fill: "#2a3142", stroke: "#6cb3ff" } as const;

/** Max `techLevel` among landable spöbs in this system (export data only). */
export function maxLandableTechLevel(system: GalaxySystem, doc: GalaxyJSONDocument): number | null {
  if (system.stellars.length === 0) return null;
  let max: number | null = null;
  for (const st of system.stellars) {
    const detail = doc.stellarsById[String(st.spobId)];
    if (detail?.flags === undefined || !canPlayerLandAtSpob(detail.flags)) continue;
    if (detail.techLevel === undefined) continue;
    max = max === null ? detail.techLevel : Math.max(max, detail.techLevel);
  }
  return max;
}

/** True if the system has at least one landable spöb with exported `flags`. */
export function hasLandableSpobData(system: GalaxySystem, doc: GalaxyJSONDocument): boolean {
  for (const st of system.stellars) {
    const detail = doc.stellarsById[String(st.spobId)];
    if (detail?.flags !== undefined && canPlayerLandAtSpob(detail.flags)) return true;
  }
  return false;
}

export function serviceLabelsForSpob(flags: number | undefined): string[] {
  if (flags === undefined) return [];
  const f = flags >>> 0;
  const out: string[] = [];
  if ((f & SPOB_FLAG_COMMODITY_EXCHANGE) !== 0) out.push("Commodity");
  if ((f & SPOB_FLAG_OUTFIT_SHIP) !== 0) out.push("Outfit");
  if ((f & SPOB_FLAG_BUY_SHIPS) !== 0) out.push("Shipyard");
  return out;
}

function serviceSummaryShort(flags: number | undefined): string {
  const s = serviceLabelsForSpob(flags);
  return s.length > 0 ? s.join(", ") : "—";
}

export function computeGlobalTechRange(doc: GalaxyJSONDocument): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const s of doc.systems) {
    const t = maxLandableTechLevel(s, doc);
    if (t !== null) {
      min = Math.min(min, t);
      max = Math.max(max, t);
    }
  }
  if (!Number.isFinite(min)) return null;
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

/** Low tech → red, high tech → green (HSL hue 0 → 120, yellow mid). */
export function techLevelNodeColors(maxTech: number, rangeMin: number, rangeMax: number): {
  fill: string;
  stroke: string;
} {
  const span = Math.max(1, rangeMax - rangeMin);
  const t = Math.max(0, Math.min(1, (maxTech - rangeMin) / span));
  const hue = t * 120;
  return {
    fill: `hsl(${hue} 48% 22%)`,
    stroke: `hsl(${hue} 62% 52%)`,
  };
}

/** No halo for empty systems, missing landable spöb data, or no tech level on any landable. */
export function techServicesSystemSkipsHalo(
  system: GalaxySystem,
  doc: GalaxyJSONDocument
): boolean {
  if (system.stellars.length === 0) return true;
  if (!hasLandableSpobData(system, doc)) return true;
  return maxLandableTechLevel(system, doc) === null;
}

export function techServicesNodeStyle(
  system: GalaxySystem,
  doc: GalaxyJSONDocument,
  techRange: { min: number; max: number } | null
): { fill: string; stroke: string } {
  if (system.stellars.length === 0) return { ...EMPTY_SYSTEM_STYLE };
  if (!hasLandableSpobData(system, doc)) return { ...NO_TECH_DATA_STYLE };
  const maxTech = maxLandableTechLevel(system, doc);
  if (maxTech === null) return { ...NO_TECH_DATA_STYLE };
  const range = techRange ?? { min: maxTech - 1, max: maxTech + 1 };
  return techLevelNodeColors(maxTech, range.min, range.max);
}

export function techServicesTooltipHtml(system: GalaxySystem, doc: GalaxyJSONDocument): string {
  if (system.stellars.length === 0) return "";

  const lines = system.stellars.map((st) => {
    const detail: GalaxySpobDetail | undefined = doc.stellarsById[String(st.spobId)];
    const land =
      detail?.flags !== undefined && canPlayerLandAtSpob(detail.flags);
    const tech =
      detail?.techLevel !== undefined ? String(detail.techLevel) : "—";
    const svc = serviceSummaryShort(detail?.flags);
    const suffix = land ? "" : " <span class=\"meta\">(not landable)</span>";
    return `<li>${escapeHtml(st.name || `spöb ${st.spobId}`)}: tech <strong>${escapeHtml(tech)}</strong> · ${escapeHtml(svc)}${suffix}</li>`;
  });

  const mapMax = maxLandableTechLevel(system, doc);
  const mapLine =
    mapMax !== null
      ? `<div class="meta"><strong>Map color</strong>: max landable tech ${mapMax}</div>`
      : `<div class="meta"><strong>Map color</strong>: no landable tech data</div>`;

  return `${mapLine}<div class="meta"><strong>Tech &amp; services</strong> (per body)<ul>${lines.join("")}</ul></div>`;
}

export type TechLegendSwatch = { label: string; fill: string; stroke: string };

/** Gradient legend from low → high tech (using current export min/max). */
export function buildTechServicesLegend(range: { min: number; max: number } | null): TechLegendSwatch[] {
  if (!range) {
    return [
      { label: "No tech in export", fill: NO_TECH_DATA_STYLE.fill, stroke: NO_TECH_DATA_STYLE.stroke },
      { label: "No bodies", fill: EMPTY_SYSTEM_STYLE.fill, stroke: EMPTY_SYSTEM_STYLE.stroke },
    ];
  }
  const steps = 5;
  const out: TechLegendSwatch[] = [];
  for (let i = 0; i < steps; i++) {
    const u = i / (steps - 1);
    const tech = Math.round(range.min + u * (range.max - range.min));
    const { fill, stroke } = techLevelNodeColors(tech, range.min, range.max);
    const label = i === 0 ? `Tech ${range.min}` : i === steps - 1 ? `Tech ${range.max}` : `Tech ~${tech}`;
    out.push({ label, fill, stroke });
  }
  out.push({
    label: "No tech data",
    fill: NO_TECH_DATA_STYLE.fill,
    stroke: NO_TECH_DATA_STYLE.stroke,
  });
  out.push({
    label: "No bodies",
    fill: EMPTY_SYSTEM_STYLE.fill,
    stroke: EMPTY_SYSTEM_STYLE.stroke,
  });
  return out;
}
