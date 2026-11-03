import Foundation
import ElementLockCore

enum AppGroup {
    /// Must match `EL_APP_GROUP` in project.yml (all four targets' entitlements).
    static let identifier = "group.app.elementlock"
}

/// App Group storage used by the app and its three extensions.
/// - `learning` is written only by the app.
/// - `unlock` is written by the app (grant) and the DeviceActivity monitor (re-block).
struct SharedStore {
    let defaults: UserDefaults
    /// false means the App Group entitlement is missing: extensions cannot see the app's data.
    let isShared: Bool

    init() {
        if let d = UserDefaults(suiteName: AppGroup.identifier) {
            defaults = d
            isShared = true
        } else {
            defaults = .standard
            isShared = false
        }
    }

    private enum Key {
        static let learning = "learning.v1"
        static let unlock = "unlock.v1"
        static let selection = "selection.v1"
        static let events = "events.v1"
    }

    /// nil when nothing is stored yet. `learningUnreadable` tells a corrupt value apart.
    var learning: LearningState? {
        get { defaults.data(forKey: Key.learning).flatMap { StateCodec.decode(LearningState.self, from: $0) } }
        nonmutating set { defaults.set(newValue.map { StateCodec.encode($0) }, forKey: Key.learning) }
    }

    var learningUnreadable: Bool {
        guard let data = defaults.data(forKey: Key.learning) else { return false }
        return StateCodec.decode(LearningState.self, from: data) == nil
    }

    var unlock: UnlockState {
        get { defaults.data(forKey: Key.unlock).flatMap { StateCodec.decode(UnlockState.self, from: $0) } ?? UnlockState() }
        nonmutating set { defaults.set(StateCodec.encode(newValue), forKey: Key.unlock) }
    }

    var selectionData: Data? {
        get { defaults.data(forKey: Key.selection) }
        nonmutating set { defaults.set(newValue, forKey: Key.selection) }
    }

    /// Short diagnostic trail (newest first) shown in Settings > 진단. No app names or content.
    var events: [String] { defaults.stringArray(forKey: Key.events) ?? [] }

    func log(_ message: String, at date: Date = Date()) {
        let stamp = ISO8601DateFormatter.string(from: date, timeZone: .current, formatOptions: [.withInternetDateTime])
        defaults.set(Array(([stamp + " " + message] + events).prefix(30)), forKey: Key.events)
    }
}
