/**
 * Typed Redux Hooks with Performance Optimizations
 */

import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// Use throughout your app instead of plain `useSelector` and `useDispatch`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * Performance-optimized selector hook using shallow equality
 * Use this for selecting objects to avoid unnecessary re-renders
 */
export const useAppSelectorShallow = <TSelected>(
  selector: (state: RootState) => TSelected
): TSelected => useSelector(selector, shallowEqual);
