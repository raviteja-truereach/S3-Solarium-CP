/**
 * Commission API Hooks
 * Convenience hooks for commission API operations with cpId handling
 */
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import {
  useGetCommissionsQuery,
  useGetCommissionByIdQuery,
  useLazyGetCommissionsQuery,
} from '../store/api/commissionApi';
import type { GetCommissionsParams } from '../types/api/commission';

/**
 * Hook to get current user's cpId from auth state
 */
export const useCurrentCpId = (): string | undefined => {
  return useSelector((state: RootState) => state.auth.user?.id);
};

/**
 * Enhanced hook for getting commissions with automatic cpId injection
 */
export const useCommissions = (
  params: Omit<GetCommissionsParams, 'cpId'> = {}
) => {
  const cpId = useCurrentCpId();

  return useGetCommissionsQuery(params, {
    skip: !cpId, // Skip query if no cpId available
  });
};

/**
 * Enhanced hook for getting commission by ID with automatic cpId handling
 */
export const useCommissionById = (commissionId: string) => {
  const cpId = useCurrentCpId();

  return useGetCommissionByIdQuery(commissionId, {
    skip: !cpId || !commissionId, // Skip if no cpId or commissionId
  });
};
