import Foundation

enum GalaxyExportError: LocalizedError {
    case unsupportedOrCorruptRez(signature: UInt32)
    case corruptResourceMap
    case missingResourceType(String)
    case insufficientSystemData(resourceId: Int)
    case insufficientStellarData(resourceId: Int)

    var errorDescription: String? {
        switch self {
        case .unsupportedOrCorruptRez(let s):
            return "Not a valid BRGR .rez file (signature 0x\(String(s, radix: 16)); expected BRGR)."
        case .corruptResourceMap:
            return "Resource map entry indexes are out of range."
        case .missingResourceType(let code):
            return "No resources of type \(code) found in file."
        case .insufficientSystemData(let id):
            return "System \(id) data is too short (expected at least 68 bytes)."
        case .insufficientStellarData(let id):
            return "Stellar \(id) data is too short for position fields."
        }
    }
}
