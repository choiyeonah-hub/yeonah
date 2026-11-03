import Foundation

enum Capabilities {
    /// true when the shield's primary button can open 원소잠금 directly
    /// (`ShieldActionResponse.openParentalControlsApp`): needs the iOS 26.5 SDK at build time
    /// AND iOS 26.5+ at run time. Otherwise the notification fallback is used and described.
    static var shieldCanOpenApp: Bool {
        #if EL_SDK_OPEN_PARENT_APP
        if #available(iOS 26.5, *) { return true }
        #endif
        return false
    }
}
