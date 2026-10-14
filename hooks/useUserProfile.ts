import React from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { userAPI, PrimaryUserProfileResponse, UserRolesResponse, UserProfile, MerchantProfileResponse, BanksResponse, BankEnquiryRequest, BankEnquiryResponse, AddBankAccountRequest, UserBankAccountResponse, MechanicProfileResponse, WalletResponse, UserEarningsResponse, WithdrawalResponse, WithdrawalFilters, WithdrawalRequestData, UserBankAccountsResponse, VehicleRentalProfileResponse } from '@/lib/api/user';
import { mechanicAPI } from '@/lib/api/mechanic';
import { communicationsAPI, extractChatRooms } from '@/lib/api/communications';
import { useMechanicStore } from '@/stores/mechanicStore';
import { useUserStore } from '@/stores/userStore';

// Query key factory
export const userProfileKeys = {
  all: ['userProfile'] as const,
  primary: () => [...userProfileKeys.all, 'primary'] as const,
  merchant: () => [...userProfileKeys.all, 'merchant'] as const,
  merchantByUuid: (uuid: string) => [...userProfileKeys.all, 'merchant', 'uuid', uuid] as const,
  profile: () => [...userProfileKeys.all, 'profile'] as const,
  roles: () => [...userProfileKeys.all, 'roles'] as const,
  notifications: () => [...userProfileKeys.all, 'notifications'] as const,
  banks: () => [...userProfileKeys.all, 'banks'] as const,
  bankAccounts: () => [...userProfileKeys.all, 'bankAccounts'] as const,
  mechanic: () => [...userProfileKeys.all, 'mechanic'] as const,
  wallet: () => [...userProfileKeys.all, 'wallet'] as const,
  earnings: () => [...userProfileKeys.all, 'earnings'] as const,
  withdrawals: () => [...userProfileKeys.all, 'withdrawals'] as const,
  vehicleRental: () => [...userProfileKeys.all, 'vehicleRental'] as const,
  cars: () => [...userProfileKeys.all, 'cars'] as const,
};

// Hook to get primary user profile
export const usePrimaryUserProfile = (enabled: boolean = true) => {
  const token = useUserStore((state) => state.accessToken);
  return useQuery<PrimaryUserProfileResponse>({
    queryKey: userProfileKeys.primary(),
    queryFn: userAPI.getPrimaryProfile,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Reduce retries
    enabled: enabled && !!token, // Only fetch when enabled and authenticated
    refetchOnMount: "always", // Force refetch on mount to override global defaults
    refetchOnWindowFocus: true, // Refetch on focus for critical profile data
  });
};

