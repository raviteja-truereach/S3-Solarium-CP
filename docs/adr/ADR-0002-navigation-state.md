# ADR-0002: Navigation and State Management Architecture

## Status
Accepted

## Date
2025-01-07

## Context
The Solarium CP App requires a robust navigation system and state management solution to handle:
- Authentication-based navigation (Auth Stack ↔ Main Tab Navigator)
- Theme management with user preferences
- Redux state with selective persistence
- RTK Query integration for future API calls

## Decision
We have chosen the following architecture:

### Navigation
- **React Navigation v6** with Native Stack Navigator for root navigation
- **Bottom Tab Navigator** for main authenticated screens
- **Authentication-based routing** switching between Auth and Main flows
- **Deep linking support** with `solariumcp://` protocol

### State Management
- **Redux Toolkit** as the primary state management solution
- **RTK Query** for future API integration with baseApi configuration
- **Redux Persist** with selective persistence (auth + preferences only)
- **Typed hooks** (useAppDispatch, useAppSelector) for type safety

### Theme Management
- **React Native Paper** for UI components with Material Design 3
- **Custom theme provider** extending Paper's default themes
- **System/Light/Dark theme support** with user preference persistence
- **Theme-aware components** using useTheme hook

## Rationale

### Navigation Choice
- React Navigation v6 provides mature, well-documented navigation
- Native Stack Navigator offers better performance than legacy stack
- Authentication-based routing simplifies security implementation
- Deep linking enables future feature sharing capabilities

### State Management Choice
- Redux Toolkit reduces boilerplate compared to vanilla Redux
- RTK Query provides built-in caching and data fetching patterns
- Selective persistence prevents unnecessary data storage and improves startup time
- TypeScript integration ensures type safety across the application

### Theme Management Choice
- React Native Paper provides consistent Material Design components
- Theme provider pattern enables global theme switching
- System theme detection provides better user experience
- Persistence ensures theme choice survives app restarts

## Consequences

### Positive
- **Consistent Navigation**: All screens follow the same navigation patterns
- **Type Safety**: Full TypeScript support across navigation and state
- **Performance**: Selective persistence reduces app startup time
- **User Experience**: Smooth theme transitions and preference persistence
- **Scalability**: RTK Query baseApi ready for future API integration
- **Maintainability**: Well-structured state management with clear separation

### Negative
- **Learning Curve**: Team needs familiarity with Redux Toolkit patterns
- **Bundle Size**: Additional dependencies increase app size
- **Complexity**: More moving parts compared to simple state solutions

### Neutral
- **Architecture Lock-in**: Significant refactoring required to change navigation/state libraries
- **Testing Complexity**: Requires comprehensive mocking for navigation and Redux

## Implementation Notes

### Persistence Strategy
Only `auth` and `preferences` slices are persisted:
```typescript
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'preferences'], // baseApi cache is NOT persisted
};