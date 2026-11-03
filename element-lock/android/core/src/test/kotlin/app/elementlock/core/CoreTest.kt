package app.elementlock.core

import java.io.File
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

private val catalog = ElementCatalog.fromJson(File(System.getProperty("elementsJson")).readText())
private const val MIN = 60_000L
private const val DAY = 24 * 60 * MIN

private fun unlockQuestion(id: String = "q1", target: Int = 11, mode: QuizMode = QuizMode.PLACE_ON_TABLE) =
    QuestionFactory.make(id, mode, target, StudyRanges.BASIC, QuizPurpose.UNLOCK, catalog, Random(1))

class ElementDataTest {
    @Test fun catalogHasAll118() {
        assertEquals((1..118).toList(), catalog.elements.map { it.number })
        assertEquals("Na", catalog[11].symbol)
        assertEquals("나트륨", catalog[11].nameKo)
        assertEquals("칼륨", catalog[19].nameKo)
        assertEquals(listOf("소듐"), catalog[11].aliasesKo)
        assertNull(catalog[57].group)
        assertEquals(9, catalog[57].displayRow)
    }
}

class SearchTest {
    private fun search(q: String) = catalog.elements.filter { it.matches(q) }.map { it.number }

    @Test fun findsByOtherNamesSymbolNumberAndEnglish() {
        assertEquals(listOf(11), search("소듐"))
        assertEquals(listOf(19), search("포타슘"))
        assertEquals(listOf(11), search("나트륨"))
        assertEquals(listOf(11), search(" na "))
        assertEquals(listOf(11), search("11"))
        assertEquals(listOf(11), search("sodium"))
        assertEquals(emptyList(), search(""))
    }
}

class QuizTest {
    @Test fun correctAnswerOnFirstTry() {
        val a = QuizAttempt(unlockQuestion())
        assertEquals(AnswerResult.Correct(firstTry = true, hintUsed = false), a.answer(11))
        assertEquals(ReviewOutcome.FIRST_TRY, a.reviewOutcome)
    }

    @Test fun wrongThenRightIsAssistedAndRepeatTapIsIgnored() {
        val a = QuizAttempt(unlockQuestion())
        assertEquals(AnswerResult.Incorrect, a.answer(3))
        assertEquals(AnswerResult.Correct(firstTry = false, hintUsed = false), a.answer(11))
        assertEquals(AnswerResult.Ignored, a.answer(11))
        assertEquals(AnswerResult.Ignored, a.answer(3))
        assertEquals(ReviewOutcome.ASSISTED, a.reviewOutcome)
    }

    @Test fun hintMakesCorrectAssisted() {
        val a = QuizAttempt(unlockQuestion())
        a.useHint()
        assertEquals(AnswerResult.Correct(firstTry = false, hintUsed = true), a.answer(11))
    }

    @Test fun abandonedAfterWrongIsFailed() {
        val a = QuizAttempt(unlockQuestion())
        a.answer(1)
        assertEquals(ReviewOutcome.FAILED, a.reviewOutcome)
        assertNull(QuizAttempt(unlockQuestion()).reviewOutcome)
    }

    @Test fun choiceOptionsAreDistinctContainTargetOnceAndStayInScope() {
        val scope = StudyRanges.BASIC
        repeat(500) { seed ->
            val rnd = Random(seed)
            val target = scope.random(rnd)
            for (mode in listOf(QuizMode.FILL_BLANK, QuizMode.SYMBOL_TO_NAME, QuizMode.NAME_TO_SYMBOL)) {
                val q = QuestionFactory.make("q$seed", mode, target, scope, QuizPurpose.PRACTICE, catalog, rnd)
                assertEquals(4, q.options.size)
                assertEquals(4, q.options.toSet().size)
                assertEquals(1, q.options.count { it == target })
                assertTrue(q.options.all { it in scope })
                // Visible labels must be unique too, so there is never more than one correct-looking answer.
                assertEquals(4, q.options.map { catalog[it].symbol }.toSet().size)
                assertEquals(4, q.options.map { catalog[it].nameKo }.toSet().size)
            }
        }
    }

