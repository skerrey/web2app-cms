package com.web2app.cms.model

import kotlinx.serialization.Serializable

@Serializable
data class Content(
    val pages: List<Page>
)

@Serializable
data class Page(
    val id: String,
    val title: String,
    val blocks: List<Block>
)

/** Block data by type (hero, button, grid) */
sealed class BlockData {
    data class Hero(
        val title: String,
        val subtitle: String = "",
        val imageUrl: String? = null
    ) : BlockData()

    data class Button(
        val label: String,
        val url: String? = null
    ) : BlockData()

    data class Grid(
        val columns: Int,
        val cells: List<GridCell>
    ) : BlockData()
}

data class GridCell(
    val id: String,
    val blocks: List<Block>
)

/**
 * Block with optional top-level `text` (legacy + backward compat) and optional `data` for hero/button/grid.
 * For text blocks: use `text` (from block.text or data.text).
 * For hero/button/grid: use `data` to get type-specific fields.
 */
data class Block(
    val type: String,
    val text: String = "",
    val data: BlockData? = null
)
