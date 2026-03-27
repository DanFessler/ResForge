import Darwin
import Foundation

private func run() -> Int32 {
    var args = Array(CommandLine.arguments.dropFirst())
    var pretty = false
    args.removeAll {
        if $0 == "--pretty" || $0 == "-p" {
            pretty = true
            return true
        }
        return false
    }

    guard let inputPath = args.first else {
        fputs("usage: galaxy-export [--pretty] <input.rez> [output.json]\n", stderr)
        fputs("  Default output: <input>.json beside the input file.\n", stderr)
        return 2
    }

    let inputURL = URL(fileURLWithPath: inputPath, isDirectory: false)
    let outputURL: URL
    if args.count >= 2 {
        outputURL = URL(fileURLWithPath: args[1], isDirectory: false)
    } else {
        outputURL = inputURL.deletingPathExtension().appendingPathExtension("json")
    }

    do {
        let data = try Data(contentsOf: inputURL)
        let map = try BRGRResourceMap.read(data)
        let document = try GalaxyMapBuilder.build(from: map)

        try FileManager.default.createDirectory(
            at: outputURL.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )

        let encoder = JSONEncoder()
        encoder.outputFormatting = pretty ? [.sortedKeys, .prettyPrinted] : [.sortedKeys]
        let json = try encoder.encode(document)
        try json.write(to: outputURL, options: [.atomic])

        let count = document.systems.count
        fputs("Wrote \(outputURL.path) (\(count) systems, \(document.stellarsById.count) spöb, \(document.nebulae.count) nebulae).\n", stderr)
        return 0
    } catch {
        fputs("galaxy-export: \(error.localizedDescription)\n", stderr)
        return 1
    }
}

exit(Int32(run()))
