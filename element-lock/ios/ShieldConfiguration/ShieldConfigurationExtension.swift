import ElementLockCore
import ManagedSettings
import ManagedSettingsUI
import UIKit

/// Customises the system shield. Only the system-provided fields (icon, title, subtitle, two buttons)
/// are available; the quiz cannot run here and is solved in the main app.
final class ShieldConfigurationExtension: ShieldConfigurationDataSource {
    override func configuration(shielding application: Application) -> ShieldConfiguration { make() }

    override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration { make() }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration { make() }

    override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration { make() }

    private func make() -> ShieldConfiguration {
        let minutes = SharedStore().learning?.settings.allowance.rawValue ?? 15
        let opensApp: Bool
        if #available(iOS 26.5, *) { opensApp = true } else { opensApp = false }
        let subtitle = String(format: NSLocalizedString(opensApp ? "shield.subtitle" : "shield.subtitle.legacy", comment: ""), minutes)
        let primary = NSLocalizedString(opensApp ? "shield.primary" : "shield.primary.legacy", comment: "")
        let navy = UIColor(red: 0.04, green: 0.09, blue: 0.19, alpha: 1)
        let mint = UIColor(red: 0.24, green: 0.90, blue: 0.76, alpha: 1)
        return ShieldConfiguration(
            backgroundBlurStyle: .systemUltraThinMaterialDark,
            backgroundColor: navy,
            icon: UIImage(systemName: "atom"),
            title: .init(text: NSLocalizedString("shield.title", comment: ""), color: .white),
            subtitle: .init(text: subtitle, color: UIColor.white.withAlphaComponent(0.85)),
            primaryButtonLabel: .init(text: primary, color: navy),
            primaryButtonBackgroundColor: mint,
            secondaryButtonLabel: .init(text: NSLocalizedString("shield.secondary", comment: ""), color: .white)
        )
    }
}
