/**
 * Document Grid Performance Tests
 */
import { performance } from 'perf_hooks';
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { configureStore } from '@reduxjs/toolkit';
import { DocumentGrid } from '../../src/components/documents/DocumentGrid';
import type { DocumentAsset } from '../../src/types/document';

// Mock FlashList for performance testing
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data, renderItem, keyExtractor, ...props }: any) => {
    const React = require('react');
    const { FlatList } = require('react-native');

    return React.createElement(FlatList, {
      data,
      renderItem,
      keyExtractor,
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

const PERFORMANCE_TARGET_MS = 100; // 100ms target
const RENDER_TARGET_MS = 200; // 200ms render target
const MEMORY_TARGET_MB = 50; // 50MB memory target

// Generate mock documents for performance testing
const generateMockDocuments = (count: number): DocumentAsset[] => {
  const types = ['image/jpeg', 'image/png', 'application/pdf'];
  const extensions = ['jpg', 'png', 'pdf'];

  return Array.from({ length: count }, (_, i) => ({
    id: `doc-${i.toString().padStart(4, '0')}`,
    uri: `file://test${i}.${extensions[i % 3]}`,
    fileName: `test-document-${i}.${extensions[i % 3]}`,
    type: types[i % 3],
    fileSize: 1024 * 1024 * (1 + (i % 5)), // 1-5MB
    timestamp: Date.now() - i * 1000,
  }));
};

const createMockStore = () => {
  return configureStore({
    reducer: {
      preferences: (state = { colorScheme: 'light' }) => state,
    },
  });
};

describe('Document Grid Performance Tests', () => {
  let store: any;

  beforeEach(() => {
    store = createMockStore();
  });

  describe('Rendering Performance', () => {
    it('should render 50 documents within performance target', () => {
      const mockDocuments = generateMockDocuments(50);

      const startTime = performance.now();

      render(
        <Provider store={store}>
          <PaperProvider>
            <DocumentGrid documents={mockDocuments} />
          </PaperProvider>
        </Provider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      console.log(`📊 Rendering 50 documents took ${renderTime.toFixed(2)}ms`);

      expect(renderTime).toBeLessThan(RENDER_TARGET_MS);
    });

    it('should render 100 documents with virtualization efficiently', () => {
      const mockDocuments = generateMockDocuments(100);

      const startTime = performance.now();

      render(
        <Provider store={store}>
          <PaperProvider>
            <DocumentGrid documents={mockDocuments} virtualized={true} />
          </PaperProvider>
        </Provider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      console.log(
        `📊 Rendering 100 documents with virtualization took ${renderTime.toFixed(
          2
        )}ms`
      );

      expect(renderTime).toBeLessThan(RENDER_TARGET_MS);
    });

    it('should handle grid layout calculations efficiently', () => {
      const mockDocuments = generateMockDocuments(25);

      const startTime = performance.now();

      // Test different column configurations
      const configurations = [1, 2, 3, 4];

      configurations.forEach((numColumns) => {
        render(
          <Provider store={store}>
            <PaperProvider>
              <DocumentGrid documents={mockDocuments} numColumns={numColumns} />
            </PaperProvider>
          </Provider>
        );
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      console.log(
        `📊 Grid layout calculations took ${renderTime.toFixed(2)}ms`
      );

      expect(renderTime).toBeLessThan(PERFORMANCE_TARGET_MS);
    });
  });

  describe('Memory Performance', () => {
    it('should not cause memory leaks with large datasets', () => {
      const initialMemory = process.memoryUsage();

      // Render multiple large grids
      for (let i = 0; i < 5; i++) {
        const mockDocuments = generateMockDocuments(50);

        const { unmount } = render(
          <Provider store={store}>
            <PaperProvider>
              <DocumentGrid documents={mockDocuments} />
            </PaperProvider>
          </Provider>
        );

        // Unmount to test cleanup
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryDiff = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(
        `📊 Memory difference: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`
      );

      // Memory growth should be reasonable
      expect(memoryDiff).toBeLessThan(MEMORY_TARGET_MB * 1024 * 1024);
    });

    it('should handle rapid updates without memory issues', () => {
      const initialMemory = process.memoryUsage();

      // Simulate rapid document updates
      for (let i = 0; i < 10; i++) {
        const mockDocuments = generateMockDocuments(20);

        const { rerender, unmount } = render(
          <Provider store={store}>
            <PaperProvider>
              <DocumentGrid documents={mockDocuments} />
            </PaperProvider>
          </Provider>
        );

        // Update with new documents
        const updatedDocuments = generateMockDocuments(25);
        rerender(
          <Provider store={store}>
            <PaperProvider>
              <DocumentGrid documents={updatedDocuments} />
            </PaperProvider>
          </Provider>
        );

        unmount();
      }

      const finalMemory = process.memoryUsage();
      const memoryDiff = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(
        `📊 Rapid updates memory difference: ${(
          memoryDiff /
          1024 /
          1024
        ).toFixed(2)}MB`
      );

      expect(memoryDiff).toBeLessThan(MEMORY_TARGET_MB * 1024 * 1024);
    });
  });

  describe('Virtualization Performance', () => {
    it('should enable virtualization for large lists', () => {
      const largeDocumentList = generateMockDocuments(100);

      const startTime = performance.now();

      render(
        <Provider store={store}>
          <PaperProvider>
            <DocumentGrid documents={largeDocumentList} virtualized={true} />
          </PaperProvider>
        </Provider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      console.log(
        `📊 Virtualized rendering of 100 documents took ${renderTime.toFixed(
          2
        )}ms`
      );

      // Should be faster than non-virtualized rendering
      expect(renderTime).toBeLessThan(RENDER_TARGET_MS);
    });

    it('should handle different grid sizes efficiently', () => {
      const mockDocuments = generateMockDocuments(50);
      const gridSizes = [1, 2, 3, 4];

      gridSizes.forEach((numColumns) => {
        const startTime = performance.now();

        render(
          <Provider store={store}>
            <PaperProvider>
              <DocumentGrid
                documents={mockDocuments}
                numColumns={numColumns}
                virtualized={true}
              />
            </PaperProvider>
          </Provider>
        );

        const endTime = performance.now();
        const renderTime = endTime - startTime;

        console.log(
          `📊 ${numColumns}-column grid rendering took ${renderTime.toFixed(
            2
          )}ms`
        );

        expect(renderTime).toBeLessThan(RENDER_TARGET_MS);
      });
    });
  });

  describe('Component Update Performance', () => {
    it('should handle document removal efficiently', () => {
      const mockDocuments = generateMockDocuments(30);

      const { rerender } = render(
        <Provider store={store}>
          <PaperProvider>
            <DocumentGrid documents={mockDocuments} />
          </PaperProvider>
        </Provider>
      );

      // Simulate document removal
      const startTime = performance.now();

      // Remove first document
      const updatedDocuments = mockDocuments.slice(1);
      rerender(
        <Provider store={store}>
          <PaperProvider>
            <DocumentGrid documents={updatedDocuments} />
          </PaperProvider>
        </Provider>
      );

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      console.log(`📊 Document removal update took ${updateTime.toFixed(2)}ms`);

      expect(updateTime).toBeLessThan(PERFORMANCE_TARGET_MS);
    });

    it('should handle document addition efficiently', () => {
      const mockDocuments = generateMockDocuments(20);

      const { rerender } = render(
        <Provider store={store}>
          <PaperProvider>
            <DocumentGrid documents={mockDocuments} />
          </PaperProvider>
        </Provider>
      );

      // Simulate document addition
      const startTime = performance.now();

      const newDocument = generateMockDocuments(1)[0];
      const updatedDocuments = [...mockDocuments, newDocument];

      rerender(
        <Provider store={store}>
          <PaperProvider>
            <DocumentGrid documents={updatedDocuments} />
          </PaperProvider>
        </Provider>
      );

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      console.log(
        `📊 Document addition update took ${updateTime.toFixed(2)}ms`
      );

      expect(updateTime).toBeLessThan(PERFORMANCE_TARGET_MS);
    });
  });
});
