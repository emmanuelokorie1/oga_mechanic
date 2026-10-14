import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Platform, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useNotificationStore } from '@/stores/notificationStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  BellAlertIcon, 
  ChatBubbleLeftRightIcon, 
  WrenchScrewdriverIcon, 
  XMarkIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon
} from 'react-native-heroicons/solid';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI } from '@/lib/api/user';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { routes, mechanicRoutes } from '@/constants/routes';
import { usePrimaryUserProfile, userProfileKeys } from '@/hooks/useUserProfile';
import { extractChatRooms } from '@/lib/api/communications';
import { useUserStore } from '@/stores/userStore';

export interface NotificationTheme {
  category: string;
  color: string;
  bgColor: string;
  borderColor: string;
  tagBg: string;
  tagText: string;
  shadowColor: string;
}

export const getNotificationTheme = (type?: string): NotificationTheme => {
  const normalized = (type || 'info').toLowerCase();
  
  if (
    normalized === 'support_chat' ||
    normalized === 'chat' ||
    normalized === 'chat_message' ||
    normalized === 'p2p'
  ) {
    return {
      category: 'NEW MESSAGE',
      color: '#2563EB',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      tagBg: 'bg-blue-50',
      tagText: 'text-blue-700',
      shadowColor: '#000000',
    };
  }
  
  if (
    normalized === 'repair_update' ||
    normalized === 'repair_status' ||
    normalized.includes('repair') ||
    normalized.includes('transit')
  ) {
    return {
      category: 'REPAIR UPDATE',
      color: '#0F172A',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-200',
      tagBg: 'bg-slate-100',
      tagText: 'text-slate-800',
      shadowColor: '#000000',
    };
  }

  if (normalized === 'order' || normalized.includes('order')) {
    return {
      category: 'ORDER STATUS',
      color: '#0F172A',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-200',
      tagBg: 'bg-slate-100',
      tagText: 'text-slate-800',
      shadowColor: '#000000',
    };
  }

  if (normalized === 'success') {
    return {
      category: 'SUCCESS',
      color: '#059669',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      tagBg: 'bg-emerald-50',
      tagText: 'text-emerald-700',
      shadowColor: '#000000',
    };
  }

  if (normalized === 'warning' || normalized === 'warn') {
    return {
      category: 'ATTENTION',
      color: '#D97706',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      tagBg: 'bg-amber-50',
      tagText: 'text-amber-700',
      shadowColor: '#000000',
    };
  }

  if (normalized === 'error') {
    return {
      category: 'NOTICE',
      color: '#E11D48',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      tagBg: 'bg-rose-50',
      tagText: 'text-rose-700',
      shadowColor: '#000000',
    };
  }

  return {
    category: 'UPDATE',
    color: '#334155',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-200',
    tagBg: 'bg-slate-100',
    tagText: 'text-slate-700',
    shadowColor: '#000000',
  };
};

export const getIconForType = (type: string, color: string) => {
  const normalized = (type || '').toLowerCase();
  if (
    normalized === 'support_chat' ||
    normalized === 'chat' ||
    normalized === 'chat_message' ||
    normalized === 'p2p'
  ) {
    return <ChatBubbleLeftRightIcon size={22} color={color} />;
  }
  if (
    normalized === 'repair_update' ||
    normalized === 'repair_status' ||
    normalized === 'order' ||
    normalized.includes('repair') ||
    normalized.includes('transit')
  ) {
    return <WrenchScrewdriverIcon size={22} color={color} />;
  }
  if (normalized === 'success') {
    return <CheckCircleIcon size={22} color={color} />;
  }
  if (normalized === 'warning' || normalized === 'warn') {
    return <ExclamationTriangleIcon size={22} color={color} />;
  }
  return <BellAlertIcon size={22} color={color} />;
};

