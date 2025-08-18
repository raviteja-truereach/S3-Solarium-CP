# Implementation Backlog: Document Upload UI & Local Validation (S5-TASK-01A)

## Pre-Analysis Phase

### Analysis of Current Codebase Patterns

Based on the codebase analysis, I've identified the following patterns to leverage:

1. **Screen Structure**: Follow `AddLeadScreen.tsx` pattern for form-based screens with validation
2. **Navigation Integration**: Use `LeadDetailScreen.tsx` tab pattern for Documents tab
3. **Validation**: Extend validation patterns from `leadSchema.ts`
4. **Error Handling**: Use `errorMessage.ts` patterns and Toast notifications
5. **Connectivity**: Leverage existing `useConnectivity()` hook
6. **Component Library**: Use react-native-paper components consistently
7. **Design System**: Reference existing design tokens and Paper theme for UI consistency
8. **Accessibility**: Follow patterns from existing a11y tests (HomeScreen.a11y.test.tsx)

### Top 5 Implementation Pitfalls

1. **Memory Overflow with Multiple Images**
   - Developers may load full-resolution images directly into state, causing crashes
   - Must use thumbnail URIs and compress images before state storage

2. **Race Condition on Document Count Validation**
   - Async count fetching while user selects files could bypass 7-doc limit
   - Must disable picker during fetch and maintain local count as source of truth

3. **Missing Permission Handling**
   - Not implementing proper camera/gallery permissions will cause silent failures
   - Must check and request permissions before picker launch

4. **Synchronous Image Compression**
   - Compressing large images on main thread will freeze UI
   - Must use async compression with progress indicators

5. **State Persistence Across Navigation**
   - Selected documents lost when navigating between tabs
   - Must lift state to parent or use proper navigation params

---

## Implementation Backlog

### SUB-TASK-01: Setup Document Module Scaffold
**Story Points**: 2  
**Priority**: High

#### Acceptance Criteria
- [ ] Document module folder structure created following existing patterns
- [ ] Required dependencies added to package.json
- [ ] Basic TypeScript types defined for documents
- [ ] Module exports properly configured
- [ ] Mock service structure created separate from production code

#### Dependencies
- None (first task)

#### Implementation Approach
1. Create document module structure under `src/components/documents/`
2. Define TypeScript interfaces in `src/types/document.ts`
3. Add image picker and compression dependencies
4. Configure module exports in index files
5. Create `src/services/mocks/documentMockService.ts` for mock APIs

#### New Code Artifacts
**Files**:
- `src/types/document.ts` - Document type definitions
- `src/components/documents/index.ts` - Module exports
- `src/constants/document.ts` - Document constants (limits, types)
- `src/services/mocks/documentMockService.ts` - Mock service for document count

**Functions**:
```typescript
// In src/services/mocks/documentMockService.ts
getDocumentCount(leadId: string): number
setDocumentCount(leadId: string, count: number): void
```

#### Expected Outputs
- Folder structure matching existing module patterns
- Type definitions for document handling
- Dependencies installed and configured
- Mock service ready for local state management

#### Testing Requirements
- Verify module imports work correctly
- TypeScript compilation passes
- No circular dependencies
- Mock service unit tests

---

### SUB-TASK-02: Image Compression Utility with Performance Optimization
**Story Points**: 3  
**Priority**: High

#### Acceptance Criteria
- [ ] Compress images >2MB to acceptable size
- [ ] Maintain image quality above threshold
- [ ] Support JPEG and PNG formats
- [ ] Handle compression errors gracefully
- [ ] Return compressed image with metadata
- [ ] Compression runs asynchronously with progress callback
- [ ] Performance metrics logged for monitoring

#### Dependencies
- SUB-TASK-01 (module scaffold)

#### Implementation Approach
1. Create ImageCompressor utility following existing utility patterns
2. Implement async compression with configurable quality
3. Add size calculation helpers
4. Implement error handling with fallback
5. Add progress callback for UI updates
6. Use React Native's InteractionManager for performance

#### New Code Artifacts
**Files**:
- `src/utils/imageCompressor.ts` - Main compression utility
- `src/utils/__tests__/imageCompressor.test.ts` - Unit tests
- `__tests__/performance/imageCompression.perf.test.ts` - Performance tests

**Functions**:
```typescript
// In src/utils/imageCompressor.ts
compressImage(uri: string, options?: CompressionOptions, onProgress?: (progress: number) => void): Promise<CompressedImage>
calculateImageSize(uri: string): Promise<number>
shouldCompress(sizeInBytes: number): boolean
compressImageBatch(uris: string[], options?: CompressionOptions): Promise<CompressedImage[]>
```

