import api from '../axios';
import { SERVICE_ENDPOINTS } from '../endpoints';

export interface ChatParticipant {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  created_at: string;
  message_type: 'text' | 'image' | 'file';
}

export interface ChatRoom {
  id: string;
  other_participant: ChatParticipant;
  unread_count: number;
  last_message: ChatMessage | null;
  created_at: string;
  updated_at: string;
}

export interface ChatRoomsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    status: boolean;
    message: string;
    data: ChatRoom[];
  };
}

/**
 * Helper to safely extract chat room array regardless of backend wrapper structure.
 * Handles { data: { results: [...] } }, { results: { data: [...] } }, { data: [...] }, { results: [...] }, and raw arrays.
 */
export const extractChatRooms = (response: any): ChatRoom[] => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data?.results)) return response.data.results;
  if (Array.isArray(response?.results?.data)) return response.results.data;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  return [];
};

/**
 * Helper to safely extract chat message array regardless of backend wrapper structure.
 */
export const extractMessages = (response: any): any[] => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data?.results)) return response.data.results;
  if (Array.isArray(response?.results?.data)) return response.results.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  return [];
};

export const communicationsAPI = {
  /**
   * Retrieves all chat rooms for the authenticated user.
   */
  getChatRooms: async (): Promise<ChatRoomsResponse> => {
    const response = await api.get(SERVICE_ENDPOINTS.COMMUNICATIONS_CHAT_ROOMS);
    return response.data;
  },

  /**
   * Retrieves messages for a specific chat room.
   */
  getRoomMessages: async (roomId: string): Promise<any> => {
    const cleanRoomId = roomId.replace(/^\/|\/$/g, '');
    const response = await api.get(`${SERVICE_ENDPOINTS.COMMUNICATIONS_CHAT_ROOMS}${cleanRoomId}/messages/`);
    return response.data;
  },

  /**
   * Initializes a conversation with another user. 
   * Returns existing room if one already exists.
   */
  createChatRoom: async (participantIds: string[]): Promise<any> => {
    const response = await api.post(SERVICE_ENDPOINTS.COMMUNICATIONS_CHAT_ROOMS, {
      participant_ids: participantIds
    });
    return response.data;
  },

  /**
   * Sends a message via REST (Fallback method).
   */
  sendMessage: async (roomId: string, content: string, messageType: string = 'text'): Promise<any> => {
    const cleanRoomId = roomId.replace(/^\/|\/$/g, '');
    const response = await api.post(`${SERVICE_ENDPOINTS.COMMUNICATIONS_CHAT_ROOMS}${cleanRoomId}/messages/`, {
      content,
      message_type: messageType
    });
    return response.data;
  },

  /**
   * Marks specific messages as read.
   */
  markMessagesAsRead: async (roomId: string, messageIds: string[] = []): Promise<any> => {
    const cleanRoomId = roomId.replace(/^\/|\/$/g, '');
    const payload = {
      message_ids: (messageIds || []).map(String)
    };
    console.log(`🌐 [communicationsAPI.markMessagesAsRead] POST to ${cleanRoomId}:`, payload);
    const response = await api.post(`${SERVICE_ENDPOINTS.COMMUNICATIONS_CHAT_ROOMS}${cleanRoomId}/mark-read/`, payload);
    return response.data;
  },

  /**
   * Lists unread chat notifications for the authenticated user.
   */
  getChatNotifications: async (): Promise<any> => {
    const response = await api.get(SERVICE_ENDPOINTS.COMMUNICATIONS_NOTIFICATIONS);
    return response.data;
  },

  /**
   * Marks chat notifications as read.
   * Pass notification_ids or leave empty to mark all as read.
   */
  markChatNotificationsAsRead: async (notificationIds: string[] = []): Promise<any> => {
    const response = await api.patch(SERVICE_ENDPOINTS.COMMUNICATIONS_NOTIFICATIONS, {
      notification_ids: notificationIds
    });
    return response.data;
  },
};

