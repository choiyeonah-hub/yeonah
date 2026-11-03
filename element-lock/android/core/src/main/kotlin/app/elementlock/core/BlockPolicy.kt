package app.elementlock.core

/**
 * Android only uses the foreground package name to decide whether to cover it with the block screen.
 * Pure function so it can be tested without a device.
 */
object BlockPolicy {
    /** Packages that must never be blocked or picked, independent of the device. */
    val ALWAYS_ALLOWED = setOf(
        "com.android.settings",
        "com.android.phone",
        "com.android.server.telecom",
        "com.android.emergency",
        "com.google.android.dialer",
        "com.android.dialer",
        "com.android.systemui",
        "com.android.permissioncontroller",
        "com.google.android.permissioncontroller",
        "com.android.packageinstaller",
        "com.google.android.packageinstaller",
    )

    enum class Action { BLOCK, NONE }

    data class Context(
        val ownPackage: String,
        /** Device-specific: default dialer, default launcher, current keyboard. */
        val deviceAllowed: Set<String>,
        val blockedPackages: Set<String>,
        val lockEnabled: Boolean,
        val allowing: Boolean,
    ) {
        fun neverBlock(pkg: String) = pkg == ownPackage || pkg in ALWAYS_ALLOWED || pkg in deviceAllowed
    }

    fun decide(foregroundPackage: String, c: Context): Action = when {
        c.neverBlock(foregroundPackage) -> Action.NONE
        !c.lockEnabled || c.allowing -> Action.NONE
        foregroundPackage in c.blockedPackages -> Action.BLOCK
        else -> Action.NONE
    }

    /** The user's selection, minus anything that must stay usable (a stale or hand-edited list cannot block Settings). */
    fun sanitize(selection: Set<String>, c: Context): Set<String> = selection.filterNot(c::neverBlock).toSet()
}
