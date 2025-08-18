/**
 * useDocumentPicker Hook Tests
 */
import { renderHook, act } from '@testing-library/react-native';
import { useDocumentPicker } from '../../src/hooks/useDocumentPicker';
import { createTestStore } from '../setup/testUtils';
import { Provider } from 'react-redux';
import React from 'react';
import { Platform, PermissionsAndroid } from 'react-native';

// Mock dependencies
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  isCancel: jest.fn(),
  types: {
    images: 'images',
    pdf: 'pdf',
  },
}));

jest.mock('../../src/validation/documentSchema', () => ({
  validateDocument: jest.fn(),
}));

const mockLaunchCamera = require('react-native-image-picker').launchCamera;
const mockLaunchImageLibrary =
  require('react-native-image-picker').launchImageLibrary;
const mockDocumentPicker = require('@react-native-documents/picker');
const mockValidateDocument =
  require('../../src/validation/documentSchema').validateDocument;

const createWrapper = (initialState?: any) => {
  const store = createTestStore(initialState);
  return ({ children }: any) =>
    React.createElement(Provider, { store, children });
};

describe('useDocumentPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful validation by default
    mockValidateDocument.mockResolvedValue({
      isValid: true,
      errors: {},
    });
  });

  it('should return initial state', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocumentPicker(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.permissionStatus).toBeDefined();
  });

  it('should clear error', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDocumentPicker(), { wrapper });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  describe('camera selection', () => {
    it('should handle successful camera capture', async () => {
      const mockAssets = [
        {
          uri: 'file://camera/photo.jpg',
          fileName: 'photo.jpg',
          type: 'image/jpeg',
          fileSize: 1024000,
        },
      ];

      mockLaunchCamera.mockImplementation((options, callback) => {
        callback({ assets: mockAssets });
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDocumentPicker(), { wrapper });

      let documents: any[] = [];
      await act(async () => {
        documents = await result.current.pickDocuments('camera');
      });

      expect(documents).toHaveLength(1);
      expect(documents[0].uri).toBe('file://camera/photo.jpg');
      expect(documents[0].fileName).toBe('photo.jpg');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle camera cancellation', async () => {
      mockLaunchCamera.mockImplementation((options, callback) => {
        callback({ didCancel: true });
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDocumentPicker(), { wrapper });

      let documents: any[] = [];
      await act(async () => {
        documents = await result.current.pickDocuments('camera');
      });

      expect(documents).toHaveLength(0);
      expect(result.current.error).toBeNull();
    });

    it('should handle camera error', async () => {
      mockLaunchCamera.mockImplementation((options, callback) => {
        callback({ errorMessage: 'Camera not available' });
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDocumentPicker(), { wrapper });

      let documents: any[] = [];
      await act(async () => {
        documents = await result.current.pickDocuments('camera');
      });

      expect(documents).toHaveLength(0);
      expect(result.current.error).toContain('Camera not available');
    });
  });

  describe('gallery selection', () => {
    it('should handle successful gallery selection', async () => {
      const mockAssets = [
        {
          uri: 'file://gallery/image1.jpg',
          fileName: 'image1.jpg',
          type: 'image/jpeg',
          fileSize: 2048000,
        },
        {
          uri: 'file://gallery/image2.png',
          fileName: 'image2.png',
          type: 'image/png',
          fileSize: 1536000,
        },
      ];

      mockLaunchImageLibrary.mockImplementation((options, callback) => {
        callback({ assets: mockAssets });
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDocumentPicker(), { wrapper });

      let documents: any[] = [];
      await act(async () => {
        documents = await result.current.pickDocuments('gallery', {
          multiple: true,
          maxCount: 2,
        });
      });

      expect(documents).toHaveLength(2);
      expect(documents[0].uri).toBe('file://gallery/image1.jpg');
      expect(documents[1].uri).toBe('file://gallery/image2.png');
    });
  });

  describe('document selection', () => {
    it('should handle successful document selection', async () => {
      const mockDocument = {
        uri: 'file://documents/sample.pdf',
        name: 'sample.pdf',
        type: 'application/pdf',
        size: 512000,
      };

      mockDocumentPicker.pick.mockResolvedValue([mockDocument]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDocumentPicker(), { wrapper });

      let documents: any[] = [];
      await act(async () => {
        documents = await result.current.pickDocuments('files');
      });

      expect(documents).toHaveLength(1);
      expect(documents[0].uri).toBe('file://documents/sample.pdf');
      expect(documents[0].fileName).toBe('sample.pdf');
      expect(documents[0].type).toBe('application/pdf');
    });

    it('should handle document picker cancellation', async () => {
      const cancelError = new Error('User cancelled');
      mockDocumentPicker.isCancel.mockReturnValue(true);
      mockDocumentPicker.pick.mockRejectedValue(cancelError);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDocumentPicker(), { wrapper });

      let documents: any[] = [];
      await act(async () => {
        documents = await result.current.pickDocuments('files');
      });

      expect(documents).toHaveLength(0);
      expect(result.current.error).toBeNull();
    });
  });

  describe('validation integration', () => {
    it('should filter out invalid documents', async () => {
      const mockAssets = [
        {
          uri: 'file://valid.jpg',
          fileName: 'valid.jpg',
          type: 'image/jpeg',
          fileSize: 1024000,
        },
        {
          uri: 'file://invalid.jpg',
          fileName: 'invalid.jpg',
          type: 'image/jpeg',
          fileSize: 15 * 1024 * 1024, // 15MB - too large
        },
      ];

      mockLaunchImageLibrary.mockImplementation((options, callback) => {
        callback({ assets: mockAssets });
      });

      // Mock validation - first document valid, second invalid
      mockValidateDocument
        .mockResolvedValueOnce({
          isValid: true,
          errors: {},
        })
        .mockResolvedValueOnce({
          isValid: false,
          errors: { fileSize: 'File size must be less than 10MB' },
        });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDocumentPicker(), { wrapper });

      let documents: any[] = [];
      await act(async () => {
        documents = await result.current.pickDocuments('gallery');
      });

      expect(documents).toHaveLength(1);
      expect(documents[0].fileName).toBe('valid.jpg');
      expect(result.current.error).toContain(
        'File size must be less than 10MB'
      );
    });
  });

  describe('permissions', () => {
    it('should request camera permission on Android', async () => {
      Platform.OS = 'android';
      const mockRequest = jest.spyOn(PermissionsAndroid, 'request');
      mockRequest.mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDocumentPicker(), { wrapper });

      let granted = false;
      await act(async () => {
        granted = await result.current.requestPermission('camera');
      });

      expect(granted).toBe(true);
      expect(result.current.permissionStatus.camera).toBe('granted');
    });

    it('should handle permission denial', async () => {
      Platform.OS = 'android';
      const mockRequest = jest.spyOn(PermissionsAndroid, 'request');
      mockRequest.mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDocumentPicker(), { wrapper });

      let granted = false;
      await act(async () => {
        granted = await result.current.requestPermission('camera');
      });

      expect(granted).toBe(false);
      expect(result.current.permissionStatus.camera).toBe('denied');
      expect(result.current.error).toContain('Camera permission is required');
    });
  });
});
