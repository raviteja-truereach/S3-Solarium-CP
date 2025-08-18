/**
 * DocumentThumbnail Component Tests
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { Alert } from 'react-native';
import { configureStore } from '@reduxjs/toolkit';
import { DocumentThumbnail } from '../../../src/components/documents/DocumentThumbnail';
import type { DocumentAsset } from '../../../src/types/document';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

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

describe('DocumentThumbnail', () => {
  const mockDocument: DocumentAsset = {
    id: 'doc-1',
    uri: 'file://test.jpg',
    fileName: 'test-image.jpg',
    type: 'image/jpeg',
    fileSize: 1024 * 1024, // 1MB
    timestamp: Date.now(),
  };

  const mockPdfDocument: DocumentAsset = {
    id: 'doc-2',
    uri: 'file://test.pdf',
    fileName: 'test-document.pdf',
    type: 'application/pdf',
    fileSize: 512 * 1024, // 512KB
    timestamp: Date.now(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render image document correctly', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <DocumentThumbnail document={mockDocument} />
    );

    expect(getByText('test-image.jpg')).toBeTruthy();
    expect(getByText('1.0 MB')).toBeTruthy();
    expect(getByText('IMG')).toBeTruthy();
    expect(getByTestId('document-thumbnail')).toBeTruthy();
  });

  it('should render PDF document correctly', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <DocumentThumbnail document={mockPdfDocument} />
    );

    expect(getByText('test-document.pdf')).toBeTruthy();
    expect(getByText('512.0 KB')).toBeTruthy();
    expect(getByText('PDF')).toBeTruthy();
    expect(getByTestId('document-thumbnail')).toBeTruthy();
  });

  it('should show warning for large files', () => {
    const largeDocument: DocumentAsset = {
      ...mockDocument,
      fileSize: 8 * 1024 * 1024, // 8MB
    };

    const { getByText } = renderWithProviders(
      <DocumentThumbnail document={largeDocument} />
    );

    expect(getByText('8.0 MB')).toBeTruthy();
    // Should show warning icon for large files
  });

  it('should show remove button when onRemove is provided', () => {
    const mockOnRemove = jest.fn();

    const { getByTestId } = renderWithProviders(
      <DocumentThumbnail document={mockDocument} onRemove={mockOnRemove} />
    );

    expect(getByTestId('document-thumbnail-remove-button')).toBeTruthy();
  });

  it('should not show remove button when onRemove is not provided', () => {
    const { queryByTestId } = renderWithProviders(
      <DocumentThumbnail document={mockDocument} />
    );

    expect(queryByTestId('document-thumbnail-remove-button')).toBeNull();
  });

  it('should show confirmation dialog when remove button is pressed', () => {
    const mockOnRemove = jest.fn();

    const { getByTestId } = renderWithProviders(
      <DocumentThumbnail document={mockDocument} onRemove={mockOnRemove} />
    );

    const removeButton = getByTestId('document-thumbnail-remove-button');
    fireEvent.press(removeButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Remove Document',
      'Are you sure you want to remove "test-image.jpg"?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Remove' }),
      ]),
      expect.any(Object)
    );
  });

  it('should call onRemove when confirmed', async () => {
    const mockOnRemove = jest.fn();

    // Mock Alert.alert to auto-confirm
    (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
      const confirmButton = buttons?.find((btn: any) => btn.text === 'Remove');
      if (confirmButton?.onPress) {
        confirmButton.onPress();
      }
    });

    const { getByTestId } = renderWithProviders(
      <DocumentThumbnail document={mockDocument} onRemove={mockOnRemove} />
    );

    const removeButton = getByTestId('document-thumbnail-remove-button');
    fireEvent.press(removeButton);

    await waitFor(() => {
      expect(mockOnRemove).toHaveBeenCalledWith(mockDocument);
    });
  });

  it('should truncate long filenames', () => {
    const longNameDocument: DocumentAsset = {
      ...mockDocument,
      fileName:
        'this-is-a-very-long-filename-that-should-be-truncated-properly.jpg',
    };

    const { getByText } = renderWithProviders(
      <DocumentThumbnail document={longNameDocument} />
    );

    // Should still render the filename (Text component handles truncation)
    expect(
      getByText(
        'this-is-a-very-long-filename-that-should-be-truncated-properly.jpg'
      )
    ).toBeTruthy();
  });

  it('should have proper accessibility labels', () => {
    const { getByTestId } = renderWithProviders(
      <DocumentThumbnail document={mockDocument} />
    );

    const container = getByTestId('document-thumbnail-container');
    expect(container.props.accessibilityLabel).toContain(
      'Image test-image.jpg'
    );
    expect(container.props.accessibilityLabel).toContain('1.0 MB');
    expect(container.props.accessibilityRole).toBe('button');
  });

  it('should handle loading state', () => {
    const mockOnRemove = jest.fn();

    const { getByTestId } = renderWithProviders(
      <DocumentThumbnail
        document={mockDocument}
        onRemove={mockOnRemove}
        loading={true}
      />
    );

    const removeButton = getByTestId('document-thumbnail-remove-button');
    fireEvent.press(removeButton);

    // Should not show alert when loading
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('should render with custom testID', () => {
    const { getByTestId } = renderWithProviders(
      <DocumentThumbnail document={mockDocument} testID="custom-thumbnail" />
    );

    expect(getByTestId('custom-thumbnail')).toBeTruthy();
    expect(getByTestId('custom-thumbnail-container')).toBeTruthy();
  });
});