// Hook to get merchant profile (only when enabled)
export const useMerchantProfile = (enabled: boolean = true) => {
  return useQuery<MerchantProfileResponse>({
    queryKey: userProfileKeys.merchant(),
    queryFn: userAPI.getMerchantProfile,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
    enabled: enabled,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
};

// Hook to get vehicle rental profile (only when enabled)
export const useVehicleRentalProfile = (enabled: boolean = true) => {
  return useQuery<VehicleRentalProfileResponse>({
    queryKey: userProfileKeys.vehicleRental(),
    queryFn: userAPI.getVehicleRentalProfile,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
    enabled: enabled,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
};

// Hook to get mechanic profile (only when enabled)
export const useMechanicProfile = (enabled: boolean = true) => {
  return useQuery<MechanicProfileResponse>({
    queryKey: userProfileKeys.mechanic(),
    queryFn: () => userAPI.getMechanicProfile(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: enabled, // Only fetch when enabled
    retry: 1, // Reduce retries
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
};



// Hook to get merchant profile by UUID
export const useMerchantProfileByUuid = (merchantUuid: string, enabled: boolean = true) => {
  return useQuery<MerchantProfileResponse>({
    queryKey: userProfileKeys.merchantByUuid(merchantUuid),
    queryFn: () => userAPI.getMerchantProfileByUuid(merchantUuid),
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    enabled: enabled && !!merchantUuid,
  });
};

// Hook to get the appropriate profile based on active role
export const useActiveRoleProfile = () => {
  // Seed the active role from AsyncStorage immediately to avoid a flash of the
  // wrong UI while the primary profile API call is still in-flight.
  // 'current_active_role' is always written on login and role switch.
  const [storedRole, setStoredRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
      AsyncStorage.getItem('current_active_role').then((role) => {
        if (!cancelled && role) setStoredRole(role);
      });
    });
    return () => { cancelled = true; };
  }, []);

  // Primary profile from API (source of truth once loaded)
  const primaryProfile = usePrimaryUserProfile();
  const activeRoleData =
    primaryProfile.data?.active_role ||
    primaryProfile.data?.data?.active_role ||
    primaryProfile.data?.data?.current_role;
  const apiRole = typeof activeRoleData === 'object' ? activeRoleData?.name : activeRoleData;

  // Use API role when available; fall back to AsyncStorage seed during the loading window
  const activeRole = apiRole || storedRole || undefined;

  // Role-specific profile flags
  const isVehicleRental = activeRole === 'vehicle_rental';
  const isMerchant = activeRole === 'merchant' || activeRole === 'seller';
  const isMechanic = activeRole === 'mechanic' || activeRole === 'Mechanic';

  // Fetch role-specific profiles conditionally
  const vehicleRentalProfile = useVehicleRentalProfile(isVehicleRental);
  const merchantProfile = useMerchantProfile(isMerchant);
  const mechanicProfile = useMechanicProfile(isMechanic);

  // Consolidated loading/fetching/error states
  const isFetching = primaryProfile.isFetching ||
    (isVehicleRental && vehicleRentalProfile.isFetching) ||
    (isMerchant && merchantProfile.isFetching) ||
    (isMechanic && mechanicProfile.isFetching);

  const isLoading = primaryProfile.isLoading ||
    (isVehicleRental && vehicleRentalProfile.isLoading) ||
    (isMerchant && merchantProfile.isLoading) ||
    (isMechanic && mechanicProfile.isLoading);

  const error = primaryProfile.error ||
    (isMerchant ? merchantProfile.error :
    (isMechanic ? mechanicProfile.error : null));

  const refetch = async () => {
    await primaryProfile.refetch();
    if (isVehicleRental) await vehicleRentalProfile.refetch();
    if (isMerchant) await merchantProfile.refetch();
    if (isMechanic) await mechanicProfile.refetch();
  };

  // Return the appropriate role-specific profile data only when fully loaded
  let data: any = null;
  if (isVehicleRental && vehicleRentalProfile.data) data = vehicleRentalProfile.data;
  else if (isMerchant && merchantProfile.data) data = merchantProfile.data;
  else if (isMechanic && mechanicProfile.data) data = mechanicProfile.data;

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    activeRole,
    isMerchant,
    isVehicleRental,
    isMechanic,
    primaryProfileData: primaryProfile.data,
  };
};

// Hook to get user profile
export const useUserProfile = () => {
  return useQuery({
    queryKey: userProfileKeys.profile(),
    queryFn: userAPI.getProfile,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
};

// Hook to get role-specific user profile (now uses primary profile for all roles)
export const useRoleUserProfile = (role?: string) => {
  return useQuery<UserProfile | MerchantProfileResponse>({
    queryKey: [...userProfileKeys.profile(), 'primary'], // Use 'primary' instead of role
    queryFn: () => userAPI.getRoleProfile(role),
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    // Remove enabled condition since we always want to fetch profile
  });
};

// Hook to get user roles
export const useUserRoles = (options?: { enabled?: boolean }) => {
  return useQuery<UserRolesResponse>({
    queryKey: userProfileKeys.roles(),
    queryFn: userAPI.getUserRoles,
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

// Hook to update user profile
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userAPI.updateProfile,
    onSuccess: (data) => {
      // Invalidate and refetch all user profile queries
      queryClient.invalidateQueries({ queryKey: userProfileKeys.all });
      console.log('✅ Profile updated successfully:', data);
    },
    onError: (error) => {
      console.error('❌ Error updating profile:', error);
    },
  });
};

// Hook to submit merchant KYC
export const useSubmitMerchantKYC = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userAPI.submitMerchantKYC,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userProfileKeys.all });
      console.log('✅ Merchant KYC submitted successfully');
    },
    onError: (error) => {
      console.error('❌ Error submitting merchant KYC:', error);
    },
  });
};

// Hook to submit vehicle rental KYC
export const useSubmitVehicleRentalKYC = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userAPI.submitVehicleRentalKYC,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userProfileKeys.all });
      console.log('✅ Vehicle Rental KYC submitted successfully');
    },
    onError: (error) => {
      console.error('❌ Error submitting vehicle rental KYC:', error);
    },
  });
};

// Hook to submit mechanic KYC
export const useSubmitMechanicKYC = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userAPI.submitMechanicKYC,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userProfileKeys.all });
      console.log('✅ Mechanic KYC submitted successfully');
    },
    onError: (error) => {
      console.error('❌ Error submitting mechanic KYC:', error);
    },
  });
};