    @Test fun optionOrderIsShuffled() {
        val positions = (0 until 200).map { seed ->
            QuestionFactory.make("q", QuizMode.SYMBOL_TO_NAME, 6, StudyRanges.BASIC, QuizPurpose.PRACTICE, catalog, Random(seed))
                .options.indexOf(6)
        }.toSet()
        assertEquals(setOf(0, 1, 2, 3), positions)
    }

    @Test fun tinyScopeFallsBackToPlacement() {
        val q = QuestionFactory.make("q", QuizMode.SYMBOL_TO_NAME, 8, setOf(8), QuizPurpose.PRACTICE, catalog, Random(0))
        assertEquals(QuizMode.PLACE_ON_TABLE, q.mode)
        val two = QuestionFactory.make("q", QuizMode.SYMBOL_TO_NAME, 8, setOf(8, 9), QuizPurpose.PRACTICE, catalog, Random(0))
        assertEquals(setOf(8, 9), two.options.toSet())
    }

    @Test fun placementRegionKeepsRealRowsOnly() {
        val cells = QuestionFactory.regionCells(StudyRanges.BASIC, catalog)
        assertEquals((1..36).toList(), cells.sorted()) // periods 1-4 are exactly elements 1..36
        val f = QuestionFactory.regionCells(setOf(60), catalog)
        assertEquals((57..71).toList(), f.sorted())
    }

    @Test fun answerOutsideRegionIsWrong() {
        val a = QuizAttempt(unlockQuestion())
        assertEquals(AnswerResult.Incorrect, a.answer(79))
    }
}

class ReviewTest {
    private val now = 1_800_000_000_000L

    @Test fun neverPicksOutsideScope() {
        val scope = setOf(3, 11, 19)
        repeat(300) { assertTrue(ReviewScheduler.next(scope, emptyMap(), now, Random(it)) in scope) }
    }

    @Test fun wrongDueFirstThenUnseenThenDueThenSoonest() {
        val records = mapOf(
            1 to ReviewRecord(1, seenCount = 1, dueAtMillis = now - 1, lastOutcome = ReviewOutcome.FIRST_TRY),
            2 to ReviewRecord(2, seenCount = 1, dueAtMillis = now - 1, lastOutcome = ReviewOutcome.FAILED),
            4 to ReviewRecord(4, seenCount = 1, dueAtMillis = now + 5 * DAY, lastOutcome = ReviewOutcome.FIRST_TRY),
            5 to ReviewRecord(5, seenCount = 1, dueAtMillis = now + 2 * DAY, lastOutcome = ReviewOutcome.FIRST_TRY),
        )
        assertEquals(2, ReviewScheduler.next(setOf(1, 2, 3, 4, 5), records, now, Random(0)))
        assertEquals(3, ReviewScheduler.next(setOf(1, 3, 4, 5), records, now, Random(0)))
        assertEquals(1, ReviewScheduler.next(setOf(1, 4, 5), records, now, Random(0)))
        assertEquals(5, ReviewScheduler.next(setOf(4, 5), records, now, Random(0)))
    }

    @Test fun avoidsImmediateRepeatWhenPossible() {
        repeat(50) { assertEquals(2, ReviewScheduler.next(setOf(1, 2), emptyMap(), now, Random(it), avoid = 1)) }
        assertEquals(1, ReviewScheduler.next(setOf(1), emptyMap(), now, Random(0), avoid = 1))
    }

    @Test fun intervalsGrowOnFirstTryAndShrinkOnMistakes() {
        var r = ReviewScheduler.update(null, 6, ReviewOutcome.FIRST_TRY, QuizPurpose.UNLOCK, now, "d1")
        assertEquals(1, r.intervalDays)
        r = ReviewScheduler.update(r, 6, ReviewOutcome.FIRST_TRY, QuizPurpose.UNLOCK, now, "d2")
        assertEquals(2, r.intervalDays)
        assertEquals(now + 2 * DAY, r.dueAtMillis)
        r = ReviewScheduler.update(r, 6, ReviewOutcome.ASSISTED, QuizPurpose.PRACTICE, now, "d3")
        assertEquals(0, r.intervalDays)
        assertEquals(now + 10 * MIN, r.dueAtMillis)
        assertEquals(1, r.practiceAnswers)
        assertEquals(2, r.unlockAnswers)
    }

