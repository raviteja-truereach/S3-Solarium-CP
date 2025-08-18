/**
 * Preferences Slice
 * Manages user preferences including theme settings
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ColorScheme = 'system' | 'light' | 'dark';

interface PreferencesState {
  colorScheme: ColorScheme;
  // Future preference fields can be added here
}

const initialState: PreferencesState = {
  colorScheme: 'system',
};

/**
 * Preferences slice for user settings
 */
const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    /**
     * Set color scheme preference
     */
    setColorScheme: (state, action: PayloadAction<ColorScheme>) => {
      state.colorScheme = action.payload;
    },
    /**
     * Reset preferences to defaults
     */
    resetPreferences: () => initialState,
  },
});

export const { setColorScheme, resetPreferences } = preferencesSlice.actions;
export default preferencesSlice.reducer;
