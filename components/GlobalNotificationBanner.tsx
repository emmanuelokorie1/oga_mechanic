import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Platform, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useNotificationStore } from '@/stores/notificationStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  BellAlertIcon, 
  ChatBubbleLeftRightIcon, 
  WrenchScrewdriverIcon, 
  XMarkIcon,
  TrashIcon
} from 'react-native-heroicons/solid';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI } from '@/lib/api/user';
import { useRouter } from 'expo-router';
import { routes, mechanicRoutes } from '@/constants/routes';
import { usePrimaryUserProfile } from '@/hooks/useUserProfile';

export const getIconForType = (type: string, color: string) => {
  switch (type) {
    case 'support_chat':
    case 'chat': return <ChatBubbleLeftRightIcon size={24} color={color} />;
    case 'repair_update':
    case 'repair_status':
    case 'order': return <WrenchScrewdriverIcon size={24} color={color} />;
    default: return <BellAlertIcon size={24} color={color} />;
  }
};

const NotificationCard = ({ item, onDismiss, onPress }: { item: any, onDismiss: () => void, onPress?: () => void }) => {
  const type = item.notification_type || item.type || 'info';
  const isRepair = type === 'repair_update' || type === 'repair_status' || type === 'order';
  const color = isRepair ? '#D30309' : type === 'support_chat' || type === 'chat' ? '#3B82F6' : '#6366F1';
  const bgColor = isRepair ? 'bg-red-50' : type === 'support_chat' || type === 'chat' ? 'bg-blue-50' : 'bg-indigo-50';
  const borderColor = isRepair ? 'border-red-100' : type === 'support_chat' || type === 'chat' ? 'border-blue-100' : 'border-indigo-100';

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      className={`bg-white rounded-[20px] p-4 flex-row items-center mb-3 shadow-sm border ${item.is_read ? 'border-gray-100 opacity-80' : 'border-red-100'}`}
    >
      <View className={`${bgColor} p-3 rounded-full mr-4 border ${borderColor}`}>
        {getIconForType(type, color)}
      </View>
      <View className="flex-1 mr-2">
        <Text className="text-gray-900 font-NunitoExtraBold text-[16px] mb-0.5">{item.title}</Text>
        <Text className="text-gray-500 font-NunitoMedium text-[13px]">{item.message}</Text>
      </View>
      <TouchableOpacity onPress={(e) => { e.stopPropagation(); onDismiss(); }} className="p-2 -mr-2">
        <XMarkIcon size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const GlobalNotificationBanner = () => {
  const router = useRouter();
  const { 
    isVisible, title, message, type, data: bannerData,
    hideNotification, 
    isHistoryModalVisible, toggleHistoryModal
  } = useNotificationStore();
  
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-150)).current;
  const queryClient = useQueryClient();
  const { data: profile } = usePrimaryUserProfile();
  const userRole = profile?.data?.current_role;

  const handleNavigation = (notifData: any) => {
    if (!notifData) return;
    
    // Extract ID and Type (handle both direct and nested data)
    const rawData = notifData.data || notifData;
    const notificationType = rawData.notification_type || rawData.type || notifData.type;
    const relatedObjectId = rawData.related_object_id || rawData.related_id || notifData.related_object_id;

    console.log('🚀 [Notification Navigation]', { notificationType, relatedObjectId, userRole });

    const isRepairNotification = notificationType === 'repair_update' || notificationType === 'repair_status';

    if (isRepairNotification && relatedObjectId) {
      // Intelligent Routing based on Role
      if (userRole === 'mechanic') {
        router.push({
          pathname: mechanicRoutes.orderDetails as any,
          params: { orderId: relatedObjectId }
        });
      } else {
        router.push({
          pathname: routes.trackMechanicOrder as any,
          params: { orderId: relatedObjectId }
        });
      }
      hideNotification();
      toggleHistoryModal(false);
    } else if (notificationType === 'support_chat') {
       router.push({
         pathname: routes.chatSpecialist as any,
         params: { roomId: relatedObjectId }
       });
       hideNotification();
       toggleHistoryModal(false);
    }
  };

  useEffect(() => {
    if (isVisible && !isHistoryModalVisible) {
      Animated.spring(translateY, {
        toValue: Platform.OS === 'ios' ? insets.top + 10 : insets.top + 20,
        useNativeDriver: true,
        bounciness: 12,
        speed: 14,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, isHistoryModalVisible]);

  // ── Backend Pagination Query ──────────────────────────────────────────────
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useInfiniteQuery({
    queryKey: ['notifications', 'infinite'],
    queryFn: ({ pageParam = 0 }) => userAPI.getNotifications(pageParam, 15),
    getNextPageParam: (lastPage, allPages) => {
      // API returns response.data inside lastPage, so the actual paginated data is in lastPage?.data
      const pageData = lastPage?.data || lastPage;
      if (pageData?.next) {
        return allPages.length * 15;
      }
      return undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000,
  });

  const notifications = data?.pages.flatMap((page) => {
    const pageData = page?.data || page;
    return Array.isArray(pageData) ? pageData : (pageData?.results || []);
  }) || [];

  const totalCount = data?.pages[0]?.data?.count || data?.pages[0]?.count || 0;

  // Mark single as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string | number) => userAPI.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => userAPI.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const renderFooter = () => {
    if (!isFetchingNextPage) return <View className="h-20" />;
    return (
      <View className="py-4 items-center h-20">
        <ActivityIndicator size="small" color="#D30309" />
      </View>
    );
  };

  return (
    <>
      {/* 1. The Temporary Drop-down Banner */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 16,
          right: 16,
          transform: [{ translateY }],
          zIndex: 9999,
        }}
      >
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => handleNavigation(bannerData)}
          onLongPress={() => toggleHistoryModal(true)} // Open history on long press
          className="bg-white rounded-[20px] p-4 flex-row items-center border border-gray-100 overflow-hidden"
          style={{
            shadowColor: '#D30309',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 2,
          }}
        >
          <View className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#D30309]" />
          <View className="bg-red-50 p-3 rounded-[14px] mr-4 ml-2 border border-red-100">
            {getIconForType(type, "#D30309")}
          </View>
          <View className="flex-1 mr-3">
            <Text className="text-gray-900 font-NunitoExtraBold text-[16px] mb-0.5 tracking-tight">{title}</Text>
            <Text className="text-gray-500 font-NunitoMedium text-[13px] leading-[18px]" numberOfLines={2}>
              {message}
            </Text>
          </View>
          <TouchableOpacity onPress={hideNotification} className="w-8 h-8 bg-gray-50 rounded-full items-center justify-center border border-gray-100">
            <XMarkIcon size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>

      {/* 2. The Full Screen History Modal with Infinite Scroll */}
      <Modal
        visible={isHistoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => toggleHistoryModal(false)}
      >
        <View className="flex-1 bg-black/60 pt-16">
          <View className="px-4">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6" style={{ marginTop: insets.top }}>
              <Text className="text-white font-NunitoExtraBold text-lg">
                Notifications {totalCount > 0 ? `(${totalCount})` : ''}
              </Text>
              <View className="flex-row items-center">
                {notifications.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => markAllReadMutation.mutate()} 
                    disabled={markAllReadMutation.isPending}
                    className="flex-row items-center mr-4"
                  >
                    <TrashIcon size={16} color="#EF4444" />
                    <Text className="text-red-500 font-NunitoBold ml-1">Clear all</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => toggleHistoryModal(false)} className="bg-white/20 p-2 rounded-full">
                  <XMarkIcon size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Infinite Scroll List */}
          <View className="flex-1 px-4">
            {isLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            ) : notifications.length === 0 ? (
              <View className="items-center justify-center mt-20">
                <BellAlertIcon size={48} color="#9CA3AF" />
                <Text className="text-gray-400 font-NunitoMedium mt-4 text-center">No recent notifications</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <NotificationCard 
                    item={item} 
                    onDismiss={() => markReadMutation.mutate(item.id)} 
                    onPress={() => handleNavigation(item)}
                  />
                )}
                showsVerticalScrollIndicator={false}
                onEndReached={() => {
                  if (hasNextPage) fetchNextPage();
                }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                refreshing={isLoading}
                onRefresh={refetch}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default GlobalNotificationBanner;
