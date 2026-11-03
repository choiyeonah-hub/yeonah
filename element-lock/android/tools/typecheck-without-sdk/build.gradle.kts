// Type-checks :app's Kotlin sources WITHOUT the Android SDK or Google's Maven repository,
// using Compose Desktop + Robolectric's android-all jar + small stubs (./stubs).
// This is NOT an Android build: it proves the code compiles against the APIs it calls, nothing more.
// Run: ../../gradlew -p . compileKotlin
plugins {
    kotlin("jvm") version "2.2.0"
    kotlin("plugin.serialization") version "2.2.0"
    id("org.jetbrains.kotlin.plugin.compose") version "2.2.0"
}

val android = rootDir.resolve("../..")
val generatedR = layout.buildDirectory.dir("generated/r")

val generateR by tasks.registering {
    val strings = android.resolve("app/src/main/res/values/strings.xml")
    inputs.file(strings)
    outputs.dir(generatedR)
    doLast {
        val names = Regex("<string name=\"([a-z0-9_]+)\"").findAll(strings.readText()).map { it.groupValues[1] }.toList()
        val out = generatedR.get().file("R.kt").asFile
        out.parentFile.mkdirs()
        out.writeText("package app.elementlock.android\nobject R { object string {\n" +
            names.mapIndexed { i, n -> "  const val $n = $i\n" }.joinToString("") + "} }\n")
    }
}

sourceSets["main"].kotlin.srcDirs(
    android.resolve("core/src/main/kotlin"), android.resolve("app/src/main/java"), "stubs", generatedR,
)
tasks.named("compileKotlin") { dependsOn(generateR) }

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.2")
    implementation("org.jetbrains.compose.ui:ui-desktop:1.8.2")
    implementation("org.jetbrains.compose.foundation:foundation-desktop:1.8.2")
    implementation("org.jetbrains.compose.material3:material3-desktop:1.8.2")
    implementation("org.jetbrains.compose.material:material-icons-core-desktop:1.7.3")
    compileOnly("org.robolectric:android-all:15-robolectric-12714715")
}

configurations.all {
    // androidx.* artifacts are only on Google's Maven; only signatures are needed here.
    exclude(group = "androidx.arch.core"); exclude(group = "androidx.lifecycle")
    exclude(group = "androidx.annotation"); exclude(group = "androidx.collection")
}

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
java { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
