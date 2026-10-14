import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mechanicAPI, CarDetails, RepairRequestPayload } from '../lib/api/mechanic';
import { useMechanicStore } from '../stores/mechanicStore';

// Query keys
export const mechanicKeys = {
  all: ['mechanics'] as const,
  lists: () => [...mechanicKeys.all, 'list'] as const,
  list: (filters: string) => [...mechanicKeys.lists(), { filters }] as const,
  details: () => [...mechanicKeys.all, 'detail'] as const,
  detail: (id: string) => [...mechanicKeys.details(), id] as const,
  nearby: (lat: number, lng: number, radius: number) => 
    [...mechanicKeys.all, 'nearby', lat, lng, radius] as const,
  specializations: () => [...mechanicKeys.all, 'specializations'] as const,
};

// Hooks
export const useFindMechanics = () => {
  const queryClient = useQueryClient();
  const { setSearchResults, loading, error, searchResults } = useMechanicStore();

  const mutation = useMutation({
    mutationFn: (carDetails: CarDetails) => mechanicAPI.findMechanic(carDetails),
    onSuccess: (data) => {
      // Update Zustand store
      setSearchResults(data.mechanics);
      
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: mechanicKeys.lists() });
    },
    onError: (error: any) => {
      console.error('Error finding mechanics:', error);
    },
  });

  return {
    findMechanics: mutation.mutate,
    isLoading: mutation.isPending || loading,
    error: mutation.error?.message || error,
    mechanics: searchResults,
    isSuccess: mutation.isSuccess,
  };
};

export const useMechanicProfile = (mechanicId: string) => {
  return useQuery({
    queryKey: mechanicKeys.detail(mechanicId),
    queryFn: () => mechanicAPI.getMechanicProfile(mechanicId),
    enabled: !!mechanicId,
  });
};

export const useNearbyMechanics = (latitude: number, longitude: number, radius: number = 10) => {
  return useQuery({
    queryKey: mechanicKeys.nearby(latitude, longitude, radius),
    queryFn: () => mechanicAPI.getNearbyMechanics(latitude, longitude, radius),
    enabled: !!latitude && !!longitude,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAvailableMechanics = () => {
  return useQuery({
    queryKey: [...mechanicKeys.all, 'available'],
    queryFn: () => mechanicAPI.getAvailableMechanics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useBookMechanic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mechanicId, bookingDetails }: { mechanicId: string; bookingDetails: any }) =>
      mechanicAPI.bookMechanic(mechanicId, bookingDetails),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: mechanicKeys.lists() });
    },
  });
};

export const useCreateRepairRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RepairRequestPayload) => mechanicAPI.createRepairRequest(payload),
    onSuccess: () => {
      // Invalidate both user and mechanic repair requests list
      queryClient.invalidateQueries({ queryKey: ['user', 'repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'repair-requests'] });
    },
  });
};

export const useMechanicReviews = (mechanicId: string) => {
  return useQuery({
    queryKey: [...mechanicKeys.detail(mechanicId), 'reviews'],
    queryFn: () => mechanicAPI.getMechanicReviews(mechanicId),
    enabled: !!mechanicId,
  });
};

export const useSpecializations = () => {
  return useQuery({
    queryKey: mechanicKeys.specializations(),
    queryFn: () => mechanicAPI.getSpecializations(),
    staleTime: 24 * 60 * 60 * 1000, // Specializations don't change often
  });
};

export { useCreateMechanicReview, useUpdateMechanicReview, useDeleteMechanicReview } from './useMechanics';

