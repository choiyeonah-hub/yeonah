# kotlinx.serialization (used by :core for saved state)
-keepattributes *Annotation*, InnerClasses
-keepclassmembers class app.elementlock.core.** { *** Companion; }
-keepclasseswithmembers class app.elementlock.core.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class app.elementlock.core.**$$serializer { *; }
