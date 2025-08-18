/**
 * Custom hook for getting quotations by lead ID
 * Updated to use new quotationApi
 */

import { useGetQuotationsQuery } from '../store/api/quotationApi';
import type { Quotation } from '../types/api/quotation';

interface UseQuotationsByLeadResult {
  quotations: Quotation[];
  loading: boolean;
  error: any;
  refetch: () => void;
}

export const useQuotationsByLead = (
  leadId: string
): UseQuotationsByLeadResult => {
  const {
    data: quotations = [],
    isLoading: loading,
    error,
    refetch,
  } = useGetQuotationsQuery(
    { leadId, offset: 0, limit: 25 },
    { skip: !leadId }
  );

  return {
    quotations,
    loading,
    error,
    refetch,
  };
};

export default useQuotationsByLead;
