package app.elementlock.core

import kotlinx.serialization.Serializable

/** Allowed-time choices for v1. Only these two were verified against the OS schedule minimum. */
enum class AllowanceMinutes(val minutes: Int) { FIFTEEN(15), THIRTY(30) }

/** Time is counted from the moment the quiz was solved (wall-clock), not from actual app usage. */
@Serializable
data class Grant(
    val sessionId: String,
    val questionId: String,
    val grantedAtMillis: Long,
    val expiresAtMillis: Long,
)

@Serializable
data class UnlockState(
    val activeGrant: Grant? = null,
    /** Most recent redeemed question ids, so a duplicate callback cannot grant twice. */
    val redeemedQuestionIds: List<String> = emptyList(),
)

sealed interface GrantDecision {
    data class Granted(val grant: Grant, val newState: UnlockState) : GrantDecision
    data class Rejected(val reason: Reason) : GrantDecision
    enum class Reason { PRACTICE_DOES_NOT_GRANT, NOT_SOLVED, ALREADY_REDEEMED, STILL_ALLOWING }
}

sealed interface IntervalEndDecision {
    data class Reblock(val newState: UnlockState) : IntervalEndDecision
    /** Callback for an older session, or no session at all: must not touch the current one. */
    data object IgnoreStale : IntervalEndDecision
    /** Callback came much earlier than the stored expiry: keep the current session. */
    data object IgnoreEarly : IntervalEndDecision
}

object UnlockRules {
    private const val KEEP_REDEEMED = 50
    /** OS callbacks are not second-accurate; accept an end callback this much before expiry. */
    const val EARLY_TOLERANCE_MILLIS = 60_000L

    fun requestGrant(
        state: UnlockState,
        attempt: QuizAttempt,
        nowMillis: Long,
        allowance: AllowanceMinutes,
        newSessionId: String,
    ): GrantDecision {
        val q = attempt.question
        if (q.purpose != QuizPurpose.UNLOCK) return GrantDecision.Rejected(GrantDecision.Reason.PRACTICE_DOES_NOT_GRANT)
        if (!attempt.solved) return GrantDecision.Rejected(GrantDecision.Reason.NOT_SOLVED)
        if (q.id in state.redeemedQuestionIds) return GrantDecision.Rejected(GrantDecision.Reason.ALREADY_REDEEMED)
        if (isAllowing(state, nowMillis)) return GrantDecision.Rejected(GrantDecision.Reason.STILL_ALLOWING)
        val grant = Grant(newSessionId, q.id, nowMillis, nowMillis + allowance.minutes * 60_000L)
        val redeemed = (state.redeemedQuestionIds + q.id).takeLast(KEEP_REDEEMED)
        return GrantDecision.Granted(grant, UnlockState(grant, redeemed))
    }

    fun isAllowing(state: UnlockState, nowMillis: Long) =
        state.activeGrant?.let { nowMillis < it.expiresAtMillis } ?: false

    fun onIntervalEnded(state: UnlockState, sessionId: String, nowMillis: Long): IntervalEndDecision {
        val grant = state.activeGrant ?: return IntervalEndDecision.IgnoreStale
        if (grant.sessionId != sessionId) return IntervalEndDecision.IgnoreStale
        if (nowMillis < grant.expiresAtMillis - EARLY_TOLERANCE_MILLIS) return IntervalEndDecision.IgnoreEarly
        return IntervalEndDecision.Reblock(state.copy(activeGrant = null))
    }

    /** Fallback used when the app itself notices an expired grant (never the only re-block path on iOS). */
    fun clearIfExpired(state: UnlockState, nowMillis: Long): UnlockState? {
        val grant = state.activeGrant ?: return null
        return if (nowMillis >= grant.expiresAtMillis) state.copy(activeGrant = null) else null
    }

    fun remainingMillis(state: UnlockState, nowMillis: Long): Long =
        state.activeGrant?.let { (it.expiresAtMillis - nowMillis).coerceAtLeast(0) } ?: 0
}

enum class LockStatus {
    PERMISSION_MISSING,
    INACTIVE,
    ACTIVE,
    QUIZ_IN_PROGRESS,
    ALLOWING,
    EXPIRED,
    ERROR,
}

data class LockInputs(
    val permissionGranted: Boolean,
    /** Android: accessibility service is bound and running. iOS: true when authorized. */
    val enforcerRunning: Boolean,
    val enabledByUser: Boolean,
    val hasSelectedApps: Boolean,
    val unlock: UnlockState,
    val nowMillis: Long,
    val quizInProgress: Boolean,
    val lastError: String?,
)

fun deriveStatus(i: LockInputs): LockStatus = when {
    // Permission revoked after the user turned the lock on is an error, not just "not set up".
    !i.permissionGranted -> if (i.enabledByUser) LockStatus.ERROR else LockStatus.PERMISSION_MISSING
    i.lastError != null -> LockStatus.ERROR
    !i.enabledByUser || !i.hasSelectedApps -> LockStatus.INACTIVE
    !i.enforcerRunning -> LockStatus.ERROR
    i.quizInProgress -> LockStatus.QUIZ_IN_PROGRESS
    i.unlock.activeGrant == null -> LockStatus.ACTIVE
    i.nowMillis < i.unlock.activeGrant.expiresAtMillis -> LockStatus.ALLOWING
    else -> LockStatus.EXPIRED
}