// Hook to submit vehicle expertise
export const useSubmitVehicleExpertise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expertise: any[]) => mechanicAPI.createVehicleExpertise(expertise),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userProfileKeys.all });
      queryClient.invalidateQueries({ queryKey: ["vehicleExpertise"] });
      console.log('✅ Vehicle expertise submitted successfully');
    },
    onError: (error) => {
      console.error('❌ Error submitting vehicle expertise:', error);
    },
  });
};



// Hook to switch user role
export const useSwitchRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleName: string) => userAPI.switchRole(roleName),
    onSuccess: (data, roleName) => {
      // Clear all cache and global UI stores on role switch
      queryClient.clear();
      useMechanicStore.getState().reset();
      
      console.log(`✅ Role switched to ${roleName} successfully`);
    },
    onError: (error) => {
      console.error('❌ Error switching role:', error);
    },
  });
};

// Hook to get unread notification count efficiently
export const useUnreadNotificationCount = (options?: { enabled?: boolean }) => {
  const token = useUserStore((state) => state.accessToken);
  return useQuery({
    queryKey: [...userProfileKeys.notifications(), 'unread-count', 'general'],
    queryFn: () => userAPI.getNotifications(0, 1, { is_read: false, category: 'general' }),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: (options?.enabled ?? true) && !!token,
    select: (data) => data?.data?.count ?? data?.count ?? 0,
  });
};

// Hook to get total unread chat messages count across all chat rooms
export const useUnreadChatCount = (options?: { enabled?: boolean }) => {
  const token = useUserStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['chatRooms'],
    queryFn: () => communicationsAPI.getChatRooms(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: (options?.enabled ?? true) && !!token,
    refetchOnMount: true,
    select: (data) => {
      const rooms = extractChatRooms(data);
      return rooms.reduce((acc: number, room: any) => acc + (Number(room.unread_count) || 0), 0);
    },
  });
};

// Hook to get a single notification's details
export const useNotificationDetail = (id: string | number) => {
  return useQuery({
    queryKey: [...userProfileKeys.notifications(), 'detail', id],
    queryFn: () => userAPI.getNotification(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
};

// Hook for infinite scrolling notifications
export const useInfiniteNotifications = (filters?: { category?: string; is_read?: boolean }) => {
  return useInfiniteQuery({
    queryKey: [...userProfileKeys.notifications(), 'infinite', filters],
    queryFn: ({ pageParam = 0 }) => userAPI.getNotifications(pageParam, 15, filters),
    getNextPageParam: (lastPage, allPages) => {
      // API returns response.data inside lastPage, so the actual paginated data is in lastPage?.data
      const pageData = lastPage?.data || lastPage;
      if (pageData?.next) {
        return allPages.length * 15;
      }
      return undefined;
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000,
  });
};

// Hook to mark a notification as read
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => userAPI.markNotificationAsRead(id),
    onSuccess: () => {
      // Invalidate and refetch notifications
      queryClient.invalidateQueries({ queryKey: userProfileKeys.notifications() });
    },
    onError: (error) => {
      console.error('❌ Error marking notification as read:', error);
    },
  });
};

// Hook to mark all notifications as read
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userAPI.markAllNotificationsAsRead,
    onSuccess: () => {
      // Invalidate and refetch notifications
      queryClient.invalidateQueries({ queryKey: userProfileKeys.notifications() });
    },
    onError: (error) => {
      console.error('❌ Error marking all notifications as read:', error);
    },
  });
};

// Hook to follow a merchant
export const useFollowMerchant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userAPI.followMerchant,
    onSuccess: (_, merchantId) => {
      // Invalidate and refetch specific merchant profile
      queryClient.invalidateQueries({ queryKey: userProfileKeys.merchantByUuid(merchantId) });
      // Also invalidate general merchant queries if necessary
      queryClient.invalidateQueries({ queryKey: userProfileKeys.merchant() });
      // Invalidate followed merchants list
      queryClient.invalidateQueries({ queryKey: ['followedMerchants'] });
    },
    onError: (error) => {
      console.error('❌ Error following merchant:', error);
    },
  });
};

// Hook to unfollow a merchant
export const useUnfollowMerchant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userAPI.unfollowMerchant,
    onSuccess: (_, merchantId) => {
      // Invalidate and refetch specific merchant profile
      queryClient.invalidateQueries({ queryKey: userProfileKeys.merchantByUuid(merchantId) });
      // Also invalidate general merchant queries if necessary
      queryClient.invalidateQueries({ queryKey: userProfileKeys.merchant() });
      // Invalidate followed merchants list
      queryClient.invalidateQueries({ queryKey: ['followedMerchants'] });
    },
    onError: (error) => {
      console.error('❌ Error unfollowing merchant:', error);
    },
  });
};

