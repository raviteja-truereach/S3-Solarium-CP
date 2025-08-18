/**
 * Document Picker Hook
 * Custom hook for document/image selection with permissions and accessibility
 */
import { useState, useCallback } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
// import {
//   launchCamera,
//   launchImageLibrary,
//   MediaType,
// } from 'react-native-image-picker';
import { DocumentPickerResponse, pick, types } from '@react-native-documents/picker';
import { useAppDispatch } from './reduxHooks';
import { getFriendlyMessage } from '../utils/errorMessage';
import { validateDocument } from '../validation/documentSchema';
import type {
  DocumentAsset,
  PickerOptions,
  PermissionStatus,
  DocumentSource,
} from '../types/document';
import React from 'react';

/**
 * Document picker hook return interface
 */
export interface UseDocumentPickerReturn {
  /** Pick documents from specified source */
  pickDocuments: (
    source: DocumentSource,
    options?: PickerOptions
  ) => Promise<DocumentAsset[]>;
  /** Current loading state */
  isLoading: boolean;
  /** Current error message */
  error: string | null;
  /** Permission status for camera and photo library */
  permissionStatus: PermissionStatus;
  /** Request specific permission */
  requestPermission: (type: 'camera' | 'photoLibrary') => Promise<boolean>;
  /** Clear current error */
  clearError: () => void;
}

/**
 * Custom hook for document selection with accessibility and permissions
 */
export const useDocumentPicker = (): UseDocumentPickerReturn => {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    camera: 'unavailable',
    photoLibrary: 'unavailable',
  });

  /**
   * Clear current error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check if permission is granted on Android
   */
  const checkAndroidPermission = async (
    permission: string
  ): Promise<boolean> => {
    try {
      const hasPermission = await PermissionsAndroid.check(permission);
      return hasPermission;
    } catch (error) {
      console.error('❌ Error checking Android permission:', error);
      return false;
    }
  };

  /**
   * Request permission on Android
   */
  const requestAndroidPermission = async (
    permission: string
  ): Promise<boolean> => {
    try {
      const result = await PermissionsAndroid.request(permission);
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('❌ Error requesting Android permission:', error);
      return false;
    }
  };

  /**
   * Check current permissions
   */
  const checkPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      const cameraGranted = await checkAndroidPermission(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      const storageGranted = await checkAndroidPermission(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );

      setPermissionStatus({
        camera: cameraGranted ? 'granted' : 'denied',
        photoLibrary: storageGranted ? 'granted' : 'denied',
      });
    } else {
      // For iOS, permissions are handled by the picker libraries
      setPermissionStatus({
        camera: 'granted', // Will be checked when picker is launched
        photoLibrary: 'granted',
      });
    }
  }, []);

  /**
   * Request specific permission
   */
  const requestPermission = useCallback(
    async (type: 'camera' | 'photoLibrary'): Promise<boolean> => {
      setError(null);

      if (Platform.OS === 'ios') {
        // iOS permissions are handled by the picker libraries
        return true;
      }

      try {
        let permission: string;
        let granted = false;

        if (type === 'camera') {
          permission = PermissionsAndroid.PERMISSIONS.CAMERA;
          granted = await requestAndroidPermission(permission);

          setPermissionStatus((prev) => ({
            ...prev,
            camera: granted ? 'granted' : 'denied',
          }));
        } else {
          permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
          granted = await requestAndroidPermission(permission);

          setPermissionStatus((prev) => ({
            ...prev,
            photoLibrary: granted ? 'granted' : 'denied',
          }));
        }

        if (!granted) {
          const errorMessage =
            type === 'camera'
              ? 'Camera permission is required to take photos'
              : 'Storage permission is required to access gallery';
          setError(errorMessage);
        }

        return granted;
      } catch (error) {
        console.error(`❌ Error requesting ${type} permission:`, error);
        setError(getFriendlyMessage('PERMISSION_ERROR'));
        return false;
      }
    },
    []
  );

  /**
   * Convert image picker response to DocumentAsset
   */
  const convertImageToDocument = (asset: any): DocumentAsset => {
    return {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uri: asset.uri,
      fileName: asset.fileName || `image_${Date.now()}.jpg`,
      type: asset.type || 'image/jpeg',
      fileSize: asset.fileSize || 0,
      timestamp: Date.now(),
    };
  };

  /**
   * Convert document picker response to DocumentAsset
   */
  const convertDocumentToAsset = (doc: any): DocumentAsset => {
    return {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uri: doc.uri,
      fileName: doc.name,
      type: doc.type,
      fileSize: doc.size || 0,
      timestamp: Date.now(),
    };
  };

/**
 * Launch camera using document picker
 */
const launchCameraSelection = useCallback(
  async (options: PickerOptions = {}): Promise<DocumentAsset[]> => {
    try {
      const result = await pick({
        type: [types.images],
        copyTo: 'documentDirectory',
      });

      return [convertDocumentToAsset(result)];
    } catch (error: any) {
      // Check for cancel error by error message
      if (error.message && error.message.includes('cancel')) {
        return [];
      }
      throw error;
    }
  },
  []
);

/**
 * Launch gallery using document picker
 */
const launchGallerySelection = useCallback(
  async (options: PickerOptions = {}): Promise<DocumentAsset[]> => {
    try {
      const result = await pick({
        type: [types.images],
        allowMultiSelection: options.multiple || false,
        copyTo: 'documentDirectory',
      });

      if (Array.isArray(result)) {
        return result.map(convertDocumentToAsset);
      } else {
        return [convertDocumentToAsset(result)];
      }
    } catch (error: any) {
      if (error.message && error.message.includes('cancel')) {
        return [];
      }
      throw error;
    }
  },
  []
);

/**
 * Launch document picker for files
 */
const launchDocumentSelection = useCallback(
  async (options: PickerOptions = {}): Promise<DocumentAsset[]> => {
    try {
      const result = await pick({
        type: [types.images, types.pdf],
        allowMultiSelection: options.multiple || false,
        copyTo: 'documentDirectory',
      });

      if (Array.isArray(result)) {
        return result.map(convertDocumentToAsset);
      } else {
        return [convertDocumentToAsset(result)];
      }
    } catch (error: any) {
      if (error.message && error.message.includes('cancel')) {
        return [];
      }
      throw error;
    }
  },
  []
);

  /**
   * Validate selected documents
   */
  const validateDocuments = useCallback(
    async (documents: DocumentAsset[]): Promise<DocumentAsset[]> => {
      console.log('📄 Processing documents:', documents.length);
      
      // Skip complex validation for now - just do basic checks
      const validDocuments: DocumentAsset[] = [];
      
      for (const document of documents) {
        // Basic validation: check if essential properties exist
        if (document.uri && document.fileName && document.type) {
          validDocuments.push(document);
          console.log('✅ Document valid:', document.fileName);
        } else {
          console.log('❌ Document invalid:', document.fileName);
        }
      }
      
      return validDocuments;
    },
    []
  );

  /**
   * Pick documents from specified source
   */
  const pickDocuments = useCallback(
    async (
      source: DocumentSource,
      options: PickerOptions = {}
    ): Promise<DocumentAsset[]> => {
      setIsLoading(true);
      setError(null);

      try {
        let documents: DocumentAsset[] = [];

        // Skip permission check for files on Android
        if (source === 'files') {
          documents = await launchDocumentSelection(options);
        } else {
          // For camera and gallery, try direct access first
          try {
            switch (source) {
              case 'camera':
                documents = await launchCameraSelection(options);
                break;
              case 'gallery':
                documents = await launchGallerySelection(options);
                break;
            }
          } catch (permError) {
            console.log('📱 Permission error, trying to request:', permError);
            // Try to request permission and retry
            const permissionType =
              source === 'camera' ? 'camera' : 'photoLibrary';
            const granted = await requestPermission(permissionType);

            if (!granted) {
              throw new Error(`${source} permission denied`);
            }

            // Retry after permission granted
            switch (source) {
              case 'camera':
                documents = await launchCameraSelection(options);
                break;
              case 'gallery':
                documents = await launchGallerySelection(options);
                break;
            }
          }
        }

        // Validate documents
        const validDocuments = await validateDocuments(documents);
        return validDocuments;
      } catch (error: any) {
        console.error(`❌ Error picking documents from ${source}:`, error);
        const errorMessage = error.message || 'Failed to select documents';
        setError(errorMessage);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [
      launchCameraSelection,
      launchGallerySelection,
      launchDocumentSelection,
      validateDocuments,
      requestPermission,
    ]
  );

  // Check permissions on hook initialization
  React.useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    pickDocuments,
    isLoading,
    error,
    permissionStatus,
    requestPermission,
    clearError,
  };
};
