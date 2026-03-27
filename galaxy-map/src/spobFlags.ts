/** EV Nova `spöb` flag bits (Nova bible). */
export const SPOB_FLAG_CAN_LAND = 0x00000001;
export const SPOB_FLAG_COMMODITY_EXCHANGE = 0x00000002;
export const SPOB_FLAG_OUTFIT_SHIP = 0x00000004;
export const SPOB_FLAG_BUY_SHIPS = 0x00000008;
export const SPOB_FLAG_LAND_IF_DESTROYED_FIRST = 0x00000080;

const SPOB_FLAG_BITS: [number, string][] = [
  [SPOB_FLAG_CAN_LAND, "Can land / dock"],
  [SPOB_FLAG_COMMODITY_EXCHANGE, "Commodity exchange"],
  [SPOB_FLAG_OUTFIT_SHIP, "Outfit ship"],
  [SPOB_FLAG_BUY_SHIPS, "Buy ships"],
  [0x00000010, "Station (not planet)"],
  [0x00000020, "Uninhabited"],
  [0x00000040, "Bar"],
  [SPOB_FLAG_LAND_IF_DESTROYED_FIRST, "Land only if destroyed first"],
];

/** True when the player can normally land/dock for trade (used to gate commodity map coloring). */
export function canPlayerLandAtSpob(flags: number | undefined): boolean {
  if (flags === undefined) return false;
  const f = flags >>> 0;
  if ((f & SPOB_FLAG_LAND_IF_DESTROYED_FIRST) !== 0) return false;
  return (f & SPOB_FLAG_CAN_LAND) !== 0;
}

export function describeSpobFlags(flags: number | undefined): string[] {
  if (flags === undefined || flags === 0) return [];
  const f = flags >>> 0;
  const out: string[] = [];
  for (const [mask, label] of SPOB_FLAG_BITS) {
    if ((f & mask) !== 0) out.push(label);
  }
  if (out.length === 0) return [`0x${f.toString(16)} (no named flags)`];
  return out;
}
