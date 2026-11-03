// swift-tools-version:5.9
// Platform-independent learning and unlock rules. No Screen Time APIs here, so `swift test`
// runs on macOS (and Linux) without a device.
import PackageDescription

let package = Package(
    name: "ElementLockCore",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [.library(name: "ElementLockCore", targets: ["ElementLockCore"])],
    targets: [
        .target(name: "ElementLockCore"),
        .testTarget(name: "ElementLockCoreTests", dependencies: ["ElementLockCore"]),
    ]
)
