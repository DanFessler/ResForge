import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { CommodityKey } from "../commodityPrices";
import type { GalaxyJSONDocument, GalaxySystem } from "../galaxyTypes";
import {
  buildGalaxyEdges,
  computeGalaxyBounds,
  GALAXY_EDGE_STROKE_WIDTH,
  GALAXY_LABEL_FONT_PX,
  GALAXY_LABEL_OFFSET_Y,
  GALAXY_COLOR_MODE_HALO_RADIUS,
  GALAXY_NODE_RADIUS,
  GALAXY_NODE_STROKE_WIDTH,
  galPx,
  type ViewBox,
} from "../mapGeometry";
import { govtDisplayName } from "../govtDisplay";
import {
  governmentNodeStyle,
  systemGovernmentId,
} from "../mapGovernmentColors";
import {
  computeStellarCountRange,
  planetCountNodeStyle,
} from "../mapPlanetCount";
import {
  computeGlobalTechRange,
  techServicesNodeStyle,
  techServicesSystemSkipsHalo,
} from "../mapTechServices";
import type { MapColorMode } from "../store/galaxyStore";
import {
  commoditySystemSkipsHalo,
  defaultSystemNodeStyle,
  galaxyMapTooltipHtml,
  systemCommodityNodeStyle,
} from "../systemCommodityOverlay";

export type GalaxyMapHandlers = {
  onSystemDoubleClick: (system: GalaxySystem) => void;
  onTooltipShow: (html: string, clientX: number, clientY: number) => void;
  onTooltipHide: () => void;
};

const HALO_STOPS = 8;
const HALO_FALLOFF_K = 3.6;
const HALO_OPACITY_SCALE = 0.15;

type SceneProps = {
  data: GalaxyJSONDocument;
  edges: ReturnType<typeof buildGalaxyEdges>;
  coloredNodeStyles: Map<number, { fill: string; stroke: string }>;
  mapColorMode: MapColorMode;
  mapCommodity: CommodityKey | null;
  handlersRef: MutableRefObject<GalaxyMapHandlers>;
};

