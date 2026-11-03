package app.elementlock.core

import kotlin.random.Random

enum class QuizMode { PLACE_ON_TABLE, FILL_BLANK, SYMBOL_TO_NAME, NAME_TO_SYMBOL }

enum class QuizPurpose { UNLOCK, PRACTICE }

/**
 * [options] are element numbers.
 * - PLACE_ON_TABLE: every cell of the shown table region (the answer is a cell).
 * - other modes: the multiple-choice options, already shuffled.
 */
data class Question(
    val id: String,
    val mode: QuizMode,
    val target: Int,
    val options: List<Int>,
    val purpose: QuizPurpose,
)

object QuestionFactory {
    const val CHOICE_COUNT = 4

    /** Choice modes need at least two distinct elements; otherwise we fall back to placing. */
    fun make(
        id: String,
        mode: QuizMode,
        target: Int,
        scope: Set<Int>,
        purpose: QuizPurpose,
        catalog: ElementCatalog,
        random: Random,
    ): Question {
        require(target in scope) { "target $target is outside the study scope" }
        val effectiveMode = if (mode != QuizMode.PLACE_ON_TABLE && scope.size < 2) QuizMode.PLACE_ON_TABLE else mode
        val options = when (effectiveMode) {
            QuizMode.PLACE_ON_TABLE -> regionCells(scope, catalog)
            else -> {
                val distractors = (scope - target).shuffled(random).take(CHOICE_COUNT - 1)
                (distractors + target).shuffled(random)
            }
        }
        return Question(id, effectiveMode, target, options, purpose)
    }

    /** All real cells in the display rows that contain the scope, so positions keep their true relations. */
    fun regionCells(scope: Set<Int>, catalog: ElementCatalog): List<Int> {
        val rows = scope.map { catalog[it].displayRow }.toSet()
        return catalog.elements.filter { it.displayRow in rows }.map { it.number }
    }

    fun pickMode(scopeSize: Int, random: Random): QuizMode {
        if (scopeSize < 2) return QuizMode.PLACE_ON_TABLE
        // The table-placement mode is the core mode, so it is drawn more often.
        val roll = random.nextInt(10)
        return when {
            roll < 4 -> QuizMode.PLACE_ON_TABLE
            roll < 6 -> QuizMode.FILL_BLANK
            roll < 8 -> QuizMode.SYMBOL_TO_NAME
            else -> QuizMode.NAME_TO_SYMBOL
        }
    }
}

sealed interface AnswerResult {
    data class Correct(val firstTry: Boolean, val hintUsed: Boolean) : AnswerResult
    data object Incorrect : AnswerResult
    /** Answer arrived after the question was already solved (double tap, duplicate callback). */
    data object Ignored : AnswerResult
}

enum class ReviewOutcome { FIRST_TRY, ASSISTED, FAILED }

/** One question being answered. Drag and tap both call [answer], so they share one judgement. */
class QuizAttempt(val question: Question) {
    var wrongCount = 0
        private set
    var hintUsed = false
        private set
    var solved = false
        private set

    fun answer(choice: Int): AnswerResult {
        if (solved) return AnswerResult.Ignored
        if (choice !in question.options) return AnswerResult.Incorrect.also { wrongCount++ }
        if (choice != question.target) return AnswerResult.Incorrect.also { wrongCount++ }
        solved = true
        return AnswerResult.Correct(firstTry = wrongCount == 0 && !hintUsed, hintUsed = hintUsed)
    }

    fun useHint() {
        if (!solved) hintUsed = true
    }

    /** What to record for spaced review. Abandoned after a wrong answer counts as FAILED. */
    val reviewOutcome: ReviewOutcome?
        get() = when {
            solved && wrongCount == 0 && !hintUsed -> ReviewOutcome.FIRST_TRY
            solved -> ReviewOutcome.ASSISTED
            wrongCount > 0 || hintUsed -> ReviewOutcome.FAILED
            else -> null
        }
}
