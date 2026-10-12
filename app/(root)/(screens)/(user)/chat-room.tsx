import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import ChatScreen from '@/components/templates/ChatScreen';
import { useP2PChatSocket } from '@/hooks/useP2PChatSocket';
import { useUserStore } from '@/stores/userStore';
import { usePrimaryUserProfile } from '@/hooks/useUserProfile';
import { communicationsAPI, extractChatRooms } from '@/lib/api/communications';

const ChatRoomScreen = () => {
  const params = useLocalSearchParams();
  const roomId = params.roomId as string;
  const participantName = params.participantName as string;
  const participantAvatar = params.participantAvatar as string;
  const headerSubtitle = (params.subtitle as string) || "Direct Chat";
  
  const currentUser = useUserStore(state => state.user);
  const userEmail = (currentUser?.email || '').toLowerCase();
  const userId = currentUser?.id;

  const { data: profileResponse } = usePrimaryUserProfile();
  const currentRole = (profileResponse?.data?.current_role || (currentUser as any)?.current_role || '').toLowerCase();

  // Initialize the real-time socket hook
  const {
    messages,
    isTyping,
    isLoadingHistory,
    sendMessage,
    sendTypingStatus,
    markMessagesAsRead,
  } = useP2PChatSocket(roomId);

  // Map backend messages to UI format
  const mappedMessages = useMemo(() => {
    return messages.map(m => {
      const msgRole = (m.senderRole || m.active_role || '').toLowerCase();
      const rawSenderEmail = m.sender_email || (typeof m.sender === 'string' && m.sender.includes('@') ? m.sender : '');
      const msgEmail = rawSenderEmail ? rawSenderEmail.toLowerCase() : '';
      const senderObj = typeof m.sender === 'object' && m.sender !== null ? m.sender : null;
      const msgSenderId = senderObj?.id || m.sender_id || (typeof m.sender === 'string' && !m.sender.includes('@') ? m.sender : null);

      // Check if message was sent by current user
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
    const currentRoom = rooms.find((r: any) => String(r.id) === String(roomId));
    const other = currentRoom?.other_participant;

    const isGeneric = !participantName || participantName === 'User' || participantName === 'Participant';
    const roomName = other?.first_name 
      ? `${other.first_name} ${other.last_name || ''}`.trim() 
      : other?.email ? other.email.split('@')[0] : null;

    const name = !isGeneric ? participantName : (roomName || "User");
    const avatar = participantAvatar || other?.avatar || undefined;

    return {
      name,
      avatar,
      phone: (params.participantPhone as string) || "",
      isOnline: true,
    };
  }, [roomsData, roomId, participantName, participantAvatar, params.participantPhone]);

  const handleSendMessage = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  const handleTyping = useCallback((typing: boolean) => {
    sendTypingStatus(typing);
  }, [sendTypingStatus]);

  return (
    <ChatScreen
      participant={participant}
      messages={mappedMessages}
      onSendMessage={handleSendMessage}
      onTyping={handleTyping}
      isTyping={isTyping}
      isLoadingHistory={isLoadingHistory}
      headerSubtitle={headerSubtitle}
    />
  );
};

export default ChatRoomScreen;