const GalaxyMapScene = memo(function GalaxyMapScene({
  data,
  edges,
  coloredNodeStyles,
  mapColorMode,
  mapCommodity,
  handlersRef,
}: SceneProps) {
  const lastTipHtmlRef = useRef("");
  const useColorHalos = mapColorMode !== "default";

  const showNodeHalo = (s: GalaxySystem): boolean => {
    if (!useColorHalos) return false;
    if (mapColorMode === "commodity" && mapCommodity) {
      return !commoditySystemSkipsHalo(s, data, mapCommodity);
    }
    if (mapColorMode === "government" && systemGovernmentId(s) === -1) {
      return false;
    }
    if (
      mapColorMode === "tech_services" &&
      techServicesSystemSkipsHalo(s, data)
    ) {
      return false;
    }
    if (mapColorMode === "planet_count" && s.stellars.length === 0) {
      return false;
    }
    return true;
  };

  return (
    <>
      <defs>
        <radialGradient
          id="galaxy-nebula-edge-alpha"
          gradientUnits="objectBoundingBox"
          cx="0.5"
          cy="0.5"
          r="0.71"
        >
          <stop offset="0%" stopColor="#fff" stopOpacity={1} />
          <stop offset="38%" stopColor="#fff" stopOpacity={0.82} />
          <stop offset="72%" stopColor="#fff" stopOpacity={0.28} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <mask
          id="galaxy-nebula-soft"
          maskUnits="objectBoundingBox"
          maskContentUnits="objectBoundingBox"
          x="0"
          y="0"
          width="1"
          height="1"
        >
          <rect
            x="0"
            y="0"
            width="1"
            height="1"
            fill="url(#galaxy-nebula-edge-alpha)"
          />
        </mask>
        {useColorHalos
          ? data.systems.filter(showNodeHalo).map((s) => {
              const hasPlanets = s.stellars.length > 0;
              const st =
                coloredNodeStyles.get(s.id) ??
                defaultSystemNodeStyle(hasPlanets);
              const gid = `galaxy-node-halo-${s.id}`;
              return (
                <radialGradient
                  key={gid}
                  id={gid}
                  gradientUnits="objectBoundingBox"
                  cx="0.5"
                  cy="0.5"
                  r="0.5"
                >
                  {Array.from({ length: HALO_STOPS }, (_, i) => {
                    const u = i / (HALO_STOPS - 1);
                    const falloff = Math.exp(-HALO_FALLOFF_K * u);
                    const opacity = HALO_OPACITY_SCALE * falloff;
                    const strokePct = Math.round((1 - u) * 100);
                    return (
                      <stop
                        key={i}
                        offset={`${u * 100}%`}
                        stopColor={`color-mix(in srgb, ${st.stroke} ${strokePct}%, ${st.fill})`}
                        stopOpacity={opacity}
                      />
                    );
                  })}
                </radialGradient>
              );
            })
          : null}
      </defs>
      <g className="world">
        {data.nebulae.map((n) => (
          <rect
            key={`${n.id}-${n.x}-${n.y}`}
            x={galPx(n.x)}
            y={galPx(n.y)}
            width={galPx(n.width)}
            height={galPx(n.height)}
            fill="rgba(160, 112, 235, 0.22)"
            mask="url(#galaxy-nebula-soft)"
          >
            <title>{n.name}</title>
          </rect>
        ))}
        {edges.map((e) => (
          <line
            key={e.key}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="var(--edge)"
            strokeWidth={GALAXY_EDGE_STROKE_WIDTH}
          />
        ))}
        {data.systems.map((s) => {
          const gx = galPx(s.x);
          const gy = galPx(s.y);
          const hasPlanets = s.stellars.length > 0;
          const nodeStyle =
            mapColorMode === "default"
              ? defaultSystemNodeStyle(hasPlanets)
              : (coloredNodeStyles.get(s.id) ??
                defaultSystemNodeStyle(hasPlanets));
          const dimWhenNoBodies =
            (mapColorMode === "commodity" &&
              Boolean(mapCommodity && !hasPlanets)) ||
            (mapColorMode === "tech_services" && !hasPlanets) ||
            (mapColorMode === "planet_count" && !hasPlanets);
          return (
            <g
              key={s.id}
              style={{
                cursor: "pointer",
                opacity: dimWhenNoBodies ? 0.38 : 1,
              }}
              onMouseEnter={(ev) => {
                const html = galaxyMapTooltipHtml(
                  s,
                  data,
                  mapCommodity,
                  mapColorMode,
                );
                lastTipHtmlRef.current = html;
                handlersRef.current.onTooltipShow(html, ev.clientX, ev.clientY);
              }}
              onMouseMove={(ev) => {
                if (lastTipHtmlRef.current) {
                  handlersRef.current.onTooltipShow(
                    lastTipHtmlRef.current,
                    ev.clientX,
                    ev.clientY,
                  );
                }
              }}
              onMouseLeave={() => {
                lastTipHtmlRef.current = "";
                handlersRef.current.onTooltipHide();
              }}
              onDoubleClick={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                lastTipHtmlRef.current = "";
                handlersRef.current.onTooltipHide();
                handlersRef.current.onSystemDoubleClick(s);
              }}
            >
              {showNodeHalo(s) ? (
                <circle
                  cx={gx}
                  cy={gy}
                  r={GALAXY_COLOR_MODE_HALO_RADIUS}
                  fill={`url(#galaxy-node-halo-${s.id})`}
                  style={{ pointerEvents: "none" }}
                />
              ) : null}
              <circle
                cx={gx}
                cy={gy}
                r={GALAXY_NODE_RADIUS}
                fill={nodeStyle.fill}
                stroke={nodeStyle.stroke}
                strokeWidth={GALAXY_NODE_STROKE_WIDTH}
              />
              <text
                x={gx}
                y={gy + GALAXY_LABEL_OFFSET_Y}
                textAnchor="middle"
                fill="var(--muted)"
                fontSize={GALAXY_LABEL_FONT_PX}
              >
                {s.name || `System ${s.id}`}
              </text>
            </g>
          );
        })}
      </g>
    </>
  );
});

