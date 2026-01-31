package com.web2app.cms

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.web2app.cms.ui.theme.Web2appcmsTheme
import androidx.compose.runtime.*
import androidx.compose.runtime.LaunchedEffect
import okhttp3.OkHttpClient
import okhttp3.Request
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import com.web2app.cms.model.Content
import com.web2app.cms.model.Manifest
import com.web2app.cms.model.Page
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
                        when {
                            content.pages.isEmpty() -> "Missing pages in content.json"
                            content.pages.any { it.id.isBlank() } -> "A page id is missing in content.json"
                            content.pages.any { it.title.isBlank() } -> "A page title is missing in content.json"
                            content.pages.any { it.blocks.isEmpty() } -> "A page has no blocks in content.json"
                            content.pages.any { page ->
                                page.blocks.any { block ->
                                    block.type != "text" || block.text.isBlank()
                                }
                            } -> "A block is missing type or text in content.json"
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
                    val parseContent = { body: String ->
                        val root = json.parseToJsonElement(body).jsonObject
                        val pages = root["pages"]?.jsonArray?.mapNotNull { pageElement ->
                            val pageObject = pageElement.jsonObject
                            val blocks = pageObject["blocks"]?.jsonArray?.mapNotNull { blockElement ->
                                val blockObject = blockElement.jsonObject
                                val type = blockObject["type"]?.jsonPrimitive?.contentOrNull ?: ""
                                val text = blockObject["text"]?.jsonPrimitive?.contentOrNull ?: ""
                                if (type.isBlank() && text.isBlank()) {
                                    null
                                } else {
                                    com.web2app.cms.model.Block(type = type, text = text)
                                }
                            } ?: emptyList()
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
                                Text(text = state.data.page.title)
                                state.data.page.blocks.forEach { block ->
                                    Text(text = block.text)
                                }
                            }
                        }
                    }
                }
            }
        }
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