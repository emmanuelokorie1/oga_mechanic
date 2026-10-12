
import React, { useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import ChatScreen from "@/components/templates/ChatScreen";
import { images } from "@/constants";
import { Message } from "@/utils/chatUtils";
import { useChatWebSocket } from "@/hooks/useChatWebSocket";
import { useUserStore } from "@/stores/userStore";
import { routes } from "@/constants/routes";

import { supportAPI } from "@/lib/api/support";

const ChatSpecialist = () => {
  const { roomId: searchRoomId, prefill } = useLocalSearchParams<{ roomId: string; prefill?: string }>();
  const { user, accessToken, hasHydrated, setTokens, setUser } = useUserStore();
  const [pendingFirstMessage, setPendingFirstMessage] = React.useState<Message | null>(null);

  // If no searchRoomId, we are in "Draft Mode" (starting a new chat)
  const isNewChat = !searchRoomId;
  const activeConversationId = searchRoomId || "";

  useEffect(() => {
    console.log("📱 [ChatSpecialist] Init. roomId:", activeConversationId, "isNewChat:", isNewChat);
  }, [activeConversationId, isNewChat]);

  // Session Recovery — must be before any returns
  useEffect(() => {
    const recover = async () => {
      if (hasHydrated && !accessToken) {
        const storedToken = await AsyncStorage.getItem("auth_token");
        const storedUser = await AsyncStorage.getItem("user_data");
        const storedRefresh = await AsyncStorage.getItem("refresh_token");
        if (storedToken && storedUser) {
          setTokens(storedToken, storedRefresh || "");
          setUser(JSON.parse(storedUser));
        }
      }
    };
    recover();
  }, [hasHydrated, accessToken, setTokens, setUser]);

  const {
    messages: wsMessages,
    sendMessage,
    isTyping,
    isLoadingHistory,
    sendTypingStatus,
    markAsRead,
    isConnected,
    reconnect,
    hasMore,
    loadMore,
  } = useChatWebSocket(activeConversationId, !isNewChat);

  // Memoize BEFORE any early returns — Rules of Hooks
  const participant = useMemo(() => ({
    name: "Oga Mechanic Specialist",
    phone: "Support",
    avatar: images.dummyProfile,
    isOnline: isConnected,
    lastSeen: isConnected ? "Online" : isNewChat ? "Ready to chat" : "Connecting...",
  }), [isConnected, isNewChat]);

  useEffect(() => {
    console.log("📱 [ChatSpecialist] wsMessages changed. Count:", wsMessages.length);
    if (!isNewChat && wsMessages.length > 0) {
      // Find unread messages from staff
      const unreadStaffMessageIds = wsMessages
        .filter(m => m.sender === 'staff' && !m.is_read)
        .map(m => m.id?.toString());
      
      if (unreadStaffMessageIds.length > 0) {
        console.log("👁️ [ChatSpecialist] Marking unread staff messages as read:", unreadStaffMessageIds);
        markAsRead(unreadStaffMessageIds);
      }
    }
  }, [wsMessages, isNewChat, markAsRead]);

  const messages: Message[] = useMemo(() => {
    const mapped = wsMessages
      .filter((m: any) => {
        // Drop any message that has no displayable text and no file
        const textContent = m.content || m.message || "";
        const hasText = typeof textContent === 'string' && textContent.trim().length > 0;
        const hasFile = !!m.file_url || !!m.fileUrl;
        return hasText || hasFile;
      })
      .map((m, index) => ({
        id: m.id || `msg-${index}`,
        text: (typeof m.content === 'string' ? m.content : '') || (typeof m.message === 'string' ? m.message : '') || "",
        isSent: m.sender === "me",
        timestamp: m.created_at
          ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : "",
        status: (m.sender === "me" 
          ? (m.is_read ? 'read' : 'sent') 
          : 'read') as 'read' | 'sent' | 'sending' | 'delivered',
      }));

    // Deduplicate by ID and content to guarantee no duplicates render
    const uniqueMessages: Message[] = [];
    const seenIds = new Set<string>();

    for (const msg of mapped) {
      const idStr = msg.id?.toString();
      if (idStr && !idStr.startsWith('local-')) {
        if (seenIds.has(idStr)) continue;
        seenIds.add(idStr);
      }
      uniqueMessages.push(msg);
    }

    // If we have an optimistic first message, prepend/append it appropriately
    if (isNewChat && pendingFirstMessage) {
      return [pendingFirstMessage];
    }

    return uniqueMessages;
  }, [wsMessages, isNewChat, pendingFirstMessage]);

  /**
   * Universal message handler:
   * 1. If active room: Uses WebSocket
   * 2. If new chat: Creates conversation via POST first
   */
  const handleSendMessage = async (content: string) => {
    if (isNewChat) {
      try {
        console.log("🆕 [Chat Activation] Creating new support conversation...");
        
        // Optimistic UI for the first message
        setPendingFirstMessage({
          id: 'pending-1',
          text: content,
          isSent: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sending' as any,
        });

        const response = await supportAPI.createConversation({
          subject: content.slice(0, 50), // Auto-subject from first message
          message: content,
          priority: "medium",
        });

        if (response.status && response.data.id) {
          console.log("✅ [Chat Activation] Created room:", response.data.id);
          // Transition to active mode
          router.setParams({ roomId: response.data.id });
        }
      } catch (err) {
        console.error("❌ [Chat Activation] Failed to create conversation:", err);
        setPendingFirstMessage(null); // Clear optimistic state on error
      }
    } else {
      sendMessage(content);
    }
  };

  const handleAttachFile = async (file: { uri: string; name: string; mimeType: string }) => {
    if (isNewChat) {
      alert("Please send a text message first to start the conversation before sending files.");
      return;
    }

    try {
      console.log("📤 [Chat Attachment] Uploading file:", file.name);
      const isImage = file.mimeType.startsWith("image/");
      const messageType = isImage ? "image" : "file";
      
      const fileObj = {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream",
      };

      const response = await supportAPI.uploadFile(fileObj);
      
      if (response.status && response.data?.file_url) {
        console.log("✅ [Chat Attachment] Upload successful:", response.data.file_url);
        sendMessage(`Attachment: ${file.name}`, messageType, response.data.file_url);
      } else {
        alert("Upload failed. " + (response.message || "Unknown error"));
      }
    } catch (err: any) {
      console.error("❌ [Chat Attachment] Error:", err);
      alert("Error uploading file. Please try again.");
    }
  };

  // --- Early returns AFTER all hooks ---

  if (hasHydrated && !accessToken) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Authentication Required</Text>
        <Text style={{ textAlign: 'center', color: '#666', marginBottom: 20 }}>
          You need to be logged in to chat with a specialist.
        </Text>
        <TouchableOpacity
          onPress={() => router.push(routes.signIn as any)}
          style={{ backgroundColor: '#000', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Update loading logic to allow empty searchRoomId (New Chat)
  if (!hasHydrated && !isNewChat) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={{ marginTop: 15, color: '#666' }}>Resuming your session...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ChatScreen
        participant={participant}
        messages={messages}
        onSendMessage={handleSendMessage}
        onTyping={isNewChat ? undefined : sendTypingStatus}
        onReconnect={isNewChat ? undefined : reconnect}
        isTyping={isTyping}
        isLoadingHistory={isLoadingHistory}
        initialText={prefill as string | undefined}
        headerSubtitle={isNewChat ? "Start a new conversation" : isConnected ? "Chat with specialist" : "Connecting..."}
        onAttachFile={handleAttachFile}
        onLoadMore={loadMore}
        hasMore={hasMore}
      />
    </View>
  );
};



export default ChatSpecialist;