#### Expected Outputs
- Images >2MB compressed to ≤2MB
- Metadata preserved (dimensions, format)
- Error messages for unsupported formats
- Progress updates during compression
- Performance within 2s for 5MB image

#### Testing Requirements
- Unit tests for compression logic
- Test with various image sizes and formats
- Verify compression quality thresholds
- Test error scenarios
- Performance benchmarks for different image sizes
- Memory usage tests

---

### SUB-TASK-03: Document Validation Helpers with Security
**Story Points**: 3  
**Priority**: High

#### Acceptance Criteria
- [ ] Validate file size ≤10MB
- [ ] Validate file type by extension AND content (magic bytes)
- [ ] Validate document count ≤7
- [ ] Return specific error messages
- [ ] Follow existing validation patterns
- [ ] Detect disguised files (content/extension mismatch)
- [ ] PDF validation clarified (icon-only display)

#### Dependencies
- SUB-TASK-01 (module scaffold)

#### Implementation Approach
1. Create validation module following `leadSchema.ts` patterns
2. Implement individual validators for each rule
3. Add file content validation using magic bytes
4. Create composite validator for document selection
5. Add validation error messages to strings constants
6. Document PDF icon-only behavior

#### New Code Artifacts
**Files**:
- `src/validation/documentSchema.ts` - Document validation rules
- `src/validation/__tests__/documentSchema.test.ts` - Validation tests
- `src/utils/fileContentValidator.ts` - Magic byte validation

**Functions**:
```typescript
// In src/validation/documentSchema.ts
validateFileSize(sizeInBytes: number): string | null
validateFileType(filename: string): string | null
validateFileContent(uri: string, expectedType: string): Promise<string | null>
validateDocumentCount(currentCount: number, newCount: number): string | null
validateDocument(document: DocumentInput): Promise<ValidationResult>

// In src/utils/fileContentValidator.ts
detectFileType(uri: string): Promise<string>
verifyFileIntegrity(uri: string, declaredType: string): Promise<boolean>
```

#### Expected Outputs
- Clear validation error messages
- Validation results with field-level errors
- Support for batch validation
- Security validation for disguised files
- PDF display behavior documented

#### Testing Requirements
- Unit tests for each validator
- Edge case testing (exactly 7 docs, 10MB files)
- Error message verification
- Integration with form validation
- Security validation tests
- Test with corrupted/disguised files

---

### SUB-TASK-04: Document Picker Integration with Accessibility
**Story Points**: 3  
**Priority**: Medium

#### Acceptance Criteria
- [ ] Launch image picker from camera or gallery
- [ ] Handle permissions properly on iOS/Android
- [ ] Return selected images with metadata
- [ ] Support multiple selection (respecting limit)
- [ ] Show loading state during selection
- [ ] All picker controls have ARIA labels
- [ ] Keyboard navigation supported
- [ ] Screen reader announces selection status
- [ ] Permission denial handled with accessible error message

#### Dependencies
- SUB-TASK-01 (module scaffold)
- SUB-TASK-03 (validation helpers)

#### Implementation Approach
1. Create DocumentPicker hook following existing hook patterns
2. Implement permission checks and requests
3. Configure picker options for both platforms
4. Add error handling for cancellation and failures
5. Add accessibility labels to all interactive elements
6. Implement keyboard navigation support

#### New Code Artifacts
**Files**:
- `src/hooks/useDocumentPicker.ts` - Document picker hook
- `src/hooks/__tests__/useDocumentPicker.test.ts` - Hook tests
- `src/components/documents/PermissionDeniedMessage.tsx` - Accessible error component

**Functions**:
```typescript
// In src/hooks/useDocumentPicker.ts
useDocumentPicker(): {
  pickDocuments: (options?: PickerOptions) => Promise<DocumentAsset[]>
  isLoading: boolean
  error: string | null
  permissionStatus: PermissionStatus
  requestPermission: () => Promise<boolean>
}

// In src/components/documents/PermissionDeniedMessage.tsx
PermissionDeniedMessage({ type, onRetry }: PermissionDeniedProps): JSX.Element
```

#### Expected Outputs
- Selected documents with URIs and metadata
- Permission request flows
- Error states for denied permissions
- Accessible picker interface
- Clear loading indicators

#### Testing Requirements
- Mock react-native-image-picker in tests
- Test permission flows
- Test selection limits
- Verify error handling
- Accessibility testing with screen reader
- Keyboard navigation tests

---

### SUB-TASK-05: Document Thumbnail Component with Performance
**Story Points**: 3  
**Priority**: Medium

