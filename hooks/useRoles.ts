import { useQuery } from '@tanstack/react-query';
import { rolesAPI, Role } from '@/lib/api/roles';

// Query keys for roles
export const rolesQueryKeys = {
  all: ['roles'] as const,
  lists: () => [...rolesQueryKeys.all, 'list'] as const,
  list: (filters: string) => [...rolesQueryKeys.lists(), { filters }] as const,
};

// useRoles hook
export const useRoles = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: rolesQueryKeys.lists(),
    queryFn: rolesAPI.getRoles,
    enabled: options?.enabled ?? true,
    staleTime: 10 * 60 * 1000, // 10 minutes - roles don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    retry: 1, // Reduce retries to prevent excessive calls
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on mount if data exists
    refetchOnReconnect: false, // Don't refetch on reconnect for roles (they rarely change)
    networkMode: 'online', // Only fetch when online
  });
};

// useRoleById hook (for future use)
export const useRoleById = (id: number) => {
  return useQuery({
    queryKey: [...rolesQueryKeys.all, 'detail', id],
    queryFn: () => rolesAPI.getRoles().then(roles => roles.find(role => role.id === id)),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Export types
export type { Role };
