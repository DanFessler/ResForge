import Foundation

/// Root document written for the Vite galaxy map and other consumers.
struct GalaxyJSONDocument: Codable {
    var systems: [GalaxySystem]
    /// Space objects (`spöb`) keyed by decimal id string.
    var stellarsById: [String: GalaxySpobDetail]
    var nebulae: [GalaxyNebula]
    /// `gövt` resource id (string) → resource name for UI lookup (absent in older exports).
    var governmentsById: [String: String]?
}

struct GalaxySystem: Codable {
    var id: Int
    var name: String
    var x: Int
    var y: Int
    var links: [Int]
    var stellars: [GalaxySystemStellar]
    /// Populated when `sÿst` resource contains dude / traffic / govt fields after nav defaults (Nova bible).
    var environment: GalaxySystemEnvironment?
}

/// `sÿst` fields following the 16 nav defaults (big-endian on disk).
struct GalaxySystemEnvironment: Codable {
    /// `DudeTypes` + `-128..<-383` fleet ids — raw int16 values from the resource.
    var dudeTypes: [Int]
    /// `% Prob` × 8 (0–100).
    var shipPresenceProb: [Int]
    var avgShips: Int
    /// Controlling `gövt` id, 128–383, or `-1` if independent.
    var govt: Int
    var messageBuoy: Int
    var asteroids: Int
    /// Navigation static (0–100).
    var interference: Int
}

struct GalaxySystemStellar: Codable {
    var spobId: Int
    var name: String
    var localX: Int
    var localY: Int
    var spinRaw: Int
}

/// Parsed `spöb` record (offsets per EV Nova / ResForge `SpobFilter` on raw plug-in data).
struct GalaxySpobDetail: Codable {
    var name: String
    var localX: Int
    var localY: Int
    /// `Type` field; sprite index uses `+ 1000` for `spïn` id in-game.
    var spinRaw: Int
    /// Bit flags (`OR` of Nova spöb flag constants).
    var flags: Int64
    var tribute: Int
    var techLevel: Int
    var specialTech: [Int]
    /// Raw defense fleet field at bytes 30–31 (wave encoding if ≥ 1000).
    var defenseFleetRaw: Int
    var govt: Int
    var minLanding: Int
    var custPicId: Int
    var custSndId: Int
    var defenseDude: Int
}

struct GalaxyNebula: Codable {
    var id: Int
    var name: String
    var x: Int
    var y: Int
    var width: Int
    var height: Int
}
