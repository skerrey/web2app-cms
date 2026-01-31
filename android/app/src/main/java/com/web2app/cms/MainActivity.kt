package com.web2app.cms

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.web2app.cms.model.Block
import com.web2app.cms.model.BlockData
import com.web2app.cms.model.Content
import com.web2app.cms.model.GridCell
import com.web2app.cms.model.Manifest
import com.web2app.cms.model.Page
import com.web2app.cms.ui.theme.Web2appcmsTheme
import androidx.compose.runtime.*
import androidx.compose.runtime.LaunchedEffect
import okhttp3.CacheControl
import okhttp3.OkHttpClient
import okhttp3.Request
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            var uiState by remember { mutableStateOf<UiState>(UiState.Loading) }

            LaunchedEffect(Unit) {
                try {
                    val client = OkHttpClient()
                    val json = Json { ignoreUnknownKeys = true }
                    val fetchText: suspend (String) -> FetchResult = { url ->
                        withContext(Dispatchers.IO) {
                            val request = Request.Builder()
                                .url(url)
                                .cacheControl(CacheControl.FORCE_NETWORK)
                                .build()
                            client.newCall(request).execute().use { response ->
                                FetchResult(response.body?.string(), response.code)
                            }
                        }
                    }
                    val validateManifest = { manifest: Manifest ->
                        when {
                            manifest.schemaVersion.isBlank() -> "Missing schemaVersion in manifest.json"
                            manifest.contentVersion.isBlank() -> "Missing contentVersion in manifest.json"
                            manifest.compatibleAppVersions.min.isBlank() -> "Missing compatibleAppVersions.min in manifest.json"
                            manifest.compatibleAppVersions.max.isBlank() -> "Missing compatibleAppVersions.max in manifest.json"
                            manifest.pagesOrder.isEmpty() -> "Missing pagesOrder entries in manifest.json"
                            manifest.pagesOrder.any { it.isBlank() } -> "pagesOrder contains empty page IDs in manifest.json"
                            else -> null
                        }
                    }
                    val validateContent = { content: Content ->
                        fun validateBlock(block: Block): Boolean {
                            return when (block.type) {
                                "text" -> block.text.isNotBlank()
                                "hero" -> (block.data as? BlockData.Hero)?.title?.isNotBlank() == true
                                "button" -> (block.data as? BlockData.Button)?.label?.isNotBlank() == true
                                "grid" -> {
                                    val grid = block.data as? BlockData.Grid ?: return false
                                    grid.cells.isNotEmpty() && grid.cells.all { cell ->
                                        cell.blocks.all { validateBlock(it) }
                                    }
                                }
                                else -> false
                            }
                        }
                        when {
                            content.pages.isEmpty() -> "Missing pages in content.json"
                            content.pages.any { it.id.isBlank() } -> "A page id is missing in content.json"
                            content.pages.any { it.title.isBlank() } -> "A page title is missing in content.json"
                            content.pages.any { it.blocks.isEmpty() } -> "A page has no blocks in content.json"
                            content.pages.any { page ->
                                page.blocks.any { block -> !validateBlock(block) }
                            } -> "A block is missing required type or data in content.json"
                            else -> null
                        }
                    }
                    val parseManifest = { body: String ->
                        val root = json.parseToJsonElement(body).jsonObject
                        val compatible = root["compatibleAppVersions"]?.jsonObject ?: JsonObject(emptyMap())
                        val featureFlags = root["featureFlags"]?.jsonObject ?: JsonObject(emptyMap())
                        val pagesOrder = root["pagesOrder"]?.jsonArray
                            ?.mapNotNull { item -> item.jsonPrimitive.contentOrNull }
                            ?: emptyList()
                        Manifest(
                            schemaVersion = root["schemaVersion"]?.jsonPrimitive?.contentOrNull ?: "",
                            contentVersion = root["contentVersion"]?.jsonPrimitive?.contentOrNull ?: "",
                            compatibleAppVersions = com.web2app.cms.model.CompatibleAppVersions(
                                min = compatible["min"]?.jsonPrimitive?.contentOrNull ?: "",
                                max = compatible["max"]?.jsonPrimitive?.contentOrNull ?: ""
                            ),
                            pagesOrder = pagesOrder,
                            featureFlags = com.web2app.cms.model.FeatureFlags(
                                showWelcomeBanner = featureFlags["showWelcomeBanner"]?.jsonPrimitive?.booleanOrNull ?: false,
                                enableHelpLink = featureFlags["enableHelpLink"]?.jsonPrimitive?.booleanOrNull ?: false
                            )
                        )
                    }
                    fun parseBlock(blockElement: kotlinx.serialization.json.JsonElement): Block? {
                        val blockObject = blockElement.jsonObject
                        val type = blockObject["type"]?.jsonPrimitive?.contentOrNull ?: "text"
                        val topLevelText = blockObject["text"]?.jsonPrimitive?.contentOrNull ?: ""
                        val dataObj = blockObject["data"]?.jsonObject

                        val (text, data) = when (type) {
                            "hero" -> {
                                val title = dataObj?.get("title")?.jsonPrimitive?.contentOrNull ?: ""
                                val subtitle = dataObj?.get("subtitle")?.jsonPrimitive?.contentOrNull ?: ""
                                val imageUrl = dataObj?.get("imageUrl")?.jsonPrimitive?.contentOrNull
                                "" to BlockData.Hero(title = title, subtitle = subtitle, imageUrl = imageUrl)
                            }
                            "button" -> {
                                val label = dataObj?.get("label")?.jsonPrimitive?.contentOrNull ?: ""
                                val url = dataObj?.get("url")?.jsonPrimitive?.contentOrNull
                                "" to BlockData.Button(label = label, url = url)
                            }
                            "grid" -> {
                                val columns = (dataObj?.get("columns")?.jsonPrimitive?.contentOrNull?.toIntOrNull() ?: 2).coerceIn(1, 12)
                                val cellsArray = dataObj?.get("cells")?.jsonArray ?: emptyList()
                                val cells = cellsArray.mapNotNull { cellElement ->
                                    val cellObj = cellElement.jsonObject
                                    val cellId = cellObj["id"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                                    val nestedBlocks = cellObj["blocks"]?.jsonArray?.mapNotNull { parseBlock(it) } ?: emptyList()
                                    com.web2app.cms.model.GridCell(id = cellId, blocks = nestedBlocks)
                                }
                                "" to BlockData.Grid(columns = columns, cells = cells)
                            }
                            else -> {
                                val textFromData = dataObj?.get("text")?.jsonPrimitive?.contentOrNull
                                val textValue = if (topLevelText.isNotBlank()) topLevelText else (textFromData ?: "")
                                textValue to null
                            }
                        }

                        return Block(type = type, text = text, data = data)
                    }

                    val parseContent = { body: String ->
                        val root = json.parseToJsonElement(body).jsonObject
                        val pages = root["pages"]?.jsonArray?.mapNotNull { pageElement ->
                            val pageObject = pageElement.jsonObject
                            val blocks = pageObject["blocks"]?.jsonArray?.mapNotNull { parseBlock(it) } ?: emptyList()
                            val id = pageObject["id"]?.jsonPrimitive?.contentOrNull ?: ""
                            val title = pageObject["title"]?.jsonPrimitive?.contentOrNull ?: ""
                            Page(id = id, title = title, blocks = blocks)
                        } ?: emptyList()
                        Content(pages = pages)
                    }
                    val manifestResult = fetchText("${BuildConfig.BASE_URL}/content/manifest.json")

                    if (manifestResult.body == null) {
                        uiState = UiState.Error("Empty manifest response")
                        return@LaunchedEffect
                    }
                    if (manifestResult.statusCode !in 200..299) {
                        uiState = UiState.Error("Manifest request failed (${manifestResult.statusCode})")
                        return@LaunchedEffect
                    }

                    val decodedManifest = runCatching {
                        parseManifest(manifestResult.body)
                    }.getOrElse {
                        val snippet = manifestResult.body
                            .take(120)
                            .replace("\n", " ")
                        uiState = UiState.Error("Manifest parse error: ${it.message}. Body: $snippet")
                        return@LaunchedEffect
                    }

                    val manifestValidationError = validateManifest(decodedManifest)
                    if (manifestValidationError != null) {
                        uiState = UiState.Error(manifestValidationError)
                        return@LaunchedEffect
                    }
                    val contentResult = fetchText("${BuildConfig.BASE_URL}/content/content.json")

                    if (contentResult.body == null) {
                        uiState = UiState.Error("Empty content response")
                        return@LaunchedEffect
                    }
                    if (contentResult.statusCode !in 200..299) {
                        uiState = UiState.Error("Content request failed (${contentResult.statusCode})")
                        return@LaunchedEffect
                    }

                    val content = runCatching {
                        parseContent(contentResult.body)
                    }.getOrElse {
                        val snippet = contentResult.body
                            .take(120)
                            .replace("\n", " ")
                        uiState = UiState.Error("Content parse error: ${it.message}. Body: $snippet")
                        return@LaunchedEffect
                    }
                    val contentValidationError = validateContent(content)
                    if (contentValidationError != null) {
                        uiState = UiState.Error(contentValidationError)
                        return@LaunchedEffect
                    }
                    val firstPageId = decodedManifest.pagesOrder.firstOrNull()
                    if (firstPageId == null) {
                        uiState = UiState.Error("No pagesOrder entries")
                        return@LaunchedEffect
                    }

                    val firstPage = content.pages.firstOrNull { page -> page.id == firstPageId }
                    if (firstPage == null) {
                        uiState = UiState.Error("Page not found: $firstPageId")
                        return@LaunchedEffect
                    }

                    uiState = UiState.Loaded(ScreenState(decodedManifest, firstPage))
                } catch (e: Exception) {
                    uiState = UiState.Error("Error: ${e::class.simpleName}")
                }
            }

            Web2appcmsTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { padding ->
                    Column(modifier = Modifier.padding(padding)) {
                        when (val state = uiState) {
                            is UiState.Loading -> {
                                Text(text = "Loading manifest...")
                            }
                            is UiState.Error -> {
                                Text(text = state.message)
                            }
                            is UiState.Loaded -> {
                                val context = LocalContext.current
                                Column(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .verticalScroll(rememberScrollState())
                                        .padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Text(
                                        text = state.data.page.title,
                                        style = MaterialTheme.typography.headlineMedium
                                    )
                                    state.data.page.blocks.forEach { block ->
                                        BlockContent(block = block, onOpenUrl = { url ->
                                            try {
                                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                            } catch (_: Exception) {}
                                        })
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BlockContent(
    block: Block,
    onOpenUrl: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    when (block.type) {
        "text" -> Text(
            text = block.text,
            style = MaterialTheme.typography.bodyLarge,
            modifier = modifier
        )
        "hero" -> {
            val hero = block.data as? BlockData.Hero ?: return
            Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(text = hero.title, style = MaterialTheme.typography.headlineSmall)
                if (hero.subtitle.isNotBlank()) {
                    Text(text = hero.subtitle, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
        "button" -> {
            val btn = block.data as? BlockData.Button ?: return
            Button(
                onClick = {
                    val url = btn.url?.takeIf { it.isNotBlank() }
                    if (url != null) onOpenUrl(url)
                },
                enabled = !btn.url.isNullOrBlank(),
                modifier = modifier
            ) {
                Text(text = btn.label.ifBlank { "Button" })
            }
        }
        "grid" -> {
            val grid = block.data as? BlockData.Grid ?: return
            Row(
                modifier = modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                grid.cells.take(grid.columns).forEach { cell ->
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        cell.blocks.forEach { nestedBlock ->
                            BlockContent(block = nestedBlock, onOpenUrl = onOpenUrl)
                        }
                    }
                }
            }
        }
        else -> Text(
            text = block.text.ifBlank { "Unknown block type: ${block.type}" },
            style = MaterialTheme.typography.bodyMedium,
            modifier = modifier
        )
    }
}

data class ScreenState(
    val manifest: Manifest,
    val page: Page
)

data class FetchResult(
    val body: String?,
    val statusCode: Int
)

sealed class UiState {
    data object Loading : UiState()
    data class Loaded(val data: ScreenState) : UiState()
    data class Error(val message: String) : UiState()
}