# Azure Application Insights Telemetry Integration

## Overview
This document describes the integration of Azure Application Insights for performance metrics collection in the Solarium CP App.

## Configuration

### Environment Variables
The following environment variables control telemetry behavior:

- `AZURE_APPLICATION_INSIGHTS_KEY`: Instrumentation key (injected by CI/CD)
- `ENABLE_TELEMETRY`: Enable/disable telemetry (default: false)
- `TELEMETRY_BATCH_SIZE`: Number of events to batch before sending (default: 10)
- `TELEMETRY_FLUSH_INTERVAL`: Interval in milliseconds to flush events (default: 30000)
- `TELEMETRY_MAX_RETRIES`: Maximum retry attempts for failed events (default: 3)
- `TELEMETRY_RETRY_DELAY`: Delay between retries in milliseconds (default: 1000)
- `ENABLE_USER_TRACKING`: Enable user tracking (default: false)
- `ENABLE_PERFORMANCE_TRACKING`: Enable performance tracking (default: true)
- `ENABLE_MEMORY_TRACKING`: Enable memory tracking (default: true)

### Security
- The instrumentation key is never stored in source code
- The key is injected during CI/CD from Azure Key Vault
- Users can opt-out of telemetry collection
- All telemetry respects privacy settings

## Usage

### Initialization
```typescript
import TelemetryService from './src/services/TelemetryService';

// Initialize with instrumentation key (typically done in App.tsx)
await TelemetryService.initialize();