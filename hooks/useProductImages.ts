import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { productsAPI } from '@/lib/api/products';

interface UseProductImagesProps {
  productId: string;
  merchantId?: string;
}

export const useProductImages = ({ productId, merchantId }: UseProductImagesProps) => {
  const queryClient = useQueryClient();

  // Query to fetch product data
  const {
    data: productData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) {
        console.warn('⚠️ [useProductImages] No productId provided for getProductDetail');
        return null;
      }
      return await productsAPI.getProductDetail(productId);
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false, // Don't refetch on mount if data exists
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: true // Only refetch when connection is restored
  });

  // Query to fetch products list
  const {
    data: productsData,
    isLoading: isLoadingProducts,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['products', merchantId, 'all'], // Use 'all' to distinguish from filtered views
    queryFn: async () => {
      const response = await productsAPI.getProducts(
        undefined, // categoryId
        undefined, // minPrice
        undefined, // maxPrice
        undefined, // offset
        undefined, // limit
        merchantId  // merchantId
      );
      const data = response.data;
      return Array.isArray(data) ? data : ((data as any)?.results || []);
    },
    enabled: !!merchantId, // Only fetch when we have merchantId
    staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false, // Don't refetch on mount if data exists
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: true // Only refetch when connection is restored
  });

  // Helper to invalidate all related queries
  const invalidateQueries = async () => {
    try {
      queryClient.removeQueries({ queryKey: ['product', productId] });
      await queryClient.refetchQueries({ 
        queryKey: ['product', productId],
        type: 'active'
      });
      
      queryClient.removeQueries({ queryKey: ['products', merchantId] });
      queryClient.removeQueries({ queryKey: ['products', merchantId, 'all'] });
      queryClient.removeQueries({ queryKey: ['products', merchantId, 'cars'] });
      queryClient.removeQueries({ queryKey: ['products', merchantId, 'spareParts'] });
      
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['products', merchantId], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['products', merchantId, 'all'], type: 'active' }),
      ]);
    } catch (err) {
      console.warn('⚠️ [useProductImages] Cache invalidation warning:', err);
    }
  };

  // Mutation to upload image
  const uploadImage = useMutation({
    mutationFn: async (imageUri: string) => {
      if (!productId) {
        console.error('❌ [useProductImages] Cannot upload image: productId is missing or empty');
        throw new Error('Product ID is missing');
      }
      console.log(`📤 [useProductImages] Starting upload for product ${productId}...`);
      return await productsAPI.uploadProductImage(productId, imageUri);
    },
    onSuccess: async (data) => {
      console.log('✅ [useProductImages] Upload image succeeded:', data);
      await invalidateQueries();
    },
    onError: (error: any) => {
      console.error('❌ [useProductImages] uploadImage mutation error:', error?.response?.data || error?.message || error);
    },
  });

  // Mutation to delete image
  const deleteImage = useMutation({
    mutationFn: async (imageId: number) => {
      if (!productId) {
        console.error('❌ [useProductImages] Cannot delete image: productId is missing or empty');
        throw new Error('Product ID is missing');
      }
      return await productsAPI.deleteProductImage(productId, imageId);
    },
    onSuccess: async () => {
      await invalidateQueries();
      Alert.alert('Success', 'Image deleted successfully');
    },
    onError: (error: any) => {
      console.error('❌ [useProductImages] deleteImage error:', error?.response?.data || error?.message || error);
      Alert.alert('Error', error?.response?.data?.message || error?.message || 'Failed to delete image. Please try again.');
    },
  });

  // Mutation to replace image
  const replaceImage = useMutation({
    mutationFn: async ({
      imageId,
      imageIndex,
      newImageUri,
    }: {
      imageId: number;
      imageIndex: number;
      newImageUri: string;
    }) => {
      if (!productId) {
        console.error('❌ [useProductImages] Cannot replace image: productId is missing or empty');
        throw new Error('Product ID is missing');
      }
      return await productsAPI.replaceProductImage(productId, imageId, imageIndex, newImageUri);
    },
    onSuccess: async () => {
      await invalidateQueries();
      Alert.alert('Success', 'Image replaced successfully');
    },
    onError: (error: any) => {
      console.error('❌ [useProductImages] replaceImage error:', error?.response?.data || error?.message || error);
      Alert.alert('Replace Error', error?.response?.data?.message || error?.message || 'Failed to replace image. Please try again.');
    },
  });

  return {
    // Product query data
    productData,
    isLoading,
    error,
    refetch,
    
    // Products list query data
    productsData,
    isLoadingProducts,
    productsError,
    refetchProducts,
    
    // Mutations
    uploadImage: uploadImage.mutateAsync,
    deleteImage: deleteImage.mutateAsync,
    replaceImage: replaceImage.mutateAsync,
    
    // Mutation states
    isUploadingImage: uploadImage.isPending,
    isDeletingImage: deleteImage.isPending,
    isReplacingImage: replaceImage.isPending,
  };
};
