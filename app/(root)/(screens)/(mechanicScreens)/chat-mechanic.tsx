import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatScreen from '@/components/templates/ChatScreen';
import { useP2PChatSocket } from '@/hooks/useP2PChatSocket';
import { useUserStore } from '@/stores/userStore';
import { usePrimaryUserProfile } from '@/hooks/useUserProfile';
import { communicationsAPI, extractChatRooms } from '@/lib/api/communications';

const ChatMechanic = () => {
  const params = useLocalSearchParams();
  const initialRoomId = params.roomId as string;
  const participantName = (params.mechanicName as string) || (params.participantName as string) || "Mechanic";
  const participantAvatar = (params.mechanicImage as string) || (params.participantAvatar as string) || "";
  const participantPhone = (params.mechanicPhone as string) || (params.participantPhone as string) || "";
  const targetUserId = (params.targetUserId as string) || (params.mechanicUserId as string) || "";

  const [activeRoomId, setActiveRoomId] = useState<string>(initialRoomId || "");
  const [isInitializing, setIsInitializing] = useState<boolean>(!initialRoomId && !!targetUserId);

  // If no initialRoomId but targetUserId exists, obtain/create the room
  useEffect(() => {
    if (activeRoomId || !targetUserId) return;

    let isMounted = true;
    const initRoom = async () => {
      try {
        setIsInitializing(true);
        const roomsResponse = await communicationsAPI.getChatRooms();
        const rooms = extractChatRooms(roomsResponse);

        const existingRoom = rooms.find((room: any) =>
          room.participants?.some((p: any) => String(p.id) === String(targetUserId) || String(p.user_id) === String(targetUserId)) ||
          String(room.other_participant?.id) === String(targetUserId) ||
          String(room.other_participant?.user_id) === String(targetUserId)
        );

        if (existingRoom && isMounted) {
          setActiveRoomId(existingRoom.id);
          return;
        }

        const createRes = await communicationsAPI.createChatRoom([String(targetUserId)]);
        const createdId = createRes?.data?.id || createRes?.id || createRes?.data?.room_id;
        if (createdId && isMounted) {
          setActiveRoomId(createdId);
        }
      } catch (err) {
        console.error('❌ [ChatMechanic] Failed to initialize room:', err);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };

    initRoom();
    return () => {
      isMounted = false;
    };
  }, [activeRoomId, targetUserId]);

  const currentUser = useUserStore(state => state.user);
  const userEmail = (currentUser?.email || '').toLowerCase();
  const userId = currentUser?.id;

  const { data: profileResponse } = usePrimaryUserProfile();
  const currentRole = (profileResponse?.data?.current_role || (currentUser as any)?.current_role || '').toLowerCase();

  const {
    messages,
    isTyping,
    isLoadingHistory,
    sendMessage,
    sendTypingStatus,
    markMessagesAsRead,
  } = useP2PChatSocket(activeRoomId, !!activeRoomId);

  const mappedMessages = useMemo(() => {
    return messages.map(m => {
      const msgRole = (m.senderRole || m.active_role || '').toLowerCase();
      const rawSenderEmail = m.sender_email || (typeof m.sender === 'string' && m.sender.includes('@') ? m.sender : '');
      const msgEmail = rawSenderEmail ? rawSenderEmail.toLowerCase() : '';
      const senderObj = typeof m.sender === 'object' && m.sender !== null ? m.sender : null;
      const msgSenderId = senderObj?.id || m.sender_id || (typeof m.sender === 'string' && !m.sender.includes('@') ? m.sender : null);

      const isSent = m.isSent === true || 
                    m.sender === 'me' || 
                    (userId && msgSenderId && String(msgSenderId) === String(userId) && (!msgRole || !currentRole || msgRole === currentRole)) ||
                    (userEmail && msgEmail && msgEmail === userEmail && (!msgRole || !currentRole || msgRole === currentRole));
      
      const rawText = m.text ?? m.content ?? (typeof m.message === 'string' ? m.message : (m.message?.content || m.message?.text)) ?? '';
      const text = typeof rawText === 'string' ? rawText : (rawText && typeof rawText === 'object' ? String(rawText.content || rawText.text || '') : String(rawText || ''));

      return {
        ...m,
        isSent,
        text,
      };
    });
  }, [messages, userEmail, userId, currentRole]);

  const queryClient = useQueryClient();

  // When leaving the chat screen, ensure chatRooms cache is refreshed
  useEffect(() => {
    return () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
    };
  }, [queryClient]);

  const { data: roomsData } = useQuery({
    queryKey: ['chatRooms'],
    queryFn: () => communicationsAPI.getChatRooms(),
    staleTime: 60 * 1000,
  });

  const participant = useMemo(() => {
    const rooms = extractChatRooms(roomsData);
    const currentRoom = rooms.find((r: any) => String(r.id) === String(activeRoomId));
    const other = currentRoom?.other_participant;

    const isGeneric = !participantName || participantName === 'Mechanic' || participantName === 'User' || participantName === 'Participant';
    const roomName = other?.first_name 
      ? `${other.first_name} ${other.last_name || ''}`.trim() 
      : other?.email ? other.email.split('@')[0] : null;

    const name = !isGeneric ? participantName : (roomName || "Mechanic");
    const avatar = participantAvatar || other?.avatar || undefined;

    return {
      name,
      avatar,
      phone: participantPhone,
      isOnline: true,
    };
  }, [roomsData, activeRoomId, participantName, participantAvatar, participantPhone]);

  const handleSendMessage = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  const handleTyping = useCallback((typing: boolean) => {
    sendTypingStatus(typing);
  }, [sendTypingStatus]);

  if (isInitializing) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0284c7" />
        <Text className="mt-3 text-sm font-NunitoMedium text-gray-500">Connecting to chat...</Text>
      </SafeAreaView>
    );
  }

  return (
    <ChatScreen
      participant={participant}
      messages={mappedMessages}
      onSendMessage={handleSendMessage}
      onTyping={handleTyping}
      isTyping={isTyping}
      isLoadingHistory={isLoadingHistory}
      headerSubtitle="Mechanic Chat"
    />
  );
};

export default ChatMechanic;
