import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  ActivityIndicator,
} from 'react-native';
import debounce from 'lodash/debounce'; // ✅ RECOMMENDED
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setSearchText } from '../../store/slices/leadSlice';
import { selectSearchText } from '../../store/selectors/leadSelectors';
import { useTheme } from 'react-native-paper';

interface SearchBarProps {
  placeholder?: string;
  loading?: boolean;
  onSearchSubmit?: (query: string) => void;
  testID?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search leads',
  loading = false,
  onSearchSubmit,
  testID = 'lead-search-bar',
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const reduxSearchText = useAppSelector(selectSearchText);

  // Local state for immediate UI updates
  const [localSearchText, setLocalSearchText] = useState(reduxSearchText);

  // Sync local state with Redux state
  useEffect(() => {
    setLocalSearchText(reduxSearchText);
  }, [reduxSearchText]);

  // ✅ LODASH DEBOUNCE with proper options
  const debouncedDispatch = useMemo(
    () =>
      debounce(
        (text: string) => {
          dispatch(setSearchText(text));
        },
        300, // 300ms delay
        {
          leading: false, // Don't execute immediately
          trailing: true, // Execute after delay
          maxWait: 1000, // Maximum delay of 1 second
        }
      ),
    [dispatch]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedDispatch.cancel();
    };
  }, [debouncedDispatch]);

  const handleChangeText = useCallback(
    (text: string) => {
      setLocalSearchText(text);
      debouncedDispatch(text);
    },
    [debouncedDispatch]
  );

  const handleClear = useCallback(() => {
    setLocalSearchText('');
    debouncedDispatch.cancel();
    dispatch(setSearchText(''));
  }, [dispatch, debouncedDispatch]);

  const handleSubmitEditing = useCallback(() => {
    debouncedDispatch.flush(); // ✅ lodash debounce has flush method
    onSearchSubmit?.(localSearchText);
  }, [debouncedDispatch, onSearchSubmit, localSearchText]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.searchBar}>
        <View style={styles.iconContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
        </View>

        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor={theme.colors?.onSurfaceVariant || '#999'}
          value={localSearchText}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSubmitEditing}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          accessibilityLabel="Search leads"
          accessibilityRole="search"
          accessibilityHint="Type to filter leads by name, phone, or address"
        />

        <View style={styles.rightSection}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={theme.colors?.primary || '#007AFF'}
            />
          ) : localSearchText.length > 0 ? (
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearButton}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors?.surfaceVariant || '#f5f5f5',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minHeight: 48,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor: theme.colors?.outline || '#e0e0e0',
    },
    iconContainer: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    searchIcon: {
      fontSize: 16,
      color: theme.colors?.onSurfaceVariant || '#666',
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors?.onSurface || '#000',
      paddingVertical: 8,
      paddingHorizontal: 0,
      textAlignVertical: 'center',
    },
    rightSection: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    clearButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors?.onSurfaceVariant || 'rgba(0, 0, 0, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearIcon: {
      fontSize: 12,
      color: theme.colors?.surface || 'white',
      fontWeight: 'bold',
    },
  });

export default SearchBar;