// Hook to get followed merchants
export const useFollowedMerchants = () => {
  return useQuery({
    queryKey: ['followedMerchants'],
    queryFn: userAPI.getFollowedMerchants,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
};

// Hook to get list of banks
export const useBanks = (enabled: boolean = true) => {
  return useQuery<BanksResponse>({
    queryKey: userProfileKeys.banks(),
    queryFn: userAPI.getBanks,
    staleTime: 24 * 60 * 60 * 1000, // Banks don't change often, keep for 24 hours
    retry: 2,
    enabled: enabled,
  });
};

// Hook to get user bank accounts
export const useBankAccounts = (enabled: boolean = true) => {
  return useQuery({
    queryKey: userProfileKeys.bankAccounts(),
    queryFn: userAPI.getBankAccounts,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    enabled: enabled,
  });
};

// Hook to get a single bank account
export const useBankAccount = (id: number | string, enabled: boolean = true) => {
  return useQuery<UserBankAccountResponse>({
    queryKey: [...userProfileKeys.bankAccounts(), id],
    queryFn: () => userAPI.getBankAccountById(id),
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    enabled: enabled && !!id,
  });
};

// Hook to get wallet details
export const useWallet = (enabled: boolean = true) => {
  return useQuery<WalletResponse>({
    queryKey: userProfileKeys.wallet(),
    queryFn: userAPI.getWallet,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    enabled: enabled,
  });
};

// Hook to get consolidated earnings
export const useEarnings = (enabled: boolean = true) => {
  return useQuery<UserEarningsResponse>({
    queryKey: userProfileKeys.earnings(),
    queryFn: userAPI.getEarnings,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    enabled: enabled,
  });
};

// Hook to get withdrawal history
export const useWithdrawals = (filters?: WithdrawalFilters, enabled: boolean = true) => {
  return useQuery<WithdrawalResponse>({
    queryKey: [...userProfileKeys.withdrawals(), filters],
    queryFn: () => userAPI.getWithdrawals(filters),
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    enabled: enabled,
  });
};

// Hook to perform a withdrawal
export const useWithdrawFunds = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WithdrawalRequestData) => userAPI.withdrawFunds(data),
    onSuccess: () => {
      // Invalidate both wallet and withdrawals history to refetch latest data
      queryClient.invalidateQueries({ queryKey: userProfileKeys.wallet() });
      queryClient.invalidateQueries({ queryKey: userProfileKeys.withdrawals() });
      queryClient.invalidateQueries({ queryKey: userProfileKeys.earnings() });
    },
    onError: (error) => {
      console.error('❌ Error withdrawing funds:', error);
    },
  });
};

// Hook to verify bank account
export const useVerifyBank = () => {
  return useMutation<BankEnquiryResponse, Error, BankEnquiryRequest>({
    mutationFn: (data: BankEnquiryRequest) => userAPI.verifyBank(data),
    onError: (error) => {
      console.error('❌ Error verifying bank account:', error);
    },
  });
};

// Hook to add a bank account
export const useAddBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<UserBankAccountResponse, Error, AddBankAccountRequest>({
    mutationFn: (data: AddBankAccountRequest) => userAPI.addBankAccount(data),
    onSuccess: () => {
      // Invalidate and refetch bank accounts immediately
      queryClient.invalidateQueries({ 
        queryKey: userProfileKeys.bankAccounts(),
        refetchType: 'all'
      });
      console.log('✅ Bank account added successfully');
    },
    onError: (error: any) => {
      console.error('❌ Error adding bank account:', error);
    },
  });
};

// Hook to delete a bank account
export const useDeleteBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => userAPI.deleteBankAccount(id),
    onSuccess: () => {
      // Invalidate and refetch bank accounts
      queryClient.invalidateQueries({ queryKey: userProfileKeys.bankAccounts() });
      console.log('✅ Bank account deleted successfully');
    },
    onError: (error: any) => {
      console.error('❌ Error deleting bank account:', error);
    },
  });
};

// Hook to update a bank account (e.g., set as default)
export const useUpdateBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<AddBankAccountRequest['data']> }) =>
      userAPI.updateBankAccount(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate and refetch all bank account queries
      queryClient.invalidateQueries({ queryKey: userProfileKeys.bankAccounts() });
      console.log(`✅ Bank account ${id} updated successfully`);
    },
    onError: (error: any) => {
      console.error('❌ Error updating bank account:', error);
    },
  });
};

// Hook to get user cars (Vehicle List)
export const useUserCars = (enabled: boolean = true) => {
  return useQuery({
    queryKey: userProfileKeys.cars(),
    queryFn: () => userAPI.getCars(),
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    enabled: enabled,
  });
};
