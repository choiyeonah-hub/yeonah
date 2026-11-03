import DeviceActivity
import ElementLockCore
import Foundation

/// Registers the OS schedule whose end re-blocks the apps (handled by the monitor extension).
/// The in-app countdown is display only; it never re-blocks by itself.
enum GrantScheduler {
    /// DeviceActivity rejects intervals shorter than 15 minutes (`intervalTooShort`).
    /// We keep the end at the exact expiry and move the start back instead; the start may be in the past.
    static let minimumInterval: TimeInterval = 15 * 60
    static let startPadding: TimeInterval = 60

    static func schedule(_ grant: Grant, calendar: Calendar = .current) throws {
        let center = DeviceActivityCenter()
        cancelAll(center)
        let end = Date(timeIntervalSince1970: TimeInterval(grant.expiresAtMillis) / 1000)
        let start = end.addingTimeInterval(-(minimumInterval + startPadding))
        let parts: Set<Calendar.Component> = [.hour, .minute, .second]
        let schedule = DeviceActivitySchedule(
            intervalStart: calendar.dateComponents(parts, from: start),
            intervalEnd: calendar.dateComponents(parts, from: end),
            repeats: false
        )
        try center.startMonitoring(GrantActivity.name(sessionId: grant.sessionId), during: schedule)
    }

    static func cancelAll(_ center: DeviceActivityCenter = DeviceActivityCenter()) {
        let grants = center.activities.filter { GrantActivity.sessionId(of: $0) != nil }
        if !grants.isEmpty { center.stopMonitoring(grants) }
    }

    static func message(for error: Error) -> String {
        if let e = error as? DeviceActivityCenter.MonitoringError {
            switch e {
            case .unauthorized: return L("error.schedule.unauthorized")
            case .intervalTooShort, .intervalTooLong, .invalidDateComponents: return L("error.schedule.interval")
            case .excessiveActivities: return L("error.schedule.tooMany")
            @unknown default: break
            }
        }
        return L("error.schedule.generic", error.localizedDescription)
    }
}
