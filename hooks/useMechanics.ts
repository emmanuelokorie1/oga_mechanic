import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mechanicAPI } from "@/lib/api/mechanic";

// Query keys for mechanics
export const mechanicKeys = {
  all: ['mechanics'] as const,
  available: () => [...mechanicKeys.all, 'available'] as const,
  nearby: (lat: number, lng: number, radius: number) => [...mechanicKeys.all, 'nearby', lat, lng, radius] as const,
  profile: (id: string) => [...mechanicKeys.all, 'profile', id] as const,
  detail: (id: string) => [...mechanicKeys.all, 'detail', id] as const,
  reviews: (id: string) => [...mechanicKeys.all, 'reviews', id] as const,
};

// Hook to get all available mechanics
export const useGetAvailableMechanics = () => {
  return useQuery({
    queryKey: mechanicKeys.available(),
    queryFn: () => mechanicAPI.getAvailableMechanics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to get nearby mechanics
export const useGetNearbyMechanics = (latitude: number, longitude: number, radius: number = 10) => {
  return useQuery({
    queryKey: mechanicKeys.nearby(latitude, longitude, radius),
    queryFn: () => mechanicAPI.getNearbyMechanics(latitude, longitude, radius),
    enabled: !!latitude && !!longitude,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to get mechanic profile
export const useGetMechanicProfile = (mechanicId: string) => {
  return useQuery({
    queryKey: mechanicKeys.profile(mechanicId),
    queryFn: () => mechanicAPI.getMechanicProfile(mechanicId),
    enabled: !!mechanicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to get mechanic detail
export const useGetMechanicDetail = (mechanicId: string) => {
  return useQuery({
    queryKey: mechanicKeys.detail(mechanicId),
    queryFn: () => mechanicAPI.getMechanicDetail(mechanicId),
    enabled: !!mechanicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to get mechanic reviews
export const useGetMechanicReviews = (mechanicId: string) => {
  return useQuery({
    queryKey: mechanicKeys.reviews(mechanicId),
    queryFn: () => mechanicAPI.getMechanicReviews(mechanicId),
    enabled: !!mechanicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to create mechanic review
export const useCreateMechanicReview = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ mechanicId, payload }: { mechanicId: string; payload: { data: { mechanic_id: string | number; rating: number; comment: string }; requestType?: string } | { rating: number; comment: string; [key: string]: any } }) =>
      mechanicAPI.createMechanicReview(mechanicId, payload),
    onSuccess: (_, variables) => {
      // Invalidate reviews query to refetch updated reviews
      queryClient.invalidateQueries({ queryKey: mechanicKeys.reviews(variables.mechanicId) });
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['repair-request'] });
    },
  });
};

// Hook to update mechanic review (PUT /users/mechanics/{user_id}/reviews/{id}/)
export const useUpdateMechanicReview = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      mechanicId,
      reviewId,
      payload,
    }: {
      mechanicId: string;
      reviewId: string | number;
      payload: { rating: number; comment: string; [key: string]: any } | { data: { rating: number; comment: string }; requestType?: string };
    }) => mechanicAPI.updateMechanicReview(mechanicId, reviewId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mechanicKeys.reviews(variables.mechanicId) });
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['repair-request'] });
    },
  });
};

// Hook to delete mechanic review (DELETE /users/mechanics/{user_id}/reviews/{id}/)
export const useDeleteMechanicReview = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      mechanicId,
      reviewId,
    }: {
      mechanicId: string;
      reviewId: string | number;
    }) => mechanicAPI.deleteMechanicReview(mechanicId, reviewId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mechanicKeys.reviews(variables.mechanicId) });
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['repair-request'] });
    },
  });
};

