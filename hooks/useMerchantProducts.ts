import { useQuery } from '@tanstack/react-query';
import { productsAPI } from '@/lib/api/products';

// Query keys for merchant products
export const merchantProductKeys = {
  all: ['merchantProducts'] as const,
  lists: () => [...merchantProductKeys.all, 'list'] as const,
  list: (merchantId: string, filters: Record<string, unknown>) => 
    [...merchantProductKeys.lists(), merchantId, { filters }] as const,
  cars: (merchantId: string, categoryId: number, isRental?: boolean) => 
    [...merchantProductKeys.all, 'cars', merchantId, categoryId, isRental ? 'rental' : 'non-rental'] as const,
  spareParts: (merchantId: string, categoryId: number) => 
    [...merchantProductKeys.all, 'spareParts', merchantId, categoryId] as const,
};

// Hook to fetch cars (rental or non-rental)
export const useMerchantCars = (
  merchantId: string,
  carCategoryId: number,
  isRental: boolean = false,
  enabled: boolean = true
) => {
  const logPrefix = isRental ? '[RENTAL CARS]' : '[CARS]';
  return useQuery({
    queryKey: merchantProductKeys.cars(merchantId, carCategoryId, isRental),
    queryFn: async () => {
      const response = await productsAPI.getProducts(
        carCategoryId, // categoryId - filter by car category
        undefined, // minPrice
        undefined, // maxPrice
        undefined, // offset
        undefined, // limit
        merchantId, // merchantId
        isRental // isRental - fetch rental or non-rental cars
      );
      const data = response.data;
      const list = Array.isArray(data) ? data : ((data as any)?.results || []);
      console.log(`✅ ${logPrefix} Fetched products:`, list.length);
      return list;
    },
    enabled: enabled && !!merchantId && !!carCategoryId,
    staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false, // Don't refetch on mount if data exists
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: true, // Only refetch when connection is restored
  });
};

// Hook to fetch spare parts
export const useMerchantSpareParts = (
  merchantId: string,
  sparePartsCategoryId: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: merchantProductKeys.spareParts(merchantId, sparePartsCategoryId),
    queryFn: async () => {
      console.log('🔄 [SPARE PARTS] Fetching for merchant:', merchantId, 'with category:', sparePartsCategoryId);
      
      const response = await productsAPI.getProducts(
        sparePartsCategoryId, // categoryId - filter by spare parts category
        undefined, // minPrice
        undefined, // maxPrice
        undefined, // offset
        undefined, // limit
        merchantId  // merchantId
      );
      
      const data = response.data;
      const list = Array.isArray(data) ? data : ((data as any)?.results || []);
      console.log('✅ [SPARE PARTS] Fetched products:', list.length);
      return list;
    },
    enabled: enabled && !!merchantId && !!sparePartsCategoryId,
    staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false, // Don't refetch on mount if data exists
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: true, // Only refetch when connection is restored
  });
};

// Hook to fetch all rental cars (for public rental car screen)
export const useRentalCars = (
  carCategoryId?: number,
  merchantId?: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['rentalCars', carCategoryId, merchantId],
    queryFn: async () => {
      console.log('🔄 [PUBLIC RENTAL CARS] Fetching with category:', carCategoryId, 'merchant:', merchantId);
      
      const response = await productsAPI.getProducts(
        carCategoryId, // categoryId - filter by car category (optional)
        undefined, // minPrice
        undefined, // maxPrice
        undefined, // offset
        undefined, // limit
        merchantId, // merchantId (optional - if not provided, gets from all merchants)
        true // isRental - fetch only rental cars
      );
      
      const data = response.data;
      const list = Array.isArray(data) ? data : ((data as any)?.results || []);
      return list;
    },
    enabled: enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes for public data
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false, // Don't refetch on mount if data exists
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: true, // Only refetch when connection is restored
  });
};

// Convenience hook that combines all merchant product queries
export const useAllMerchantProducts = (
  merchantId: string,
  carCategoryId: number,
  sparePartsCategoryId: number,
  enabled: boolean = true
) => {
  const cars = useMerchantCars(merchantId, carCategoryId, false, enabled);
  const rentalCars = useMerchantCars(merchantId, carCategoryId, true, enabled);
  const spareParts = useMerchantSpareParts(merchantId, sparePartsCategoryId, enabled);

  return {
    // Individual queries
    cars,
    rentalCars,
    spareParts,
    
    // Combined data
    allProducts: [
      ...(cars.data || []),
      ...(rentalCars.data || []),
      ...(spareParts.data || [])
    ],
    
    // Combined loading states
    isLoading: cars.isLoading || rentalCars.isLoading || spareParts.isLoading,
    isLoadingAny: cars.isLoading || rentalCars.isLoading || spareParts.isLoading,
    isLoadingAll: cars.isLoading && rentalCars.isLoading && spareParts.isLoading,
    
    // Combined error states
    hasError: !!cars.error || !!rentalCars.error || !!spareParts.error,
    errors: {
      cars: cars.error,
      rentalCars: rentalCars.error,
      spareParts: spareParts.error,
    },
    
    // Combined refetch
    refetchAll: async () => {
      await Promise.all([
        cars.refetch(),
        rentalCars.refetch(),
        spareParts.refetch(),
      ]);
    },
  };
};
