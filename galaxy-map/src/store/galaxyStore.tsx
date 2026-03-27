import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { COMMODITY_ORDER, type CommodityKey } from "../commodityPrices";
import type { GalaxyJSONDocument, GalaxySystem } from "../galaxyTypes";

export type MapColorMode =
  | "default"
  | "commodity"
  | "government"
  | "tech_services"
  | "planet_count";

export type MapTooltipPayload = {
  html: string;
  clientX: number;
  clientY: number;
} | null;

type GalaxyState = {
  galaxyDoc: GalaxyJSONDocument | null;
  loadStatus: string;
  modalSystem: GalaxySystem | null;
  mapTooltip: MapTooltipPayload;
  mapColorMode: MapColorMode;
  /** Used when `mapColorMode === "commodity"`. */
  mapCommodity: CommodityKey | null;
};

const initialState: GalaxyState = {
  galaxyDoc: null,
  loadStatus: "",
  modalSystem: null,
  mapTooltip: null,
  mapColorMode: "default",
  mapCommodity: null,
};

type GalaxyAction =
  | { type: "LOAD_DOC"; doc: GalaxyJSONDocument }
  | { type: "SET_LOAD_STATUS"; message: string }
  | { type: "OPEN_MODAL"; system: GalaxySystem }
  | { type: "CLOSE_MODAL" }
  | { type: "SHOW_MAP_TOOLTIP"; payload: NonNullable<MapTooltipPayload> }
  | { type: "HIDE_MAP_TOOLTIP" }
  | { type: "SET_MAP_COMMODITY"; commodity: CommodityKey | null }
  | { type: "SET_MAP_COLOR_MODE"; mode: MapColorMode };

function galaxyReducer(state: GalaxyState, action: GalaxyAction): GalaxyState {
  switch (action.type) {
    case "LOAD_DOC": {
      const doc = action.doc;
      return {
        ...state,
        galaxyDoc: doc,
        modalSystem: null,
        loadStatus: `${doc.systems.length} systems · ${Object.keys(doc.stellarsById).length} spöb · ${doc.nebulae.length} nebulae`,
      };
    }
    case "SET_LOAD_STATUS":
      return { ...state, loadStatus: action.message };
    case "OPEN_MODAL":
      return { ...state, modalSystem: action.system };
    case "CLOSE_MODAL":
      return { ...state, modalSystem: null };
    case "SHOW_MAP_TOOLTIP":
      return { ...state, mapTooltip: action.payload };
    case "HIDE_MAP_TOOLTIP":
      return { ...state, mapTooltip: null };
    case "SET_MAP_COMMODITY":
      return { ...state, mapCommodity: action.commodity };
    case "SET_MAP_COLOR_MODE": {
      const mode = action.mode;
      let commodity = state.mapCommodity;
      if (mode === "commodity" && commodity === null) {
        commodity = COMMODITY_ORDER[0]!;
      }
      return { ...state, mapColorMode: mode, mapCommodity: commodity };
    }
    default:
      return state;
  }
}

type StoreContextValue = {
  state: GalaxyState;
  dispatch: Dispatch<GalaxyAction>;
};

const GalaxyStoreContext = createContext<StoreContextValue | null>(null);

export function GalaxyStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(galaxyReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <GalaxyStoreContext.Provider value={value}>{children}</GalaxyStoreContext.Provider>;
}

export function useGalaxyStore() {
  const ctx = useContext(GalaxyStoreContext);
  if (!ctx) {
    throw new Error("useGalaxyStore must be used within GalaxyStoreProvider");
  }
  const { state, dispatch } = ctx;

  const actions = useMemo(
    () => ({
      loadGalaxyDoc: (doc: GalaxyJSONDocument) => dispatch({ type: "LOAD_DOC", doc }),
      setLoadStatus: (message: string) => dispatch({ type: "SET_LOAD_STATUS", message }),
      openSystemModal: (system: GalaxySystem) => dispatch({ type: "OPEN_MODAL", system }),
      closeSystemModal: () => dispatch({ type: "CLOSE_MODAL" }),
      showMapTooltip: (html: string, clientX: number, clientY: number) =>
        dispatch({
          type: "SHOW_MAP_TOOLTIP",
          payload: { html, clientX, clientY },
        }),
      hideMapTooltip: () => dispatch({ type: "HIDE_MAP_TOOLTIP" }),
      setMapCommodity: (commodity: CommodityKey | null) =>
        dispatch({ type: "SET_MAP_COMMODITY", commodity }),
      setMapColorMode: (mode: MapColorMode) => dispatch({ type: "SET_MAP_COLOR_MODE", mode }),
    }),
    [dispatch]
  );

  return useMemo(
    () => ({
      galaxyDoc: state.galaxyDoc,
      loadStatus: state.loadStatus,
      modalSystem: state.modalSystem,
      mapTooltip: state.mapTooltip,
      mapColorMode: state.mapColorMode,
      mapCommodity: state.mapCommodity,
      ...actions,
    }),
    [
      state.galaxyDoc,
      state.loadStatus,
      state.modalSystem,
      state.mapTooltip,
      state.mapColorMode,
      state.mapCommodity,
      actions,
    ]
  );
}
