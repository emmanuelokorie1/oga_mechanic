import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useErrorHandler } from './useErrorHandler';

interface ApiQueryOptions<TData = unknown, TError = Error> extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  // Custom options for our API queries
  enableRetry?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  cacheTime?: number;
  staleTime?: number;
}

type ApiQueryResult<TData = unknown, TError = Error> = UseQueryResult<TData, TError> & {
  // Additional properties for error handling
  errorInfo?: ReturnType<typeof useErrorHandler>['parseError'] extends (error: any) => infer R ? R : never;
  canRetry: boolean;
  shouldShowTroubleshooting: boolean;
};

/**
 * Enhanced useQuery hook with built-in error handling and retry logic
 * Use this instead of useQuery directly for consistent error handling across the app
 */
export const useApiQuery = <TData = unknown, TError = Error>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options: ApiQueryOptions<TData, TError> = {}
): ApiQueryResult<TData, TError> => {
  const { parseError, shouldShowTroubleshooting } = useErrorHandler();

  const {
    enableRetry = true,
    retryAttempts = 2,
    retryDelay = 1000,
    cacheTime = 10 * 60 * 1000, // 10 minutes
    staleTime = 5 * 60 * 1000,  // 5 minutes
    ...queryOptions
  } = options;

  const queryResult = useQuery<TData, TError>({
    queryKey,
    queryFn,
    retry: enableRetry ? retryAttempts : false,
    retryDelay: (attemptIndex) => Math.min(retryDelay * 2 ** attemptIndex, 30000),
    gcTime: cacheTime,
    staleTime,
    refetchOnMount: false, // Don't refetch on mount if data exists
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: true, // Only refetch when connection is restored
    ...queryOptions, // Allow individual queries to override these defaults
  });

  // Parse error information
  const errorInfo = queryResult.error ? parseError(queryResult.error) : undefined;
  const canRetry = errorInfo?.canRetry ?? true;
  const shouldShowTroubleshootingGuide = errorInfo ? shouldShowTroubleshooting(errorInfo.type) : false;

  return {
    ...queryResult,
    errorInfo,
    canRetry,
    shouldShowTroubleshooting: shouldShowTroubleshootingGuide,
  };
};

/**
 * Preset configurations for common API query patterns
 */
export const apiQueryPresets = {
  // For frequently changing data (orders, notifications)
  realtime: {
    staleTime: 30 * 1000,     // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: false, // Disabled by default - enable manually if needed
  },

  // For moderately changing data (analytics, products)
  standard: {
    staleTime: 5 * 60 * 1000,  // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  },

  // For rarely changing data (categories, user profile)
  stable: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
  },

  // For critical data that should always be fresh
  critical: {
    staleTime: 0,              // Always stale
    cacheTime: 5 * 60 * 1000,  // 5 minutes
    retryAttempts: 3,
  },
};

export default useApiQuery;
