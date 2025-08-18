# Device Testing Matrix for Performance Validation

## Overview

This document defines the specific device configurations and testing requirements for performance budget validation in the Solarium CP App.

## Device Tier Definitions

### Minimum Specification Devices (Baseline Testing)

These devices represent the minimum supported configuration and establish the performance floor.

#### Android Minimum Spec
| Specification | Requirement | Reference Devices |
|---------------|-------------|-------------------|
| **OS Version** | Android 8.0 (API 26) | Minimum supported |
| **RAM** | 2GB | Entry-level threshold |
| **CPU** | Snapdragon 425 or equivalent | ~1.4GHz quad-core |
| **Storage** | 16GB+ available | Sufficient for app + OS |
| **Screen** | 5.0" 720p | Common budget device spec |

**Reference Test Devices:**
- Samsung Galaxy J7 (2017)
- Xiaomi Redmi 5A
- Nokia 3.1
- Moto E5

#### iOS Minimum Spec
| Specification | Requirement | Reference Devices |
|---------------|-------------|-------------------|
| **OS Version** | iOS 13.0 | Minimum supported |
| **RAM** | 2GB | iPhone 7 baseline |
| **CPU** | A10 Bionic | 2016 flagship processor |
| **Storage** | 32GB+ available | Base storage tier |
| **Screen** | 4.7" Retina | iPhone 7 display |

**Reference Test Devices:**
- iPhone 7
- iPhone 7 Plus
- iPad (6th generation)

### High-End Devices (Performance Validation)

These devices represent modern flagship specifications and validate optimal performance.

#### Android High-End
| Specification | Requirement | Reference Devices |
|---------------|-------------|-------------------|
| **OS Version** | Android 12+ (API 31+) | Latest stable |
| **RAM** | 6GB+ | Flagship standard |
| **CPU** | Snapdragon 888/Exynos 2100+ | 2021+ flagship |
| **Storage** | 128GB+ UFS 3.1 | Fast storage |
| **Screen** | 6.0"+ 1080p+ | Modern display |

**Reference Test Devices:**
- Samsung Galaxy S21/S22 series
- Google Pixel 6/7 series
- OnePlus 9/10 series
- Xiaomi Mi 11/12 series

#### iOS High-End  
| Specification | Requirement | Reference Devices |
|---------------|-------------|-------------------|
| **OS Version** | iOS 15+ | Latest stable |
| **RAM** | 6GB+ | iPhone 12 Pro+ |
| **CPU** | A14 Bionic+ | 2020+ processor |
| **Storage** | 128GB+ | Base Pro storage |
| **Screen** | 6.1"+ Super Retina | Modern display |

**Reference Test Devices:**
- iPhone 12 Pro/Pro Max
- iPhone 13 Pro/Pro Max
- iPhone 14 series
- iPad Pro (5th gen+)

## Performance Budget by Device Tier

### Cold Start Performance

| Device Tier | Target | Maximum | Notes |
|-------------|--------|---------|-------|
| **Minimum Spec** | 2500ms | 3500ms | Adjusted for limited CPU/RAM |
| **High-End** | 1500ms | 2000ms | Expected flagship performance |
| **CI Emulator** | 2000ms | 3000ms | Default budget for automation |

### Navigation Performance

| Device Tier | Target | Maximum | Notes |
|-------------|--------|---------|-------|
| **Minimum Spec** | 250ms | 400ms | Account for slower rendering |
| **High-End** | 150ms | 200ms | Smooth flagship experience |
| **CI Emulator** | 200ms | 300ms | Default budget for automation |

### Memory Usage

| Device Tier | Target | Maximum | Notes |
|-------------|--------|---------|-------|
| **Minimum Spec** | 80MB | 120MB | Conservative for 2GB devices |
| **High-End** | 128MB | 192MB | Higher limits for 6GB+ devices |
| **CI Emulator** | 100MB | 150MB | Default budget for automation |

## Testing Environment Setup

### Physical Device Testing

#### Android Device Setup
```bash
# Enable developer options
adb shell settings put global development_settings_enabled 1

# Disable animations for consistent testing
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0

# Set device to performance mode
adb shell settings put global low_power 0
adb shell settings put system screen_brightness 128

# Clear app data before testing
adb shell pm clear com.solarium.cpapp