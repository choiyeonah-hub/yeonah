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
    /** Official name, with the most common former name in parentheses: "소듐(나트륨)". */
    val displayNameKo: String
        get() = if (aliasesKo.isEmpty()) nameKo else "$nameKo(${aliasesKo.first()})"
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
