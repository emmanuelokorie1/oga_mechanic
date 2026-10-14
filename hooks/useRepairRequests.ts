import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router/react-navigation';
import { mechanicAPI } from '@/lib/api/mechanic';
import { useUserStore } from '@/stores/userStore';

// Hook to fetch repair requests
export const useRepairRequests = (
  status?: string, 
  enabled: boolean = true,
  options?: { refetchInterval?: number | false }
) => {
  const token = useUserStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['mechanic', 'repair-requests', status || 'all'],
    queryFn: () => mechanicAPI.getRepairRequests(status),
    enabled: enabled && !!token,
    staleTime: 60 * 1000, // 60s cache freshness prevents repeated spam
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Prevent focus storm
    refetchOnReconnect: true,
    refetchInterval: options?.refetchInterval ?? false,
    networkMode: 'online',
  });
};

// Hook to fetch mechanic analytics
export const useMechanicAnalytics = (enabled: boolean = true) => {
  const token = useUserStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['mechanic', 'analytics'],
    queryFn: () => mechanicAPI.getMechanicAnalytics(),
    enabled: enabled && !!token,
    staleTime: 60 * 1000, // 60s cache freshness
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: 'online',
  });
};

// Hook to accept repair request
export const useAcceptRepairRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (requestId: string) => mechanicAPI.acceptRepairRequest(requestId),
    onSuccess: (_, requestId) => {
      // Invalidate and refetch all related repair request queries
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['repair-request', requestId] });
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'analytics'] });
    },
  });
};

// Hook to decline repair request
export const useDeclineRepairRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (requestId: string) => mechanicAPI.declineRepairRequest(requestId),
    onSuccess: (_, requestId) => {
      // Invalidate and refetch all related repair request queries
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['repair-request', requestId] });
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'analytics'] });
    },
  });
};

// Hook to fetch user's repair requests
export const useUserRepairRequests = (
  status?: string, 
  enabled: boolean = true,
  options?: { refetchInterval?: number | false }
) => {
  const token = useUserStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['user', 'repair-requests', status || 'all'],
    queryFn: () => mechanicAPI.getUserRepairRequests(status),
    enabled: enabled && !!token,
    staleTime: options?.refetchInterval ? 0 : 60 * 1000,
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    placeholderData: (previousData) => previousData,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: options?.refetchInterval ?? false,
    networkMode: 'online',
  });
};

// Hook to fetch repair request detail by ID with smart status-aware polling
export const useRepairRequestDetail = (requestId: string | undefined, pollInterval?: number) => {
  const token = useUserStore((state) => state.accessToken);
  const isFocused = useIsFocused();

  return useQuery({
    queryKey: ['repair-request', requestId],
    queryFn: () => mechanicAPI.getRepairRequestDetail(requestId!),
    enabled: !!requestId && !!token && isFocused,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: (query) => {
      // If the screen is not currently visible/focused (e.g. user pushed Chat, Settings, etc.), STOP ALL POLLING!
      if (!token || !isFocused) return false;

      // If caller explicitly configured an interval
      if (pollInterval !== undefined) {
        return pollInterval > 0 ? pollInterval : false;
      }

      // Smart status-based polling:
      const data = query.state.data as any;
      const status = (data?.data?.status || data?.status || '').toLowerCase();
      
      // Live GPS coordinate tracking for map while mechanic is actively traveling to customer:
      if (status === 'in_transit') return 8000;
      
      // All other statuses (pending, accepted, arrived, in_progress, completed, verified)
      // are delivered instantly via WebSocket events. No polling spam!
      return false;
    },
    networkMode: 'online',
  });
};

// Hook to update repair request
export const useUpdateRepairRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, payload }: { requestId: string; payload: any }) =>
      mechanicAPI.updateRepairRequest(requestId, payload),
    onSuccess: (_, variables) => {
      // Invalidate active repair request detail
      queryClient.invalidateQueries({ queryKey: ['repair-request', variables.requestId], refetchType: 'active' });
      // Invalidate active repair requests lists
      queryClient.invalidateQueries({ queryKey: ['user', 'repair-requests'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'repair-requests'], refetchType: 'active' });
    },
  });
};

// Hook to update repair request status (e.g., in_transit, in_progress)
export const useUpdateRepairRequestStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: string }) =>
      mechanicAPI.updateRepairRequestStatus(requestId, status),
    onSuccess: (_, variables) => {
      // Invalidate and refetch all related repair request queries
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['repair-request', variables.requestId] });
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'analytics'] });
    },
  });
};

// Hook to cancel repair request (for mechanics after accepting)
export const useCancelRepairRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      mechanicAPI.cancelRepairRequest(requestId, reason),
    onSuccess: (_, variables) => {
      // Invalidate and refetch all related repair request queries
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['repair-request', variables.requestId] });
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'analytics'] });
    },
  });
};

// Hook to verify repair request OTP
export const useVerifyRepairRequestOtp = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, otpCode }: { requestId: string; otpCode: string }) =>
      mechanicAPI.verifyRepairRequestOtp(requestId, otpCode),
    onSuccess: (_, variables) => {
      // Invalidate and refetch repair request detail
      queryClient.invalidateQueries({ queryKey: ['repair-request', variables.requestId] });
      // Invalidate both user and mechanic repair requests list
      queryClient.invalidateQueries({ queryKey: ['user', 'repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'repair-requests'] });
    },
  });
};

// Hook to verify repair completion (from user part)
export const useVerifyRepairCompletion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (requestId: string) => mechanicAPI.verifyRepairCompletion(requestId),
    onSuccess: (_, requestId) => {
      // Invalidate and refetch all related repair request queries
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['repair-request', requestId] });
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'analytics'] });
    },
  });
};

