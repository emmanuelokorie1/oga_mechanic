import { useQuery } from '@tanstack/react-query';
import { mechanicAPI, ServiceType } from '../lib/api/mechanic';

export interface ServiceTypeOption {
  label: string;
  value: string;
  name: string;
}

export const useServiceTypes = () => {
  const query = useQuery({
    queryKey: ['service-types'],
    queryFn: () => mechanicAPI.getServiceTypes(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    networkMode: 'online',
  });

  const rawResults: ServiceType[] = query.data?.results || [];

  const serviceTypes: ServiceTypeOption[] = rawResults.map((service: ServiceType) => {
    const vehicleInfo = service.vehicle_make_name && service.vehicle_model_name 
      ? `${service.vehicle_make_name} - ${service.vehicle_model_name}`
      : service.vehicle_make_name 
      ? `${service.vehicle_make_name} - All Models`
      : 'All Models';
    
    return {
      label: `${service.name} (${vehicleInfo})`,
      value: service.id,
      name: service.name,
    };
  });

  return {
    ...query,
    serviceTypes,
    loading: query.isLoading,
    error: query.error ? (query.error as any).message || 'Failed to fetch service types' : null,
    refetch: query.refetch,
  };
};

