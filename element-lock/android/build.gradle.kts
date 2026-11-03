// AGP must share the root classloader with the Kotlin plugin (otherwise kotlin-android cannot see
// AGP classes). It is only put on the classpath when an Android SDK is configured, so that :core
// still builds on machines without the SDK or Google's Maven repository.
buildscript {
    val sdkConfigured = System.getenv("ANDROID_HOME") != null ||
        System.getenv("ANDROID_SDK_ROOT") != null ||
        File(rootDir, "local.properties").let { it.exists() && it.readText().contains("sdk.dir") }
    if (sdkConfigured) {
        repositories { google(); mavenCentral() }
        dependencies { classpath("com.android.tools.build:gradle:8.11.1") }
    }
}

plugins {
    kotlin("jvm") version "2.2.0" apply false
    kotlin("android") version "2.2.0" apply false
    kotlin("plugin.serialization") version "2.2.0" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.2.0" apply false
}
