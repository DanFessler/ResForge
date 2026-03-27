import { useLayoutEffect, useRef, useState } from "react";
import type { MapTooltipPayload } from "../store/galaxyStore";
import styles from "./MapTooltip.module.css";

export function MapTooltip({ payload }: { payload: MapTooltipPayload }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!payload || !ref.current) return;
    const pad = 12;
    let left = payload.clientX + pad;
    let top = payload.clientY + pad;
    const tr = ref.current.getBoundingClientRect();
    if (left + tr.width > window.innerWidth - 8) {
      left = payload.clientX - tr.width - pad;
    }
    if (top + tr.height > window.innerHeight - 8) {
      top = payload.clientY - tr.height - pad;
    }
    setPos({ left, top });
  }, [payload]);

  if (!payload) return null;

  return (
    <aside
      ref={ref}
      className={styles.tooltip}
      style={{ left: pos.left, top: pos.top }}
      dangerouslySetInnerHTML={{ __html: payload.html }}
    />
  );
}
