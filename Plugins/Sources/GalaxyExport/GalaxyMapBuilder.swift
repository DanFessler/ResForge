import Foundation
import OrderedCollections
import RFSupport

/// Nova resource type codes (UTF-8, matches `NovaTools` / in-file BRGR four-char strings).
private enum NovaRezType {
    static let system = "sÿst"
    static let spaceObject = "spöb"
    static let nebula = "nëbu"
    static let government = "gövt"
}

/// Stellar id range referenced from system nav defaults (`SystemWindowController`).
private let spobNavIdRange = 128...2175

/// Byte offset after fixed `sÿst` header (2 xy + 16 links + 16 nav defaults × int16).
private let systEnvironmentFieldOffset = 68

enum GalaxyMapBuilder {
    static func build(from resourceMap: OrderedDictionary<ResourceType, [Resource]>) throws -> GalaxyJSONDocument {
        func resources(matching code: String) -> [Resource] {
            var combined: [Resource] = []
            for (key, value) in resourceMap where key.code == code {
                combined.append(contentsOf: value)
            }
            return combined
        }

        let systResources = resources(matching: NovaRezType.system).sorted { $0.id < $1.id }
        let spobResources = resources(matching: NovaRezType.spaceObject)
        let nebuResources = resources(matching: NovaRezType.nebula).sorted { $0.id < $1.id }

        guard !systResources.isEmpty else {
            throw GalaxyExportError.missingResourceType(NovaRezType.system)
        }

        var spobById: [Int: Resource] = [:]
        for r in spobResources {
            spobById[r.id] = r
        }

        var stellarsById: [String: GalaxySpobDetail] = [:]
        for r in spobResources {
            stellarsById[String(r.id)] = parseSpobDetail(r)
        }

        var systemsOut: [GalaxySystem] = []
        systemsOut.reserveCapacity(systResources.count)

        for syst in systResources {
            systemsOut.append(try parseSystem(syst, spobById: spobById))
        }

        var nebulae: [GalaxyNebula] = []
        nebulae.reserveCapacity(nebuResources.count)
        for nebu in nebuResources {
            nebulae.append(try parseNebula(nebu))
        }

        let govtResources = resources(matching: NovaRezType.government).sorted { $0.id < $1.id }
        var governmentsById: [String: String] = [:]
        governmentsById.reserveCapacity(govtResources.count)
        for g in govtResources {
            governmentsById[String(g.id)] = g.name
        }

        return GalaxyJSONDocument(
            systems: systemsOut,
            stellarsById: stellarsById,
            nebulae: nebulae,
            governmentsById: governmentsById
        )
    }

    private static func parseSystem(_ resource: Resource, spobById: [Int: Resource]) throws -> GalaxySystem {
        guard resource.data.count >= 68 else {
            throw GalaxyExportError.insufficientSystemData(resourceId: resource.id)
        }
        let reader = BinaryDataReader(resource.data)
        let x = Int(try reader.read() as Int16)
        let y = Int(try reader.read() as Int16)
        var links: [Int] = []
        links.reserveCapacity(16)
        for _ in 0..<16 {
            let v = Int(try reader.read() as Int16)
            if v != -1 {
                links.append(v)
            }
        }

        var stellars: [GalaxySystemStellar] = []
        for _ in 0..<16 {
            let navId = Int(try reader.read() as Int16)
            guard spobNavIdRange ~= navId else { continue }
            guard let spob = spobById[navId] else {
                stellars.append(GalaxySystemStellar(spobId: navId, name: "", localX: 0, localY: 0, spinRaw: 0))
                continue
            }
            let detail = parseSpobDetail(spob)
            stellars.append(
                GalaxySystemStellar(
                    spobId: navId,
                    name: detail.name,
                    localX: detail.localX,
                    localY: detail.localY,
                    spinRaw: detail.spinRaw
                )
            )
        }

        let environment = parseSystemEnvironment(resource)
        return GalaxySystem(
            id: resource.id,
            name: resource.name,
            x: x,
            y: y,
            links: links,
            stellars: stellars,
            environment: environment
        )
    }

