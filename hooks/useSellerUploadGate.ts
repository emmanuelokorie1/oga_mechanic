import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrimaryUserProfile, useMerchantProfile, useVehicleRentalProfile } from '@/hooks/useUserProfile';
import { productsAPI } from '@/lib/api/products';
import { useProfileStore } from '@/hooks/useProfileStore';

export const FREE_UPLOAD_LIMIT = 2;

export const useSellerUploadGate = () => {
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isProfileComplete = useProfileStore((state) => state.isProfileComplete);

  // 1. Primary Profile
  const { data: primaryProfileData } = usePrimaryUserProfile();
  const activeRoleRaw = primaryProfileData?.active_role || primaryProfileData?.data?.active_role || (primaryProfileData?.data as any)?.current_role;
  const activeRole = typeof activeRoleRaw === 'object' ? activeRoleRaw?.name : activeRoleRaw;
  const isVehicleRental = activeRole === 'vehicle_rental';
  const isSeller = activeRole === 'merchant' || activeRole === 'seller';

  // 2. Specific role profile for KYC & subscription status
  const merchantProfileQuery = useMerchantProfile(isSeller);
  const vehicleRentalProfileQuery = useVehicleRentalProfile(isVehicleRental);
  const activeProfileQuery = isVehicleRental ? vehicleRentalProfileQuery : merchantProfileQuery;

  const isSubscribed = Boolean(
    (activeProfileQuery.data?.data as any)?.merchant_profile?.is_subscribed ||
    (activeProfileQuery.data?.data as any)?.vehicle_rental_profile?.is_subscribed
  );

  const isPendingApproval = Boolean(
    activeProfileQuery.data?.data?.kyc?.is_complete && 
    !((activeProfileQuery.data?.data as any)?.merchant_profile?.is_approved || (activeProfileQuery.data?.data as any)?.vehicle_rental_profile?.is_approved)
  );

  // 3. Merchant ID safely extracted
  const profileData = primaryProfileData;
  const merchantId = (activeRole === 'merchant' || activeRole === 'vehicle_rental' || activeRole === 'seller')
    ? (profileData?.data as any)?.user?.id || (profileData?.data as any)?.user_id || (profileData as any)?.user_id
    : (profileData?.data as any)?.user_id || (profileData as any)?.user_id;

  // 4. Products query (shares cache with product.tsx)
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products', merchantId, 'all'],
    queryFn: async () => {
      const response = await productsAPI.getProducts(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        merchantId
      );
      const data = response.data;
      return Array.isArray(data) ? data : (data?.results || []);
    },
    enabled: !!merchantId,
    staleTime: 30 * 1000,
  });

  const totalProductsCount = Array.isArray(allProducts) ? allProducts.length : 0;
  const hasReachedFreeUploadLimit = !isSubscribed && totalProductsCount >= FREE_UPLOAD_LIMIT;

  /**
   * Unified permission check for upload actions.
   * - Shows ProfileCompletionModal if KYC/profile incomplete.
   * - Shows SubscriptionGateModal if free uploads are exhausted.
   * - Returns true only if allowed to proceed.
   */
  const checkUploadPermission = useCallback((): boolean => {
    if (!isProfileComplete || isPendingApproval) {
      setShowProfileModal(true);
      return false;
    }

    if (hasReachedFreeUploadLimit) {
      setShowSubscriptionModal(true);
      return false;
    }

    return true;
  }, [isProfileComplete, isPendingApproval, hasReachedFreeUploadLimit]);

  return {
    isSubscribed,
    isPendingApproval,
    isProfileComplete,
    totalProductsCount,
    hasReachedFreeUploadLimit,
    showSubscriptionModal,
    setShowSubscriptionModal,
    showProfileModal,
    setShowProfileModal,
    checkUploadPermission,
    FREE_UPLOAD_LIMIT,
    roleName: isVehicleRental ? 'vehicle_rental' : 'seller',
    isVehicleRental,
    isSeller,
    merchantId,
  };
};