    @Test fun masteryNeedsThreeDifferentDays() {
        var r = ReviewScheduler.update(null, 6, ReviewOutcome.FIRST_TRY, QuizPurpose.PRACTICE, now, "2026-11-01")
        r = ReviewScheduler.update(r, 6, ReviewOutcome.FIRST_TRY, QuizPurpose.PRACTICE, now, "2026-11-01")
        r = ReviewScheduler.update(r, 6, ReviewOutcome.FIRST_TRY, QuizPurpose.PRACTICE, now, "2026-11-01")
        assertFalse(ReviewScheduler.isMastered(r), "three times on one day is not mastery")
        r = ReviewScheduler.update(r, 6, ReviewOutcome.ASSISTED, QuizPurpose.PRACTICE, now, "2026-11-02")
        assertFalse(ReviewScheduler.isMastered(r), "assisted answers do not count")
        r = ReviewScheduler.update(r, 6, ReviewOutcome.FIRST_TRY, QuizPurpose.PRACTICE, now, "2026-11-02")
        r = ReviewScheduler.update(r, 6, ReviewOutcome.FIRST_TRY, QuizPurpose.PRACTICE, now, "2026-11-03")
        assertTrue(ReviewScheduler.isMastered(r))
    }
}

class UnlockTest {
    private val now = 1_800_000_000_000L

    private fun solved(purpose: QuizPurpose = QuizPurpose.UNLOCK, id: String = "q1") =
        QuizAttempt(QuestionFactory.make(id, QuizMode.PLACE_ON_TABLE, 11, StudyRanges.BASIC, purpose, catalog, Random(0)))
            .also { it.answer(11) }

    @Test fun solvedUnlockQuestionGrants15Minutes() {
        val d = UnlockRules.requestGrant(UnlockState(), solved(), now, AllowanceMinutes.FIFTEEN, "s1")
        assertIs<GrantDecision.Granted>(d)
        assertEquals(now + 15 * MIN, d.grant.expiresAtMillis)
        assertTrue(UnlockRules.isAllowing(d.newState, now + 14 * MIN))
        assertFalse(UnlockRules.isAllowing(d.newState, now + 15 * MIN))
    }

    @Test fun thirtyMinuteOption() {
        val d = UnlockRules.requestGrant(UnlockState(), solved(), now, AllowanceMinutes.THIRTY, "s1")
        assertEquals(now + 30 * MIN, (d as GrantDecision.Granted).grant.expiresAtMillis)
    }

    @Test fun practiceNeverGrants() {
        assertEquals(
            GrantDecision.Rejected(GrantDecision.Reason.PRACTICE_DOES_NOT_GRANT),
            UnlockRules.requestGrant(UnlockState(), solved(QuizPurpose.PRACTICE), now, AllowanceMinutes.FIFTEEN, "s1"),
        )
    }

    @Test fun unsolvedOrWrongOnlyNeverGrants() {
        val a = QuizAttempt(unlockQuestion())
        a.answer(1)
        assertEquals(
            GrantDecision.Rejected(GrantDecision.Reason.NOT_SOLVED),
            UnlockRules.requestGrant(UnlockState(), a, now, AllowanceMinutes.FIFTEEN, "s1"),
        )
    }

    @Test fun duplicateRedeemIsRejectedEvenAfterExpiry() {
        val attempt = solved()
        val first = UnlockRules.requestGrant(UnlockState(), attempt, now, AllowanceMinutes.FIFTEEN, "s1") as GrantDecision.Granted
        assertEquals(
            GrantDecision.Rejected(GrantDecision.Reason.STILL_ALLOWING),
            UnlockRules.requestGrant(first.newState, solved(id = "q2"), now + MIN, AllowanceMinutes.FIFTEEN, "s2"),
        )
        assertEquals(
            GrantDecision.Rejected(GrantDecision.Reason.ALREADY_REDEEMED),
            UnlockRules.requestGrant(first.newState, attempt, now + 60 * MIN, AllowanceMinutes.FIFTEEN, "s3"),
        )
    }

