import type { GalaxyJSONDocument } from "./galaxyTypes";

export function govtDisplayName(doc: GalaxyJSONDocument, govtId: number | undefined): string {
  if (govtId === undefined || govtId === -1) return "Independent";
  if (govtId === 0) return "—";
  const name = doc.governmentsById?.[String(govtId)];
  return name && name.length > 0 ? name : `Government ${govtId}`;
}