    /// Dude / traffic / government fields after nav defaults (see Nova bible `sÿst`).
    private static func parseSystemEnvironment(_ resource: Resource) -> GalaxySystemEnvironment? {
        // 8 dude + 8 %Prob + AvgShips + Govt + Message + Asteroids + Interference (each int16).
        let envBytes = (8 + 8 + 7) * 2
        guard resource.data.count >= systEnvironmentFieldOffset + envBytes else {
            return nil
        }

        let reader = BinaryDataReader(resource.data)
        do {
            try reader.setPosition(systEnvironmentFieldOffset)
            var dudeTypes: [Int] = []
            dudeTypes.reserveCapacity(8)
            for _ in 0..<8 {
                dudeTypes.append(Int(try reader.read() as Int16))
            }
            var probs: [Int] = []
            probs.reserveCapacity(8)
            for _ in 0..<8 {
                probs.append(Int(try reader.read() as Int16))
            }
            let avgShips = Int(try reader.read() as Int16)
            let govt = Int(try reader.read() as Int16)
            let message = Int(try reader.read() as Int16)
            let asteroids = Int(try reader.read() as Int16)
            let interference = Int(try reader.read() as Int16)
            return GalaxySystemEnvironment(
                dudeTypes: [Int](dudeTypes),
                shipPresenceProb: probs,
                avgShips: avgShips,
                govt: govt,
                messageBuoy: message,
                asteroids: asteroids,
                interference: interference
            )
        } catch {
            return nil
        }
    }

    /// Full `spöb` prefix after graphics: `flags`, econ, specials, defense fleet word (`SpobFilter` bytes 30–31), govt block.
    private static func parseSpobDetail(_ resource: Resource) -> GalaxySpobDetail {
        let data = resource.data
        let name = resource.name
        var lx = 0, ly = 0, spin = 0
        var flags: Int64 = 0
        var tribute = 0, techLevel = 0
        var specialTech = Array(repeating: 0, count: 8)
        var defenseFleetRaw = 0
        var govt = 0, minLanding = 0, custPic = 0, custSnd = 0, defDude = 0

        do {
            let r = BinaryDataReader(data)
            guard data.count >= 6 else {
                return GalaxySpobDetail(
                    name: name, localX: 0, localY: 0, spinRaw: 0,
                    flags: 0, tribute: 0, techLevel: 0, specialTech: specialTech,
                    defenseFleetRaw: 0, govt: 0, minLanding: 0, custPicId: 0, custSndId: 0, defenseDude: 0
                )
            }
            lx = Int(try r.read() as Int16)
            ly = Int(try r.read() as Int16)
            spin = Int(try r.read() as Int16)
            if data.count >= 10 {
                flags = Int64(try r.read() as UInt32)
            } else {
                return GalaxySpobDetail(
                    name: name, localX: lx, localY: ly, spinRaw: spin,
                    flags: 0, tribute: 0, techLevel: 0, specialTech: specialTech,
                    defenseFleetRaw: 0, govt: 0, minLanding: 0, custPicId: 0, custSndId: 0, defenseDude: 0
                )
            }
            if data.count >= 12 { tribute = Int(try r.read() as Int16) }
            if data.count >= 14 { techLevel = Int(try r.read() as Int16) }
            if data.count >= 30 {
                for i in 0..<8 {
                    specialTech[i] = Int(try r.read() as Int16)
                }
            }
            if data.count >= 32 { defenseFleetRaw = Int(try r.read() as Int16) }
            if data.count >= 42 {
                govt = Int(try r.read() as Int16)
                minLanding = Int(try r.read() as Int16)
                custPic = Int(try r.read() as Int16)
                custSnd = Int(try r.read() as Int16)
                defDude = Int(try r.read() as Int16)
            }
        } catch {
            /* leave defaults for partially read fields */
        }

        return GalaxySpobDetail(
            name: name,
            localX: lx,
            localY: ly,
            spinRaw: spin,
            flags: flags,
            tribute: tribute,
            techLevel: techLevel,
            specialTech: specialTech,
            defenseFleetRaw: defenseFleetRaw,
            govt: govt,
            minLanding: minLanding,
            custPicId: custPic,
            custSndId: custSnd,
            defenseDude: defDude
        )
    }

    private static func parseNebula(_ resource: Resource) throws -> GalaxyNebula {
        guard resource.data.count >= 8 else {
            return GalaxyNebula(id: resource.id, name: resource.name, x: 0, y: 0, width: 0, height: 0)
        }
        let reader = BinaryDataReader(resource.data)
        let x = Int(try reader.read() as Int16)
        let y = Int(try reader.read() as Int16)
        let w = Int(try reader.read() as Int16)
        let h = Int(try reader.read() as Int16)
        return GalaxyNebula(id: resource.id, name: resource.name, x: x, y: y, width: w, height: h)
    }
}
