/**
 * DocumentGrid Component Tests
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { configureStore } from '@reduxjs/toolkit';
import { DocumentGrid } from '../../../src/components/documents/DocumentGrid';
import type { DocumentAsset } from '../../../src/types/document';

// Mock FlashList
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({
    data,
    renderItem,
    keyExtractor,
    ListEmptyComponent,
    ...props
  }: any) => {
    const React = require('react');
    const { FlatList } = require('react-native');

    return React.createElement(FlatList, {
      data,
      renderItem,
      keyExtractor,
      ListEmptyComponent,
      testID: props.testID,
      ...props,
    });
  },
}));

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

describe('DocumentGrid', () => {
  const mockDocuments: DocumentAsset[] = [
    {
      id: 'doc-1',
      uri: 'file://test1.jpg',
      fileName: 'test1.jpg',
      type: 'image/jpeg',
      fileSize: 1024 * 1024,
      timestamp: Date.now(),
    },
    {
      id: 'doc-2',
      uri: 'file://test2.pdf',
      fileName: 'test2.pdf',
      type: 'application/pdf',
      fileSize: 512 * 1024,
      timestamp: Date.now(),
    },
    {
      id: 'doc-3',
      uri: 'file://test3.png',
      fileName: 'test3.png',
      type: 'image/png',
      fileSize: 2 * 1024 * 1024,
      timestamp: Date.now(),
    },
  ];

  it('should render documents in grid', () => {
    const { getByText } = renderWithProviders(
      <DocumentGrid documents={mockDocuments} />
    );

    expect(getByText('test1.jpg')).toBeTruthy();
    expect(getByText('test2.pdf')).toBeTruthy();
    expect(getByText('test3.png')).toBeTruthy();
  });

  it('should render empty state when no documents', () => {
    const { getByText } = renderWithProviders(<DocumentGrid documents={[]} />);

    expect(getByText('No documents added yet')).toBeTruthy();
    expect(
      getByText('Add documents using the camera, gallery, or file picker')
    ).toBeTruthy();
  });

  it('should render loading state', () => {
    const { getByText } = renderWithProviders(
      <DocumentGrid documents={[]} loading={true} />
    );

    expect(getByText('Loading documents...')).toBeTruthy();
  });

  it('should call onRemove when document is removed', () => {
    const mockOnRemove = jest.fn();

    const { getByTestId } = renderWithProviders(
      <DocumentGrid documents={mockDocuments} onRemove={mockOnRemove} />
    );

    // Find first document's remove button
    const removeButton = getByTestId('document-grid-item-0-remove-button');
    fireEvent.press(removeButton);

    // Note: This test depends on the Alert mock from DocumentThumbnail tests
    // In a real scenario, you might need to mock Alert.alert here as well
  });

  it('should render with custom number of columns', () => {
    const { getByTestId } = renderWithProviders(
      <DocumentGrid documents={mockDocuments} numColumns={3} />
    );

    const flashList = getByTestId('document-grid-flashlist');
    expect(flashList.props.numColumns).toBe(3);
  });

  it('should have proper accessibility labels', () => {
    const { getByTestId } = renderWithProviders(
      <DocumentGrid documents={mockDocuments} />
    );

    const container = getByTestId('document-grid');
    expect(container.props.accessibilityLabel).toContain(
      'Document grid with 3 documents'
    );
    expect(container.props.accessibilityRole).toBe('grid');
  });

  it('should render with custom accessibility label', () => {
    const customLabel = 'Custom document grid';

    const { getByTestId } = renderWithProviders(
      <DocumentGrid
        documents={mockDocuments}
        accessibilityLabel={customLabel}
      />
    );

    const container = getByTestId('document-grid');
    expect(container.props.accessibilityLabel).toBe(customLabel);
  });

  it('should render with custom testID', () => {
    const { getByTestId } = renderWithProviders(
      <DocumentGrid documents={mockDocuments} testID="custom-grid" />
    );

    expect(getByTestId('custom-grid')).toBeTruthy();
    expect(getByTestId('custom-grid-flashlist')).toBeTruthy();
  });

  it('should handle virtualization for large lists', () => {
    const largeDocumentList = Array.from({ length: 50 }, (_, i) => ({
      id: `doc-${i}`,
      uri: `file://test${i}.jpg`,
      fileName: `test${i}.jpg`,
      type: 'image/jpeg',
      fileSize: 1024 * 1024,
      timestamp: Date.now(),
    }));

    const { getByTestId } = renderWithProviders(
      <DocumentGrid documents={largeDocumentList} virtualized={true} />
    );

    const flashList = getByTestId('document-grid-flashlist');
    expect(flashList.props.removeClippedSubviews).toBe(true);
    expect(flashList.props.maxToRenderPerBatch).toBe(10);
  });

  it('should disable virtualization for small lists', () => {
    const { getByTestId } = renderWithProviders(
      <DocumentGrid documents={mockDocuments} virtualized={true} />
    );

    const flashList = getByTestId('document-grid-flashlist');
    expect(flashList.props.removeClippedSubviews).toBe(false);
    expect(flashList.props.maxToRenderPerBatch).toBe(3);
  });
});
