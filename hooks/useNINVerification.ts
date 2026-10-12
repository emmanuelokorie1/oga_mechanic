import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI, NINStatusResponse, NINVerifyRequest, NINVerifyResponse } from '@/lib/api/user';
import { userProfileKeys } from '@/hooks/useUserProfile';

export const ninKeys = {
  status: () => [...userProfileKeys.all, 'ninStatus'] as const,
};

/**
 * Hook to retrieve the current user's NIN verification status across all profiles.
 */
export const useNINStatus = (enabled: boolean = true) => {
  return useQuery<NINStatusResponse>({
    queryKey: ninKeys.status(),
    queryFn: userAPI.getNINStatus,
    staleTime: 60 * 1000, // 1 minute
    enabled,
    retry: 1,
  });
};

/**
 * Hook to submit an 11-digit NIN for real-time verification against NIMC via Didit.
 */
export const useVerifyNIN = () => {
  const queryClient = useQueryClient();

  return useMutation<NINVerifyResponse, any, NINVerifyRequest>({
    mutationFn: userAPI.verifyNIN,
    onSuccess: (response) => {
      // Invalidate NIN status and all user profile caches
      queryClient.invalidateQueries({ queryKey: ninKeys.status() });
      queryClient.invalidateQueries({ queryKey: userProfileKeys.all });
      console.log('✅ Real-time NIN verification successful:', response.message);
    },
    onError: (error) => {
      console.error('❌ Real-time NIN verification error:', error?.response?.data || error.message);
    },
  });
};

/**
 * Unified hook providing status and real-time verification functions.
 */
export const useNINVerification = (role?: string) => {
  const statusQuery = useNINStatus();
  const verifyMutation = useVerifyNIN();

  const ninData = statusQuery.data?.data;
  const isNinVerified = Boolean(ninData?.is_nin_verified);
  const verifiedNin = ninData?.verified_nin;
  const verifiedAt = ninData?.verified_at;

  // Check role-specific profile verification if role is provided
  const roleProfileStatus = role && ninData?.profiles ? ninData.profiles[role] : undefined;
  const isRoleNinVerified = isNinVerified || Boolean(roleProfileStatus?.nin_is_verified);

  return {
    isNinVerified,
    isRoleNinVerified,
    verifiedNin,
    verifiedAt,
    roleProfileStatus,
    recentVerifications: ninData?.recent_verifications || [],
    isLoadingStatus: statusQuery.isLoading,
    isRefetchingStatus: statusQuery.isRefetching,
    refetchStatus: statusQuery.refetch,
    verifyNIN: verifyMutation.mutateAsync,
    isVerifying: verifyMutation.isPending,
    verifyError: verifyMutation.error,
    resetVerify: verifyMutation.reset,
  };
};
