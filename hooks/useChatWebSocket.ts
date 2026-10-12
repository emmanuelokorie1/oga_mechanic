import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import useWebSocket, { WebSocketMessage } from './useWebSocket';
import { supportAPI } from '@/lib/api/support';

/**
 * Specialized WebSocket hook for the Specialist Chat system.
 * Built on top of the production-ready useWebSocket foundation.
 */
export const useChatWebSocket = (roomId: string, enabled: boolean = true) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Socket-First Construction: Matches the /ws/support/chat/{id}/ channel exactly
  const urlPath = useMemo(() => 
    `support/chat/${roomId}/`,
    [roomId]
  );

  /**
   * Fetch historical messages from the REST API.
   * Runs whenever the roomId becomes valid and enabled is true.
   */
  const fetchHistory = useCallback(async (currentOffset?: number) => {
    if (!roomId || !enabled) return;
    
    try {
      setIsLoadingHistory(true);
      const limit = 20;
      
      // 1. If no offset is provided, we need to find the "tail" (latest messages)
      let targetOffset = currentOffset;
      
      if (targetOffset === undefined) {
        const initialRes = await supportAPI.getMessages(roomId, 1, 0);
        const totalCount = initialRes?.count || 0;
        
        // Calculate offset to get the last 'limit' messages
        targetOffset = Math.max(0, totalCount - limit);
        setOffset(targetOffset);
        
        // If we are starting from 0, there is no more "previous" data
        if (targetOffset === 0) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }

      const response = await supportAPI.getMessages(roomId, limit, targetOffset);
      
      const historicalData = response?.results?.data || response?.data || [];
      
      // Bug 13 fix: only set hasMore=false after a page returns fewer results
      // than requested, not based on offset calculation
      if (historicalData.length < limit) {
        setHasMore(false);
      }
      
      const mappedHistory = historicalData.map((m: any) => {
        let isStaff = false;
        if (typeof m.sender === 'object' && m.sender !== null) {
          isStaff = !!m.sender?.is_staff;
        } else if (typeof m.sender === 'string') {
          isStaff = m.sender === 'staff' || !!m.sender_is_staff;
        } else {
          isStaff = !!m.sender_is_staff;
        }

        return {
          ...m,
          text: m.content || m.message || "", 
          sender: isStaff ? 'staff' : 'me',
          isSent: !isStaff,
          status: 'sent',
          is_read: m.is_read || false,
          timestamp: m.created_at || new Date().toISOString(),
          type: 'chat_message',
          messageType: m.message_type || 'text',
          fileUrl: m.file_url || undefined,
        };
      });

      setMessages((prev) => {
        const existingIds = new Set(prev.map(m => m.id?.toString()));
        const filteredHistory = mappedHistory.filter((m: any) => !existingIds.has(m.id?.toString()));
        
        // Combine and sort chronologically
        return [...prev, ...filteredHistory].sort((a, b) => 
          new Date(a.created_at || a.timestamp).getTime() - new Date(b.created_at || b.timestamp).getTime()
        );
      });
    } catch (err) {
      // History fetch errors are non-fatal — leave existing messages in place
    } finally {
      setIsLoadingHistory(false);
    }
  }, [roomId, enabled]);

  /**
   * Loads the previous page of history (older messages).
   */
  const loadMore = useCallback(() => {
    if (isLoadingHistory || !hasMore) return;
    
    // In tail-first mode, we move the offset backwards to get older data
    const nextOffset = Math.max(0, offset - 20);
    
    setOffset(nextOffset);
    // Bug 13 fix: do NOT set hasMore=false here — wait for the response
    // to come back with 0/fewer results before disabling further loads.
    fetchHistory(nextOffset);
  }, [offset, hasMore, isLoadingHistory, fetchHistory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /**
   * Event handlers for chat-specific messages.
   * Memoized to prevent hook instability.
   */
  const eventHandlers = useMemo(() => ({
    connection_established: (_data: any) => {
      // Connection ready — nothing to do here
    },
    chat_message: (data: WebSocketMessage) => {
      const msgData = data.message && typeof data.message === 'object' ? data.message : data;
      const textContent = msgData.content || msgData.message || "";

      setMessages((prev) => {
        // 1. Strict ID Check
        const existsById = prev.some(m => m.id && m.id?.toString() === msgData.id?.toString());
        if (existsById) {
          return prev;
        }

        // 2. Resolve sender status (staff vs me)
        let isStaff = false;
        if (typeof msgData.sender === 'object' && msgData.sender !== null) {
          isStaff = !!msgData.sender?.is_staff;
        } else if (typeof msgData.sender === 'string') {
          isStaff = msgData.sender === 'staff' || !!msgData.sender_is_staff;
        } else {
          isStaff = !!msgData.sender_is_staff;
        }

        const mappedMessage = {
          ...msgData,
          id: msgData.id || Date.now().toString(),
          timestamp: msgData.created_at || new Date().toISOString(),
          text: textContent,
          sender: isStaff ? 'staff' : 'me',
          isSent: !isStaff,
          status: 'sent',
          is_read: msgData.is_read || false,
          messageType: msgData.message_type || 'text',
          fileUrl: msgData.file_url || undefined,
        };

        // 3. Optimistic Content Check (for user's own echoes)
        if (mappedMessage.isSent) {
          const alreadyExistsIndex = prev.findIndex(m => 
            (m.isSent || m.sender === 'me') &&
            (m.id?.toString().startsWith('local-') || m.status === 'sending' || m.id?.toString() === mappedMessage.id?.toString()) &&
            ((m.text || m.content || m.message) === textContent)
          );

          if (alreadyExistsIndex !== -1) {
            const newMessages = [...prev];
            newMessages[alreadyExistsIndex] = {
              ...newMessages[alreadyExistsIndex],
              ...mappedMessage,
              id: mappedMessage.id,
              status: 'sent',
              timestamp: mappedMessage.timestamp || newMessages[alreadyExistsIndex].timestamp
            };
            return newMessages;
          }
        }
        
        // Push Notification Integration
        if (isStaff && textContent) {
          import('@/services/notificationService').then(service => {
            service.scheduleChatMessageNotification({
              senderName: 'Oga Mechanic Specialist',
              message: textContent,
              roomId: roomId,
              type: 'support'
            });
          });
        }

        return [...prev, mappedMessage].sort((a, b) => 
          new Date(a.timestamp || a.created_at).getTime() - new Date(b.timestamp || b.created_at).getTime()
        );
      });
    },
    typing: (data: WebSocketMessage) => {
      setIsTyping(!!data.is_typing || !!data.typing);
    },
    user_typing: (data: WebSocketMessage) => {
      setIsTyping(!!data.is_typing || !!data.typing);
    },
    typing_status: (data: WebSocketMessage) => {
      setIsTyping(!!data.is_typing || !!data.typing);
    },
    messages_read: (data: any) => {
      const readIds = data.message_ids || [];
      if (readIds.length === 0) return;
      setMessages((prev) => 
        prev.map(m => {
          if (readIds.includes(m.id?.toString())) {
            return { ...m, is_read: true };
          }
          return m;
        })
      );
    }
  }), [roomId]);

  // Initialize the production-ready core logic
  const { 
    isConnected, 
    sendMessage: baseSendMessage, 
    reconnect 
  } = useWebSocket({
    urlPath,
    eventHandlers,
    enabled: enabled && !!roomId,
  });

  /**
   * Sends a message with an optimistic UI update.
   * Uses REST for transmission to ensure reliability.
   */
  const sendMessage = useCallback(async (content: string, messageType: string = 'text', fileUrl?: string) => {
    if (!roomId) return;

    const timestamp = new Date().toISOString();
    const localId = `local-${Date.now()}`;
    
    // 1. Optimistic Update: Add to UI immediately
    const localMessage = {
      type: 'chat_message',
      content,
      text: content,
      message: content,
      message_type: messageType,
      file_url: fileUrl,
      messageType,
      fileUrl,
      sender: 'me',
      isSent: true,
      created_at: timestamp,
      timestamp,
      id: localId,
      status: 'sending'
    };
    setMessages((prev) => [...prev, localMessage]);

    try {
      // 2. Transmit via REST
      const response = await supportAPI.sendMessage(roomId, content, messageType, fileUrl);

      // 3. Update optimistic message with real server data
      const serverId = response?.data?.id || response?.id || response?.data?.message?.id;
      const serverCreatedAt = response?.data?.created_at || response?.created_at || response?.data?.message?.created_at;

      if (serverId) {
        setMessages((prev) => {
          const serverIdStr = serverId.toString();
          // If WebSocket echo already inserted a message with this serverId, remove the local optimistic one
          const alreadyHasServerId = prev.some(m => m.id?.toString() === serverIdStr && m.id !== localId);
          if (alreadyHasServerId) {
            return prev.filter(m => m.id !== localId);
          }
          return prev.map((m) => 
            m.id === localId 
              ? { ...m, id: serverId, created_at: serverCreatedAt || m.created_at, timestamp: serverCreatedAt || m.timestamp, status: 'sent' } 
              : m
          );
        });
      } else {
        // POST worked but response structure is unexpected — mark as sent anyway
        setMessages((prev) =>
          prev.map((m) => m.id === localId ? { ...m, status: 'sent' as any } : m)
        );
      }
    } catch (err) {
      // Mark as failed so user knows it didn't go through
      setMessages((prev) => 
        prev.map((m) => m.id === localId ? { ...m, status: 'failed' as any } : m)
      );
    }
  }, [roomId]);

  /**
   * Reports typing status to the participant.
   */
  const sendTypingStatus = useCallback((isTypingStatus: boolean) => {
    baseSendMessage('typing', { is_typing: isTypingStatus });
  }, [baseSendMessage]);

  const queryClient = useQueryClient();

  /**
   * Marks a batch of messages as read.
   */
  const markAsRead = useCallback((messageIds: string[]) => {
    if (messageIds.length === 0) return;
    
    // 1. Send to server
    baseSendMessage('read_messages', { message_ids: messageIds });
    
    // 2. Invalidate counts locally after a small delay to allow server to process
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['support-conversations'] });
    }, 500);
  }, [baseSendMessage, queryClient]);

  return {
    messages,
    isTyping,
    isLoadingHistory,
    isConnected,
    hasMore,
    loadMore,
    sendMessage,
    sendTypingStatus,
    markAsRead,
    reconnect,
  };
};
