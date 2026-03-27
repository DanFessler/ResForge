import { useEffect } from "react";
import { useGalaxyStore } from "../store/galaxyStore";
import type { GalaxyJSONDocument } from "../galaxyTypes";

/** Loads `/galaxy.json` once; updates the galaxy store. */
export function GalaxyBootstrap() {
  const { loadGalaxyDoc, setLoadStatus } = useGalaxyStore();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/galaxy.json");
        if (!res.ok) throw new Error(`${res.status}`);
        const doc = (await res.json()) as GalaxyJSONDocument;
        if (!cancelled) loadGalaxyDoc(doc);
      } catch {
        if (!cancelled) {
          setLoadStatus(
            "No galaxy.json served — add public/galaxy.json or run galaxy-export."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadGalaxyDoc, setLoadStatus]);

  return null;
}
