import { useEffect, useMemo, useRef, useState } from "react";
import type { GalaxySystem } from "../galaxyTypes";
import { computeSystemMapLayout, SYSTEM_MAP_PAD, type ViewBox } from "../mapGeometry";
import styles from "./SystemMapSvg.module.css";

type Props = {
  system: GalaxySystem;
  selectedSpobId: number | null;
  onSelectSpob: (spobId: number) => void;
  onDeselect: () => void;
};

export function SystemMapSvg({ system, selectedSpobId, onSelectSpob, onDeselect }: Props) {
  const layout = useMemo(() => computeSystemMapLayout(system), [system]);
  const containerRef = useRef<HTMLDivElement>(null);
  const panMovedRef = useRef(false);
  const [viewBox, setViewBox] = useState<ViewBox>(layout.viewBox);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setViewBox(layout.viewBox);
  }, [layout]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      setViewBox((prev) => {
        const rect = el.getBoundingClientRect();
        const mx = ((ev.clientX - rect.left) / rect.width) * prev.width + prev.x;
        const my = ((ev.clientY - rect.top) / rect.height) * prev.height + prev.y;
        const factor = ev.deltaY > 0 ? 1.08 : 1 / 1.08;
        const nw = Math.min(Math.max(prev.width * factor, 40), prev.width * 48);
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

  const { hitX, hitY, hitW, hitH, minX, maxX, minY, maxY } = layout;
  const vbString = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const w = Math.max(el.clientWidth, 1);
    const h = Math.max(el.clientHeight, 1);
    setDragging(true);
    panMovedRef.current = false;
    let lastX = e.clientX;
    let lastY = e.clientY;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      if (dx !== 0 || dy !== 0) panMovedRef.current = true;
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

  const onHitBackgroundClick = () => {
    if (panMovedRef.current) {
      panMovedRef.current = false;
      return;
    }
    onDeselect();
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.root} ${dragging ? styles.dragging : ""}`}
      onMouseDown={onMouseDown}
    >
      <svg className={styles.svg} viewBox={vbString}>
        {/*
          Hit layer under planets (same as original imperative order) so planets receive clicks;
          axes use pointer-events: none so empty space still hits this rect.
        */}
        <rect
          x={hitX}
          y={hitY}
          width={hitW}
          height={hitH}
          fill="transparent"
          className={styles.hit}
          onClick={onHitBackgroundClick}
        />
        <line
          x1={minX - SYSTEM_MAP_PAD}
          y1={0}
          x2={maxX + SYSTEM_MAP_PAD}
          y2={0}
          className={styles.axis}
        />
        <line
          x1={0}
          y1={minY - SYSTEM_MAP_PAD}
          x2={0}
          y2={maxY + SYSTEM_MAP_PAD}
          className={styles.axis}
        />
        {system.stellars.map((st) => (
          <g
            key={st.spobId}
            style={{ cursor: "pointer" }}
            onClick={(ev) => {
              ev.stopPropagation();
              onSelectSpob(st.spobId);
            }}
          >
            <circle
              cx={st.localX}
              cy={st.localY}
              r={14}
              className={`${styles.planet} ${selectedSpobId === st.spobId ? styles.planetSelected : ""}`}
            />
            <text x={st.localX + 18} y={st.localY + 4} className={styles.plname}>
              {st.name || `#${st.spobId}`}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