    @Test fun intervalEndReblocksOnlyCurrentSession() {
        val g = UnlockRules.requestGrant(UnlockState(), solved(), now, AllowanceMinutes.FIFTEEN, "s1") as GrantDecision.Granted
        assertEquals(IntervalEndDecision.IgnoreStale, UnlockRules.onIntervalEnded(g.newState, "old", now + 15 * MIN))
        assertEquals(IntervalEndDecision.IgnoreEarly, UnlockRules.onIntervalEnded(g.newState, "s1", now + 5 * MIN))
        val end = UnlockRules.onIntervalEnded(g.newState, "s1", now + 15 * MIN + 30_000)
        assertIs<IntervalEndDecision.Reblock>(end)
        assertNull(end.newState.activeGrant)
        // A late duplicate callback for the same, already ended session is stale.
        assertEquals(IntervalEndDecision.IgnoreStale, UnlockRules.onIntervalEnded(end.newState, "s1", now + 16 * MIN))
        // Slightly early (OS jitter within tolerance) still re-blocks.
        assertIs<IntervalEndDecision.Reblock>(UnlockRules.onIntervalEnded(g.newState, "s1", now + 15 * MIN - 30_000))
    }

    @Test fun oldSessionCallbackDoesNotEndNewSession() {
        val g1 = UnlockRules.requestGrant(UnlockState(), solved(id = "a"), now, AllowanceMinutes.FIFTEEN, "s1") as GrantDecision.Granted
        val after = UnlockRules.clearIfExpired(g1.newState, now + 16 * MIN)!!
        val g2 = UnlockRules.requestGrant(after, solved(id = "b"), now + 20 * MIN, AllowanceMinutes.FIFTEEN, "s2") as GrantDecision.Granted
        assertEquals(IntervalEndDecision.IgnoreStale, UnlockRules.onIntervalEnded(g2.newState, "s1", now + 35 * MIN))
        assertEquals("s2", g2.newState.activeGrant?.sessionId)
    }
}

class StatusTest {
    private val now = 1_000L
    private val base = LockInputs(true, true, true, true, UnlockState(), now, false, null)
    private val grant = Grant("s", "q", 0, 2_000)

    @Test fun statesAreDistinct() {
        assertEquals(LockStatus.ACTIVE, deriveStatus(base))
        assertEquals(LockStatus.PERMISSION_MISSING, deriveStatus(base.copy(permissionGranted = false, enabledByUser = false)))
        assertEquals(LockStatus.ERROR, deriveStatus(base.copy(permissionGranted = false)), "revoked while on")
        assertEquals(LockStatus.INACTIVE, deriveStatus(base.copy(enabledByUser = false)))
        assertEquals(LockStatus.INACTIVE, deriveStatus(base.copy(hasSelectedApps = false)))
        assertEquals(LockStatus.ERROR, deriveStatus(base.copy(enforcerRunning = false)))
        assertEquals(LockStatus.ERROR, deriveStatus(base.copy(lastError = "schedule failed")))
        assertEquals(LockStatus.QUIZ_IN_PROGRESS, deriveStatus(base.copy(quizInProgress = true)))
        assertEquals(LockStatus.ALLOWING, deriveStatus(base.copy(unlock = UnlockState(grant))))
        assertEquals(LockStatus.EXPIRED, deriveStatus(base.copy(unlock = UnlockState(grant), nowMillis = 2_000)))
    }
}

class PersistenceTest {
    @Test fun stateSurvivesRoundTrip() {
        val a = QuizAttempt(unlockQuestion()).also { it.answer(11) }
        val state = LearningState(
            settings = Settings(onboardingDone = true, scope = StudyRanges.EXTENDED, allowance = AllowanceMinutes.THIRTY, lockEnabled = true),
            unlock = UnlockState(Grant("s", "q1", 1, 2), listOf("q1")),
        ).record(a, 5_000, "2026-11-03")
        val restored = StateCodec.decode(StateCodec.encode(state))
        assertEquals(state, restored)
        assertEquals(1, restored!!.solvedToday("2026-11-03"))
    }

    @Test fun corruptDataIsReportedNotWiped() {
        assertNull(StateCodec.decode("{not json"))
        assertNotNull(StateCodec.decode("{}"))
    }

    @Test fun emptyScopeIsRejected() {
        assertEquals(ScopeError.EMPTY, validateScope(emptySet()))
        assertEquals(ScopeError.OUT_OF_RANGE, validateScope(setOf(0)))
        assertNull(validateScope(StudyRanges.BASIC))
    }
}
