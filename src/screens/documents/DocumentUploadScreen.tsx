import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Alert, Platform, Linking } from 'react-native';
import {
  Text,
  Card,
  Banner,
  FAB,
  Portal,
  Modal,
  List,
  ActivityIndicator,
  Button,
  Chip,
} from 'react-native-paper';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';

// Internal imports
import ScreenContainer from '../../components/common/ScreenContainer';
import AppButton from '../../components/common/AppButton';
import { DocumentGrid } from '../../components/documents/DocumentGrid';
import { PermissionDeniedMessage } from '../../components/documents/PermissionDeniedMessage';
import { UploadProgressBar } from '../../components/documents/UploadProgressBar';
import { UploadErrorState } from '../../components/documents/UploadErrorState';
import { DocumentUploadErrorBoundary } from '../../components/documents/DocumentUploadErrorBoundary';
import { useConnectivity } from '../../contexts/ConnectivityContext';
import { useDocumentPicker } from '../../hooks/useDocumentPicker';
import { useDocumentUpload } from '../../hooks/useDocumentUpload';
import {
  useGetLeadDocSasTokenMutation,
  useGetDocumentCountQuery,
  useGetDocumentsByLeadQuery,
  useLazyGetDocumentsByLeadQuery,
  useGetDocumentViewSasMutation,
} from '../../store/api/documentApi';
import { MAX_DOCUMENT_COUNT } from '../../constants/document';
import {
  convertApiDocumentToAsset,
  type ExistingDocumentAsset,
  type ApiDocument,
} from '../../types/document';
import type {
  DocumentAsset,
  DocumentSource,
  DocumentUploadScreenProps,
} from '../../types/document';
import type { HomeStackParamList } from '../../navigation/types';
import { useDatabase } from '../../hooks/useDatabase';
import { DocumentSyncService } from '../../services/DocumentSyncService';

type DocumentUploadScreenNavigation = NativeStackNavigationProp<
  HomeStackParamList,
  'DocumentUpload'
>;

interface DocumentUploadState {
  selectedDocuments: DocumentAsset[];
  isCompressing: boolean;
  compressingDocument: string | null;
  showPickerModal: boolean;
  showOfflineBanner: boolean;
  persistedState: boolean;
}

/**
 * Document Source Selection Modal
 */