#### Acceptance Criteria
- [ ] Display image thumbnails in grid
- [ ] Show file type icon for PDFs (not preview)
- [ ] Include remove button on each thumbnail
- [ ] Display file name and size
- [ ] Handle loading and error states
- [ ] Use React.memo for performance
- [ ] Implement virtualization for large lists
- [ ] All thumbnails have proper ARIA labels
- [ ] Remove action has confirmation

#### Dependencies
- SUB-TASK-01 (module scaffold)

#### Implementation Approach
1. Create thumbnail component using Paper Card
2. Implement grid layout with proper spacing
3. Add remove functionality with confirmation
4. Show PDF icon (not thumbnail generation)
5. Optimize with React.memo and useCallback
6. Add virtualization for >20 items

#### New Code Artifacts
**Files**:
- `src/components/documents/DocumentThumbnail.tsx` - Thumbnail component
- `src/components/documents/DocumentGrid.tsx` - Grid container
- `src/components/documents/__tests__/DocumentThumbnail.test.tsx` - Tests
- `__tests__/performance/documentGrid.perf.test.tsx` - Performance tests

**Functions**:
```typescript
// In src/components/documents/DocumentThumbnail.tsx
DocumentThumbnail = React.memo(({ document, onRemove }: DocumentThumbnailProps): JSX.Element)

// In src/components/documents/DocumentGrid.tsx
DocumentGrid({ documents, onRemove, loading }: DocumentGridProps): JSX.Element
useVirtualizedGrid(documents: Document[]): VirtualizedGridResult
```

#### Expected Outputs
- Grid of document thumbnails
- Smooth remove animations
- Accessibility labels
- PDF files show icon only
- Performance: <100ms render for 50 items

#### Testing Requirements
- Snapshot tests for components
- Interaction tests for remove action
- Accessibility testing
- Different file type rendering
- Performance tests with large datasets
- Memory leak tests

---

### SUB-TASK-06: Local Document Count State Management
**Story Points**: 2  
**Priority**: Medium

#### Acceptance Criteria
- [ ] Manage document count in local state (no network)
- [ ] Integrate with mock service from SUB-TASK-01
- [ ] Simulate realistic delays for testing
- [ ] UI locks during count operations
- [ ] Count persists during navigation

#### Dependencies
- SUB-TASK-01 (module scaffold)

#### Implementation Approach
1. Use local state management (Context or Redux slice)
2. Integrate with mock service for count storage
3. Add loading states for count operations
4. Implement UI locking mechanism
5. Persist count in navigation params

#### New Code Artifacts
**Files**:
- `src/contexts/DocumentContext.tsx` - Document state context
- `src/hooks/useDocumentCount.ts` - Count management hook

**Functions**:
```typescript
// In src/contexts/DocumentContext.tsx
DocumentProvider({ children }: DocumentProviderProps): JSX.Element
useDocumentContext(): DocumentContextValue

// In src/hooks/useDocumentCount.ts
useDocumentCount(leadId: string): {
  count: number
  loading: boolean
  refreshCount: () => Promise<void>
  isCountLocked: boolean
}
```

#### Expected Outputs
- Local count management
- Loading states during operations
- UI properly locked during updates
- Count persists across navigation

#### Testing Requirements
- State management tests
- Loading state verification
- Race condition prevention tests
- Navigation persistence tests

---

### SUB-TASK-07: Document Upload Screen UI with State Persistence
**Story Points**: 4  
**Priority**: High

#### Acceptance Criteria
- [ ] Complete screen layout following design system
- [ ] Add document button triggers picker
- [ ] Display selected documents in grid
- [ ] Show remaining slots counter with loading state
- [ ] Disabled upload button (for now)
- [ ] Loading states for all operations (compression, count fetch)
- [ ] Error states with user-friendly messages
- [ ] State persists across tab navigation
- [ ] All form elements have ARIA labels
- [ ] Keyboard navigation fully supported
- [ ] Follows existing screen patterns

#### Dependencies
- SUB-TASK-02 through SUB-TASK-06 (all utilities and components)

#### Implementation Approach
1. Create screen following AddLeadScreen structure
2. Integrate all document handling utilities
3. Implement state management for documents
4. Add loading and error states for each async operation
5. Connect to navigation from Documents tab
6. Implement state persistence using navigation params
7. Add comprehensive accessibility attributes

#### New Code Artifacts
**Files**:
- `src/screens/documents/DocumentUploadScreen.tsx` - Main screen
- `src/screens/documents/__tests__/DocumentUploadScreen.test.tsx` - Screen tests
- `__tests__/a11y/DocumentUploadScreen.a11y.test.tsx` - Accessibility tests

