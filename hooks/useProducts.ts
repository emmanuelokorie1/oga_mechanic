import { useEffect } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, InfiniteData, keepPreviousData } from '@tanstack/react-query';
import { productsAPI, HomeProductsResponse, ProductDetailResponse, ProductListResponse, CategoryResponse, ProductListAPIResponse, FavoriteProductAPIResponse } from '../lib/api/products';

// Query keys
export const productKeys = {
  all: ['products'] as const,
  home: () => [...productKeys.all, 'home'] as const,
  list: (categoryId?: string, minPrice?: string, maxPrice?: string, type?: string) => [...productKeys.all, 'list', categoryId, minPrice, maxPrice, type] as const,
  search: (query: string, category?: string, minPrice?: string, maxPrice?: string) => [...productKeys.all, 'search', query, category, minPrice, maxPrice] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
  categories: () => [...productKeys.all, 'categories'] as const,
  favorites: () => [...productKeys.all, 'favorites'] as const,
};

// Hooks
export const useHomeProducts = () => {
  return useQuery<HomeProductsResponse, Error>({
    queryKey: productKeys.home(),
    queryFn: () => productsAPI.getHomeProducts(),
    staleTime: 10 * 60 * 1000, // 10 minutes - increased to reduce API calls
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2, // Retry failed requests
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

export const useProductDetail = (id: string) => {
  return useQuery<ProductDetailResponse, Error>({
    queryKey: productKeys.detail(id),
    queryFn: () => productsAPI.getProductDetail(id),
    enabled: !!id, // Only run query if id is provided
    staleTime: 10 * 60 * 1000, // 10 minutes - increased to reduce API calls
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useProducts = (
  categoryId?: number | null,
  minPrice?: string,
  maxPrice?: string
) => {
  return useQuery<ProductListResponse[], Error>({
    queryKey: productKeys.list(categoryId?.toString(), minPrice, maxPrice),
    queryFn: () => productsAPI.getProducts(categoryId, minPrice, maxPrice).then(response => {
      const data = response.data;
      return Array.isArray(data) ? data : (data?.results || []);
    }),
    staleTime: 10 * 60 * 1000, // 10 minutes - increased to reduce API calls
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useProductsInfinite = (
  categoryId?: number | null,
  minPrice?: string,
  maxPrice?: string,
  limit: number = 20,
  enabled: boolean = true
) => {
  return useInfiniteQuery<ProductListAPIResponse, Error, InfiniteData<ProductListAPIResponse>, readonly unknown[], number>({
    queryKey: productKeys.list(categoryId?.toString(), minPrice, maxPrice, 'infinite'),
    queryFn: ({ pageParam }) => productsAPI.getProducts(categoryId, minPrice, maxPrice, pageParam, limit),
    getNextPageParam: (lastPage) => {
      // Check if data is the paginated object and not a direct array
      if (lastPage.data && !Array.isArray(lastPage.data) && lastPage.data.next) {
        // Extract offset from next URL
        const url = new URL(lastPage.data.next);
        const offset = url.searchParams.get('offset');
        return offset ? parseInt(offset, 10) : undefined;
      }
      return undefined;
    },
    initialPageParam: 0,
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - keeps prefetched products fresh
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    refetchOnMount: false, // Don't refetch on mount if data is already fresh
    placeholderData: keepPreviousData,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useCategories = () => {
  return useQuery<CategoryResponse[], Error>({
    queryKey: productKeys.categories(),
    queryFn: () => productsAPI.getCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutes (categories change less frequently)
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Prefetches the first page of shop products and all categories into the React Query cache.
 * Call this upon login, tab mounting, or home screen display so the Shop tab renders instantly without a loader.
 */
export const prefetchShopData = async (queryClient: any) => {
  if (!queryClient) return;
  try {
    const productsPromise = queryClient.prefetchInfiniteQuery({
      queryKey: productKeys.list(undefined, '', '', 'infinite'),
      queryFn: ({ pageParam = 0 }: { pageParam?: unknown }) =>
        productsAPI.getProducts(undefined, '', '', (pageParam as number) || 0, 20),
      initialPageParam: 0,
      getNextPageParam: (lastPage: any) => {
        if (lastPage?.data && !Array.isArray(lastPage.data) && lastPage.data.next) {
          try {
            const url = new URL(lastPage.data.next);
            const offset = url.searchParams.get('offset');
            return offset ? parseInt(offset, 10) : undefined;
          } catch {
            return undefined;
          }
        }
        return undefined;
      },
      pages: 1,
      staleTime: 5 * 60 * 1000,
    });

    const categoriesPromise = queryClient.prefetchQuery({
      queryKey: productKeys.categories(),
      queryFn: () => productsAPI.getCategories(),
      staleTime: 10 * 60 * 1000,
    });

    await Promise.allSettled([productsPromise, categoriesPromise]);
  } catch (error) {
    // Non-blocking prefetch failure
    console.warn('Background shop prefetch encountered an issue:', error);
  }
};

/**
 * Hook to trigger background prefetching of shop products and categories.
 */
export const usePrefetchShop = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    prefetchShopData(queryClient);
  }, [queryClient]);
};

export const useProductSearch = (
  query: string, 
  categoryId?: number | null, 
  enabled: boolean = true,
  minPrice?: string,
  maxPrice?: string
) => {
  // Always enable the query if enabled is true, let the API handle empty queries
  return useQuery<ProductListResponse[], Error>({
    queryKey: productKeys.search(query, categoryId?.toString(), minPrice, maxPrice),
    queryFn: () => productsAPI.searchProducts(query, categoryId, minPrice, maxPrice),
    enabled: enabled, // Simple boolean value only
    staleTime: 2 * 60 * 1000, // 2 minutes (search results can be more dynamic)
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Toggle favorite product mutation
export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ productId, isCurrentlyFavorited }: { productId: string; isCurrentlyFavorited: boolean }) => 
      productsAPI.toggleFavorite(productId, isCurrentlyFavorited),
    onSuccess: () => {
      // Invalidate product queries to refresh data
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error) => {
      console.error('Toggle favorite error:', error);
    },
  });
};

export const useCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentMethod, mobileCallbackUrl }: { paymentMethod: string; mobileCallbackUrl?: string }) =>
      productsAPI.checkout(paymentMethod, mobileCallbackUrl),
    onSuccess: () => {
      // Invalidate cart and product queries to refresh data
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error) => {
      console.error('Checkout error:', error);
    },
  });
};

// Get user's favorite products
export const useFavoriteProducts = () => {
  return useQuery<FavoriteProductAPIResponse, Error>({
    queryKey: productKeys.favorites(),
    queryFn: () => productsAPI.getFavoriteProducts(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useActiveBiddingProducts = () => {
  return useQuery<ProductListAPIResponse, Error>({
    queryKey: [...productKeys.all, 'bidding', 'active'] as const,
    queryFn: () => productsAPI.getActiveBiddingProducts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (previousData) => previousData,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useProductBids = (biddingWindowId: string) => {
  return useQuery<any, Error>({
    queryKey: ['bidding', biddingWindowId, 'bids'] as const,
    queryFn: () => productsAPI.getProductBids(biddingWindowId),
    enabled: !!biddingWindowId,
    staleTime: 1 * 60 * 1000, // 1 minute, bids change fast
  });
}

export const useSubmitBid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, biddingWindow, amount }: { productId: string, biddingWindow: string, amount: number }) =>
      productsAPI.submitBid(biddingWindow, { 
        requestType: 'inbound', 
        bidding_window: biddingWindow,
        amount: amount,
        data: { bidding_window: biddingWindow, amount } 
      }),
    onSuccess: (_, { productId, biddingWindow }) => {
      // Refresh both the product details and the specific bids list
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
      queryClient.invalidateQueries({ queryKey: ['bidding', biddingWindow, 'bids'] });
    },
    onError: (error) => {
      console.error('Submit bid error:', error);
    },
  });
};

export const useMyBids = () => {
  return useQuery<any, Error>({
    queryKey: [...productKeys.all, 'bidding', 'my-bids'] as const,
    queryFn: () => productsAPI.getMyBids(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
export const useUpdateBid = (biddingWindowId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bidId, payload }: { bidId: string; payload: { status?: string; amount?: string; bidding_window?: string } }) =>
      productsAPI.updateBid(bidId, payload),
    onSuccess: () => {
      // Invalidate the specific products bids list
      queryClient.invalidateQueries({ queryKey: ['bidding', biddingWindowId, 'bids'] });
    },
    onError: (error) => {
      console.error('Update bid error:', error);
    },
  });
};

export const useDeleteBid = (biddingWindowId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bidId: string) => productsAPI.deleteBid(bidId),
    onSuccess: () => {
      // Invalidate my bids list
      queryClient.invalidateQueries({ queryKey: [...productKeys.all, 'bidding', 'my-bids'] });
      
      // Invalidate the specific product's bids if window ID is provided
      if (biddingWindowId) {
        queryClient.invalidateQueries({ queryKey: ['bidding', biddingWindowId, 'bids'] });
      }
    },
    onError: (error) => {
      console.error('Delete bid error:', error);
    },
  });
};
