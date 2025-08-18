# Contributing to Solarium CP App

Thank you for contributing to the Solarium Channel Partner App! This guide outlines our development workflow and coding standards.

## 🚀 Getting Started

### Development Workflow

1. **Fork & Clone** the repository
2. **Create feature branch** from `main`
3. **Make changes** following our standards
4. **Test thoroughly** with automated and manual tests  
5. **Submit pull request** with clear description

### Branch Strategy

main (development) ← Default branch for development ├── feature/CP-123-feature-name ← Feature branches ├── bugfix/CP-456-bug-description ← Bug fix branches └── hotfix/CP-789-critical-fix ← Critical fixes

staging ← Staging environment branch production ← Production environment branch


#### Branch Naming

- **Feature**: `feature/CP-123-short-description`
- **Bug Fix**: `bugfix/CP-456-short-description`  
- **Hot Fix**: `hotfix/CP-789-short-description`
- **Refactor**: `refactor/CP-101-short-description`

### Environment Requirements

**Mandatory ENVFILE Usage**: All builds and tests require environment configuration.

```bash
# ✅ Correct - Always specify environment
ENVFILE=.env.development yarn test
ENVFILE=.env.staging fastlane android_debug

# ❌ Incorrect - Will fail
yarn test
fastlane android_debug
📝 Coding Standards
TypeScript Guidelines
// ✅ Good: Strong typing
interface UserProfile {
  id: string;
  name: string;
  role: 'channel_partner' | 'admin';
}

// ✅ Good: Documented functions
/**
 * Calculates commission based on lead value
 * @param leadValue - Lead value in currency
 * @param rate - Commission rate (0-1)
 * @returns Commission amount
 */
const calculateCommission = (leadValue: number, rate: number): number => {
  return leadValue * rate;
};

// ❌ Avoid: Any types
const userData: any = getUser();

// ❌ Avoid: Undocumented complex functions
const calc = (x, y) => x * y * 0.15;
React Native Components
// ✅ Good: Functional component with proper types
interface LeadCardProps {
  lead: Lead;
  onPress: (leadId: string) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(lead.id);
  }, [lead.id, onPress]);

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text>{lead.customerName}</Text>
    </TouchableOpacity>
  );
};

export default React.memo(LeadCard);
File Organization
// Import order
import React from 'react';                    // 1. React
import { View, Text } from 'react-native';    // 2. React Native
import { useSelector } from 'react-redux';    // 3. Third-party
import { Lead } from '@models/Lead';           // 4. Internal types
import { LeadService } from '@services/api';   // 5. Internal services
import styles from './LeadScreen.styles';     // 6. Local styles
Testing Standards
// ✅ Good: Comprehensive test coverage
describe('LeadService', () => {
  describe('createLead', () => {
    it('should create lead with valid data', async () => {
      const leadData = createTestData.lead();
      const result = await LeadService.createLead(leadData);
      
      expect(result.success).toBe(true);
      expect(result.data.id).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const invalidData = { ...createTestData.lead(), customerName: '' };
      
      await expect(LeadService.createLead(invalidData))
        .rejects.toThrow('Customer name is required');
    });

    it('should handle network errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Network error'));
      
      await expect(LeadService.createLead(createTestData.lead()))
        .rejects.toThrow('Network error');
    });
  });
});
🔧 Development Tools
Pre-commit Hooks
Husky automatically runs these checks before each commit:

# Runs automatically on git commit:
1. ESLint (with auto-fix)
2. Prettier formatting  
3. TypeScript type checking
4. Test execution (if relevant files changed)
Bypassing Hooks
# Only in emergencies (not recommended)
git commit --no-verify -m "Emergency fix"
Code Quality Checks
# Run all quality checks
yarn lint              # ESLint
yarn type-check        # TypeScript
yarn test:coverage     # Tests with coverage
yarn format:check      # Prettier formatting

# Auto-fix issues
yarn lint:fix          # Fix ESLint issues
yarn format            # Apply Prettier formatting
🧪 Testing Requirements
Coverage Requirements
| Component Type | Coverage Threshold | |----------------|-------------------| | Services/API | ≥85% | | Components | ≥75% | | Utilities | ≥90% | | Overall | ≥80% |

Test Categories
Unit Tests: Individual functions and components
Integration Tests: API interactions and data flow
Manual Testing: User workflows on both platforms
Writing Tests
// Test file naming: ComponentName.test.tsx
// Test location: __tests__/components/ComponentName.test.tsx

import { render, fireEvent } from '@testing-library/react-native';
import { LeadCard } from '@components/LeadCard';
import { createTestData } from '@utils/testUtils';

describe('LeadCard', () => {
  const mockLead = createTestData.lead();
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays lead information correctly', () => {
    const { getByText } = render(
      <LeadCard lead={mockLead} onPress={mockOnPress} />
    );
    
    expect(getByText(mockLead.customerName)).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const { getByTestId } = render(
      <LeadCard lead={mockLead} onPress={mockOnPress} />
    );
    
    fireEvent.press(getByTestId('lead-card'));
    expect(mockOnPress).toHaveBeenCalledWith(mockLead.id);
  });
});
📦 Build & Deployment
Local Builds
# Android
ENVFILE=.env.development fastlane android_debug
ENVFILE=.env.staging fastlane android_debug  

# iOS (macOS only)
ENVFILE=.env.development fastlane ios_debug
ENVFILE=.env.staging fastlane ios_debug
Environment Validation
Before any build or test:

# Validate environment setup
yarn ci:validate-env

# Check environment variables
echo $ENVFILE
cat $ENVFILE
🚀 Pull Request Process
Before Submitting
Rebase your branch on latest main
Run all checks locally:
yarn lint
yarn type-check  
yarn test:coverage
ENVFILE=.env.development yarn ci:validate-env
Test on both platforms (if UI changes)
Update documentation if needed
PR Requirements
[ ] Clear title describing the change
[ ] Detailed description with context and reasoning
[ ] Screenshots for UI changes
[ ] Test coverage maintained or improved
[ ] No linting errors or TypeScript issues
[ ] All CI checks passing
PR Template
Use the provided PR template covering:

Description of changes
Type of change (feature/bugfix/refactor)
Testing performed
Screenshots (if applicable)
Checklist completion
Review Process
Automated checks must pass (CI pipeline)
Code review by team member
Manual testing on staging environment
Approval and merge to target branch
🔐 Security Guidelines
Secret Management
# ✅ Good: Using placeholders in committed files
REACT_APP_PUSH_KEY=PLACEHOLDER-FCM-KEY

# ❌ Never commit real secrets
REACT_APP_PUSH_KEY=AIzaSyBvG4_actual_secret_key_here
Security Checklist
[ ] No hardcoded secrets or credentials
[ ] Environment files contain only placeholders
[ ] Sensitive files in .gitignore
[ ] Gitleaks scan passes
[ ] Dependencies regularly updated
📱 Platform-Specific Guidelines
Android
Test on multiple screen sizes and Android versions
Follow Material Design guidelines
Ensure proper ProGuard/R8 configuration for releases
Test with and without Google Play Services
iOS
Test on multiple iOS versions and device sizes
Follow Human Interface Guidelines
Ensure proper iOS-specific permissions
Test on both simulator and physical devices
🐛 Debugging
Common Issues
Metro bundler issues
yarn start --reset-cache
Android build issues
cd android && ./gradlew clean && cd ..
iOS build issues
cd ios && rm -rf Pods && pod install && cd ..
Environment issues
export ENVFILE=.env.development
yarn ci:validate-env
Debug Tools
Flipper: React Native debugging
React DevTools: Component inspection
Redux DevTools: State management debugging
Network Inspector: API call monitoring
📊 Performance Guidelines
React Native Performance
Use React.memo for expensive components
Implement proper FlatList optimization
Avoid anonymous functions in render methods
Use proper image optimization and caching
Bundle Size
Monitor bundle size with Metro bundle analyzer
Use proper tree-shaking for unused code
Optimize images and assets
Consider code splitting for large features
📚 Documentation Standards
Code Documentation
/**
 * Lead management service
 * Handles CRUD operations for leads with offline caching
 */
export class LeadService {
  /**
   * Creates a new lead
   * @param leadData - Lead information
   * @param options - Additional options
   * @returns Promise with created lead data
   * @throws ValidationError if data is invalid
   * @throws NetworkError if API call fails
   */
  static async createLead(
    leadData: CreateLeadRequest,
    options?: CreateLeadOptions
  ): Promise<Lead> {
    // Implementation
  }
}
Markdown Documentation
Use consistent heading structure
Include code examples for APIs
Add table of contents for long documents
Keep examples copy-pasteable
🤝 Communication
Issue Reporting
Search existing issues before creating new ones
Use issue templates provided
Include reproduction steps for bugs
Add relevant labels and assignees
Code Review Comments
Be constructive and specific
Explain the "why" behind suggestions
Acknowledge good code practices
Focus on code, not the person
Team Communication
Use clear, professional language
Reference relevant issue numbers
Tag appropriate team members
Include context for decisions
📋 Checklist for Contributors
First-time Setup
[ ] Fork and clone repository
[ ] Install all prerequisites
[ ] Run yarn install successfully
[ ] Run tests and verify they pass
[ ] Understand branch strategy and naming
Before Each Commit
[ ] Code follows style guidelines
[ ] Tests added/updated for changes
[ ] Documentation updated if needed
[ ] Pre-commit hooks pass
[ ] Environment validation passes
Before Pull Request
[ ] Rebased on latest main branch
[ ] All CI checks passing locally
[ ] Screenshots included for UI changes
[ ] PR template completed
[ ] Self-review performed


## Component Development Guidelines

### Creating New Components

1. **Use Shared Components**: Always use AppButton, AppTextInput, ScreenContainer for consistency
2. **Theme Integration**: Use `useTheme()` hook for color values
3. **TypeScript**: Export proper interfaces for component props
4. **Testing**: Include both snapshot and interaction tests

Example component structure:
```typescript
import React from 'react';
import { useTheme } from 'react-native-paper';
import { ScreenContainer, AppButton } from '@components/common';

