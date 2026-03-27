/** EV Nova spöb commodity price tiers (mutually exclusive per category; Nova bible flag masks). */
export type CommodityPriceTier = "none" | "low" | "med" | "high";

export type CommodityKey =
  | "food"
  | "industrial"
  | "medical"
  | "luxury"
  | "metal"
  | "equipment";

export type CommodityPrices = Record<CommodityKey, CommodityPriceTier>;

const MASKS: Record<CommodityKey, { low: number; med: number; high: number }> = {
  equipment: { low: 0x00000100, med: 0x00000200, high: 0x00000400 },
  metal: { low: 0x00001000, med: 0x00002000, high: 0x00004000 },
  luxury: { low: 0x00010000, med: 0x00020000, high: 0x00040000 },
  medical: { low: 0x00100000, med: 0x00200000, high: 0x00400000 },
  industrial: { low: 0x01000000, med: 0x02000000, high: 0x04000000 },
  food: { low: 0x10000000, med: 0x20000000, high: 0x40000000 },
};

function tierForCategory(f: number, key: CommodityKey): CommodityPriceTier {
  const { low, med, high } = MASKS[key];
  if ((f & high) !== 0) return "high";
  if ((f & med) !== 0) return "med";
  if ((f & low) !== 0) return "low";
  return "none";
}

/** Decode six standard commodities from `spöb` flags (`none` = won't trade / no tier set). */
export function decodeCommodityPrices(flags: number | undefined): CommodityPrices | undefined {
  if (flags === undefined) return undefined;
  const f = flags >>> 0;
  return {
    food: tierForCategory(f, "food"),
    industrial: tierForCategory(f, "industrial"),
    medical: tierForCategory(f, "medical"),
    luxury: tierForCategory(f, "luxury"),
    metal: tierForCategory(f, "metal"),
    equipment: tierForCategory(f, "equipment"),
  };
}

export function tierDisplay(t: CommodityPriceTier): string {
  if (t === "none") return "Won't trade";
  return t === "med" ? "Medium" : t[0]!.toUpperCase() + t.slice(1);
}

export const COMMODITY_LABELS: Record<CommodityKey, string> = {
  food: "Food",
  industrial: "Industrial",
  medical: "Medical",
  luxury: "Luxury",
  metal: "Metal",
  equipment: "Equipment",
};

export const COMMODITY_ORDER: CommodityKey[] = [
  "food",
  "industrial",
  "medical",
  "luxury",
  "metal",
  "equipment",
];

export function commodityRowsHtml(prices: CommodityPrices): string {
  return COMMODITY_ORDER
    .map(
      (k) =>
        `<tr><th>${COMMODITY_LABELS[k]}</th><td>${tierDisplay(prices[k])}</td></tr>`
    )
    .join("");
}
