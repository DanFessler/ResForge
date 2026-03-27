import { useCallback, useMemo, type ChangeEvent } from "react";
import { COMMODITY_LABELS, COMMODITY_ORDER, type CommodityKey } from "../commodityPrices";
import { buildGovernmentLegend } from "../mapGovernmentColors";
import { buildPlanetCountLegend, computeStellarCountRange } from "../mapPlanetCount";
import { buildTechServicesLegend, computeGlobalTechRange } from "../mapTechServices";
import { useGalaxyStore, type MapColorMode } from "../store/galaxyStore";
import { MAP_COMMODITY_LEGEND } from "../systemCommodityOverlay";
import { GalaxyBootstrap } from "./GalaxyBootstrap";
import styles from "./App.module.css";
import { GalaxyMapView } from "./GalaxyMapView";
import { MapTooltip } from "./MapTooltip";
import { SystemModal } from "./SystemModal";

const MAP_COLOR_MODE_OPTIONS: { value: MapColorMode; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "commodity", label: "Commodity" },
  { value: "government", label: "Government" },
  { value: "tech_services", label: "Tech & services" },
  { value: "planet_count", label: "Planet count" },
];

export function App() {
  const {
    galaxyDoc,
    loadStatus,
    modalSystem,
    mapTooltip,
    mapColorMode,
    mapCommodity,
    openSystemModal,
    closeSystemModal,
    showMapTooltip,
    hideMapTooltip,
    setMapCommodity,
    setMapColorMode,
  } = useGalaxyStore();

  const govLegendEntries = useMemo(
    () => (galaxyDoc ? buildGovernmentLegend(galaxyDoc) : []),
    [galaxyDoc]
  );

  const techServicesLegend = useMemo(
    () => buildTechServicesLegend(galaxyDoc ? computeGlobalTechRange(galaxyDoc) : null),
    [galaxyDoc]
  );

  const planetCountLegend = useMemo(
    () =>
      buildPlanetCountLegend(galaxyDoc ? computeStellarCountRange(galaxyDoc) : null),
    [galaxyDoc]
  );

  const { legendItems, legendScroll } = useMemo(() => {
    const scroll = mapColorMode === "government";
    let items: { label: string; fill: string; stroke: string; muted?: boolean }[] = [];

    switch (mapColorMode) {
      case "default":
        items = [
          {
            label: "Has bodies",
            fill: "var(--node-fill)",
            stroke: "var(--node)",
          },
          {
            label: "No bodies",
            fill: "#4a5160",
            stroke: "#ffffff",
            muted: true,
          },
        ];
        break;
      case "commodity":
        items = MAP_COMMODITY_LEGEND.map((item) => ({
          ...item,
          muted: item.label === "No bodies",
        }));
        break;
      case "tech_services":
        items = techServicesLegend.map((item) => ({
          ...item,
          muted:
            item.label === "No bodies" ||
            item.label === "No tech data" ||
            item.label === "No tech in export",
        }));
        break;
      case "planet_count":
        items = planetCountLegend.map((item) => ({
          ...item,
          muted:
            item.label === "No bodies" || item.label === "No bodies in galaxy",
        }));
        break;
      case "government":
        items = govLegendEntries.map((entry) => ({
          label: entry.label,
          fill: entry.fill,
          stroke: entry.stroke,
          muted: entry.label === "Independent",
        }));
        break;
    }

    return { legendItems: items, legendScroll: scroll };
  }, [mapColorMode, techServicesLegend, planetCountLegend, govLegendEntries]);

  const onMapColorModeChange = useCallback(
    (ev: ChangeEvent<HTMLSelectElement>) => {
      setMapColorMode(ev.target.value as MapColorMode);
    },
    [setMapColorMode]
  );

  const onCommodityChange = useCallback(
    (ev: ChangeEvent<HTMLSelectElement>) => {
      setMapCommodity(ev.target.value as CommodityKey);
    },
    [setMapCommodity]
  );

  const mapHandlers = {
    onSystemDoubleClick: openSystemModal,
    onTooltipShow: showMapTooltip,
    onTooltipHide: hideMapTooltip,
  };

  return (
    <div className={styles.layout}>
      <GalaxyBootstrap />
      <header className={styles.toolbar}>
        <div className={styles.toolbarTop}>
          <h1>Galaxy map</h1>
          <span className={styles.hintBar}>
            Double-click a system for the solar map and spöb details.
          </span>
          <label className={styles.commodityLabel}>
            <span className={styles.commodityLabelText}>Map color</span>
            <select
              className={styles.commoditySelect}
              aria-label="Map color mode"
              value={mapColorMode}
              onChange={onMapColorModeChange}
            >
              {MAP_COLOR_MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.legendRow} aria-label="Map color legend">
          {mapColorMode === "government" && !galaxyDoc ? (
            <span className={styles.legendPlaceholder}>
              Load galaxy data to show the government color key.
            </span>
          ) : (
            <div
              className={`${styles.commodityLegend}${legendScroll ? ` ${styles.legendScroll}` : ""}`}
            >
              {legendItems.map((item, i) => (
                <span
                  key={`${mapColorMode}-${item.label}-${i}`}
                  className={`${styles.legendItem}${item.muted ? ` ${styles.legendItemMuted}` : ""}`}
                  title={item.label}
                >
                  <svg className={styles.legendSwatch} viewBox="0 0 12 12" aria-hidden>
                    <circle
                      cx={6}
                      cy={6}
                      r={5}
                      fill={item.fill}
                      stroke={item.stroke}
                      strokeWidth={1}
                    />
                  </svg>
                  <span className={styles.legendLabel}>{item.label}</span>
                </span>
              ))}
            </div>
          )}
          {mapColorMode === "commodity" ? (
            <label className={`${styles.commodityLabel} ${styles.legendRowCommodity}`}>
              <span className={styles.commodityLabelText}>Commodity</span>
              <select
                className={styles.commoditySelect}
                aria-label="Color map by commodity price"
                title="Only spöbs you can land on (Nova flags) count toward the system color."
                value={mapCommodity ?? COMMODITY_ORDER[0]!}
                onChange={onCommodityChange}
              >
                {COMMODITY_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {COMMODITY_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </header>
      <div className={styles.mapStage}>
        {galaxyDoc ? (
          <GalaxyMapView
            data={galaxyDoc}
            handlers={mapHandlers}
            mapColorMode={mapColorMode}
            mapCommodity={mapCommodity}
          />
        ) : (
          <div className={styles.mapPlaceholder} aria-hidden />
        )}
        {loadStatus ? (
          <div className={styles.mapStatsOverlay} role="status">
            {loadStatus}
          </div>
        ) : null}
      </div>
      <MapTooltip payload={mapTooltip} />
      <SystemModal
        open={modalSystem !== null}
        doc={galaxyDoc}
        system={modalSystem}
        onClose={closeSystemModal}
      />
    </div>
  );
}