interface MyComponentProps {
  title: string;
  onPress: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onPress }) => {
  const theme = useTheme();
  
  return (
    <ScreenContainer>
      <AppButton 
        title={title} 
        onPress={onPress}
        variant="contained"
      />
    </ScreenContainer>
  );
};
Navigation Guidelines
Screen Naming: Use descriptive names ending in "Screen"
Type Safety: Define param lists for all navigators
Authentication: Use the existing auth-based routing pattern
Deep Linking: Add new routes to the linking configuration
State Management Guidelines
Redux Slices: Keep slices focused on single concerns
Persistence: Only persist user preferences, not business data
RTK Query: Use baseApi for all future API integrations
Type Safety: Export and use typed hooks (useAppDispatch, useAppSelector)
Testing Requirements
Minimum Coverage: 80% overall, 85% for business logic
Component Tests: Render + interaction tests for all components
Redux Tests: Test all reducers and actions
Hook Tests: Test custom hooks with renderHook
Integration Tests: Test navigation flows where applicable
Code Quality Standards
TypeScript: Strict mode enabled, no any types in production code
ESLint: All rules must pass
Prettier: Consistent code formatting
Performance: Use React.memo and useCallback for expensive operations
Accessibility: Include accessibility props where appropriate

### 4. Create Development Guide

