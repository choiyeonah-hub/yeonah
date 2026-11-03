package app.elementlock.core

import app.elementlock.core.BlockPolicy.Action
import kotlin.test.Test
import kotlin.test.assertEquals

class BlockPolicyTest {
    private val c = BlockPolicy.Context(
        ownPackage = "app.elementlock",
        deviceAllowed = setOf("com.sec.android.app.launcher", "com.samsung.android.dialer"),
        blockedPackages = setOf("com.google.android.youtube", "com.instagram.android"),
        lockEnabled = true,
        allowing = false,
    )

    @Test fun blocksOnlySelectedApps() {
        assertEquals(Action.BLOCK, BlockPolicy.decide("com.google.android.youtube", c))
        assertEquals(Action.NONE, BlockPolicy.decide("com.kakao.talk", c), "unselected app stays usable")
    }

    @Test fun neverBlocksPhoneSettingsLauncherOrItself() {
        val evil = c.copy(blockedPackages = c.blockedPackages + BlockPolicy.ALWAYS_ALLOWED + c.deviceAllowed + c.ownPackage)
        for (pkg in BlockPolicy.ALWAYS_ALLOWED + c.deviceAllowed + c.ownPackage) {
            assertEquals(Action.NONE, BlockPolicy.decide(pkg, evil), pkg)
        }
        assertEquals(c.blockedPackages, BlockPolicy.sanitize(evil.blockedPackages, c))
    }

    @Test fun pausedOrAllowingBlocksNothing() {
        assertEquals(Action.NONE, BlockPolicy.decide("com.google.android.youtube", c.copy(lockEnabled = false)))
        assertEquals(Action.NONE, BlockPolicy.decide("com.google.android.youtube", c.copy(allowing = true)))
    }

    @Test fun enteringAndLeavingTarget() {
        // Sequence of foreground packages as the service would see them.
        val seq = listOf("com.sec.android.app.launcher", "com.instagram.android", "com.sec.android.app.launcher", "com.kakao.talk")
        assertEquals(listOf(Action.NONE, Action.BLOCK, Action.NONE, Action.NONE), seq.map { BlockPolicy.decide(it, c) })
    }
}
