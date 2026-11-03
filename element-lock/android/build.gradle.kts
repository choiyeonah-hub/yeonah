// The Android Gradle Plugin version is declared in app/build.gradle.kts so that :core can
// build on machines without access to Google's Maven repository or the Android SDK.
plugins {
    kotlin("jvm") version "2.2.0" apply false
    kotlin("android") version "2.2.0" apply false
    kotlin("plugin.serialization") version "2.2.0" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.2.0" apply false
}
