package app.elementlock.core

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class Element(
    val number: Int,
    val symbol: String,
    val nameKo: String,
    val aliasesKo: List<String> = emptyList(),
    val nameEn: String,
    val period: Int,
    /** null for the lanthanide/actinide series (shown in separate rows). */
    val group: Int?,
    val displayRow: Int,
    val displayColumn: Int,
    val category: String,
) {
    /**
     * Search by atomic number, symbol, Korean name, other Korean names (e.g. 소듐 → 나트륨) or the start of the English name.
     * Case and surrounding spaces are ignored. Quizzes always show [nameKo] only.
     */
    fun matches(query: String): Boolean {
        val q = query.trim().lowercase()
        if (q.isEmpty()) return false
        q.toIntOrNull()?.let { return it == number }
        return symbol.lowercase() == q ||
            nameKo.contains(q) ||
            aliasesKo.any { it.contains(q) } ||
            nameEn.lowercase().startsWith(q)
    }
}

@Serializable
private data class ElementsFile(val schemaVersion: Int, val elements: List<Element>)

class ElementCatalog(val elements: List<Element>) {
    private val byNumber = elements.associateBy { it.number }

    operator fun get(number: Int): Element = byNumber.getValue(number)

    companion object {
        private val json = Json { ignoreUnknownKeys = true }
        fun fromJson(text: String) = ElementCatalog(json.decodeFromString<ElementsFile>(text).elements)
    }
}

object StudyRanges {
    val BASIC: Set<Int> = (1..20).toSet()
    val EXTENDED: Set<Int> = (1..36).toSet()
    val ALL: Set<Int> = (1..118).toSet()
}