**File**: `docs/DEVELOPMENT.md`
```markdown
# Development Guide

## Architecture Decisions

This project follows key architectural decisions documented in `/docs/adr/`:

- **ADR-0001**: CI/CD Pipeline Toolchain
- **ADR-0002**: Navigation and State Management Architecture

## State Management

### Redux Store Structure
store ├── auth (persisted) │ ├── isLoggedIn: boolean │ ├── token?: string │ └── user?: User ├── preferences (persisted) │ └── colorScheme: 'system' | 'light' | 'dark' └── baseApi (not persisted) └── [cache managed by RTK Query]


### Persistence Strategy
Only auth and preferences are persisted to AsyncStorage:
- Reduces startup time by avoiding large cached datasets
- Ensures fresh API data on each app launch
- Maintains user session and theme preferences

## Component Architecture

### Shared Components
- **AppButton**: Themed button with consistent styling
- **AppTextInput**: Themed text input with error handling
- **ScreenContainer**: Consistent screen wrapper with theme support

### Theme Integration
All components should use the theme system:
```typescript
const theme = useTheme();
// Use theme.colors.primary, theme.colors.surface, etc.
Navigation Structure
NavigationProvider
├── AuthStack (when not logged in)
│   ├── SplashScreen
│   └── LoginScreen
└── MainTabNavigator (when logged in)
    ├── HomeTab
    │   └── HomeStack
    │       └── HomeScreen
    └── Settings
        └── SettingsScreen
