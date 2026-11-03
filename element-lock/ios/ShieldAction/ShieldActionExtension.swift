import ManagedSettings
import UserNotifications

/// Handles the buttons on the system shield. The quiz itself always runs in the main app.
/// - iOS 26.5+: the primary button opens 원소잠금 through the official `.openParentalControlsApp` response.
/// - Earlier iOS, or a build made with an SDK older than 26.5: there is no official way to open an app from the shield, so we post a local
///   notification the user can tap (needs notification permission) and close the shield.
final class ShieldActionExtension: ShieldActionDelegate {
    override func handle(action: ShieldAction, for application: ApplicationToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        respond(to: action, completionHandler)
    }

    override func handle(action: ShieldAction, for webDomain: WebDomainToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        respond(to: action, completionHandler)
    }

    override func handle(action: ShieldAction, for category: ActivityCategoryToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        respond(to: action, completionHandler)
    }

    private func respond(to action: ShieldAction, _ completionHandler: @escaping (ShieldActionResponse) -> Void) {
        switch action {
        case .primaryButtonPressed:
            #if EL_SDK_OPEN_PARENT_APP
            if #available(iOS 26.5, *) {
                completionHandler(.openParentalControlsApp)
                return
            }
            #endif
            postOpenAppReminder { completionHandler(.close) }
        case .secondaryButtonPressed:
            completionHandler(.close)
        @unknown default:
            completionHandler(.close)
        }
    }

    private func postOpenAppReminder(then done: @escaping () -> Void) {
        let content = UNMutableNotificationContent()
        content.title = NSLocalizedString("reminder.title", comment: "")
        content.body = NSLocalizedString("reminder.body", comment: "")
        let request = UNNotificationRequest(identifier: "open-element-lock", content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request) { _ in done() }
    }
}
