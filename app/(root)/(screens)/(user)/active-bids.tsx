import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ArrowLeftIcon } from 'react-native-heroicons/solid';
import { useActiveBiddingProducts } from '@/hooks/useProducts';
import LoadingSpinner from '@/components/LoadingSpinner';
import { routes } from '@/constants/routes';
import AdsComponents from '@/components/AdsComponents';

const { width: screenWidth } = Dimensions.get("window");

const ActiveBids = () => {
  const router = useRouter();
  const { data: activeBiddingRes, isLoading, refetch, isRefetching } = useActiveBiddingProducts();

  // Handle both direct array and paginated structure
  const biddingProducts = Array.isArray(activeBiddingRes?.data) 
    ? activeBiddingRes.data 
    : (activeBiddingRes?.results || (activeBiddingRes?.data as any)?.results || []);

  const displayAds = (biddingProducts || []).map((p: any) => ({
    id: p.id,
    title: p.name,
    description: p.description?.slice(0, 60) + (p.description?.length > 60 ? '...' : ''),
    image: p.images?.[0]?.image ? { uri: p.images[0].image } : null,
    price: p.price,
    currency: p.currency,
    year: p.year,
    repairHistoryCount: p.repair_history?.length || 0,
    isBidding: true
  })).filter((ad: any) => ad.image !== null);

  const renderAdItem = useCallback(({ item }: { item: any }) => (
    <View style={{ width: screenWidth, alignItems: 'center', marginBottom: 16 }}>
      <View style={{ width: screenWidth - 18 }}>
        <AdsComponents
          image={item.image}
          title={item.title}
          description={item.description}
          price={item.price}
          currency={item.currency}
          year={item.year}
          repairHistoryCount={item.repairHistoryCount}
          isBidding={item.isBidding}
          onPress={() => {
            if (item.isBidding) {
              router.push({
                pathname: routes.biddingDetail as any,
                params: { productId: item.id }
              });
            }
          }}
        />
      </View>
    </View>
  ), []);

  if (isLoading) {
    return (
      <LoadingSpinner 
        message="Loading active bids..." 
        size="medium"
      />
    );
  }

  const EmptyState = () => (
    <View className="flex-1 items-center justify-center pt-20 px-5">
      <Text className="text-xl font-NunitoBold text-gray-900 mb-2 text-center">
        No Active Bids
      </Text>
      <Text className="text-sm font-NunitoMedium text-gray-500 text-center mb-8">
        There are currently no active auctions taking place. Please check back later.
      </Text>
      <TouchableOpacity
        onPress={() => router.replace(routes.home as any)}
        className="bg-primary-500 px-8 py-3 rounded-full shadow-sm"
      >
        <Text className="text-white font-NunitoBold text-base">
          Go Back Home
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
          Active Bids
        </Text>
        <View className="w-10" />
      </View>
      
      {/* Content */}
      <FlatList
        data={displayAds}
        renderItem={renderAdItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: 40
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
      />
    </SafeAreaView>
  );
};

export default ActiveBids;
