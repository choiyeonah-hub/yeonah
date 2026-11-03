import DeviceActivity
import ElementLockCore
import Foundation

/// Re-applies the shield when a grant's DeviceActivity interval ends.
/// Runs even when the main app is in the background or terminated. The OS decides exactly when
/// the callback arrives, so re-blocking is "around" the expiry, not to the second.
final class DeviceActivityMonitorExtension: DeviceActivityMonitor {
    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        guard let sessionId = GrantActivity.sessionId(of: activity) else { return }
        let store = SharedStore()
        let now = Date()
        switch UnlockRules.onIntervalEnded(state: store.unlock, sessionId: sessionId, nowMillis: millis(now)) {
        case .reblock(let newState):
            // Shield first: if anything below fails, the apps are still restricted.
            if store.learning?.settings.lockEnabled ?? true {
                Shield.apply(store.selection)
            }
            store.unlock = newState
            store.log("monitor: reblocked session \(sessionId.prefix(8))", at: now)
        case .ignoreStale:
            store.log("monitor: ignored stale callback \(sessionId.prefix(8))", at: now)
        case .ignoreEarly:
            store.log("monitor: ignored early callback \(sessionId.prefix(8))", at: now)
        }
        DeviceActivityCenter().stopMonitoring([activity])
    }
}