type Props = {
  data: GalaxyJSONDocument;
  handlersRef: MutableRefObject<GalaxyMapHandlers>;
  className?: string;
  draggingClass: string;
  mapColorMode: MapColorMode;
  mapCommodity: CommodityKey | null;
};

export function GalaxyMapSvg({
  data,
  handlersRef,
  className,
  draggingClass,
  mapColorMode,
  mapCommodity,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState<ViewBox>(() =>
    computeGalaxyBounds(data),
  );
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setViewBox(computeGalaxyBounds(data));
  }, [data]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      setViewBox((prev) => {
        const rect = el.getBoundingClientRect();
        const mx =
          ((ev.clientX - rect.left) / rect.width) * prev.width + prev.x;
        const my =
          ((ev.clientY - rect.top) / rect.height) * prev.height + prev.y;
        const factor = ev.deltaY > 0 ? 1.08 : 1 / 1.08;
        const nw = Math.min(Math.max(prev.width * factor, 50), prev.width * 64);
        const nh = prev.height * (nw / prev.width);
        return {
          x: mx - (mx - prev.x) * (nw / prev.width),
          y: my - (my - prev.y) * (nh / prev.height),
          width: nw,
          height: nh,
        };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const edges = useMemo(() => buildGalaxyEdges(data), [data]);

  const techRange = useMemo(() => computeGlobalTechRange(data), [data]);
  const planetCountRange = useMemo(
    () => computeStellarCountRange(data),
    [data],
  );

  const coloredNodeStyles = useMemo(() => {
    const m = new Map<number, { fill: string; stroke: string }>();
    if (mapColorMode === "commodity" && mapCommodity) {
      for (const s of data.systems) {
        m.set(s.id, systemCommodityNodeStyle(s, data, mapCommodity));
      }
    } else if (mapColorMode === "government") {
      for (const s of data.systems) {
        const gid = systemGovernmentId(s);
        const label = govtDisplayName(data, gid === -1 ? undefined : gid);
        m.set(s.id, governmentNodeStyle(gid, label));
      }
    } else if (mapColorMode === "tech_services") {
      for (const s of data.systems) {
        m.set(s.id, techServicesNodeStyle(s, data, techRange));
      }
    } else if (mapColorMode === "planet_count") {
      for (const s of data.systems) {
        m.set(s.id, planetCountNodeStyle(s, planetCountRange));
      }
    }
    return m;
  }, [data, mapColorMode, mapCommodity, techRange, planetCountRange]);

  const vbString = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const w = Math.max(el.clientWidth, 1);
    const h = Math.max(el.clientHeight, 1);
    setDragging(true);
    let lastX = e.clientX;
    let lastY = e.clientY;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      setViewBox((vb) => {
        const sx = vb.width / w;
        const sy = vb.height / h;
        return { ...vb, x: vb.x - dx * sx, y: vb.y - dy * sy };
      });
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      ref={containerRef}
      className={`${className ?? ""} ${dragging ? draggingClass : ""}`.trim()}
      onMouseDown={onMouseDown}
    >
      <svg
        width="100%"
        height="100%"
        style={{ background: "var(--bg)" }}
        viewBox={vbString}
      >
        <GalaxyMapScene
          data={data}
          edges={edges}
          coloredNodeStyles={coloredNodeStyles}
          mapColorMode={mapColorMode}
          mapCommodity={mapCommodity}
          handlersRef={handlersRef}
        />
      </svg>
    </div>
  );
}
