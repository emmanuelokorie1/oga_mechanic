import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ArrowLeftIcon, HeartIcon } from 'react-native-heroicons/solid';
import { useFavoriteProducts, useToggleFavorite } from '@/hooks/useProducts';
import ProductCard from '@/components/cards/ProductCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { routes } from '@/constants/routes';

const FavoriteProducts = () => {
  const router = useRouter();
  const { data: favoritesData, isLoading, refetch, isRefetching } = useFavoriteProducts();
  const toggleFavoriteMutation = useToggleFavorite();

  const handleProductPress = (productId: string) => {
    router.push({
      pathname: routes.ProductDetail,
      params: { id: productId }
    });
  };

  const handleRemoveFavorite = (productId: string) => {
    toggleFavoriteMutation.mutate({
      productId,
      isCurrentlyFavorited: true
    });
  };

  if (isLoading) {
    return (
      <LoadingSpinner 
        message="Loading your favorites..." 
        size="medium"
      />
    );
  }

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    // Determine container style for grid layout
    // Add margin to correct side based on index (even/odd)
    const containerStyle = index % 2 === 0 ? "mr-2 mb-4" : "ml-2 mb-4";
    
    // Map API response to ProductCard props
    // The item structure is { id, product: { ... }, created_at }
    const product = item.product;

    return (
      <View className={`flex-1 ${containerStyle}`}>
        <ProductCard
          productId={product.id}
          name={product.name}
          price={parseFloat(product.price)}
          Images={product.images}
          rating={product.rating}
          reviewCount={product.purchased_count || 0}
          isFavorite={true}
          showLove={true}
          love={true}
          // Use product.id for navigation and for removing favorite
          onPress={() => handleProductPress(product.id)}
          onLovePress={() => handleRemoveFavorite(product.id)}
          containerStyle="w-full"
        />
      </View>
    );
  };

  const EmptyState = () => (
    <View className="flex-1 items-center justify-center pt-20 px-5">
      <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
        <HeartIcon size={40} color="#9CA3AF" />
      </View>
      <Text className="text-xl font-NunitoBold text-gray-900 mb-2 text-center">
        No Favorites Yet
      </Text>
      <Text className="text-sm font-NunitoMedium text-gray-500 text-center mb-8">
        Start exploring products and save the ones you love!
      </Text>
      <TouchableOpacity
        onPress={() => router.replace(routes.home as any)}
        className="bg-primary-500 px-8 py-3 rounded-full shadow-sm"
      >
        <Text className="text-white font-NunitoBold text-base">
          Browse Products
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="px-5 py-4 bg-white border-b border-gray-100 flex-row items-center gap-4 shadow-sm z-10">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center"
        >
          <ArrowLeftIcon size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-xl font-NunitoBold text-gray-900 flex-1">
          My Favorites
        </Text>
        <View className="w-10" />
      </View>
      
      {/* Content */}
      <FlatList
        // favoritesData.data is now the array itself
        data={favoritesData?.data || []}
        renderItem={renderItem}
        // Use the product ID or the favorite record ID as key
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 100
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#D30309"
            colors={["#D30309"]}
          />
        }
        ListEmptyComponent={EmptyState}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
      />

    </SafeAreaView>
  );
};

export default FavoriteProducts;
