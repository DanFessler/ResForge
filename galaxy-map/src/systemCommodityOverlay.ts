import {
  COMMODITY_LABELS,
  decodeCommodityPrices,
  tierDisplay,
  type CommodityKey,
  type CommodityPriceTier,
} from "./commodityPrices";
import { escapeHtml } from "./domUtils";
import { govtDisplayName } from "./govtDisplay";
import type { GalaxyJSONDocument, GalaxySystem } from "./galaxyTypes";
import { galaxySystemTooltipHtml } from "./mapGeometry";
import { systemGovernmentId } from "./mapGovernmentColors";
import { planetCountMapTooltipHtml } from "./mapPlanetCount";
import { techServicesTooltipHtml } from "./mapTechServices";
import type { MapColorMode } from "./store/galaxyStore";
import { canPlayerLandAtSpob } from "./spobFlags";

/** Classification when coloring the map by one commodity. */
export type SystemCommodityKind =
  | "empty_system"
  | "no_spob_data"
  | "all_none"
  | "low"
  | "med"
  | "high"
  | "mixed";

const TIER_RANK: Record<CommodityPriceTier, number> = {
  none: 0,
  low: 1,
  med: 2,
  high: 3,
};

/**
 * Uses every nav-default body that has `flags` in `stellarsById`, **can land** (`canPlayerLandAtSpob`),
 * and decodable commodity tiers. Non-landable bodies are skipped (same as missing price data for the map).
 * Purple (`mixed`): at least one qualifying body is **low** and one is **high**.
 * Otherwise the system uses the **maximum** tier among qualifying bodies (`none` < `low` < `med` < `high`).
 */
export function classifySystemCommodity(
  system: GalaxySystem,
  doc: GalaxyJSONDocument,
  commodity: CommodityKey
): SystemCommodityKind {
  if (system.stellars.length === 0) return "empty_system";

  const tiers: CommodityPriceTier[] = [];
  for (const st of system.stellars) {
    const detail = doc.stellarsById[String(st.spobId)];
    if (detail?.flags === undefined || !canPlayerLandAtSpob(detail.flags)) continue;
    const prices = decodeCommodityPrices(detail.flags);
    if (prices === undefined) continue;
    tiers.push(prices[commodity]);
  }

  if (tiers.length === 0) return "no_spob_data";

  const hasLow = tiers.some((t) => t === "low");
  const hasHigh = tiers.some((t) => t === "high");
  if (hasLow && hasHigh) return "mixed";

  const maxTier = tiers.reduce((a, b) => (TIER_RANK[b] > TIER_RANK[a] ? b : a));
  if (maxTier === "none") return "all_none";
  return maxTier;
}

/** No radial halo on the commodity map for empty systems or “won’t trade” (all tiers `none`). */
export function commoditySystemSkipsHalo(
  system: GalaxySystem,
  doc: GalaxyJSONDocument,
  commodity: CommodityKey
): boolean {
  const kind = classifySystemCommodity(system, doc, commodity);
  return kind === "empty_system" || kind === "all_none";
}

const EMPTY_SYSTEM_STYLE = { fill: "#4a5160", stroke: "#ffffff" } as const;

/** Stronger chroma on strokes (and slightly on fills) so halos read vivid, not brighter overall. */
const OVERLAY_STYLES: Record<Exclude<SystemCommodityKind, "empty_system">, { fill: string; stroke: string }> = {
  low: { fill: "#0f3329", stroke: "#2dd4a4" },
  med: { fill: "#5a4200", stroke: "#fbbf10" },
  high: { fill: "#5c0a1f", stroke: "#ff4d67" },
  all_none: { fill: "#353a47", stroke: "#94a0b8" },
  mixed: { fill: "#4a1088", stroke: "#c77dff" },
  no_spob_data: { fill: "#1c2738", stroke: "#38b8ff" },
};

export function systemCommodityNodeStyle(
  system: GalaxySystem,
  doc: GalaxyJSONDocument,
  commodity: CommodityKey
): { fill: string; stroke: string } {
  const kind = classifySystemCommodity(system, doc, commodity);
  if (kind === "empty_system") return { ...EMPTY_SYSTEM_STYLE };
  return OVERLAY_STYLES[kind];
}

/** SVG circle colors when commodity overlay is off (default map). */
export function defaultSystemNodeStyle(hasPlanets: boolean): { fill: string; stroke: string } {
  return hasPlanets
    ? { fill: "var(--node-fill)", stroke: "var(--node)" }
    : { ...EMPTY_SYSTEM_STYLE };
}

export function commodityBreakdownTooltipHtml(
  system: GalaxySystem,
  doc: GalaxyJSONDocument,
  commodity: CommodityKey
): string {
  const title = COMMODITY_LABELS[commodity];
  if (system.stellars.length === 0) return "";

  const items = system.stellars
    .map((st) => {
      const detail = doc.stellarsById[String(st.spobId)];
      const prices = decodeCommodityPrices(detail?.flags);
      let tierLabel: string;
      if (prices === undefined) tierLabel = "—";
      else if (!canPlayerLandAtSpob(detail.flags)) tierLabel = "— (not landable)";
      else tierLabel = tierDisplay(prices[commodity]);
      return `<li>${escapeHtml(st.name || `spöb ${st.spobId}`)}: <strong>${escapeHtml(tierLabel)}</strong></li>`;
    })
    .join("");

  return `<div class="meta"><strong>${escapeHtml(title)}</strong> (per body)<ul>${items}</ul></div>`;
}

export function galaxyMapTooltipHtml(
  system: GalaxySystem,
  doc: GalaxyJSONDocument,
  commodity: CommodityKey | null,
  colorMode: MapColorMode = "default"
): string {
  let html = galaxySystemTooltipHtml(system);
  if (colorMode === "commodity" && commodity) {
    html += commodityBreakdownTooltipHtml(system, doc, commodity);
  }
  if (colorMode === "government") {
    const gid = systemGovernmentId(system);
    const name = govtDisplayName(doc, gid === -1 ? undefined : gid);
    html += `<div class="meta"><strong>Government (map)</strong>: ${escapeHtml(name)}</div>`;
  }
  if (colorMode === "tech_services") {
    html += techServicesTooltipHtml(system, doc);
  }
  if (colorMode === "planet_count") {
    html += planetCountMapTooltipHtml(system);
  }
  return html;
}

/** Swatches for toolbar legend (matches `OVERLAY_STYLES` + empty system). */
export const MAP_COMMODITY_LEGEND: { label: string; fill: string; stroke: string }[] = [
  { label: "Low", fill: "#0f3329", stroke: "#2dd4a4" },
  { label: "Medium", fill: "#5a4200", stroke: "#fbbf10" },
  { label: "High", fill: "#5c0a1f", stroke: "#ff4d67" },
  { label: "Low + high", fill: "#4a1088", stroke: "#c77dff" },
  { label: "No price data", fill: "#1c2738", stroke: "#38b8ff" },
  { label: "Won't trade", fill: "#353a47", stroke: "#94a0b8" },
  { label: "No bodies", fill: "#4a5160", stroke: "#ffffff" },
];