**Functions**:
```typescript
// In src/screens/documents/DocumentUploadScreen.tsx
DocumentUploadScreen({ route, navigation }: DocumentUploadScreenProps): JSX.Element
handleAddDocument(): Promise<void>
handleRemoveDocument(documentId: string): void
handleCompress(document: DocumentAsset): Promise<DocumentAsset>
refreshDocumentCount(): Promise<void>
persistState(): void
restoreState(): void
```

#### Expected Outputs
- Fully functional document selection screen
- Smooth user experience with loading states
- Clear error messages via Toast
- Specific loading indicators for each operation
- State persistence across navigation
- Fully accessible interface

#### Testing Requirements
- Screen snapshot tests
- User flow integration tests
- State management tests
- Navigation integration
- Accessibility compliance (80%+ coverage)
- Loading/error state tests
- State persistence tests

---

### SUB-TASK-08: Documents Tab Integration
**Story Points**: 2  
**Priority**: High

#### Acceptance Criteria
- [ ] Replace placeholder in Documents tab
- [ ] Navigate to DocumentUploadScreen
- [ ] Pass leadId correctly
- [ ] Handle back navigation
- [ ] Show tab badge with document count
- [ ] Tab accessible with screen reader

#### Dependencies
- SUB-TASK-07 (Document Upload Screen)

#### Implementation Approach
1. Update LeadDetailScreen Documents tab case
2. Add navigation to DocumentUploadScreen
3. Pass required parameters including state
4. Update tab to show document count badge
5. Add accessibility labels to tab

#### New Code Artifacts
**Files**:
- Updates to `src/screens/leads/LeadDetailScreen.tsx`
- Updates to `src/navigation/types.ts` - Add route type

**Functions**:
```typescript
// Navigation type updates only
// In src/navigation/types.ts
DocumentUpload: {
  leadId: string;
  initialDocuments?: Document[];
}
```

#### Expected Outputs
- Working Documents tab navigation
- Proper parameter passing
- Smooth transitions
- Document count badge visible

#### Testing Requirements
- Navigation flow tests
- Parameter passing verification
- Tab switching tests
- Badge update tests

---

### SUB-TASK-09: Comprehensive Testing & Documentation
**Story Points**: 3  
**Priority**: Medium

#### Acceptance Criteria
- [ ] All unit tests achieve 85%+ coverage
- [ ] E2E test for document selection flow
- [ ] Performance tests for image compression and UI
- [ ] Accessibility tests pass WCAG 2.1 AA
- [ ] README documentation updated
- [ ] ADR for document handling decisions
- [ ] Design compliance verified

#### Dependencies
- SUB-TASK-01 through SUB-TASK-08 (all implementation complete)

#### Implementation Approach
1. Write comprehensive unit tests for all new code
2. Create E2E test following existing patterns
3. Add performance benchmarks for compression and UI
4. Run accessibility audit and fix issues
5. Document architectural decisions
6. Update component documentation
7. Verify design system compliance

#### New Code Artifacts
**Files**:
- `e2e/documentUpload.e2e.js` - E2E test suite
- `__tests__/performance/imageCompression.perf.test.ts` - Performance tests
- `__tests__/performance/documentUI.perf.test.ts` - UI performance tests
- `docs/adr/ADR-0017-document-handling.md` - Architecture decisions
- `docs/features/document-upload.md` - Feature documentation

**Functions**:
- Test functions only

#### Expected Outputs
- 85%+ test coverage on all new code
- Passing E2E tests on both platforms
- Performance within defined budgets
- Accessibility audit passed
- Clear architectural documentation
- Design compliance documented

#### Testing Requirements
- Coverage reports meet targets
- E2E tests pass on both platforms
- Performance within acceptable limits
- Accessibility tests pass
- Documentation review complete
- All async operations have proper test coverage

---

## Execution Order & Dependencies

```
SUB-TASK-01 (Scaffold)
    ├── SUB-TASK-02 (Compression)
    ├── SUB-TASK-03 (Validation)
    └── SUB-TASK-04 (Picker)
            └── SUB-TASK-05 (Thumbnails)
                    └── SUB-TASK-06 (Local State)
                            └── SUB-TASK-07 (Screen UI)
                                    └── SUB-TASK-08 (Tab Integration)
                                            └── SUB-TASK-09 (Testing)
```

## Risk Mitigation Strategies

1. **Performance**: Implement compression in background thread with progress indicators
2. **Memory**: Use thumbnail URIs, not full images in state; implement virtualization
3. **Permissions**: Graceful degradation if permissions denied with accessible messages
4. **State Management**: Persist selection in navigation params and context
5. **Network**: Strictly local-only for this slice; mock all network operations
6. **Security**: Validate file content, not just extensions
7. **Accessibility**: Test with screen readers on both platforms
8. **Race Conditions**: Lock UI during count operations