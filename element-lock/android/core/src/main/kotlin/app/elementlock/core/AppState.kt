package app.elementlock.core

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class Settings(
    val onboardingDone: Boolean = false,
    val scope: Set<Int> = StudyRanges.BASIC,
    val allowance: AllowanceMinutes = AllowanceMinutes.FIFTEEN,
    val hapticsEnabled: Boolean = true,
    /** The user's switch. Off = paused; selected apps are not restricted. */
    val lockEnabled: Boolean = false,
)

/** Everything the learning side persists. Platform-specific data (selected apps) is stored separately. */
@Serializable
data class LearningState(
    val settings: Settings = Settings(),
    val unlock: UnlockState = UnlockState(),
    val records: Map<Int, ReviewRecord> = emptyMap(),
    /** Solved questions per local day ("2026-11-03"), unlock and practice together. */
    val solvedPerDay: Map<String, Int> = emptyMap(),
) {
    val masteredCount: Int get() = records.values.count(ReviewScheduler::isMastered)

    fun solvedToday(today: String): Int = solvedPerDay[today] ?: 0

    fun record(attempt: QuizAttempt, nowMillis: Long, today: String): LearningState {
        val outcome = attempt.reviewOutcome ?: return this
        val n = attempt.question.target
        val updated = ReviewScheduler.update(records[n], n, outcome, attempt.question.purpose, nowMillis, today)
        val solved = if (attempt.solved) mapOf(today to solvedToday(today) + 1) else emptyMap()
        return copy(records = records + (n to updated), solvedPerDay = solvedPerDay + solved)
    }
}

object StateCodec {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    fun encode(state: LearningState): String = json.encodeToString(LearningState.serializer(), state)

    /** Unreadable data yields null so the caller can decide (it must not silently wipe records). */
    fun decode(text: String): LearningState? =
        runCatching { json.decodeFromString(LearningState.serializer(), text) }.getOrNull()
}

enum class ScopeError { EMPTY, OUT_OF_RANGE }

/** Scope validation shared by settings and quiz start. */
fun validateScope(scope: Set<Int>): ScopeError? = when {
    scope.isEmpty() -> ScopeError.EMPTY
    scope.any { it !in 1..118 } -> ScopeError.OUT_OF_RANGE
    else -> null
}
