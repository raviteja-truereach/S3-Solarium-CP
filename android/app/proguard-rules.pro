# Solarium CP App - ProGuard Rules for React Native 0.71.x
# Compatible with Android Gradle Plugin 7.3.1
# R8 is used by default (no need for separate R8 config)

# ================================
# CORE REACT NATIVE RULES
# ================================

# Keep React Native classes and methods
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }

# Keep React Native Bridge
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.views.** { *; }
-keep class com.facebook.react.modules.** { *; }

# Keep JavaScript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep React Native annotations
-keepclassmembers class * { 
    @com.facebook.react.uimanager.annotations.ReactProp <methods>; 
}
-keepclassmembers class * { 
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; 
}

# Keep ReactPackage implementations
-keep class * extends com.facebook.react.ReactPackage { *; }
-keepclassmembers class * extends com.facebook.react.ReactPackage {
    <init>(...);
}

# ================================
# HERMES JAVASCRIPT ENGINE
# ================================

-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# ================================
# THIRD-PARTY LIBRARY RULES
# ================================

# React Navigation
-keep class com.swmansion.** { *; }
-keep class com.th3rdwave.** { *; }
-dontwarn com.swmansion.**

# React Native Screens
-keep class com.swmansion.rnscreens.** { *; }

# React Native Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }

# React Native Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# React Native Paper / Material Components
-keep class com.google.android.material.** { *; }
-dontwarn com.google.android.material.**

# React Native Keychain
-keep class com.oblador.keychain.** { *; }
-keep class androidx.biometric.** { *; }

# React Native NetInfo
-keep class com.reactnativecommunity.netinfo.** { *; }

# React Native Config
-keep class com.lugg.ReactNativeConfig.** { *; }

# React Native SQLite Storage
-keep class io.liteglue.** { *; }
-keep class org.pgsqlite.** { *; }

# React Native Document Picker
-keep class com.reactnativecommunity.picker.** { *; }

# React Native Date Picker
-keep class com.henninghall.date_picker.** { *; }

# React Native Device Info
-keep class com.learnium.RNDeviceInfo.** { *; }

# React Native FS
-keep class com.rnfs.** { *; }

# React Native Get Random Values
-keep class com.reactnativecommunity.getrandomvalues.** { *; }

# React Native Toast Message
-keep class com.calendarevents.** { *; }
-keep class com.rntoastmessage.** { *; }

# React Native OTP Text Input
-keep class com.rnopttextinput.** { *; }

# React Native Restart
-keep class com.reactnativecommunity.rnrestart.** { *; }

# React Native Super Grid
-keep class com.reactnativesupergrid.** { *; }

# React Native Performance
-keep class com.oblador.performance.** { *; }

# Flash List
-keep class com.shopify.reactnative.** { *; }

# AsyncStorage
-keep class com.reactnativeasyncstorage.** { *; }

# ================================
# REDUX AND STATE MANAGEMENT
# ================================

# Redux Persist
-dontwarn com.google.errorprone.annotations.**
-keep class * implements java.io.Serializable { *; }

# ================================
# NETWORKING AND HTTP
# ================================

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# Retrofit (if used)
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }

# ================================
# ANDROID SYSTEM COMPONENTS
# ================================

# Support Library
-keep class android.support.** { *; }
-keep class androidx.** { *; }
-dontwarn androidx.**

# AndroidX
-keep class * extends androidx.fragment.app.Fragment {}
-keepclassmembers class * extends androidx.fragment.app.Fragment {
    public <init>(...);
}

# ================================
# SOLARIUM APP SPECIFIC
# ================================

# Keep main application class
-keep class com.solarium.cpapp.** { *; }

# Keep all model classes (data serialization)
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }

# ================================
# SECURITY AND OBFUSCATION
# ================================

# Keep native method names
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep enum classes
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Parcelable implementations
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator CREATOR;
}

# ================================
# DEBUGGING AND CRASH REPORTING
# ================================

# Preserve line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep crash reporting classes
-keep class com.crashlytics.** { *; }
-dontwarn com.crashlytics.**

# ================================
# PERFORMANCE OPTIMIZATIONS
# ================================

# Remove logging in release builds
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
    public static int e(...);
}

# Remove debug code
-assumenosideeffects class * {
    void debug(...);
    void trace(...);
}

# ================================
# GENERAL OPTIMIZATION SETTINGS
# ================================

# Optimization passes
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-dontpreverify
-verbose

# Keep generic signatures for reflection
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# ================================
# KOTLIN SUPPORT (for future)
# ================================

-dontwarn kotlin.**
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }

# ================================
# ADDITIONAL SAFETY RULES
# ================================

# Don't warn about missing classes
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**
-dontwarn java.nio.file.*
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement