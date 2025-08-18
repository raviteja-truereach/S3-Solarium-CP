/**
 * Mock native services for development
 * Simulates image picker, document picker, and file system operations
 */

import { DocumentAsset } from '../../types/document';

// Mock image picker response
export const mockImagePicker = {
  launchImageLibrary: (options: any, callback: any) => {
    setTimeout(() => {
      callback({
        assets: [
          {
            uri: 'file://mock/gallery/image1.jpg',
            fileName: 'gallery_image.jpg',
            type: 'image/jpeg',
            fileSize: 1024000,
            width: 1920,
            height: 1080,
          },
        ],
      });
    }, 500);
  },

  launchCamera: (options: any, callback: any) => {
    setTimeout(() => {
      callback({
        assets: [
          {
            uri: 'file://mock/camera/photo.jpg',
            fileName: 'camera_photo.jpg',
            type: 'image/jpeg',
            fileSize: 2048000,
            width: 1920,
            height: 1080,
          },
        ],
      });
    }, 800);
  },
};

// Mock document picker
export const mockDocumentPicker = {
  pick: async (options: any): Promise<any[]> => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return [
      {
        uri: 'file://mock/documents/sample.pdf',
        name: 'sample_document.pdf',
        type: 'application/pdf',
        size: 512000,
      },
    ];
  },
};

// Mock permissions
export const mockPermissions = {
  check: async (permission: string): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return 'granted';
  },

  request: async (permission: string): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return 'granted';
  },
};

// Mock file system
export const mockFileSystem = {
  stat: async (path: string): Promise<any> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      size: Math.floor(Math.random() * 5000000), // Random size up to 5MB
      isFile: () => true,
      isDirectory: () => false,
    };
  },

  copyFile: async (source: string, destination: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    console.log(`[Mock] Copied ${source} to ${destination}`);
  },
};

// Mock image resizer
export const mockImageResizer = {
  createResizedImage: async (
    uri: string,
    width: number,
    height: number,
    format: string,
    quality: number
  ): Promise<any> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const originalSize = Math.floor(Math.random() * 3000000) + 1000000; // 1-4MB
    const compressedSize = Math.floor(originalSize * quality);

    return {
      uri: uri.replace('.jpg', '_compressed.jpg'),
      path: uri.replace('.jpg', '_compressed.jpg'),
      name: 'compressed_image.jpg',
      size: compressedSize,
      width: width,
      height: height,
    };
  },
};

/**
 * Generate mock document asset
 */
export const generateMockDocument = (
  source: 'camera' | 'gallery' | 'files'
): DocumentAsset => {
  const id = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = Date.now();

  const mockDocuments = {
    camera: {
      uri: `file://mock/camera/photo_${timestamp}.jpg`,
      fileName: `camera_photo_${timestamp}.jpg`,
      type: 'image/jpeg',
      fileSize: Math.floor(Math.random() * 2000000) + 1000000, // 1-3MB
    },
    gallery: {
      uri: `file://mock/gallery/image_${timestamp}.jpg`,
      fileName: `gallery_image_${timestamp}.jpg`,
      type: 'image/jpeg',
      fileSize: Math.floor(Math.random() * 1500000) + 500000, // 0.5-2MB
    },
    files: {
      uri: `file://mock/files/document_${timestamp}.pdf`,
      fileName: `document_${timestamp}.pdf`,
      type: 'application/pdf',
      fileSize: Math.floor(Math.random() * 1000000) + 200000, // 0.2-1.2MB
    },
  };

  return {
    id,
    timestamp,
    ...mockDocuments[source],
  };
};
