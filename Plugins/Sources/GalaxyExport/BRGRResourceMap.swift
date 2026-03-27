import Foundation
import OrderedCollections
import RFSupport

/// Reads Burgerlib BRGR `.rez` files into a resource map.
/// Logic matches ``RezFormat.read(_:)`` in `ResForge/Formats/RezFormat.swift`; keep in sync when fixing parser bugs.
enum BRGRResourceMap {
    static let signature = UInt32(fourCharString: "BRGR")
    static let groupType: UInt32 = 1
    static let resourceNameLength = 256

    static func read(_ data: Data) throws -> OrderedDictionary<ResourceType, [Resource]> {
        var resourceMap: OrderedDictionary<ResourceType, [Resource]> = [:]
        let reader = BinaryDataReader(data, bigEndian: false)

        let signature = try reader.read(bigEndian: true) as UInt32
        let numGroups = try reader.read() as UInt32
        let headerLength = try reader.read() as UInt32
        let groupType = try reader.read() as UInt32
        let baseIndex = Int(try reader.read() as UInt32)
        let numEntries = Int(try reader.read() as UInt32)
        guard signature == Self.signature,
              numGroups == 1,
              headerLength <= data.count,
              groupType == Self.groupType,
              numEntries >= 1
        else {
            throw GalaxyExportError.unsupportedOrCorruptRez(signature: signature)
        }

        var offsets: [Int] = []
        var sizes: [Int] = []
        for _ in 0..<numEntries {
            offsets.append(Int(try reader.read() as UInt32))
            sizes.append(Int(try reader.read() as UInt32))
            try reader.advance(4)
        }

        let mapOffset = offsets.last!
        try reader.setPosition(mapOffset)
        reader.bigEndian = true
        let typeListOffset = Int(try reader.read() as UInt32) + mapOffset
        let numTypes = try reader.read() as UInt32

        try reader.setPosition(typeListOffset)
        for _ in 0..<numTypes {
            let type = (try reader.read() as UInt32).fourCharString
            let resourceListOffset = Int(try reader.read() as UInt32) + mapOffset
            let numResources = try reader.read() as UInt32
            let resourceType = ResourceType(type)

            try reader.pushPosition(resourceListOffset)
            var resources: [Resource] = []
            for _ in 0..<numResources {
                let index = Int(try reader.read() as UInt32) - baseIndex
                guard 0..<numEntries ~= index else {
                    throw GalaxyExportError.corruptResourceMap
                }
                try reader.advance(4)
                let id = Int(try reader.read() as Int16)
                let nextOffset = reader.bytesRead + Self.resourceNameLength

                let name = try reader.readCString(encoding: .macOSRoman)

                try reader.setPosition(offsets[index])
                let resourceData = try reader.readData(length: sizes[index])
                try reader.setPosition(nextOffset)

                let resource = Resource(type: resourceType, id: id, name: name, data: resourceData)
                resources.append(resource)
            }
            resourceMap[resourceType] = resources
            reader.popPosition()
        }

        return resourceMap
    }
}
