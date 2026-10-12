import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { communicationsAPI, extractChatRooms } from '@/lib/api/communications';
import { usePrimaryUserProfile } from '@/hooks/useUserProfile';
import { router, useFocusEffect } from 'expo-router';
import BackArrowBtn from '@/components/BackArrowBtn';
import { ChatBubbleLeftRightIcon, UserIcon, MagnifyingGlassIcon } from 'react-native-heroicons/outline';
import { format } from 'date-fns';

const InboxScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const { data: profileResponse } = usePrimaryUserProfile();
  
  const isSeller = useMemo(() => {
    // Correct path based on actual API: data.current_role
    const role = profileResponse?.data?.current_role || (profileResponse as any)?.current_role;
    const roleName = role?.toLowerCase();
    return roleName === 'merchant' || roleName === 'seller';
  }, [profileResponse]);

  // Fetch all chat rooms (Conversations)
  const { data: roomsData, isLoading, refetch } = useQuery({
    queryKey: ['chatRooms'],
    queryFn: () => communicationsAPI.getChatRooms(),
  });

  // Automatically "trigger the get chat" whenever this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const rooms = useMemo(() => extractChatRooms(roomsData), [roomsData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderRoomItem = ({ item }: { item: any }) => {
    const currentUserId = profileResponse?.data?.user_id || (profileResponse as any)?.id;
    const participant = item.other_participant || 
      item.participants?.find((p: any) => p?.id !== currentUserId) || 
      item.participant || 
      {};
    const lastMessage = item.last_message;
    const unreadCount = item.unread_count || 0;

    const participantName = 
      participant.first_name 
        ? `${participant.first_name} ${participant.last_name || ''}`.trim()
        : participant.email 
          ? participant.email.split('@')[0]
          : participant.name || "User";

    const participantAvatar = participant.avatar || participant.profile_picture || "";

    return (
      <TouchableOpacity
        onPress={() => router.push({
          pathname: "/(root)/(screens)/(user)/chat-room",
          params: {
            roomId: item.id,
            participantName: participantName,
            participantAvatar: participantAvatar,
          }
        })}
        className="flex-row items-center px-4 py-4 border-b border-gray-50 bg-white active:bg-gray-50"
      >
        {/* Avatar */}
        <View className="relative">
          <View className="w-14 h-14 bg-gray-100 rounded-full overflow-hidden items-center justify-center border border-gray-100">
            {participantAvatar ? (
              <Image source={{ uri: participantAvatar }} className="w-full h-full" />
            ) : (
              <UserIcon size={30} color="#94a3b8" />
            )}
          </View>
          {item.is_active && (
            <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
          )}
        </View>

        {/* Content */}
        <View className="flex-1 ml-4">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-base font-NunitoBold text-gray-900" numberOfLines={1}>
              {participantName}
            </Text>
            {lastMessage && (
              <Text className="text-[11px] text-gray-400 font-NunitoMedium">
                {format(new Date(lastMessage.created_at), 'p')}
              </Text>
            )}
          </View>
          
          <View className="flex-row justify-between items-center">
            <Text 
              className={`text-sm flex-1 mr-2 ${unreadCount > 0 ? 'font-NunitoBold text-gray-900' : 'font-NunitoMedium text-gray-500'}`}
              numberOfLines={1}
            >
              {lastMessage?.content || "Start a conversation..."}
            </Text>
            
            {unreadCount > 0 && (
              <View className="bg-red-500 rounded-full px-2 py-0.5 min-w-[20px] items-center justify-center">
                <Text className="text-white text-[10px] font-NunitoBold">{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-gray-100">
        <View className="flex-row items-center">
          <BackArrowBtn />
          <Text className="text-xl font-NunitoExtraBold text-gray-900 ml-2">Messages</Text>
        </View>
        <TouchableOpacity className="p-2 bg-gray-50 rounded-full">
          <MagnifyingGlassIcon size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={renderRoomItem}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D30309" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="flex-1 items-center justify-center px-8">
              <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
                <ChatBubbleLeftRightIcon size={40} color="#cbd5e1" />
              </View>
              <Text className="text-lg font-NunitoBold text-gray-900 text-center">No messages yet</Text>
              <Text className="text-gray-500 text-center mt-2 font-NunitoMedium px-4">
                {isSeller 
                  ? "When customers inquire about your products or services, their messages will appear here." 
                  : "When you message sellers about spare parts or products, their replies will appear here."}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default InboxScreen;