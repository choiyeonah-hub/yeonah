pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "ElementLock"

// :core is plain Kotlin/JVM (learning rules, unlock rules) and builds without the Android SDK.
include(":core")

// :app needs the Android SDK. It is skipped when no SDK is configured so that
// `./gradlew :core:test` still runs on machines/CI without the SDK.
val sdkConfigured = System.getenv("ANDROID_HOME") != null ||
    System.getenv("ANDROID_SDK_ROOT") != null ||
    file("local.properties").let { it.exists() && it.readText().contains("sdk.dir") }
if (sdkConfigured) {
    include(":app")
} else {
    logger.warn("Android SDK not configured: skipping :app (set ANDROID_HOME or local.properties sdk.dir)")
}
