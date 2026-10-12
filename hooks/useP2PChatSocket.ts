import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import useWebSocket, { WebSocketMessage } from './useWebSocket';
import { communicationsAPI, extractMessages } from '@/lib/api/communications';
import { usePrimaryUserProfile } from './useUserProfile';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { playMechanicNotificationSound } from '@/utils/sound';

/**
 * Specialized WebSocket hook for the Peer-to-Peer (Customer/Mechanic/Buyer/Seller) Chat system.
 * Handles history fetching via REST and real-time bidirectional messaging via WebSockets.
 */
export const useP2PChatSocket = (roomId: string, enabled: boolean = true) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const { data: profileResponse } = usePrimaryUserProfile();
  const currentUser = useUserStore((state) => state.user);

  // Identity resolution for determining sender
  const currentUserId = useMemo(() => {
    return profileResponse?.data?.user_id || (profileResponse?.data as any)?.id || currentUser?.id;
  }, [profileResponse?.data?.user_id, (profileResponse?.data as any)?.id, currentUser?.id]);

  const currentEmail = useMemo(() => {
    return (profileResponse?.data?.email || currentUser?.email || '').toLowerCase();
  }, [profileResponse?.data?.email, currentUser?.email]);

  const currentRole = useMemo(() => {
    const role = profileResponse?.data?.current_role || (currentUser as any)?.current_role;
    return role ? role.toLowerCase() : '';
  }, [profileResponse?.data?.current_role, currentUser]);

  // Keep identity in refs for stable event callbacks
  const identityRef = useRef({ currentUserId, currentEmail, currentRole });
  useEffect(() => {
    identityRef.current = { currentUserId, currentEmail, currentRole };
  }, [currentUserId, currentEmail, currentRole]);

  // Path matches backend documentation: /ws/chat/{chat_room_id}/
  const urlPath = useMemo(() => (roomId ? `chat/${roomId}/` : ''), [roomId]);

  /**
   * Helper to determine if a message was sent by the current user
   */
  const checkIsSentByMe = useCallback((m: any) => {
    if (m.isSent === true || m.sender === 'me') return true;

    const { currentUserId: myId, currentEmail: myEmail, currentRole: myRole } = identityRef.current;

    const senderObj = typeof m.sender === 'object' && m.sender !== null ? m.sender : null;
    const senderId = senderObj?.id || m.sender_id || (typeof m.sender === 'string' && !m.sender.includes('@') ? m.sender : null);
    const rawEmail = senderObj ? senderObj.email : (m.sender_email || (typeof m.sender === 'string' && m.sender.includes('@') ? m.sender : ''));
    const senderEmail = rawEmail ? rawEmail.toLowerCase() : '';
    const senderRole = (senderObj?.active_role || m.active_role || m.senderRole || '').toLowerCase();

    // ID Match
    if (myId && senderId && String(senderId) === String(myId)) {
      if (myRole && senderRole && senderRole !== myRole) {
        // Same account tested in different roles
        return false;
      }
      return true;
    }

    // Email Match
    if (myEmail && senderEmail && senderEmail === myEmail) {
      if (myRole && senderRole && senderRole !== myRole) {
        // Same account tested in different roles
        return false;
      }
      return true;
    }

    return false;
  }, []);

  const queryClient = useQueryClient();
  const baseSendMessageRef = useRef<(event: string, data?: any) => void>(() => {});
  const markedIdsSetRef = useRef<Set<string>>(new Set());

  const markMessagesAsRead = useCallback(
    async (messageIds: string[] = []) => {
      if (!roomId) return;

      // Extract valid backend IDs (exclude temporary optimistic local-*, ws-*, temp-*)
      const validBackendIds = (messageIds || [])
        .map((id) => (id !== null && id !== undefined ? String(id) : ''))
        .filter(
          (id) =>
            id &&
            !id.startsWith('local-') &&
            !id.startsWith('ws-') &&
            !id.startsWith('temp-')
        );

      // Check if all of these valid IDs were already processed
      const unhandled = validBackendIds.filter((id) => !markedIdsSetRef.current.has(id));
      if (validBackendIds.length > 0 && unhandled.length === 0) {
        return;
      }
      validBackendIds.forEach((id) => markedIdsSetRef.current.add(id));

      console.log(`👁️ [markMessagesAsRead] Marking ${validBackendIds.length} messages read in room ${roomId}:`, validBackendIds);

      // 1. Optimistic local state update in current room
      if (validBackendIds.length > 0) {
        setMessages((prev) =>
          prev.map((m) =>
            validBackendIds.includes(String(m.id)) ? { ...m, is_read: true, read: true, status: 'read' } : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => ({ ...m, is_read: true, read: true, status: 'read' }))
        );
      }

      // 2. WebSocket event: Send { type: "read_messages", message_ids: validBackendIds }
      if (validBackendIds.length > 0) {
        try {
          baseSendMessageRef.current('read_messages', { message_ids: validBackendIds });
        } catch (wsErr) {
          console.warn('⚠️ [P2P Chat WS Mark Read]:', wsErr);
        }
      }

      // 3. REST API call: POST /chat-rooms/{roomId}/mark-read/
      try {
        console.log(`📡 [P2P Chat REST Mark Read] Sending request for room ${roomId} with ${validBackendIds.length} IDs...`);
        const res = await communicationsAPI.markMessagesAsRead(roomId, validBackendIds);
        console.log(`✅ [P2P Chat REST Mark Read Success]:`, res);
      } catch (err: any) {
        console.warn('⚠️ [P2P Chat Mark Read REST Error]:', err?.response?.data || err?.message || err);
      }

      // 4. Mark all chat notifications as read on /communications/notifications/
      try {
        await communicationsAPI.markChatNotificationsAsRead([]);
      } catch (_) {}

      // 5. Optimistically update cached chatRooms so Navbar badge and Inbox show 0 unread instantly
      queryClient.setQueryData(['chatRooms'], (oldData: any) => {
        if (!oldData) return oldData;
        const updateRoomList = (rooms: any[]) =>
          rooms.map((r: any) => (String(r.id) === String(roomId) ? { ...r, unread_count: 0 } : r));

        if (Array.isArray(oldData?.data?.results)) {
          return { ...oldData, data: { ...oldData.data, results: updateRoomList(oldData.data.results) } };
        }
        if (Array.isArray(oldData?.results?.data)) {
          return { ...oldData, results: { ...oldData.results, data: updateRoomList(oldData.results.data) } };
        }
        if (Array.isArray(oldData?.data)) {
          return { ...oldData, data: updateRoomList(oldData.data) };
        }
        if (Array.isArray(oldData?.results)) {
          return { ...oldData, results: updateRoomList(oldData.results) };
        }
        if (Array.isArray(oldData)) {
          return updateRoomList(oldData);
        }
        return oldData;
      });
    },
    [roomId, queryClient]
  );

  /**
   * Fetch historical messages from the REST API.
   * Runs immediately on mount when roomId is available and periodically in background.
   */
  const fetchHistory = useCallback(
    async (isSilent: boolean = false) => {
      if (!roomId || !enabled) return;

      try {
        if (!isSilent) {
          setIsLoadingHistory(true);
        }
        console.log(`📜 [P2P Chat History] Fetching messages for room: ${roomId} (silent: ${isSilent})`);
        const response = await communicationsAPI.getRoomMessages(roomId);
        const historicalData = extractMessages(response);

        const mappedHistory = historicalData.map((m: any) => {
          const payload = typeof m.message === 'object' && m.message !== null ? m.message : m;
          const senderObj = typeof payload.sender === 'object' && payload.sender !== null ? payload.sender : null;
          const senderEmail = senderObj ? senderObj.email : (payload.sender_email || payload.sender);
          const senderRole = senderObj ? senderObj.active_role : payload.active_role;
          const rawContent = payload.content ?? (typeof payload.message === 'string' ? payload.message : '') ?? payload.text ?? '';
          const text = typeof rawContent === 'string' ? rawContent : (rawContent?.content || rawContent?.text || '');
          const isSentByMe = checkIsSentByMe(payload);

          const isRead = payload.is_read === true || payload.read === true || payload.isRead === true;
          const messageId = payload.id || m.id || payload.uuid || m.uuid || payload.message_id || m.message_id;

          return {
            ...payload,
            id: messageId,
            text,
            sender: senderEmail,
            senderRole,
            isSent: isSentByMe,
            status: isRead ? 'read' : 'sent',
            is_read: isRead,
            read: isRead,
            timestamp: payload.created_at || payload.timestamp || new Date().toISOString(),
            type: 'chat_message',
            messageType: payload.message_type || 'text',
            fileUrl: payload.file_url || payload.fileUrl || null,
          };
        });

        // Deduplicate historical messages: same text, same sender within 3 seconds
        const deduplicatedHistory: any[] = [];
        for (const m of mappedHistory) {
          const isDup = deduplicatedHistory.some((existing) => {
            if (existing.text !== m.text) return false;
            if (existing.isSent !== m.isSent) return false;
            const timeDiff = Math.abs(new Date(existing.timestamp).getTime() - new Date(m.timestamp).getTime());
            return !isNaN(timeDiff) && timeDiff < 3000;
          });
          if (!isDup) {
            deduplicatedHistory.push(m);
          }
        }

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id?.toString()));
          const newApiMessages = deduplicatedHistory.filter((m: any) => !existingIds.has(m.id?.toString()));

          if (newApiMessages.length === 0 && prev.length > 0) {
            // Update read statuses without rewriting array
            return prev.map((oldMsg) => {
              const matchedApi = deduplicatedHistory.find((h) => String(h.id) === String(oldMsg.id));
              if (matchedApi && matchedApi.is_read !== oldMsg.is_read) {
                return { ...oldMsg, is_read: matchedApi.is_read, read: matchedApi.read, status: matchedApi.status };
              }
              return oldMsg;
            });
          }

          let updated = [...prev];
          for (const apiMsg of newApiMessages) {
            // If there's an optimistic local message with matching text, replace it with the real server message
            const localIdx = updated.findIndex(
              (m) =>
                (m.status === 'sending' || m.id?.toString().startsWith('local-')) &&
                m.text === apiMsg.text
            );
            if (localIdx !== -1) {
              updated[localIdx] = { ...updated[localIdx], ...apiMsg, status: 'sent' };
            } else {
              updated.push(apiMsg);
            }
          }

          return updated.sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });

        // Extract all message IDs from history to mark as read
        const allHistoryIds = deduplicatedHistory
          .map((m: any) => m.id || m.uuid || m.message_id || m.message?.id)
          .filter((id: any) => id && !String(id).startsWith('local-') && !String(id).startsWith('ws-') && !String(id).startsWith('temp-'))
          .map(String);

        const incomingHistoryIds = deduplicatedHistory
          .filter((m: any) => !m.isSent)
          .map((m: any) => m.id || m.uuid || m.message_id || m.message?.id)
          .filter((id: any) => id && !String(id).startsWith('local-') && !String(id).startsWith('ws-') && !String(id).startsWith('temp-'))
          .map(String);

        const idsToMark = incomingHistoryIds.length > 0 ? incomingHistoryIds : allHistoryIds;

        if (idsToMark.length > 0) {
          markMessagesAsRead(idsToMark);
        }
      } catch (err) {
        console.error(`❌ [P2P Chat History] Failed:`, err);
      } finally {
        if (!isSilent) {
          setIsLoadingHistory(false);
        }
      }
    },
    [roomId, enabled, checkIsSentByMe, markMessagesAsRead]
  );

  // Initial fetch on mount
  useEffect(() => {
    fetchHistory(false);
  }, [roomId, enabled]);

  // Periodic silent background sync every 3.5s while active in the chat room
  useEffect(() => {
    if (!roomId || !enabled) return;

    const interval = setInterval(() => {
      fetchHistory(true);
    }, 3500);

    return () => clearInterval(interval);
  }, [roomId, enabled, fetchHistory]);

  // Watch for query cache invalidations from notification socket or global banner
  useEffect(() => {
    if (!roomId || !enabled) return;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event?.type === 'updated' ||
        event?.type === 'observerResultsUpdated' ||
        event?.type === 'removed'
      ) {
        const queryKey = event.query?.queryKey;
        if (
          Array.isArray(queryKey) &&
          (queryKey[0] === 'chat-messages' || queryKey[0] === 'chatRooms') &&
          (!queryKey[1] || String(queryKey[1]) === String(roomId))
        ) {
          fetchHistory(true);
        }
      }
    });

    return () => unsubscribe();
  }, [roomId, enabled, queryClient, fetchHistory]);

  // Watch for latest chat notification in notification store
  const lastNotification = useNotificationStore((state) => state.recentNotifications[0]);
  useEffect(() => {
    if (!lastNotification || !roomId) return;
    const rawType: string = (lastNotification.type || lastNotification.data?.notification_type || '').toLowerCase();
    const notifRoomId =
      lastNotification.data?.room_id ||
      lastNotification.data?.roomId ||
      lastNotification.data?.chat_room_id ||
      lastNotification.data?.related_object_id;

    const isChat = rawType === 'chat' || rawType.includes('chat') || rawType === 'p2p';
    if (isChat && (!notifRoomId || String(notifRoomId) === String(roomId))) {
      fetchHistory(true);
    }
  }, [lastNotification?.timestamp, roomId, fetchHistory]);

  /**
   * Incoming WebSocket message handler
   */
  const handleIncomingMessage = useCallback((data: WebSocketMessage) => {
    console.log('💬 [P2P Chat WS] Message received:', data);

    // Filter out system / connection status events
    const rawType = (data.type || data.event || '').toLowerCase();
    if (
      rawType === 'connection' ||
      rawType === 'connect' ||
      rawType === 'status' ||
      rawType === 'ping' ||
      rawType === 'pong' ||
      rawType === 'system'
    ) {
      console.log('ℹ️ [P2P Chat WS] Ignored system event:', rawType);
      return;
    }

    // Unpack if wrapped inside message/data object from Django Channels
    const payload = (typeof data.message === 'object' && data.message !== null)
      ? data.message
      : (typeof data.data === 'object' && data.data !== null)
      ? data.data
      : data;

    const rawContent = payload.content ?? (typeof data.message === 'string' ? data.message : '') ?? payload.text ?? '';
    const text = typeof rawContent === 'string' ? rawContent : (rawContent?.content || rawContent?.text || '');
    if (!text && !payload.id && !data.id) return;

    if (text.trim() === 'Connected to chat room' || text.toLowerCase().includes('connected to chat')) {
      return;
    }

    setMessages((prev) => {
      // Avoid duplicate by ID
      const incomingId = payload.id || data.id;
      if (incomingId && prev.some((m) => m.id && String(m.id) === String(incomingId))) {
        return prev;
      }

      const senderObj = typeof payload.sender === 'object' && payload.sender !== null
        ? payload.sender
        : (typeof data.sender === 'object' && data.sender !== null ? data.sender : null);
      const senderEmail = senderObj ? senderObj.email : (payload.sender_email || data.sender_email || payload.sender || data.sender);
      const senderRole = senderObj ? senderObj.active_role : (payload.active_role || data.active_role);
      const isSentByMe = checkIsSentByMe(payload) || checkIsSentByMe(data);

      const mappedMessage = {
        ...data,
        ...payload,
        id: incomingId || `ws-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: payload.created_at || data.created_at || payload.timestamp || data.timestamp || new Date().toISOString(),
        text,
        isSent: isSentByMe,
        sender: senderEmail,
        senderRole,
        senderName: senderObj?.full_name || payload.sender_name || data.sender_name || (isSentByMe ? 'You' : 'Participant'),
        status: 'sent',
        messageType: payload.message_type || data.message_type || 'text',
        fileUrl: payload.file_url || payload.fileUrl || data.file_url || null,
      };

      // Optimistic deduplication: replace matching local pending message
      if (mappedMessage.text) {
        const localIndex = prev.findIndex(
          (m) =>
            (m.status === 'sending' || m.id?.toString().startsWith('local-')) &&
            m.text === mappedMessage.text
        );
        if (localIndex !== -1) {
          const updated = [...prev];
          updated[localIndex] = { ...updated[localIndex], ...mappedMessage, status: 'sent' };
          return updated;
        }
      }

      // Deduplicate: same sender & same text within 3 seconds
      const isDuplicate = prev.some((m) => {
        if (m.text !== mappedMessage.text) return false;
        if (m.isSent !== mappedMessage.isSent) return false;
        const timeDiff = Math.abs(new Date(m.timestamp).getTime() - new Date(mappedMessage.timestamp).getTime());
        return timeDiff < 3000;
      });
      if (isDuplicate) {
        return prev;
      }

      // If received from the other party:
      if (mappedMessage.text && !mappedMessage.isSent) {
        playMechanicNotificationSound();

        // 1. Schedule native OS notification (for when device is locked/backgrounded)
        import('@/services/notificationService')
          .then((service) => {
            service.scheduleChatMessageNotification({
              senderName: mappedMessage.senderName,
              message: mappedMessage.text,
              roomId: roomId,
              type: 'p2p',
            });
          })
          .catch(() => {});

        // 2. Mark as read immediately since user is actively in the chat room
        if (mappedMessage.id && !mappedMessage.id.toString().startsWith('ws-')) {
          markMessagesAsRead([mappedMessage.id.toString()]);
        }
      }

      return [...prev, mappedMessage].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });
  }, [roomId, checkIsSentByMe, markMessagesAsRead]);

  const handleReadReceipt = useCallback(
    (data: any) => {
      console.log('👁️ [P2P Chat WS Incoming Read Receipt]:', data);
      const payload =
        typeof data.message === 'object' && data.message !== null
          ? data.message
          : typeof data.data === 'object' && data.data !== null
          ? data.data
          : data;

      const rawIds =
        payload.message_ids ||
        data.message_ids ||
        (payload.message_id ? [payload.message_id] : data.message_id ? [data.message_id] : []);
      const readIds = Array.isArray(rawIds) ? rawIds.map(String) : [];

      setMessages((prev) =>
        prev.map((m) => {
          if (readIds.length === 0 || readIds.includes(String(m.id))) {
            return { ...m, is_read: true, read: true, status: 'read' };
          }
          return m;
        })
      );
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
    },
    [queryClient]
  );

  const eventHandlers = useMemo(
    () => ({
      chat_message: handleIncomingMessage,
      'chat-message': handleIncomingMessage,
      'chat.message': handleIncomingMessage,
      message: handleIncomingMessage,
      new_message: handleIncomingMessage,
      'new-message': handleIncomingMessage,
      chat: handleIncomingMessage,
      send_message: handleIncomingMessage,
      room_message: handleIncomingMessage,
      typing: (data: WebSocketMessage) => {
        setIsTyping(!!data.is_typing);
      },
      messages_read: handleReadReceipt,
      read_messages: handleReadReceipt,
      message_read: handleReadReceipt,
      chat_read: handleReadReceipt,
      read: handleReadReceipt,
      '*': (data: WebSocketMessage) => {
        const t = (data?.type || data?.event || '').toLowerCase();
        if (t === 'connection' || t === 'connect' || t === 'system' || t === 'ping' || t === 'pong') return;
        const payload =
          typeof data.message === 'object' && data.message !== null
            ? data.message
            : typeof data.data === 'object' && data.data !== null
            ? data.data
            : data;
        const rawText = payload?.content ?? (typeof data.message === 'string' ? data.message : '') ?? payload?.text ?? '';
        if (rawText && rawText.trim() !== 'Connected to chat room') {
          handleIncomingMessage(data);
        } else if (payload?.id || data?.id) {
          handleIncomingMessage(data);
        }
      },
    }),
    [handleIncomingMessage, handleReadReceipt]
  );

  const handleWebSocketConnect = useCallback(() => {
    console.log('🟢 [P2P Chat WS onConnect] Connected to room:', roomId);
    // Send read receipt over WebSocket for all existing incoming messages once socket connects
    const incomingIds = messages
      .filter((m) => !m.isSent && m.id && !String(m.id).startsWith('local-') && !String(m.id).startsWith('ws-') && !String(m.id).startsWith('temp-'))
      .map((m) => String(m.id));

    if (incomingIds.length > 0) {
      try {
        baseSendMessageRef.current('read_messages', { message_ids: incomingIds });
      } catch (_) {}
    }
  }, [roomId, messages]);

  const { isConnected, sendMessage: baseSendMessage, reconnect } = useWebSocket({
    urlPath,
    eventHandlers,
    onConnect: handleWebSocketConnect,
    enabled: enabled && !!roomId,
  });

  useEffect(() => {
    baseSendMessageRef.current = baseSendMessage;
  }, [baseSendMessage]);

  const sendMessage = useCallback(
    async (content: string, messageType: string = 'text') => {
      if (!roomId || !content?.trim()) return;

      const trimmed = content.trim();
      const localId = `local-${Date.now()}`;
      const localMessage = {
        content: trimmed,
        message_type: messageType,
        text: trimmed,
        sender: 'me',
        isSent: true,
        created_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        id: localId,
        status: 'sending',
      };

      setMessages((prev) => [...prev, localMessage]);

      // 1. Send via WebSocket for instant delivery to active room
      if (isConnected) {
        try {
          baseSendMessage('chat_message', {
            room_id: roomId,
            content: trimmed,
            message: trimmed,
            message_type: messageType,
          });
        } catch (wsErr) {
          console.warn('⚠️ [P2P Chat WS Send Failed]:', wsErr);
        }
      }

      // 2. Persist via REST API — ensures DB persistence, notifications, and official message ID
      try {
        const response = await communicationsAPI.sendMessage(roomId, trimmed, messageType);
        const serverId = response?.data?.id || response?.id || response?.results?.id;
        queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
        queryClient.invalidateQueries({ queryKey: ['chat-messages', String(roomId)] });
        setMessages((prev) =>
          prev.map((m) => (m.id === localId ? { ...m, id: serverId || m.id, status: 'sent' } : m))
        );
      } catch (err) {
        if (isConnected) {
          // If WS sent, consider it sent optimistically
          setMessages((prev) =>
            prev.map((m) => (m.id === localId ? { ...m, status: 'sent' } : m))
          );
        } else {
          console.error(`❌ [P2P Chat Send REST] Failed:`, err);
          setMessages((prev) =>
            prev.map((m) => (m.id === localId ? { ...m, status: 'failed' as any } : m))
          );
        }
      }
    },
    [roomId, baseSendMessage, isConnected, queryClient]
  );

  const sendTypingStatus = useCallback(
    (isTypingStatus: boolean) => {
      baseSendMessage('typing', { is_typing: isTypingStatus });
    },
    [baseSendMessage]
  );

  return {
    messages,
    isTyping,
    isLoadingHistory,
    isConnected,
    sendMessage,
    sendTypingStatus,
    markMessagesAsRead,
    reconnect,
  };
};
