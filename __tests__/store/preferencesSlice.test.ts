/**
 * Preferences Slice Tests
 * Unit tests for preferences reducer
 */
import preferencesReducer, {
  setColorScheme,
  resetPreferences,
} from '@store/slices/preferencesSlice';

describe('preferencesSlice', () => {
  const initialState = {
    colorScheme: 'system' as const,
  };

  it('should return the initial state', () => {
    expect(preferencesReducer(undefined, { type: 'unknown' })).toEqual(
      initialState
    );
  });

  it('should handle setColorScheme to light', () => {
    const result = preferencesReducer(initialState, setColorScheme('light'));
    expect(result.colorScheme).toBe('light');
  });

  it('should handle setColorScheme to dark', () => {
    const result = preferencesReducer(initialState, setColorScheme('dark'));
    expect(result.colorScheme).toBe('dark');
  });

  it('should handle setColorScheme to system', () => {
    const currentState = { colorScheme: 'light' as const };
    const result = preferencesReducer(currentState, setColorScheme('system'));
    expect(result.colorScheme).toBe('system');
  });

  it('should handle resetPreferences', () => {
    const currentState = { colorScheme: 'dark' as const };
    const result = preferencesReducer(currentState, resetPreferences());
    expect(result).toEqual(initialState);
  });

  it('should maintain state for unknown actions', () => {
    const currentState = { colorScheme: 'light' as const };
    const result = preferencesReducer(currentState, { type: 'unknown' });
    expect(result).toEqual(currentState);
  });
});
