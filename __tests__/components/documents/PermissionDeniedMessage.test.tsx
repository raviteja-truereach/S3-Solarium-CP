/**
 * PermissionDeniedMessage Component Tests
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { configureStore } from '@reduxjs/toolkit';
import { PermissionDeniedMessage } from '../../../src/components/documents/PermissionDeniedMessage';

const createMockStore = () => {
  return configureStore({
    reducer: {
      preferences: (state = { colorScheme: 'light' }) => state,
    },
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <PaperProvider>{component}</PaperProvider>
    </Provider>
  );
};

describe('PermissionDeniedMessage', () => {
  it('should render camera permission message', () => {
    const mockOnRetry = jest.fn();

    const { getByText, getByTestId } = renderWithProviders(
      <PermissionDeniedMessage
        type="camera"
        onRetry={mockOnRetry}
        testID="camera-permission-test"
      />
    );

    expect(getByText('Camera Access Required')).toBeTruthy();
    expect(
      getByText('This app needs camera access to take photos of documents.')
    ).toBeTruthy();
    expect(getByTestId('camera-permission-test')).toBeTruthy();
  });

  it('should render photo library permission message', () => {
    const mockOnOpenSettings = jest.fn();

    const { getByText } = renderWithProviders(
      <PermissionDeniedMessage
        type="photoLibrary"
        onOpenSettings={mockOnOpenSettings}
      />
    );

    expect(getByText('Photo Library Access Required')).toBeTruthy();
    expect(
      getByText('This app needs photo library access to select images.')
    ).toBeTruthy();
  });

  it('should render file permission message', () => {
    const { getByText } = renderWithProviders(
      <PermissionDeniedMessage type="files" />
    );

    expect(getByText('File Access Required')).toBeTruthy();
    expect(
      getByText('This app needs file access to select documents.')
    ).toBeTruthy();
  });

  it('should render custom message', () => {
    const customMessage = 'Custom error message for testing';

    const { getByText } = renderWithProviders(
      <PermissionDeniedMessage type="camera" message={customMessage} />
    );

    expect(getByText(customMessage)).toBeTruthy();
  });

  it('should call onRetry when retry button is pressed', () => {
    const mockOnRetry = jest.fn();

    const { getByText } = renderWithProviders(
      <PermissionDeniedMessage type="camera" onRetry={mockOnRetry} />
    );

    const retryButton = getByText('Try Again');
    fireEvent.press(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should call onOpenSettings when settings button is pressed', () => {
    const mockOnOpenSettings = jest.fn();

    const { getByText } = renderWithProviders(
      <PermissionDeniedMessage
        type="camera"
        onOpenSettings={mockOnOpenSettings}
      />
    );

    const settingsButton = getByText('Settings');
    fireEvent.press(settingsButton);

    expect(mockOnOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('should not render buttons when callbacks are not provided', () => {
    const { queryByText } = renderWithProviders(
      <PermissionDeniedMessage type="camera" />
    );

    expect(queryByText('Try Again')).toBeNull();
    expect(queryByText('Settings')).toBeNull();
  });
});
