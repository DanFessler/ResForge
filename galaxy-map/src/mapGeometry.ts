import { escapeHtml } from "./domUtils";
import type { GalaxyJSONDocument, GalaxySystem } from "./galaxyTypes";

/** Multiply stored coordinates for drawing only (larger = more spread; markers stay fixed for a “smaller dot” look). */
export const GALAXY_POSITION_SCALE = 1.35;
export const GALAXY_NODE_RADIUS = 3;
export const GALAXY_NODE_STROKE_WIDTH = 1;
/** User-space px beyond the node disk for commodity / government / tech color halos. */
export const GALAXY_COLOR_MODE_HALO_EXTENT = 64;
export const GALAXY_COLOR_MODE_HALO_RADIUS =
  GALAXY_NODE_RADIUS + GALAXY_COLOR_MODE_HALO_EXTENT;
export const GALAXY_LABEL_FONT_PX = 7.5;
export const GALAXY_LABEL_OFFSET_Y = 9;
export const GALAXY_EDGE_STROKE_WIDTH = 0.85;
export const GALAXY_NEBULA_STROKE_WIDTH = 0.75;
export const GALAXY_VIEW_PADDING = 48;

export const galPx = (n: number): number => n * GALAXY_POSITION_SCALE;

export type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function computeGalaxyBounds(data: GalaxyJSONDocument): ViewBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const expand = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  for (const s of data.systems) {
    expand(galPx(s.x), galPx(s.y));
  }
  for (const n of data.nebulae) {
    const nx = galPx(n.x);
    const ny = galPx(n.y);
    expand(nx, ny);
    expand(nx + galPx(n.width), ny + galPx(n.height));
  }

  if (!Number.isFinite(minX)) {
    return { x: -500, y: -500, width: 1000, height: 1000 };
  }

  const pad = GALAXY_VIEW_PADDING;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export type GalaxyEdge = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export function buildGalaxyEdges(data: GalaxyJSONDocument): GalaxyEdge[] {
  const idSet = new Set(data.systems.map((s) => s.id));
  const byId = new Map(data.systems.map((s) => [s.id, s] as const));
  const drawn = new Set<string>();
  const edges: GalaxyEdge[] = [];

  for (const s of data.systems) {
    for (const t of s.links) {
      if (!idSet.has(t)) continue;
      const a = Math.min(s.id, t);
      const b = Math.max(s.id, t);
      const key = `${a}-${b}`;
      if (drawn.has(key)) continue;
      drawn.add(key);
      const p0 = byId.get(a);
      const p1 = byId.get(b);
      if (!p0 || !p1) continue;
      edges.push({
        key,
        x1: galPx(p0.x),
        y1: galPx(p0.y),
        x2: galPx(p1.x),
        y2: galPx(p1.y),
      });
    }
  }
  return edges;
}

export function galaxySystemTooltipHtml(s: GalaxySystem): string {
  const stellarLines =
    s.stellars.length > 0
      ? `<ul>${s.stellars
          .map(
            (st) =>
              `<li>${escapeHtml(st.name || `spöb ${st.spobId}`)} <span class="meta">(${st.localX}, ${st.localY})</span></li>`,
          )
          .join("")}</ul>`
      : '<p class="meta">No stellars in nav defaults.</p>';

  const linksLine =
    s.links.length > 0
      ? `<div class="meta">Hyperlinks: ${s.links.map((id) => escapeHtml(String(id))).join(", ")}</div>`
      : "";

  return `<h2>${escapeHtml(s.name || `System ${s.id}`)}</h2><div class="meta">id ${s.id} · galaxy (${s.x}, ${s.y})</div>${linksLine}${stellarLines}`;
}

export const SYSTEM_MAP_PAD = 120;

export type SystemMapLayout = {
  viewBox: ViewBox;
  hitX: number;
  hitY: number;
  hitW: number;
  hitH: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export function computeSystemMapLayout(system: GalaxySystem): SystemMapLayout {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const st of system.stellars) {
    minX = Math.min(minX, st.localX);
    minY = Math.min(minY, st.localY);
    maxX = Math.max(maxX, st.localX);
    maxY = Math.max(maxY, st.localY);
  }
  const pad = SYSTEM_MAP_PAD;
  if (!Number.isFinite(minX)) {
    minX = -200;
    minY = -200;
    maxX = 200;
    maxY = 200;
  }
  const sminX = minX - pad;
  const sminY = minY - pad;
  const smaxX = maxX + pad;
  const smaxY = maxY + pad;
  const w0 = Math.max(smaxX - sminX, 80);
  const h0 = Math.max(smaxY - sminY, 80);

  return {
    viewBox: { x: sminX, y: sminY, width: w0, height: h0 },
    hitX: sminX,
    hitY: sminY,
    hitW: w0 + pad * 2,
    hitH: h0 + pad * 2,
    minX: sminX,
    maxX: smaxX,
    minY: sminY,
    maxY: smaxY,
  };
}
