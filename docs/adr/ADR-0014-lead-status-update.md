# ADR-0014: Lead Status Update Architecture

## Status

**Accepted** - 2024-01-21

## Context

The Solarium CP App requires a robust lead status update system that supports the complete lead lifecycle from "New Lead" to "Executed". The system must handle status transitions, validation, quotation integration, and maintain data consistency across offline/online scenarios.

### Requirements

1. **Sequential Status Flow**: Enforce proper lead lifecycle progression
2. **Validation**: Business rule validation for status transitions
3. **Quotation Integration**: Require quotation reference for "Won" status
4. **Optimistic Updates**: Immediate UI feedback with server rollback capability
5. **Offline Guard**: Prevent status changes when offline
6. **Performance**: Dialog open < 300ms, perceived latency < 150ms
7. **Accessibility**: Full screen reader support and keyboard navigation
8. **Data Consistency**: Sync across RTK Query, Redux, and SQLite

### Constraints

- Must work with existing RTK Query architecture
- Maintain backward compatibility with current lead data structure
- Support both online and offline scenarios
- Follow React Native Paper design patterns
- Integrate with existing SyncManager for background persistence

### Business Rules

1. **Status Transitions**: New Lead → In Discussion → Physical Meeting Assigned → Customer Accepted → Won → Pending at Solarium → Under Execution → Executed
2. **Terminal States**: Not Responding, Not Interested, Other Territory (reachable from any active state)
3. **Field Requirements**:
   - Won status requires quotation reference
   - Under Execution/Executed require token number
   - Follow-up required for In Discussion, Physical Meeting Assigned, Customer Accepted, Pending at Solarium
4. **Validation Rules**:
   - Remarks minimum 10 characters
   - Follow-up date within 30 days
   - Quotation reference format: QUOT-XXXX
   - Token number format: TKN-XXXX

## Decision

### Architecture Components

#### 1. StatusValidationService (Pure Function)
```typescript
// Core validation with business rules
validateStatusChange(input: StatusChangeDraft): ValidationResult
isTransitionAllowed(current: string, next: string): boolean
getStatusRequirements(status: string): string[]