Testing Strategy
Test Types
Unit Tests: Redux slices, utility functions
Component Tests: React components with RNTL
Hook Tests: Custom hooks with renderHook
Integration Tests: Navigation flows
Mock Strategy
React Native components and hooks
React Navigation
React Native Paper
Redux Persist
AsyncStorage
Performance Considerations
Startup Optimization
Only essential data (auth + preferences) persisted
RTK Query cache starts fresh each launch
Theme applied synchronously to prevent flash
Runtime Optimization
React.memo for expensive components
useCallback for event handlers passed to children
Proper key props for list items
Future Enhancements
API Integration
The baseApi is configured with tag types for future endpoints:

Lead, Customer, Quotation, Commission
User, KYC, Product, Service
Additional Features
Push notifications (MSG91 integration ready)
Offline data synchronization
Advanced error handling and retry logic


## Testing Requirements

### Code Coverage Standards

All contributions must maintain our quality standards:

#### Minimum Coverage Thresholds

**Global Requirements:**
- **Lines**: ≥ 80%
- **Functions**: ≥ 80%
- **Branches**: ≥ 80%
- **Statements**: ≥ 80%

**Critical Components (Higher Standards):**
- Authentication code (`authSlice.ts`): ≥ 90% lines, ≥ 85% branches
- Security utilities (`KeychainHelper.ts`): ≥ 90% lines, ≥ 85% branches
- Auth business logic (`authThunks.ts`): ≥ 85% all metrics

#### Coverage Enforcement

- **Automated**: Jest enforces thresholds on every test run
- **CI Pipeline**: PRs are blocked if coverage drops below thresholds
- **Local Verification**: Run `yarn test:ci` before submitting PRs

### Testing Checklist

Before submitting a pull request, ensure:

#### ✅ Code Quality
- [ ] All tests pass: `yarn test`
- [ ] Coverage thresholds met: `yarn test:ci`
- [ ] No linting errors: `yarn lint`
- [ ] TypeScript compiles: `npx tsc --noEmit`

#### ✅ Test Coverage
- [ ] **New features**: Include comprehensive unit tests
- [ ] **Bug fixes**: Add regression tests
- [ ] **Components**: Include accessibility tests
- [ ] **Critical paths**: Test success and failure scenarios

#### ✅ Test Quality
- [ ] Tests are focused and readable
- [ ] Mock dependencies appropriately
- [ ] Avoid testing implementation details
- [ ] Include edge cases and error conditions

### Writing Quality Tests

#### Test Structure

```typescript
describe('ComponentName', () => {
  describe('feature or method', () => {
    it('should do something specific', () => {
      // Arrange
      const props = { ... };
      
      // Act
      const result = render(<Component {...props} />);
      
      // Assert
      expect(result.getByText('Expected')).toBeTruthy();
    });
  });
});