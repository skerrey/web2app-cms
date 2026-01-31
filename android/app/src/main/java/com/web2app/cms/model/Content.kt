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

@Serializable
data class Block(
    val type: String,
    val text: String
)
