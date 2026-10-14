import { useQuery } from '@tanstack/react-query';
import { productsAPI } from '@/lib/api/products';
import { useActiveRoleProfile } from '@/hooks/useUserProfile';

// Query keys for merchant analytics
export const merchantAnalyticsKeys = {
  all: ['merchantAnalytics'] as const,
  lists: () => [...merchantAnalyticsKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...merchantAnalyticsKeys.lists(), { filters }] as const,
  details: () => [...merchantAnalyticsKeys.all, 'detail'] as const,
  detail: (id: string) => [...merchantAnalyticsKeys.details(), id] as const,
};

// Hook to get merchant analytics
export const useMerchantAnalytics = (enabled: boolean = true) => {
  const { isVehicleRental, isMerchant } = useActiveRoleProfile();

  // Explicit guard: Vehicle rental role should NEVER call the merchant analytics endpoint
  const isQueryEnabled = enabled && isMerchant && !isVehicleRental;

  return useQuery({
    queryKey: merchantAnalyticsKeys.lists(),
    queryFn: productsAPI.getMerchantAnalytics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: isQueryEnabled,
  });
};
