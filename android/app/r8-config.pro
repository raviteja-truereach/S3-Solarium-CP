# R8-specific optimizations for Solarium CP App
# Enhanced rules for R8 compiler

# ================================
# R8 SPECIFIC RULES
# ================================

# Enable aggressive optimizations
-allowaccessmodification
-mergeinterfacesaggressively
-optimizeaggressively

# Keep important runtime annotations
-keepattributes RuntimeVisibleAnnotations
-keepattributes RuntimeVisibleParameterAnnotations
-keepattributes RuntimeVisibleTypeAnnotations

# ================================
# REACT NATIVE R8 OPTIMIZATIONS
# ================================

# Optimize React Native method calls
-assumevalues class com.facebook.react.bridge.ReactMethod {
    boolean isBlockingSynchronousMethod() return false;
}

# ================================
# SECURITY ENHANCEMENTS
# ================================

# Obfuscate class and member names more aggressively
-repackageclasses 'solarium.obfuscated'

# ================================
# DEAD CODE ELIMINATION
# ================================

# Remove unused React Native modules
-assumenosideeffects class com.facebook.react.bridge.ReactApplicationContext {
    void addLifecycleEventListener(...);
    void removeLifecycleEventListener(...);
}

# ================================
# STRING AND RESOURCE OPTIMIZATION
# ================================

# Optimize string concatenations
-optimizestring