/**
 * Manual test screen for document module
 * Enhanced to test useDocumentCount hook
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Button, Divider, useTheme, Card } from 'react-native-paper';
import { documentMockService } from '../index';
import { generateMockDocument } from '../../../services/mocks/nativeServices';
import { DocumentThumbnail } from '../DocumentThumbnail';
import { DocumentGrid } from '../DocumentGrid';
import { useDocumentCount } from '../../../hooks/useDocumentCount'; // ADD this import
import type { DocumentAsset } from '../../../types/document';

export const DocumentModuleTestScreen: React.FC = () => {
  const theme = useTheme();
  const [documents, setDocuments] = useState<DocumentAsset[]>([]);
  const [gridLoading, setGridLoading] = useState<boolean>(false);
  const [selectedLeadId, setSelectedLeadId] =
    useState<string>('test-lead-12345');

  // ADD: Use the document count hook
  const documentCount = useDocumentCount(selectedLeadId);

  // Test lead IDs for switching
  const testLeadIds = [
    'test-lead-12345',
    'test-lead-67890',
    'test-lead-abcdef',
  ];

  // Generate different types of mock documents
  const generateTestDocuments = useCallback(
    (count: number): DocumentAsset[] => {
      const types = ['camera', 'gallery', 'files'] as const;
      const fileSizes = [
        512 * 1024, // 512KB - small
        1.5 * 1024 * 1024, // 1.5MB - medium
        3 * 1024 * 1024, // 3MB - large
        8 * 1024 * 1024, // 8MB - very large
      ];

      return Array.from({ length: count }, (_, i) => {
        const source = types[i % 3];
        const sizeIndex = i % fileSizes.length;
        const doc = generateMockDocument(source);

        doc.fileSize = fileSizes[sizeIndex];

        const fileNames = [
          'short.jpg',
          'medium-filename-document.pdf',
          'very-long-filename-that-should-be-truncated-properly-in-the-ui.jpg',
          'test-image-with-multiple-words.png',
        ];

        doc.fileName = fileNames[i % fileNames.length];

        return doc;
      });
    },
    []
  );

  // Legacy mock service tests (direct service calls)
  const testGetCount = async () => {
    try {
      const count = await documentMockService.getDocumentCount(selectedLeadId);
      Alert.alert('✅ Direct Service Call', `Document count: ${count}`);
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to get document count');
    }
  };

  const testSetCount = async () => {
    try {
      await documentMockService.setDocumentCount(selectedLeadId, 3);
      const count = await documentMockService.getDocumentCount(selectedLeadId);
      Alert.alert('✅ Direct Service Call', `Document count set to: ${count}`);
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to set document count');
    }
  };

  // Document generation tests
  const testGenerateDocument = (source: 'camera' | 'gallery' | 'files') => {
    const doc = generateMockDocument(source);
    setDocuments((prev) => [...prev, doc]);
    Alert.alert('✅ Success', `Generated ${source} document: ${doc.fileName}`);
  };

  const testGenerateMultipleDocuments = (count: number) => {
    const newDocs = generateTestDocuments(count);
    setDocuments((prev) => [...prev, ...newDocs]);
    Alert.alert('✅ Success', `Generated ${count} test documents`);
  };

  const testGridLoading = () => {
    setGridLoading(true);
    setTimeout(() => {
      setGridLoading(false);
    }, 2000);
  };

  const testLargeDataset = () => {
    const largeDocs = generateTestDocuments(50);
    setDocuments(largeDocs);
    Alert.alert('✅ Success', 'Generated 50 documents for performance testing');
  };

  const handleRemoveDocument = useCallback((docToRemove: DocumentAsset) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docToRemove.id));
    Alert.alert('✅ Removed', `Document ${docToRemove.fileName} removed`);
  }, []);

  const clearDocuments = () => {
    setDocuments([]);
    documentMockService.resetDocumentCount(selectedLeadId);
    Alert.alert('✅ Success', 'All documents cleared');
  };

  // Switch lead for testing
  const switchLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setDocuments([]); // Clear UI documents when switching leads
    Alert.alert('🔄 Switched', `Now testing with lead: ${leadId}`);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Document Module Test Screen</Text>

      {/* Lead Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Test Lead Selection</Text>
        <Text style={styles.info}>Current Lead: {selectedLeadId}</Text>

        <View style={styles.leadButtons}>
          {testLeadIds.map((leadId) => (
            <TouchableOpacity
              key={leadId}
              style={[
                styles.leadButton,
                selectedLeadId === leadId && styles.selectedLeadButton,
              ]}
              onPress={() => switchLead(leadId)}
            >
              <Text
                style={[
                  styles.leadButtonText,
                  selectedLeadId === leadId && styles.selectedLeadButtonText,
                ]}
              >
                {leadId.split('-')[2]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Document Count Hook Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🪝 useDocumentCount Hook Status</Text>

        <Card style={styles.statusCard}>
          <Card.Content>
            <Text style={styles.statusLabel}>
              Count:{' '}
              <Text style={styles.statusValue}>{documentCount.count}</Text>
            </Text>
            <Text style={styles.statusLabel}>
              Loading:{' '}
              <Text style={styles.statusValue}>
                {documentCount.loading ? 'Yes' : 'No'}
              </Text>
            </Text>
            <Text style={styles.statusLabel}>
              Error:{' '}
              <Text style={styles.statusValue}>
                {documentCount.error || 'None'}
              </Text>
            </Text>
            <Text style={styles.statusLabel}>
              UI Locked:{' '}
              <Text style={styles.statusValue}>
                {documentCount.isCountLocked ? 'Yes' : 'No'}
              </Text>
            </Text>
            <Text style={styles.statusLabel}>
              Refreshing:{' '}
              <Text style={styles.statusValue}>
                {documentCount.isRefreshing ? 'Yes' : 'No'}
              </Text>
            </Text>
            <Text style={styles.statusLabel}>
              Last Sync:{' '}
              <Text style={styles.statusValue}>
                {documentCount.lastSync
                  ? new Date(documentCount.lastSync).toLocaleTimeString()
                  : 'Never'}
              </Text>
            </Text>
          </Card.Content>
        </Card>
      </View>

      <Divider style={styles.divider} />

      {/* Hook-based Document Count Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🪝 Hook-based Count Tests</Text>

        <TouchableOpacity
          style={[
            styles.button,
            documentCount.loading && styles.disabledButton,
          ]}
          onPress={documentCount.refreshCount}
          disabled={documentCount.loading || documentCount.isCountLocked}
        >
          <Text style={styles.buttonText}>
            {documentCount.loading
              ? '⏳ Loading...'
              : '🔄 Refresh Count (Hook)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            documentCount.loading && styles.disabledButton,
          ]}
          onPress={() => documentCount.incrementCount(1)}
          disabled={documentCount.loading || documentCount.isCountLocked}
        >
          <Text style={styles.buttonText}>
            {documentCount.loading
              ? '⏳ Processing...'
              : '➕ Increment Count (+1)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            documentCount.loading && styles.disabledButton,
          ]}
          onPress={() => documentCount.incrementCount(3)}
          disabled={documentCount.loading || documentCount.isCountLocked}
        >
          <Text style={styles.buttonText}>
            {documentCount.loading
              ? '⏳ Processing...'
              : '➕➕ Increment Count (+3)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            documentCount.loading && styles.disabledButton,
          ]}
          onPress={documentCount.resetCount}
          disabled={documentCount.loading || documentCount.isCountLocked}
        >
          <Text style={styles.buttonText}>
            {documentCount.loading
              ? '⏳ Processing...'
              : '🔄 Reset Count (Hook)'}
          </Text>
        </TouchableOpacity>

        {documentCount.error && (
          <TouchableOpacity
            style={[styles.button, styles.errorButton]}
            onPress={documentCount.clearErrorState}
          >
            <Text style={styles.buttonText}>❌ Clear Error</Text>
          </TouchableOpacity>
        )}
      </View>

      <Divider style={styles.divider} />

      {/* Legacy Mock Service Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          📊 Legacy Service Tests (Direct)
        </Text>

        <TouchableOpacity style={styles.button} onPress={testGetCount}>
          <Text style={styles.buttonText}>📊 Direct Get Count</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testSetCount}>
          <Text style={styles.buttonText}>📝 Direct Set Count (3)</Text>
        </TouchableOpacity>
      </View>

      <Divider style={styles.divider} />

      {/* Document Generation Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📄 Document Generation Tests</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => testGenerateDocument('camera')}
        >
          <Text style={styles.buttonText}>📷 Generate Camera Document</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => testGenerateDocument('gallery')}
        >
          <Text style={styles.buttonText}>🖼️ Generate Gallery Document</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => testGenerateDocument('files')}
        >
          <Text style={styles.buttonText}>📄 Generate File Document</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => testGenerateMultipleDocuments(5)}
        >
          <Text style={styles.buttonText}>📚 Generate 5 Mixed Documents</Text>
        </TouchableOpacity>
      </View>

      <Divider style={styles.divider} />

      {/* Grid Component Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏗️ Grid Component Tests</Text>

        <TouchableOpacity style={styles.button} onPress={testGridLoading}>
          <Text style={styles.buttonText}>⏳ Test Grid Loading</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testLargeDataset}>
          <Text style={styles.buttonText}>🚀 Test Performance (50 docs)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearDocuments}
        >
          <Text style={styles.buttonText}>🗑️ Clear All Documents</Text>
        </TouchableOpacity>
      </View>

      <Divider style={styles.divider} />

      {/* Single Document Thumbnail Test */}
      {documents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🖼️ Single Thumbnail Test</Text>
          <View style={styles.thumbnailContainer}>
            <DocumentThumbnail
              document={documents[0]}
              onRemove={handleRemoveDocument}
              testID="test-thumbnail"
            />
          </View>
        </View>
      )}

      {/* Document Grid Display */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          📱 Document Grid ({documents.length} documents)
        </Text>

        <View style={styles.gridContainer}>
          <DocumentGrid
            documents={documents}
            onRemove={handleRemoveDocument}
            loading={gridLoading}
            testID="test-grid"
            numColumns={2}
            virtualized={documents.length > 20}
          />
        </View>
      </View>

      {/* Testing Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Testing Instructions</Text>
        <Text style={styles.instructionText}>
          <Text style={styles.bold}>Hook Testing:</Text>
          {'\n'}
          1. Switch between test leads - notice count persists{'\n'}
          2. Use hook-based count operations{'\n'}
          3. Watch UI lock during operations{'\n'}
          4. Compare hook vs direct service calls{'\n'}
          5. Test error handling and recovery{'\n'}
          {'\n'}
          <Text style={styles.bold}>Component Testing:</Text>
          {'\n'}
          6. Test document generation{'\n'}
          7. Try removing documents{'\n'}
          8. Test large datasets (50+ docs){'\n'}
          9. Check loading states{'\n'}
          10. Verify accessibility with screen reader
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  info: {
    marginBottom: 8,
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  divider: {
    marginVertical: 16,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  clearButton: {
    backgroundColor: '#dc3545',
  },
  errorButton: {
    backgroundColor: '#ffc107',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  leadButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  leadButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  selectedLeadButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  leadButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057',
  },
  selectedLeadButtonText: {
    color: 'white',
  },
  statusCard: {
    marginTop: 8,
    backgroundColor: '#f8f9fa',
  },
  statusLabel: {
    fontSize: 14,
    marginBottom: 4,
    color: '#495057',
  },
  statusValue: {
    fontWeight: 'bold',
    color: '#007bff',
  },
  thumbnailContainer: {
    width: 200,
    height: 160,
    alignSelf: 'center',
    marginVertical: 10,
  },
  gridContainer: {
    height: 400,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginTop: 10,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  bold: {
    fontWeight: 'bold',
    color: '#333',
  },
});
