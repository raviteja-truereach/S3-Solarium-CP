/**
 * Document Picker Accessibility Tests
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { configureStore } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations } from 'jest-axe';
import { PermissionDeniedMessage } from '../../src/components/documents/PermissionDeniedMessage';

expect.extend(toHaveNoViolations);

const createMockStore = () => {
  return configureStore({
    reducer: {
      preferences: (state = { colorScheme: 'light' }) => state,
    },
  });
};

describe('Document Picker Accessibility', () => {
  describe('PermissionDeniedMessage', () => {
    it('should meet accessibility guidelines', async () => {
      const mockStore = createMockStore();
      const mockOnRetry = jest.fn();
      const mockOnOpenSettings = jest.fn();

      const { container } = render(
        <Provider store={mockStore}>
          <PaperProvider>
            <PermissionDeniedMessage
              type="camera"
              onRetry={mockOnRetry}
              onOpenSettings={mockOnOpenSettings}
              testID="permission-test"
            />
          </PaperProvider>
        </Provider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper accessibility labels for camera permission', () => {
      const mockStore = createMockStore();
      const mockOnRetry = jest.fn();

      const { getByTestId } = render(
        <Provider store={mockStore}>
          <PaperProvider>
            <PermissionDeniedMessage
              type="camera"
              onRetry={mockOnRetry}
              testID="camera-permission"
            />
          </PaperProvider>
        </Provider>
      );

      // Check container accessibility
      const container = getByTestId('camera-permission');
      expect(container.props.accessible).toBe(true);
      expect(container.props.accessibilityRole).toBe('alert');
      expect(container.props.accessibilityLabel).toContain(
        'Camera Access Required'
      );

      // Check retry button accessibility
      const retryButton = getByTestId('camera-permission-retry-button');
      expect(retryButton.props.accessible).toBe(true);
      expect(retryButton.props.accessibilityRole).toBe('button');
      expect(retryButton.props.accessibilityLabel).toContain(
        'Retry camera permission'
      );
      expect(retryButton.props.accessibilityHint).toBeDefined();
    });

    it('should have proper accessibility labels for photo library permission', () => {
      const mockStore = createMockStore();
      const mockOnOpenSettings = jest.fn();

      const { getByTestId } = render(
        <Provider store={mockStore}>
          <PaperProvider>
            <PermissionDeniedMessage
              type="photoLibrary"
              onOpenSettings={mockOnOpenSettings}
              testID="gallery-permission"
            />
          </PaperProvider>
        </Provider>
      );

      const container = getByTestId('gallery-permission');
      expect(container.props.accessibilityLabel).toContain(
        'Photo Library Access Required'
      );

      const settingsButton = getByTestId('gallery-permission-settings-button');
      expect(settingsButton.props.accessibilityLabel).toContain(
        'Open device settings'
      );
    });

    it('should have proper accessibility labels for file permission', () => {
      const mockStore = createMockStore();

      const { getByTestId } = render(
        <Provider store={mockStore}>
          <PaperProvider>
            <PermissionDeniedMessage type="files" testID="file-permission" />
          </PaperProvider>
        </Provider>
      );

      const container = getByTestId('file-permission');
      expect(container.props.accessibilityLabel).toContain(
        'File Access Required'
      );

      const title = getByTestId('file-permission-title');
      expect(title.props.accessibilityRole).toBe('header');
    });

    it('should be keyboard navigable', () => {
      const mockStore = createMockStore();
      const mockOnRetry = jest.fn();
      const mockOnOpenSettings = jest.fn();

      const { getByTestId } = render(
        <Provider store={mockStore}>
          <PaperProvider>
            <PermissionDeniedMessage
              type="camera"
              onRetry={mockOnRetry}
              onOpenSettings={mockOnOpenSettings}
              testID="keyboard-test"
            />
          </PaperProvider>
        </Provider>
      );

      // Both buttons should be accessible and focusable
      const retryButton = getByTestId('keyboard-test-retry-button');
      const settingsButton = getByTestId('keyboard-test-settings-button');

      expect(retryButton.props.accessible).toBe(true);
      expect(settingsButton.props.accessible).toBe(true);

      // Should have proper accessibility roles for keyboard navigation
      expect(retryButton.props.accessibilityRole).toBe('button');
      expect(settingsButton.props.accessibilityRole).toBe('button');
    });

    it('should announce changes to screen readers', () => {
      const mockStore = createMockStore();
      const customMessage = 'Custom permission error message';

      const { getByTestId } = render(
        <Provider store={mockStore}>
          <PaperProvider>
            <PermissionDeniedMessage
              type="camera"
              message={customMessage}
              testID="screen-reader-test"
            />
          </PaperProvider>
        </Provider>
      );

      const message = getByTestId('screen-reader-test-message');
      expect(message.props.accessible).toBe(true);
      expect(message.children[0]).toBe(customMessage);
    });
  });
});
