package com.web2app.cms.model

import kotlinx.serialization.Serializable

@Serializable
data class Manifest(
    val schemaVersion: String,
    val contentVersion: String,
    val compatibleAppVersions: CompatibleAppVersions,
    val pagesOrder: List<String>,
    val featureFlags: FeatureFlags
)

@Serializable
data class CompatibleAppVersions(
    val min: String,
    val max: String
)

@Serializable
data class FeatureFlags(
    val showWelcomeBanner: Boolean,
    val enableHelpLink: Boolean
)
