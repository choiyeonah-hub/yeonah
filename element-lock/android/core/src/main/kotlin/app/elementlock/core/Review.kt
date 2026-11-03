package app.elementlock.core

import kotlinx.serialization.Serializable
import kotlin.random.Random

@Serializable
data class ReviewRecord(
    val number: Int,
    val seenCount: Int = 0,
    val intervalDays: Int = 0,
    val dueAtMillis: Long = 0,
    val lastOutcome: ReviewOutcome? = null,
    /** Local calendar days ("2026-11-03") with a first-try correct answer. */
    val firstTryDays: Set<String> = emptySet(),
    val unlockAnswers: Int = 0,
    val practiceAnswers: Int = 0,
)

/**
 * Simple, explainable review rules:
 * 1. due elements answered wrong/with help last time, 2. never-seen elements,
 * 3. other due elements, 4. otherwise the one due soonest.
 * First-try correct doubles the interval (1, 2, 4 ... days, max 60).
 * Wrong or assisted answers bring it back after 10 minutes.
 * Mastered = first-try correct on [MASTERY_DAYS] different days.
 */
object ReviewScheduler {
    const val MASTERY_DAYS = 3
    const val MAX_INTERVAL_DAYS = 60
    const val RETRY_DELAY_MILLIS = 10 * 60 * 1000L
    private const val DAY_MILLIS = 24 * 60 * 60 * 1000L

    fun next(scope: Set<Int>, records: Map<Int, ReviewRecord>, nowMillis: Long, random: Random, avoid: Int? = null): Int {
        require(scope.isNotEmpty()) { "empty study scope" }
        val candidates = if (scope.size > 1 && avoid != null) scope - avoid else scope
        fun bucket(n: Int): Int {
            val r = records[n] ?: return 1
            if (r.seenCount == 0) return 1
            val due = r.dueAtMillis <= nowMillis
            return when {
                due && r.lastOutcome != ReviewOutcome.FIRST_TRY -> 0
                due -> 2
                else -> 3
            }
        }
        val grouped = candidates.groupBy(::bucket)
        val best = grouped.keys.min()
        val pool = grouped.getValue(best)
        if (best == 3) {
            val soonest = pool.minOf { records.getValue(it).dueAtMillis }
            return pool.filter { records.getValue(it).dueAtMillis == soonest }.random(random)
        }
        return pool.random(random)
    }

    fun update(
        previous: ReviewRecord?,
        number: Int,
        outcome: ReviewOutcome,
        purpose: QuizPurpose,
        nowMillis: Long,
        today: String,
    ): ReviewRecord {
        val r = previous ?: ReviewRecord(number)
        val counted = r.copy(
            seenCount = r.seenCount + 1,
            lastOutcome = outcome,
            unlockAnswers = r.unlockAnswers + if (purpose == QuizPurpose.UNLOCK) 1 else 0,
            practiceAnswers = r.practiceAnswers + if (purpose == QuizPurpose.PRACTICE) 1 else 0,
        )
        return when (outcome) {
            ReviewOutcome.FIRST_TRY -> {
                val interval = if (r.intervalDays == 0) 1 else minOf(r.intervalDays * 2, MAX_INTERVAL_DAYS)
                counted.copy(
                    intervalDays = interval,
                    dueAtMillis = nowMillis + interval * DAY_MILLIS,
                    firstTryDays = r.firstTryDays + today,
                )
            }
            ReviewOutcome.ASSISTED, ReviewOutcome.FAILED ->
                counted.copy(intervalDays = 0, dueAtMillis = nowMillis + RETRY_DELAY_MILLIS)
        }
    }

    fun isMastered(record: ReviewRecord?) = record != null && record.firstTryDays.size >= MASTERY_DAYS
}
