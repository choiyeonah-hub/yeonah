import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

extension ManagedSettingsStore.Name {
    static let elementLock = Self("elementlock")
}

/// One DeviceActivity name per grant session, so an old callback can be told apart from the current one.
enum GrantActivity {
    static let prefix = "elementlock.grant."

    static func name(sessionId: String) -> DeviceActivityName { DeviceActivityName(prefix + sessionId) }

    static func sessionId(of activity: DeviceActivityName) -> String? {
        activity.rawValue.hasPrefix(prefix) ? String(activity.rawValue.dropFirst(prefix.count)) : nil
    }
}

extension SharedStore {
    var selection: FamilyActivitySelection {
        get { selectionData.flatMap { try? JSONDecoder().decode(FamilyActivitySelection.self, from: $0) } ?? FamilyActivitySelection() }
        nonmutating set { selectionData = try? JSONEncoder().encode(newValue) }
    }
}

extension FamilyActivitySelection {
    var isEmptySelection: Bool {
        applicationTokens.isEmpty && categoryTokens.isEmpty && webDomainTokens.isEmpty
    }
}

/// Applies or removes the shield for exactly the user's selection. Nothing else is restricted.
enum Shield {
    static func apply(_ selection: FamilyActivitySelection) {
        let store = ManagedSettingsStore(named: .elementLock)
        store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
        store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
        let categories = selection.categoryTokens
        store.shield.applicationCategories = categories.isEmpty ? nil : .specific(categories)
        store.shield.webDomainCategories = categories.isEmpty ? nil : .specific(categories)
    }

    static func clear() {
        ManagedSettingsStore(named: .elementLock).clearAllSettings()
    }
}
