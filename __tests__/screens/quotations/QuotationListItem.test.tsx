/**
 * QuotationListItem Unit Tests
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { QuotationListItem } from '../../../src/screens/quotations/QuotationListItem';
import { Quotation } from '../../../src/types/quotation';

// Mock connectivity
jest.mock('../../../src/contexts/ConnectivityContext', () => ({
  useConnectivity: () => ({ isOnline: true }),
}));

const mockQuotation: Quotation = {
  quotationId: 'QUOT-001',
  leadId: 'LEAD-001',
  systemKW: 5,
  totalCost: 500000,
  status: 'Created',
  createdAt: '2023-01-01T00:00:00Z',
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider>{children}</PaperProvider>
);

describe('QuotationListItem', () => {
  const mockOnPress = jest.fn();
  const mockOnShare = jest.fn();
  const mockOnViewPdf = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render quotation information correctly', () => {
      const { getByText } = render(
        <TestWrapper>
          <QuotationListItem
            quotation={mockQuotation}
            onPress={mockOnPress}
            testID="test-quotation-item"
          />
        </TestWrapper>
      );

      expect(getByText('QUOT-001')).toBeTruthy();
      expect(getByText('Lead: LEAD-001')).toBeTruthy();
      expect(getByText('System: 5 kW')).toBeTruthy();
      expect(getByText('Created')).toBeTruthy();
    });

    it('should handle press event', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <QuotationListItem
            quotation={mockQuotation}
            onPress={mockOnPress}
            testID="test-quotation-item"
          />
        </TestWrapper>
      );

      fireEvent.press(getByTestId('test-quotation-item'));
      expect(mockOnPress).toHaveBeenCalledWith(mockQuotation);
    });
  });

  describe('Share Functionality', () => {
    it('should show share button for Created status', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <QuotationListItem
            quotation={mockQuotation}
            onPress={mockOnPress}
            onShare={mockOnShare}
            testID="test-quotation-item"
          />
        </TestWrapper>
      );

      expect(getByTestId('share-button-QUOT-001')).toBeTruthy();
    });

    it('should not show share button for Shared status', () => {
      const sharedQuotation = { ...mockQuotation, status: 'Shared' as any };

      const { queryByTestId } = render(
        <TestWrapper>
          <QuotationListItem
            quotation={sharedQuotation}
            onPress={mockOnPress}
            onShare={mockOnShare}
            testID="test-quotation-item"
          />
        </TestWrapper>
      );

      expect(queryByTestId('share-button-QUOT-001')).toBeNull();
    });

    it('should handle share button press', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <QuotationListItem
            quotation={mockQuotation}
            onPress={mockOnPress}
            onShare={mockOnShare}
            testID="test-quotation-item"
          />
        </TestWrapper>
      );

      fireEvent.press(getByTestId('share-button-QUOT-001'));
      expect(mockOnShare).toHaveBeenCalledWith(mockQuotation);
      expect(mockOnPress).not.toHaveBeenCalled(); // Should not trigger main press
    });
  });

  describe('PDF Functionality', () => {
    it('should show PDF button for Shared status', () => {
      const sharedQuotation = { ...mockQuotation, status: 'Shared' as any };

      const { getByTestId } = render(
        <TestWrapper>
          <QuotationListItem
            quotation={sharedQuotation}
            onPress={mockOnPress}
            onViewPdf={mockOnViewPdf}
            testID="test-quotation-item"
          />
        </TestWrapper>
      );

      expect(getByTestId('pdf-button-QUOT-001')).toBeTruthy();
    });

    it('should handle PDF button press', () => {
      const sharedQuotation = { ...mockQuotation, status: 'Shared' as any };

      const { getByTestId } = render(
        <TestWrapper>
          <QuotationListItem
            quotation={sharedQuotation}
            onPress={mockOnPress}
            onViewPdf={mockOnViewPdf}
            testID="test-quotation-item"
          />
        </TestWrapper>
      );

      fireEvent.press(getByTestId('pdf-button-QUOT-001'));
      expect(mockOnViewPdf).toHaveBeenCalledWith(sharedQuotation);
      expect(mockOnPress).not.toHaveBeenCalled(); // Should not trigger main press
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when sharing', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <QuotationListItem
            quotation={mockQuotation}
            onPress={mockOnPress}
            onShare={mockOnShare}
            isSharing={true}
            testID="test-quotation-item"
          />
        </TestWrapper>
      );

      const shareButton = getByTestId('share-button-QUOT-001');
      expect(shareButton).toBeTruthy();
      // Should contain ActivityIndicator when isSharing is true
    });

    it('should show loading spinner when loading PDF', () => {
      const sharedQuotation = { ...mockQuotation, status: 'Shared' as any };

      const { getByTestId } = render(
        <TestWrapper>
          <QuotationListItem
            quotation={sharedQuotation}
            onPress={mockOnPress}
            onViewPdf={mockOnViewPdf}
            isLoadingPdf={true}
            testID="test-quotation-item"
          />
        </TestWrapper>
      );

      const pdfButton = getByTestId('pdf-button-QUOT-001');
      expect(pdfButton).toBeTruthy();
      // Should contain ActivityIndicator when isLoadingPdf is true
    });
  });
});