const formatRelativeTime = (timestamp?: string | number) => {
  if (!timestamp) return '';
  const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const NotificationCard = ({ item, onDismiss, onPress }: { item: any, onDismiss: () => void, onPress?: () => void }) => {
  const type = item.notification_type || item.type || 'info';
  const theme = getNotificationTheme(type);
  const isUnread = !item.is_read;
  const timeText = formatRelativeTime(item.created_at || item.timestamp);

  const rawTitle = typeof item.title === 'string' ? item.title : String(item.title || '');
  const rawMessage =
    typeof item.message === 'string'
      ? item.message
      : (item.message?.content || item.message?.text || String(item.message || ''));

  return (
    <TouchableOpacity 
      activeOpacity={0.88}
      onPress={onPress}
      className={`bg-white rounded-2xl p-4 mb-3 border ${
        isUnread ? 'border-slate-200/90' : 'border-slate-100 bg-slate-50/20'
      }`}
      style={{
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isUnread ? 0.08 : 0.03,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <View className="flex-row items-start">
        {/* Left Icon Badge */}
        <View className={`${theme.bgColor} p-3 rounded-xl mr-3 border ${theme.borderColor} mt-0.5`}>
          {getIconForType(type, theme.color)}
        </View>

        {/* Content */}
        <View className="flex-1 mr-2">
          {/* Top meta row */}
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center">
              {isUnread && (
                <View className="w-2 h-2 rounded-full bg-[#D30309] mr-1.5" />
              )}
              <View className={`${theme.tagBg} px-2 py-0.5 rounded-full`}>
                <Text className={`${theme.tagText} font-NunitoExtraBold text-[10px] tracking-wider uppercase`}>
                  {theme.category}
                </Text>
              </View>
            </View>

            {timeText ? (
              <Text className="text-gray-400 font-NunitoMedium text-[11px]">
                {timeText}
              </Text>
            ) : null}
          </View>

          <Text
            className={`text-gray-900 text-[15px] leading-5 mb-0.5 ${
              isUnread ? 'font-NunitoExtraBold' : 'font-NunitoBold'
            }`}
          >
            {rawTitle}
          </Text>
          <Text className="text-gray-600 font-NunitoMedium text-[13px] leading-[18px]" numberOfLines={3}>
            {rawMessage}
          </Text>
        </View>

        {/* Dismiss Button */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation?.();
            onDismiss();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center border border-gray-100 ml-1"
        >
          <XMarkIcon size={14} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const GlobalNotificationBanner = () => {
  const router = useRouter();
  const pathname = usePathname();
  const currentParams = useLocalSearchParams();
  const { 
    isVisible, title, message, type, data: bannerData,
    hideNotification, 
    isHistoryModalVisible, toggleHistoryModal
  } = useNotificationStore();
  
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-160)).current;
  const queryClient = useQueryClient();
  const { data: profile } = usePrimaryUserProfile();
  const userRole = profile?.data?.current_role;
  const accessToken = useUserStore((state) => state.accessToken);

  const bannerTheme = getNotificationTheme(type);

  const handleNavigation = (notifData: any) => {
    if (!notifData) return;
    
    // Extract ID and Type (handle both direct and nested data)
    const rawData = notifData.data || notifData;
    const notificationType = rawData.notification_type || rawData.type || notifData.type;
    const relatedObjectId = rawData.related_object_id || rawData.related_id || notifData.related_object_id;

    console.log('🚀 [Notification Navigation]', { notificationType, relatedObjectId, userRole });

    const titleText = (bannerData?.title || rawData.title || '').toLowerCase();
    const isRepairNotification =
      notificationType === 'repair_update' ||
      notificationType === 'repair_status' ||
      notificationType?.includes('repair') ||
      notificationType?.includes('transit') ||
      titleText.includes('repair') ||
      titleText.includes('transit');

    if (isRepairNotification) {
      const targetOrderId = relatedObjectId || rawData.order_id || rawData.repair_request_id || rawData.repair_id || rawData.id;
      // Invalidate queries so screen refreshes
      queryClient.invalidateQueries({ queryKey: ['repair-request'] });
      if (targetOrderId) {
        queryClient.invalidateQueries({ queryKey: ['repair-request', String(targetOrderId)] });
        queryClient.refetchQueries({ queryKey: ['repair-request', String(targetOrderId)], type: 'active' });
      }

      if (targetOrderId) {
        const currentPath = pathname || '';
        const isAlreadyOnScreen =
          (currentPath.includes('track-mechanic-order') || currentPath.includes('order-details')) &&
          String(currentParams?.orderId) === String(targetOrderId);

        if (!isAlreadyOnScreen) {
          if (userRole === 'mechanic') {
            router.push({
              pathname: mechanicRoutes.orderDetails as any,
              params: { orderId: targetOrderId }
            });
          } else {
            router.push({
              pathname: routes.trackMechanicOrder as any,
              params: { orderId: targetOrderId }
            });
          }
        }
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
    } else if (
      notificationType === 'chat' ||
      notificationType === 'chat_message' ||
      notificationType === 'p2p' ||
      rawData.chatType === 'p2p' ||
      !!rawData.roomId
    ) {
      const targetRoomId = rawData.roomId || relatedObjectId;
      if (targetRoomId) {
        // If the user is already viewing this exact chat room, do not reload or push duplicate screen
        const currentPath = pathname || '';
        const isAlreadyInRoom =
          (currentPath.includes('chat-room') || currentPath.includes('chat-mechanic')) &&
          String(currentParams?.roomId) === String(targetRoomId);

        if (isAlreadyInRoom) {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', String(targetRoomId)] });
          queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
          queryClient.refetchQueries({ queryKey: ['chat-messages', String(targetRoomId)], type: 'active' });
          queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
          hideNotification();
          toggleHistoryModal(false);
          return;
        }

        // Resolve real participant name & avatar from chatRooms query cache or notification payload
        const chatRoomsData = queryClient.getQueryData(['chatRooms']);
        const chatRooms = extractChatRooms(chatRoomsData);
        const matchedRoom = chatRooms.find((r: any) => String(r.id) === String(targetRoomId));
        const roomParticipant = matchedRoom?.other_participant;
        const roomParticipantName = roomParticipant?.first_name
          ? `${roomParticipant.first_name} ${roomParticipant.last_name || ''}`.trim()
          : roomParticipant?.email ? roomParticipant.email.split('@')[0] : null;

        const resolvedName =
          (rawData.participantName && rawData.participantName !== 'User' && rawData.participantName !== 'Participant' ? rawData.participantName : null) ||
          (rawData.senderName && rawData.senderName !== 'User' && rawData.senderName !== 'Participant' ? rawData.senderName : null) ||
          (rawData.sender?.full_name ? rawData.sender.full_name : null) ||
          (rawData.sender?.first_name ? `${rawData.sender.first_name} ${rawData.sender.last_name || ''}`.trim() : null) ||
          roomParticipantName ||
          "User";

        const resolvedAvatar = rawData.participantAvatar || roomParticipant?.avatar || "";

        router.push({
          pathname: "/(root)/(screens)/(user)/chat-room" as any,
          params: {
            roomId: String(targetRoomId),
            participantName: resolvedName,
            participantAvatar: resolvedAvatar,
          }
        });
        hideNotification();
        toggleHistoryModal(false);
      }
    } else {
      const rawText = `${rawData?.title || notifData?.title || ''} ${rawData?.message || notifData?.message || ''}`.toLowerCase();
      if (rawText.includes('approv') || rawText.includes('kyc') || rawText.includes('verif') || rawText.includes('profile')) {
        queryClient.invalidateQueries({ queryKey: userProfileKeys.all });
        queryClient.refetchQueries({ queryKey: userProfileKeys.all });
      }
      hideNotification();
      toggleHistoryModal(false);
    }
  };

  useEffect(() => {
    if (isVisible && !isHistoryModalVisible) {
      Animated.spring(translateY, {
        toValue: Platform.OS === 'ios' ? insets.top + 8 : insets.top + 14,
        useNativeDriver: true,
        bounciness: 10,
        speed: 14,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -160,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, isHistoryModalVisible, insets.top]);

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
      const pageData = lastPage?.data || lastPage;
      if (pageData?.next) {
        return allPages.length * 15;
      }
      return undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(accessToken),
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
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
      {/* 1. The Elevated Floating In-App Dropdown Banner */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 14,
          right: 14,
          transform: [{ translateY }],
          zIndex: 9999,
        }}
      >
        <TouchableOpacity 
          activeOpacity={0.92}
          onPress={() => handleNavigation(bannerData)}
          onLongPress={() => toggleHistoryModal(true)}
          className="bg-white rounded-[22px] p-3.5 border border-slate-200/90 overflow-hidden"
          style={{
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: Platform.OS === 'ios' ? 0.12 : 0.18,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Top Category Row */}
          <View className="flex-row items-center justify-between mb-2">
            <View className={`${bannerTheme.tagBg} px-2.5 py-0.5 rounded-full border ${bannerTheme.borderColor}`}>
              <Text className={`${bannerTheme.tagText} font-NunitoBold text-[10px] tracking-wider uppercase`}>
                {bannerTheme.category}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Text className="text-slate-400 font-NunitoSemiBold text-[10.5px] mr-2">
                Tap to view
              </Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  hideNotification();
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                className="w-6 h-6 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
              >
                <XMarkIcon size={12} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Banner Body */}
          <View className="flex-row items-center">
            <View className={`w-11 h-11 rounded-2xl ${bannerTheme.bgColor} border ${bannerTheme.borderColor} items-center justify-center mr-3`}>
              {getIconForType(type, bannerTheme.color)}
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-slate-900 font-NunitoExtraBold text-[14px] leading-5 mb-0.5" numberOfLines={1}>
                {typeof title === 'string' ? title : String(title || '')}
              </Text>
              <Text className="text-slate-600 font-NunitoMedium text-[12.5px] leading-[17px]" numberOfLines={2}>
                {typeof message === 'string' ? message : ((message as any)?.content || (message as any)?.text || String(message || ''))}
              </Text>
            </View>
            <ChevronRightIcon size={16} color="#94A3B8" />
          </View>

          {/* Tactile Bottom Grabber */}
          <View className="w-8 h-1 bg-slate-200 rounded-full mx-auto mt-2" />
        </TouchableOpacity>
      </Animated.View>

      {/* 2. The Full Screen History Modal with Sheet Styling */}
      <Modal
        visible={isHistoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => toggleHistoryModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View 
            className="flex-1 bg-[#0F1014] pt-4"
            style={{ paddingTop: Math.max(insets.top, 24) }}
          >
            {/* Header */}
            <View className="px-5 pb-4 border-b border-white/10 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Text className="text-white font-NunitoExtraBold text-xl">
                  Notifications
                </Text>
                {totalCount > 0 && (
                  <View className="ml-2.5 bg-[#D30309] px-2.5 py-0.5 rounded-full">
                    <Text className="text-white font-NunitoExtraBold text-xs">
                      {totalCount}
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row items-center">
                {notifications.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => markAllReadMutation.mutate()} 
                    disabled={markAllReadMutation.isPending}
                    className="flex-row items-center bg-white/10 px-3 py-1.5 rounded-full mr-3 border border-white/10 active:bg-white/20"
                  >
                    <TrashIcon size={14} color="#EF4444" />
                    <Text className="text-red-400 font-NunitoBold text-xs ml-1.5">Clear all</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  onPress={() => toggleHistoryModal(false)} 
                  className="w-9 h-9 rounded-full bg-white/15 items-center justify-center active:bg-white/25"
                >
                  <XMarkIcon size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Infinite Scroll List */}
            <View className="flex-1 px-4 pt-4">
              {isLoading ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" color="#D30309" />
                  <Text className="text-gray-400 font-NunitoMedium text-sm mt-3">
                    Loading notifications...
                  </Text>
                </View>
              ) : notifications.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                  <View className="w-20 h-20 rounded-full bg-white/10 items-center justify-center mb-4 border border-white/10">
                    <BellAlertIcon size={40} color="#9CA3AF" />
                  </View>
                  <Text className="text-white font-NunitoExtraBold text-lg mb-1">
                    All Caught Up!
                  </Text>
                  <Text className="text-gray-400 font-NunitoMedium text-sm text-center leading-5 max-w-[280px]">
                    You have no unread notifications right now. We'll alert you as soon as there are updates on your repairs, orders, or chats.
                  </Text>
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
        </View>
      </Modal>
    </>
  );
};

export default GlobalNotificationBanner;
