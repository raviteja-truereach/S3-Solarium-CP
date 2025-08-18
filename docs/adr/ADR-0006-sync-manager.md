# ADR-0006: SyncManager Architecture and Implementation

## Status
Accepted

## Context
The CPAPP requires a robust offline-first synchronization system to manage lead, customer, and quotation data between the local SQLite cache and the backend APIs. The system must handle authentication failures, network issues, and ensure data consistency while providing a seamless user experience.

## Decision
We implement a singleton SyncManager service with the following key architectural decisions:

### 1. Server-Wins Strategy
- **Decision**: Local cache is completely overwritten with server data during sync
- **Rationale**: Simplifies conflict resolution and ensures data consistency
- **Trade-off**: Local changes are lost, but prevents complex merge scenarios

### 2. Atomic Transactions
- **Decision**: All database updates occur within a single SQLite transaction
- **Rationale**: Ensures data consistency - either all updates succeed or all fail
- **Implementation**: DELETE all existing records, then INSERT new records per table

### 3. Empty Array Protection
- **Decision**: Tables are only updated if server returns non-empty data arrays
- **Rationale**: Prevents accidental data loss due to temporary server issues
- **Implementation**: Check `array.length > 0` before DELETE/INSERT operations

### 4. Authentication-First Error Handling
- **Decision**: 401 errors immediately trigger logout and halt sync
- **Rationale**: Invalid auth state requires user intervention
- **Implementation**: Dispatch `performLogout()` thunk, emit AUTH_EXPIRED event

### 5. Exponential Backoff for Server Errors
- **Decision**: Retry 5xx errors with delays: 1s → 2s → 4s (max 3 attempts)
- **Rationale**: Handles temporary server overload gracefully
- **Implementation**: Promise-based retry loop with setTimeout delays

### 6. Concurrency Protection via Promise Caching
- **Decision**: Multiple sync calls return the same Promise instance
- **Rationale**: Prevents duplicate network requests and database conflicts
- **Implementation**: Cache active sync Promise, clear on completion

### 7. Event-Driven Architecture
- **Decision**: Emit typed events (syncStarted, syncFinished, syncFailed) for UI updates
- **Rationale**: Decouples sync logic from UI, enables multiple listeners
- **Implementation**: Extend EventEmitter with typed event system

## Technical Implementation

### Core Components
```typescript
SyncManager (Singleton)
├── manualSync(source) → Promise<SyncResult>
├── Event System (syncStarted, syncFinished, syncFailed)
├── Network Check (NetInfo integration)
├── Fetch Layer (JWT auth, timeout, retry)
├── Cache Persistence (atomic SQLite transactions)
└── Redux Hydration (immediate UI updates)