const DocumentSourceModal: React.FC<{
  visible: boolean;
  onDismiss: () => void;
  onSelectSource: (source: DocumentSource) => void;
  permissionError: string | null;
}> = ({ visible, onDismiss, onSelectSource, permissionError }) => {
  const sources = [
    {
      id: 'gallery' as DocumentSource,
      title: 'Choose from Gallery',
      subtitle: 'Select images from photo library',
    },
    {
      id: 'files' as DocumentSource,
      title: 'Browse Files',
      subtitle: 'Select PDF or image files',
    },
  ];

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Text variant="headlineSmall" style={styles.modalTitle}>
          Add Document
        </Text>

        {/* Error Display */}
        {permissionError && (
          <View style={styles.permissionErrorContainer}>
            <Text style={styles.permissionErrorText}>{permissionError}</Text>
          </View>
        )}

        <View style={styles.sourcesList}>
          {sources.map((source) => (
            <List.Item
              key={source.id}
              title={source.title}
              description={source.subtitle}
              onPress={() => {
                onSelectSource(source.id);
                onDismiss();
              }}
              style={styles.sourceItem}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${source.title}. ${source.subtitle}`}
              accessibilityHint="Double tap to select this document source"
            />
          ))}
        </View>

        <View style={styles.modalButtonContainer}>
          <Button mode="outlined" onPress={onDismiss}>
            Cancel
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

/**
 * Document Management Screen Component
 */
const DocumentUploadScreen: React.FC<DocumentUploadScreenProps> = () => {
  const theme = useTheme();
  const navigation = useNavigation<DocumentUploadScreenNavigation>();
  const route = useRoute();
  const { isOnline } = useConnectivity();

  // Extract params
  const { leadId, initialDocuments = [] } = route.params;

  // Hooks
  const {
    pickDocuments,
    isLoading: isPickerLoading,
    error: pickerError,
    permissionStatus,
    requestPermission,
    clearError: clearPickerError,
  } = useDocumentPicker();

  // Server state hooks
  const {
    data: documentCountData,
    isLoading: isCountLoading,
    error: countError,
    refetch: refetchServerCount,
  } = useGetDocumentCountQuery(leadId);

  // Document count from API response
  const documentCount = documentCountData?.data?.count || 0;

  // Existing documents from server
  const {
    data: existingDocumentsData,
    isLoading: isLoadingExistingDocs,
    error: existingDocsError,
    refetch: refetchExistingDocs,
  } = useGetDocumentsByLeadQuery(leadId, {
    refetchOnMountOrArgChange: true,
  });

  // Convert API documents to DocumentAsset format
  const existingDocuments: ExistingDocumentAsset[] = useMemo(() => {
    if (!existingDocumentsData?.data?.documents) return [];
    return existingDocumentsData.data.documents.map(convertApiDocumentToAsset);
  }, [existingDocumentsData]);

  // Document upload hook
  const {
    uploadState,
    startUpload,
    cancelUpload: cancelCurrentUpload,
    resetUpload,
    canCancel,
  } = useDocumentUpload();

  // SAS token mutations
  const [getLeadDocSasToken, { isLoading: isGettingSasToken }] =
    useGetLeadDocSasTokenMutation();
  const [getDocumentViewSas, { isLoading: isLoadingViewSas }] =
    useGetDocumentViewSasMutation();

  // Server state verification hooks
  const [getDocumentsByLead] = useLazyGetDocumentsByLeadQuery();

  // Local state
  const [state, setState] = useState<DocumentUploadState>({
    selectedDocuments: initialDocuments,
    isCompressing: false,
    compressingDocument: null,
    showPickerModal: false,
    showOfflineBanner: false,
    persistedState: false,
  });

  // Enhanced upload state
  const [uploadErrorState, setUploadErrorState] = useState<{
    hasError: boolean;
    error: string | null;
    fileName: string | null;
    isRetrying: boolean;
  }>({
    hasError: false,
    error: null,
    fileName: null,
    isRetrying: false,
  });

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<DocumentUploadState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Calculated values
   */
  const remainingSlots = useMemo(() => {
    const existingCount = existingDocuments.length;
    const selectedCount = state.selectedDocuments.length;
    return Math.max(0, MAX_DOCUMENT_COUNT - existingCount - selectedCount);
  }, [existingDocuments.length, state.selectedDocuments.length]);

  const canAddDocuments = useMemo(() => {
    return remainingSlots > 0 && isOnline;
  }, [remainingSlots, isOnline]);

  const hasDocuments = state.selectedDocuments.length > 0;
  const isProcessing =
    isPickerLoading ||
    state.isCompressing ||
    isCountLoading ||
    uploadState.isUploading ||
    isGettingSasToken;

  /**
   * Focus effect for state persistence and refresh
   */
  useFocusEffect(
    useCallback(() => {
      // Only refresh on initial focus
      if (!state.persistedState) {
        refetchServerCount();
        refetchExistingDocs();
        updateState({ persistedState: true });
      }

      // Cleanup function
      return () => {
        persistState();
      };
    }, [leadId]) // Add leadId dependency
  );

  /**
   * Handle viewing existing document
   */
  const handleViewDocument = useCallback(
    async (document: DocumentAsset) => {
      if (!('docId' in document)) {
        Toast.show({
          type: 'error',
          text1: 'Cannot View Document',
          text2: 'Document information not available',
        });
        return;
      }

      try {
        console.log('👁️ Viewing document:', document.fileName);

        Toast.show({
          type: 'info',
          text1: 'Getting Document',
          text2: `Loading ${document.fileName}...`,
        });

        const viewSasResponse = await getDocumentViewSas({
          docId: (document as ExistingDocumentAsset).docId,
        }).unwrap();

        const sasUrl = viewSasResponse.data.sasUrl;
        console.log('✅ Got view SAS URL:', sasUrl);

        // Try to open the document URL
        const supported = await Linking.canOpenURL(sasUrl);

        if (supported) {
          await Linking.openURL(sasUrl);
          Toast.show({
            type: 'success',
            text1: 'Document Opened',
            text2: `${document.fileName} opened in browser`,
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Cannot Open Document',
            text2: 'Unable to open document viewer',
          });
        }
      } catch (error: any) {
        console.error('❌ Error viewing document:', error);
        Toast.show({
          type: 'error',
          text1: 'View Failed',
          text2: error.message || 'Failed to load document',
        });
      }
    },
    [getDocumentViewSas]
  );

  /**
   * Handle adding documents
   */
  const handleAddDocument = useCallback(async () => {
    if (!canAddDocuments || isProcessing) {
      if (!isOnline) {
        updateState({ showOfflineBanner: true });
        setTimeout(() => updateState({ showOfflineBanner: false }), 5000);
      } else if (remainingSlots === 0) {
        Toast.show({
          type: 'error',
          text1: 'Document Limit Reached',
          text2: `Maximum ${MAX_DOCUMENT_COUNT} documents allowed per lead`,
        });
      }
      return;
    }

    updateState({ showPickerModal: true });
  }, [canAddDocuments, isProcessing, isOnline, remainingSlots]);

  /**
   * Handle document source selection
   */
  const handleSelectSource = useCallback(
    async (source: DocumentSource) => {
      clearPickerError();

      try {
        const maxPickCount = Math.min(remainingSlots, 5); // Limit picker selections
        const pickedDocuments = await pickDocuments(source, {
          multiple: true,
          maxCount: maxPickCount,
        });

        if (pickedDocuments.length > 0) {
          // Process documents (compression handled in previous sub-tasks)
          const processedDocuments = await handleCompressDocuments(
            pickedDocuments
          );

          setState((prev) => ({
            ...prev,
            selectedDocuments: [
              ...prev.selectedDocuments,
              ...processedDocuments,
            ],
          }));

          Toast.show({
            type: 'success',
            text1: 'Documents Added',
            text2: `${processedDocuments.length} document(s) added successfully`,
          });

          // Auto-persist state
          persistState();
        }
      } catch (error: any) {
        console.error('❌ Error selecting documents:', error);
        Toast.show({
          type: 'error',
          text1: 'Selection Failed',
          text2: error.message || 'Failed to select documents',
        });
      }
    },
    [remainingSlots, pickDocuments, clearPickerError]
  );

  const handleCompressDocuments = useCallback(
    async (documents: DocumentAsset[]): Promise<DocumentAsset[]> => {
      console.log(
        '📂 Skipping compression, returning original documents:',
        documents
      );
      // Skip compression for now - just return original documents
      return documents;
    },
    []
  );

  /**
   * Handle document removal
   */
  const handleRemoveDocument = useCallback((document: DocumentAsset) => {
    setState((prev) => ({
      ...prev,
      selectedDocuments: prev.selectedDocuments.filter(
        (d) => d.id !== document.id
      ),
    }));

    Toast.show({
      type: 'info',
      text1: 'Document Removed',
      text2: `${document.fileName} removed from selection`,
    });

    // Auto-persist state
    persistState();
  }, []);

  /**
   * Verify server document count before upload
   */
  const verifyServerDocumentCount = useCallback(async (): Promise<boolean> => {
    console.log('🔍 Verifying server document count before upload...');

    try {
      // Refresh server count
      const serverResult = await refetchServerCount();

      if (serverResult.error) {
        throw new Error('Failed to verify document count from server');
      }

      const serverCount = serverResult.data?.data.count || 0;
      const selectedCount = state.selectedDocuments.length;
      const totalAfterUpload = serverCount + selectedCount;

      console.log('📊 Server verification:', {
        serverCount,
        selectedCount,
        totalAfterUpload,
        maxAllowed: MAX_DOCUMENT_COUNT,
      });

      if (totalAfterUpload > MAX_DOCUMENT_COUNT) {
        throw new Error(
          `Upload would exceed limit. Server has ${serverCount} documents, uploading ${selectedCount} would total ${totalAfterUpload}/${MAX_DOCUMENT_COUNT}`
        );
      }

      return true;
    } catch (error: any) {
      console.error('❌ Server verification failed:', error);
      setUploadErrorState({
        hasError: true,
        error: error.message || 'Failed to verify document count from server',
        fileName: null,
        isRetrying: false,
      });
      return false;
    }
  }, [refetchServerCount, state.selectedDocuments.length]);

  /**
   * Refresh document list from server after upload
   */
  const refreshDocumentListFromServer = useCallback(async (): Promise<void> => {
    console.log('🔄 Refreshing document list from server...');

    try {
      // Refresh existing documents list
      await refetchExistingDocs();

      // Refresh document count as well
      await refetchServerCount();

      // Invalidate cache and sync with database
      try {
        // We'll get db and authToken from a different approach
        // For now, let's focus on the cache invalidation trigger
        // This will be handled by the sync service integration

        console.log('📄 Triggering cache invalidation for lead:', leadId);
        // The actual cache invalidation will be handled in the next step
      } catch (syncError) {
        console.warn('⚠️ Cache sync failed but continuing:', syncError);
      }

      console.log('✅ Document list refreshed from server');
    } catch (error: any) {
      console.error('❌ Failed to refresh document list:', error);
      Toast.show({
        type: 'warning',
        text1: 'Sync Warning',
        text2: 'Documents uploaded but failed to refresh list',
      });
    }
  }, [refetchExistingDocs, refetchServerCount, leadId]);

  /**
   * Enhanced document upload with server state verification
   */
  const handleUploadDocuments = useCallback(async (): Promise<void> => {
    if (state.selectedDocuments.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'No Documents',
        text2: 'Please select documents to upload first',
      });
      return;
    }

    if (!isOnline) {
      updateState({ showOfflineBanner: true });
      setTimeout(() => updateState({ showOfflineBanner: false }), 5000);
      return;
    }

    // Clear any previous upload errors
    setUploadErrorState({
      hasError: false,
      error: null,
      fileName: null,
      isRetrying: false,
    });

    console.log('🚀 Starting upload process with server verification...');

    try {
      // Step 1: Verify server document count
      const isCountValid = await verifyServerDocumentCount();
      if (!isCountValid) {
        return; // Error already handled in verifyServerDocumentCount
      }

      // Step 2: Upload documents one by one
      let uploadedCount = 0;
      const totalDocuments = state.selectedDocuments.length;

      for (let i = 0; i < totalDocuments; i++) {
        const document = state.selectedDocuments[i];

        console.log(
          `📤 Uploading document ${i + 1}/${totalDocuments}: ${
            document.fileName
          }`
        );

        try {
          // Get SAS token
          Toast.show({
            type: 'info',
            text1: 'Getting Upload Token',
            text2: `Preparing ${document.fileName}... (${
              i + 1
            }/${totalDocuments})`,
          });

          const sasTokenResponse = await getLeadDocSasToken({
            leadId,
            docType: 'GENERAL',
          }).unwrap();

          // Start upload with progress tracking
          const uploadResult = await startUpload(
            document,
            sasTokenResponse.data.sasUrl
          );

          if (uploadResult.success) {
            uploadedCount++;

            Toast.show({
              type: 'success',
              text1: 'Upload Successful',
              text2: `${document.fileName} uploaded (${uploadedCount}/${totalDocuments})`,
            });

            // Remove uploaded document from selected list
            updateState((prev) => ({
              selectedDocuments: prev.selectedDocuments.filter(
                (d) => d.id !== document.id
              ),
            }));
          } else {
            // Handle upload failure
            throw new Error(uploadResult.error || 'Upload failed');
          }

          // Reset upload state for next document
          resetUpload();
        } catch (uploadError: any) {
          console.error('❌ Document upload failed:', uploadError);

          setUploadErrorState({
            hasError: true,
            error: uploadError.message || 'Upload failed',
            fileName: document.fileName,
            isRetrying: false,
          });

          // Stop uploading remaining documents
          break;
        }
      }

      // Step 3: Refresh document list and count from server after successful uploads
      if (uploadedCount > 0) {
        console.log(
          `✅ Successfully uploaded ${uploadedCount}/${totalDocuments} documents`
        );

        await refreshDocumentListFromServer();

        if (uploadedCount === totalDocuments) {
          Toast.show({
            type: 'success',
            text1: 'All Uploads Complete',
            text2: `Successfully uploaded ${uploadedCount} document${
              uploadedCount === 1 ? '' : 's'
            }`,
          });
        }
      }
    } catch (error: any) {
      console.error('❌ Upload process failed:', error);

      setUploadErrorState({
        hasError: true,
        error: error.message || 'Upload process failed',
        fileName: null,
        isRetrying: false,
      });
    }
  }, [
    state.selectedDocuments,
    isOnline,
    leadId,
    verifyServerDocumentCount,
    getLeadDocSasToken,
    startUpload,
    resetUpload,
    refreshDocumentListFromServer,
    updateState,
  ]);

  /**
   * Handle retry upload
   */
  const handleRetryUpload = useCallback(async () => {
    console.log('🔄 Retrying upload...');

    setUploadErrorState((prev) => ({ ...prev, isRetrying: true }));

    // Reset upload state completely
    resetUpload();

    // Wait a moment for state to reset
    setTimeout(() => {
      setUploadErrorState({
        hasError: false,
        error: null,
        fileName: null,
        isRetrying: false,
      });

      // Retry the upload
      handleUploadDocuments();
    }, 500);
  }, [resetUpload, handleUploadDocuments]);

  /**
   * Reset upload state completely
   */
  const resetUploadState = useCallback(() => {
    console.log('🔄 Resetting upload state completely');

    resetUpload();
    setUploadErrorState({
      hasError: false,
      error: null,
      fileName: null,
      isRetrying: false,
    });
  }, [resetUpload]);

  /**
   * Handle refresh count
   */
  const handleRefreshCount = useCallback(async () => {
    try {
      const result = await refetchServerCount();
      if (result.error) {
        throw new Error('Failed to refresh count');
      }
      Toast.show({
        type: 'success',
        text1: 'Count Updated',
        text2: 'Document count refreshed from server',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Refresh Failed',
        text2: 'Failed to refresh document count',
      });
    }
  }, [refetchServerCount]);

  /**
   * Handle permission request
   */
  const handleRequestPermission = useCallback(
    async (type: 'camera' | 'photoLibrary') => {
      try {
        const granted = await requestPermission(type);
        if (granted) {
          Toast.show({
            type: 'success',
            text1: 'Permission Granted',
            text2: `${
              type === 'camera' ? 'Camera' : 'Photo library'
            } access granted`,
          });
        }
      } catch (error) {
        console.error('❌ Permission request failed:', error);
      }
    },
    [requestPermission]
  );

  /**
   * Open device settings
   */
  const handleOpenSettings = useCallback(() => {
    Alert.alert(
      'Open Settings',
      'To grant permissions, go to Settings > Apps > Solarium > Permissions',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }, []);

  /**
   * Handle upload cancellation
   */
  const handleCancelUpload = useCallback(() => {
    console.log('🛑 User requested upload cancellation');
    cancelCurrentUpload();

    Toast.show({
      type: 'info',
      text1: 'Upload Cancelled',
      text2: 'Document upload has been cancelled',
    });
  }, [cancelCurrentUpload]);

  /**
   * Persist state for navigation
   */
  const persistState = useCallback(() => {
    // In a real app, you might save to AsyncStorage or update navigation params
    // For now, we'll just log the persistence
    console.log('🔄 Persisting document upload state:', {
      documentCount: state.selectedDocuments.length,
      leadId,
    });
  }, [state.selectedDocuments.length, leadId]);

  /**
   * Restore state from navigation params
   */
  const restoreState = useCallback(() => {
    if (initialDocuments.length > 0) {
      updateState({ selectedDocuments: initialDocuments });
      console.log(
        '🔄 Restored document state:',
        initialDocuments.length,
        'documents'
      );
    }
  }, [initialDocuments]);

  // Restore state on mount
  useEffect(() => {
    restoreState();
  }, [restoreState]);

  /**
   * Get accessibility labels
   */
  const getDocumentCountLabel = (): string => {
    return `${existingDocuments.length} existing documents, ${state.selectedDocuments.length} selected for upload, ${remainingSlots} slots remaining out of ${MAX_DOCUMENT_COUNT} maximum`;
  };

  const getAddButtonLabel = (): string => {
    if (!isOnline) return 'Cannot add documents offline';
    if (remainingSlots === 0) return 'Document limit reached';
    return `Add documents. ${remainingSlots} slots remaining`;
  };

  return (
    <DocumentUploadErrorBoundary onReset={resetUploadState}>
      <View style={styles.screenContainer}>
        <ScreenContainer scrollable={true} style={styles.scrollableContent}>
          {/* Offline Banner */}
          <Banner
            visible={state.showOfflineBanner}
            actions={[
              {
                label: 'Dismiss',
                onPress: () => updateState({ showOfflineBanner: false }),
              },
            ]}
            style={styles.offlineBanner}
          >
            Go online to add documents
          </Banner>

          {/* Header */}
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              Document Management
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Manage documents for this lead (max {MAX_DOCUMENT_COUNT})
            </Text>
          </View>

          {/* Document Count Card */}
          <Card style={styles.countCard}>
            <Card.Content style={styles.countContent}>
              <View style={styles.countInfo}>
                <View style={styles.countNumbers}>
                  <Text variant="headlineMedium" style={styles.countText}>
                    {isCountLoading
                      ? '...'
                      : existingDocuments.length +
                        state.selectedDocuments.length}
                  </Text>
                  <Text variant="bodySmall" style={styles.countLabel}>
                    / {MAX_DOCUMENT_COUNT} documents
                  </Text>
                </View>

                <View style={styles.countDetails}>
                  <Chip
                    style={[
                      styles.countChip,
                      { backgroundColor: theme.colors.primaryContainer },
                    ]}
                    textStyle={styles.chipText}
                  >
                    {existingDocuments.length} uploaded
                  </Chip>
                  {state.selectedDocuments.length > 0 && (
                    <Chip
                      style={[
                        styles.countChip,
                        { backgroundColor: theme.colors.secondaryContainer },
                      ]}
                      textStyle={styles.chipText}
                    >
                      {state.selectedDocuments.length} pending
                    </Chip>
                  )}
                </View>
              </View>

              {/* Refresh Count Button */}
              <Button
                mode="outlined"
                compact
                onPress={handleRefreshCount}
                disabled={isCountLoading}
                style={styles.refreshButton}
                accessible={true}
                accessibilityLabel="Refresh document count from server"
                accessibilityHint="Double tap to refresh the current document count"
              >
                {isCountLoading ? 'Loading...' : 'Refresh'}
              </Button>
            </Card.Content>
          </Card>

          {/* Permission Error */}
          {pickerError && (
            <PermissionDeniedMessage
              type="camera"
              message={pickerError}
              onRetry={() => handleRequestPermission('camera')}
              onOpenSettings={handleOpenSettings}
              testID="document-permission-error"
            />
          )}

          {/* Count Error */}
          {countError && (
            <Banner
              visible={true}
              actions={[
                {
                  label: 'Retry',
                  onPress: handleRefreshCount,
                },
                {
                  label: 'Dismiss',
                  onPress: () => {}, // RTK Query handles error dismissal automatically
                },
              ]}
              style={styles.errorBanner}
            >
              {typeof countError === 'object' && 'message' in countError
                ? (countError as any).message
                : 'Failed to load document count'}
            </Banner>
          )}

          {/* Enhanced Upload Progress Display */}
          {uploadState.isUploading && (
            <Card style={styles.progressCard}>
              <UploadProgressBar
                progress={uploadState.progress.percent}
                status="uploading"
                fileName={state.selectedDocuments.find(() => true)?.fileName}
                loaded={uploadState.progress.loaded}
                total={uploadState.progress.total}
                speed={uploadState.progress.speed}
              />
              {canCancel && (
                <View style={{ padding: 16, paddingTop: 0 }}>
                  <AppButton
                    mode="outlined"
                    onPress={handleCancelUpload}
                    title="Cancel Upload"
                  />
                </View>
              )}
            </Card>
          )}

          {/* Document Sections */}
          <View style={styles.sectionsContainer}>
            {/* Existing Documents Section */}
            <View style={styles.sectionContainer}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Existing Documents ({existingDocuments.length})
              </Text>

              {isLoadingExistingDocs ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" />
                  <Text style={styles.loadingText}>
                    Loading existing documents...
                  </Text>
                </View>
              ) : existingDocsError ? (
                <Banner
                  visible={true}
                  actions={[
                    {
                      label: 'Retry',
                      onPress: () => refetchExistingDocs(),
                    },
                  ]}
                  style={styles.errorBanner}
                >
                  Failed to load existing documents
                </Banner>
              ) : (
                <DocumentGrid
                  documents={existingDocuments}
                  onView={handleViewDocument}
                  loading={isLoadingViewSas}
                  testID="existing-documents-grid"
                  accessibilityLabel={`Existing documents: ${existingDocuments.length} documents`}
                  numColumns={2}
                  virtualized={false}
                />
              )}
            </View>

            {/* Selected for Upload Section */}
            <View style={styles.sectionContainer}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Selected for Upload ({state.selectedDocuments.length})
              </Text>

              <DocumentGrid
                documents={state.selectedDocuments}
                onRemove={handleRemoveDocument}
                loading={state.isCompressing}
                testID="selected-documents-grid"
                accessibilityLabel={`Selected documents: ${state.selectedDocuments.length} documents`}
                numColumns={2}
                virtualized={false}
              />
            </View>
          </View>

          {/* Upload Button */}
          <View style={styles.uploadButtonContainer}>
            <AppButton
              mode="contained"
              onPress={handleUploadDocuments}
              disabled={!hasDocuments || isProcessing || !isOnline}
              loading={uploadState.isUploading || isGettingSasToken}
              fullWidth
              style={styles.uploadButton}
              title={
                uploadState.isUploading
                  ? `Uploading... ${uploadState.progress.percent}%`
                  : isGettingSasToken
                  ? 'Getting Upload Token...'
                  : `Upload ${state.selectedDocuments.length} Document${
                      state.selectedDocuments.length === 1 ? '' : 's'
                    }`
              }
              accessible={true}
              accessibilityLabel={`Upload ${state.selectedDocuments.length} documents`}
              accessibilityHint="Double tap to start uploading selected documents"
            />
          </View>

          {/* Bottom padding for FAB */}
          <View style={styles.fabSpacing} />
        </ScreenContainer>

        {/* FAB - Now outside the scrollable container */}
        <FAB
          onPress={handleAddDocument}
          disabled={!canAddDocuments || isProcessing}
          style={[styles.fab, !canAddDocuments && styles.fabDisabled]}
          loading={isProcessing}
          accessible={true}
          accessibilityLabel={getAddButtonLabel()}
          accessibilityHint="Double tap to add documents from camera, gallery, or files"
          testID="add-document-fab"
          label="Add Document"
        />

        {/* Document Source Selection Modal */}
        <DocumentSourceModal
          visible={state.showPickerModal}
          onDismiss={() => updateState({ showPickerModal: false })}
          onSelectSource={handleSelectSource}
          permissionError={pickerError}
        />
      </View>
    </DocumentUploadErrorBoundary>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.7,
  },
  offlineBanner: {
    margin: 0,
  },
  errorBanner: {
    margin: 16,
    marginTop: 8,
  },
  countCard: {
    margin: 16,
    marginTop: 8,
  },
  countContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countInfo: {
    flex: 1,
  },
  countNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  countText: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  countLabel: {
    opacity: 0.7,
  },
  countDetails: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  countChip: {
    height: 32,
    minHeight: 32,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    lineHeight: 16,
    textAlignVertical: 'center',
  },
  refreshButton: {
    alignSelf: 'flex-start',
  },
  progressCard: {
    margin: 16,
    marginTop: 8,
  },
  // sectionsContainer: {
  //   // paddingHorizontal: 16,
  //   paddingBottom: 100, // Space for FAB and upload button
  // },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 8,
    opacity: 0.7,
  },
  uploadButtonContainer: {
    padding: 16,
    paddingTop: 8,
  },
  uploadButton: {
    borderRadius: 25,
  },
  // fab: {
  //   position: 'absolute',
  //   right: 16,
  //   bottom: 100, // Above upload button
  // },
  // fabDisabled: {
  //   opacity: 0.6,
  // },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 0,
    maxHeight: '80%',
  },
  modalTitle: {
    padding: 20,
    paddingBottom: 8,
    fontWeight: 'bold',
  },
  sourcesList: {
    paddingHorizontal: 8,
  },
  sourceItem: {
    borderRadius: 8,
    marginVertical: 2,
  },
  modalButtonContainer: {
    padding: 20,
    paddingTop: 16,
    alignItems: 'center',
  },
  permissionErrorContainer: {
    backgroundColor: '#ffebee',
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  permissionErrorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  ////////////
  screenContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Match your app's background
  },
  scrollableContent: {
    flex: 1,
  },
  fabSpacing: {
    height: 80, // Space for the floating FAB
  },

  // UPDATE EXISTING FAB STYLES
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16, // Changed from 100 to 16 for better positioning
    elevation: 8, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000, // Ensure it's above other content
  },
  fabDisabled: {
    opacity: 0.6,
  },

  // UPDATE SECTIONS CONTAINER
  sectionsContainer: {
    paddingBottom: 24, // Reduced since we have fabSpacing now
  },
});

export default DocumentUploadScreen;
