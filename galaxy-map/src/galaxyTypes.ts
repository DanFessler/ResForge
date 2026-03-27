export interface GalaxySystemEnvironment {
  dudeTypes: number[];
  shipPresenceProb: number[];
  avgShips: number;
  govt: number;
  messageBuoy: number;
  asteroids: number;
  interference: number;
}

export interface GalaxySystemStellar {
  spobId: number;
  name: string;
  localX: number;
  localY: number;
  spinRaw: number;
}

export interface GalaxySystem {
  id: number;
  name: string;
  x: number;
  y: number;
  links: number[];
  stellars: GalaxySystemStellar[];
  environment?: GalaxySystemEnvironment;
}

/** Full `spöb` export; older JSON may omit extended fields. */
export interface GalaxySpobDetail {
  name: string;
  localX: number;
  localY: number;
  spinRaw: number;
  flags?: number;
  tribute?: number;
  techLevel?: number;
  specialTech?: number[];
  defenseFleetRaw?: number;
  govt?: number;
  minLanding?: number;
  custPicId?: number;
  custSndId?: number;
  defenseDude?: number;
}

export interface GalaxyNebula {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GalaxyJSONDocument {
  systems: GalaxySystem[];
  stellarsById: Record<string, GalaxySpobDetail>;
  nebulae: GalaxyNebula[];
  /** `gövt` id string → display name */
  governmentsById?: Record<string, string>;
}
