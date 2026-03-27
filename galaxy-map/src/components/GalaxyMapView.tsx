import { useRef } from "react";
import type { CommodityKey } from "../commodityPrices";
import type { GalaxyJSONDocument, GalaxySystem } from "../galaxyTypes";
import type { MapColorMode } from "../store/galaxyStore";
import { GalaxyMapSvg, type GalaxyMapHandlers } from "./GalaxyMapSvg";
import styles from "./GalaxyMapView.module.css";

export type GalaxyMapViewHandlers = {
  onSystemDoubleClick: (system: GalaxySystem) => void;
  onTooltipShow: (html: string, clientX: number, clientY: number) => void;
  onTooltipHide: () => void;
};

export function GalaxyMapView({
  data,
  handlers,
  mapColorMode,
  mapCommodity,
}: {
  data: GalaxyJSONDocument;
  handlers: GalaxyMapViewHandlers;
  mapColorMode: MapColorMode;
  mapCommodity: CommodityKey | null;
}) {
  const handlersRef = useRef<GalaxyMapHandlers>(handlers);
  handlersRef.current = handlers;

  return (
    <GalaxyMapSvg
      data={data}
      handlersRef={handlersRef}
      className={styles.root}
      draggingClass={styles.dragging}
      mapColorMode={mapColorMode}
      mapCommodity={mapCommodity}
    />
  );
}
