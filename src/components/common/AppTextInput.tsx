/**
 * App Text Input Component
 * Themed text input extending react-native-paper TextInput
 */
import React from 'react';
import { TextInput, useTheme } from 'react-native-paper';
import type { TextInputProps } from 'react-native-paper';
import { StyleSheet } from 'react-native';

export interface AppTextInputProps extends TextInputProps {
  /** Input variant */
  variant?: 'outlined' | 'flat';
  /** Error message to display */
  error?: string;
  /** Helper text to display */
  helperText?: string;
}
/**
 * AppTextInput Component
 * Consistent themed text input with project styling
 */
export const AppTextInput: React.FC<AppTextInputProps> = ({
  variant = 'outlined',
  error,
  helperText,
  style,
  ...props
}) => {
  const theme = useTheme();

  const inputStyle = [styles.input, style];

  const hasError = Boolean(error);

  return (
    <TextInput mode={variant} style={inputStyle} error={hasError} {...props} />
  );
};

const styles = StyleSheet.create({
  input: {
    marginVertical: 8,
    backgroundColor: 'transparent',
  },
});

export default AppTextInput;
