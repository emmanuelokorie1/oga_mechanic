import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import useWebSocket, { WebSocketMessage } from './useWebSocket';
import { scheduleGenericNotification, scheduleSuccessNotification } from '../services/notificationService';
import { useNotificationStore } from '@/stores/notificationStore';
import { userProfileKeys } from './useUserProfile';
import { useProfileStore } from './useProfileStore';
import { playMechanicNotificationSound } from '../utils/sound';

interface UseNotificationWebSocketOptions {
  onNewOrder?: (order: any) => void;
  onOrderRemoved?: (orderId: string) => void;
  onRepairUpdate?: (orderId: string | null, status: string, data: any) => void;
  enabled?: boolean;
  triggerPush?: boolean;
}

/**
 * Real-time notification hook.
 * Centralizes all support and system-wide notifications.
 *
 * Repair event type variants handled (backend may use either naming convention):
 *   Top-level WS event: repair_update | repair-update | repair_status | repair-status
 *   Nested inside notification.new / notification wrappers: same values in .notification_type or .type
 */
export const useNotificationWebSocket = ({
  onNewOrder,
  onOrderRemoved,
  onRepairUpdate,
  enabled = true,
  triggerPush = false,
}: UseNotificationWebSocketOptions) => {
  const queryClient = useQueryClient();

  const extractOrderId = useCallback((data?: any): string | null => {
    // Prioritize specific repair request / order ID fields before generic row IDs
    const rawId =
      data?.related_object_id ||
      data?.related_id ||
      data?.repair_request_id ||
      data?.repair_id ||
      data?.order_id ||
      data?.data?.related_object_id ||
      data?.data?.repair_request_id ||
      data?.data?.repair_id ||
      data?.data?.order_id ||
      data?.notification?.related_object_id ||
      data?.notification?.related_id ||
      data?.notification?.repair_request_id ||
      data?.notification?.repair_id ||
      data?.notification?.order_id ||
      data?.order?.id ||
      (data?.object_type === 'repair_request' ? data?.object_id : null) ||
      data?.id ||
      data?.data?.id;
    return rawId ? String(rawId) : null;
  }, []);

  const extractRoomId = useCallback((data?: any): string | null => {
    const rawId =
      data?.room_id ||
      data?.roomId ||
      data?.chat_room_id ||
      data?.chatRoomId ||
      data?.data?.room_id ||
      data?.data?.roomId ||
      data?.notification?.room_id ||
      data?.notification?.roomId ||
      (data?.notification_type?.includes('chat') ? (data?.related_object_id || data?.related_id) : null) ||
      (data?.type?.includes('chat') ? (data?.related_object_id || data?.related_id) : null);
    return rawId ? String(rawId) : null;
  }, []);

  /**
   * Invalidate & actively refetch chat room list and open chat messages.
   */
  const invalidateChatCaches = useCallback((data?: any) => {
    queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
    queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    queryClient.refetchQueries({ queryKey: ['chat-messages'], type: 'active' });

    const roomId = extractRoomId(data);
    if (roomId) {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', String(roomId)] });
      queryClient.refetchQueries({ queryKey: ['chat-messages', String(roomId)], type: 'active' });
    }
  }, [queryClient, extractRoomId]);

  /**
   * Shared cache invalidation for any repair request status change.
   * Covers both list views and the specific order detail (tracking screen).
   */
  const invalidateRepairCaches = useCallback((data?: any) => {
    // 1. Optimistic status mutation if status is present or inferred from message
    const rawStatus = (data as any)?.status || data?.data?.status || data?.notification?.status;
    const title = String((data as any)?.title || data?.data?.title || data?.notification?.title || '').toLowerCase();
    const msg = String((data as any)?.message || data?.data?.message || data?.notification?.message || data?.body || '').toLowerCase();

    const inferredStatus = rawStatus || (
      title.includes('transit') || msg.includes('transit') ? 'in_transit' :
      title.includes('arrived') || msg.includes('arrived') ? 'arrived' :
      title.includes('accepted') || msg.includes('accepted') ? 'accepted' :
      title.includes('progress') || msg.includes('progress') ? 'in_progress' :
      title.includes('completed') || msg.includes('completed') ? 'completed' :
      null
    );

    const orderId = extractOrderId(data);

    if (inferredStatus) {
      console.log(`⚡ [invalidateRepairCaches] Optimistically updating repair cache with status '${inferredStatus}'`);
      queryClient.setQueriesData({ queryKey: ['repair-request'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.data) {
          return { ...oldData, data: { ...oldData.data, status: inferredStatus } };
        }
        return { ...oldData, status: inferredStatus };
      });
    }

    // 2. Invalidate and actively refetch list queries
    queryClient.invalidateQueries({ queryKey: ['mechanic', 'repair-requests'] });
    queryClient.invalidateQueries({ queryKey: ['user', 'repair-requests'] });
    queryClient.refetchQueries({ queryKey: ['mechanic', 'repair-requests'], type: 'active' });
    queryClient.refetchQueries({ queryKey: ['user', 'repair-requests'], type: 'active' });

    // 3. Invalidate and immediately refetch detail queries over network
    queryClient.invalidateQueries({ queryKey: ['repair-request'] });
    queryClient.refetchQueries({ queryKey: ['repair-request'], type: 'active' });

    if (orderId) {
      queryClient.invalidateQueries({ queryKey: ['repair-request', String(orderId)] });
      queryClient.refetchQueries({ queryKey: ['repair-request', String(orderId)], type: 'active' });
    }

    // 4. Trigger onRepairUpdate callback
    if (onRepairUpdate) {
      onRepairUpdate(orderId, inferredStatus || '', data);
    }
  }, [queryClient, extractOrderId, onRepairUpdate]);

  /**
   * Invalidate order caches for Sellers, Vehicle Rentals, and Customers.
   */
  const invalidateOrderCaches = useCallback((data?: any) => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['merchant-analytics'] });
    const orderId = extractOrderId(data);
    if (orderId) {
      queryClient.invalidateQueries({ queryKey: ['order', String(orderId)] });
      queryClient.invalidateQueries({ queryKey: ['orderDetail', String(orderId)] });
      queryClient.invalidateQueries({ queryKey: ['orderStatus', String(orderId)] });
    }
  }, [queryClient, extractOrderId]);

  /**
   * Invalidate bidding caches for live auctions and bids.
   */
  const invalidateBiddingCaches = useCallback((data?: any) => {
    queryClient.invalidateQueries({ queryKey: ['productBids'] });
    queryClient.invalidateQueries({ queryKey: ['my-bids'] });
    queryClient.invalidateQueries({ queryKey: ['active-bidding-products'] });
    queryClient.invalidateQueries({ queryKey: ['biddingCarousel'] });
    const productId = data?.product_id || data?.productId || data?.data?.product_id;
    if (productId) {
      queryClient.invalidateQueries({ queryKey: ['productDetail', String(productId)] });
    }
  }, [queryClient]);

  /**
   * Invalidate profile caches whenever an account, KYC, or profile status changes.
   */
  const invalidateProfileCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: userProfileKeys.all });
    queryClient.refetchQueries({ queryKey: userProfileKeys.all });
    queryClient.invalidateQueries({ queryKey: ['primary-profile'] });
    queryClient.refetchQueries({ queryKey: ['primary-profile'] });
    queryClient.invalidateQueries({ queryKey: ['merchant-analytics'] });
    useProfileStore.getState().setIsProfileComplete(true);
  }, [queryClient]);

  const isProfileOrKycUpdate = useCallback((type: string = '', title: string = '', message: string = '') => {
    const t = type.toLowerCase();
    const tit = title.toLowerCase();
    const msg = message.toLowerCase();

    return (
      t.includes('kyc') ||
      t.includes('profile') ||
      t.includes('approval') ||
      t.includes('approved') ||
      t.includes('account') ||
      t.includes('verification') ||
      t.includes('merchant') ||
      t.includes('mechanic') ||
      tit.includes('approv') ||
      tit.includes('kyc') ||
      tit.includes('verif') ||
      tit.includes('profile') ||
      tit.includes('account') ||
      msg.includes('approv') ||
      msg.includes('verified') ||
      msg.includes('verification') ||
      msg.includes('kyc') ||
      msg.includes('profile') ||
      msg.includes('account')
    );
  }, []);

  /**
   * Real-time eviction: immediately removes a taken or cancelled order
   * from the mechanic's active pending list in the local React Query cache,
   * without waiting for HTTPS network roundtrip.
   */
  const removeOrderFromPendingCache = useCallback((data?: any) => {
    const orderId = extractOrderId(data);
    if (!orderId) return;

    if (onOrderRemoved) {
      onOrderRemoved(orderId);
    }

    queryClient.setQueriesData(
      { queryKey: ['mechanic', 'repair-requests'] },
      (oldData: any) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData)) {
          return oldData.filter((item: any) => String(item.id) !== orderId);
        }
        if (Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.filter((item: any) => String(item.id) !== orderId),
          };
        }
        if (Array.isArray(oldData.results)) {
          return {
            ...oldData,
            results: oldData.results.filter((item: any) => String(item.id) !== orderId),
          };
        }
        return oldData;
      }
    );

    invalidateRepairCaches(data);
  }, [extractOrderId, onOrderRemoved, queryClient, invalidateRepairCaches]);

  /** Returns true if the event type string is any known repair update/status variant */
  const isRepairUpdateType = (type: string) =>
    type === 'repair_status' ||
    type === 'repair-status' ||
    type === 'repair_update' ||
    type === 'repair-update';

  const handleRepairStatusChange = useCallback((data: WebSocketMessage) => {
    // 1. Play notification sound & haptics
    playMechanicNotificationSound();

    // 2. Extract status and order info
    const rawData = (data as any)?.data || data;
    const status: string = (data as any)?.status || rawData?.status || '';
    const orderId = extractOrderId(data);

    // 3. Cache management
    if (status && status !== 'pending') {
      removeOrderFromPendingCache(data);
    }
    invalidateRepairCaches(data);

    // 4. Construct user-friendly title & message
    let title = rawData?.title || (data as any)?.title;
    let message = rawData?.message || (data as any)?.message || rawData?.body;

    if (!title || !message) {
      switch (status) {
        case 'accepted':
          title = 'Mechanic Accepted Request';
          message = 'A mechanic has accepted your repair order!';
          break;
        case 'in_transit':
        case 'on_the_way':
          title = 'Mechanic On The Way';
          message = 'The mechanic is currently heading to your location!';
          break;
        case 'arrived':
          title = 'Mechanic Arrived';
          message = 'The mechanic has arrived at your location!';
          break;
        case 'in_progress':
          title = 'Repair In Progress';
          message = 'The mechanic has started working on your vehicle.';
          break;
        case 'completed':
          title = 'Repair Completed';
          message = 'Your vehicle repair has been successfully completed!';
          break;
        case 'cancelled':
          title = 'Order Cancelled';
          message = 'The repair request has been cancelled.';
          break;
        case 'declined':
          title = 'Request Declined';
          message = 'The repair request was declined.';
          break;
        default:
          title = 'Repair Order Update';
          message = status ? `Repair request status updated to ${status.replace(/_/g, ' ')}.` : 'Your repair request has been updated.';
          break;
      }
    }

    const bannerPayload = {
      ...data,
      related_object_id: orderId,
      notification_type: 'repair_update',
      status,
    };

    useNotificationStore.getState().showNotification(
      title,
      message,
      'order',
      bannerPayload
    );

    if (triggerPush) {
      scheduleGenericNotification(title, message, bannerPayload);
    }
  }, [extractOrderId, removeOrderFromPendingCache, invalidateRepairCaches, triggerPush]);

  const eventHandlers = useMemo(() => ({

    // ── New Order Events ──────────────────────────────────────────────────────
    new_repair_request: (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      if (onNewOrder) onNewOrder(data.order || data);
      playMechanicNotificationSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      useNotificationStore.getState().showNotification(title, message, 'order', notifData);
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    'new-repair-request': (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      if (onNewOrder) onNewOrder(data.order || data);
      playMechanicNotificationSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      useNotificationStore.getState().showNotification(title, message, 'order', notifData);
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    new_repair: (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      if (onNewOrder) onNewOrder(data.order || data);
      playMechanicNotificationSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      useNotificationStore.getState().showNotification(title, message, 'order', notifData);
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    new_order: (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      invalidateOrderCaches(data);
      if (onNewOrder) onNewOrder(data.order || data);
      playMechanicNotificationSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Order';
      const message = notifData?.message || notifData?.body || 'A new order has been placed.';
      useNotificationStore.getState().showNotification(title, message, 'order', notifData);
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    'new-order': (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      invalidateOrderCaches(data);
      if (onNewOrder) onNewOrder(data.order || data);
      playMechanicNotificationSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Order';
      const message = notifData?.message || notifData?.body || 'A new order has been placed.';
      useNotificationStore.getState().showNotification(title, message, 'order', notifData);
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    // ── Seller & Vehicle Rental Order Updates ────────────────────────────────
    order_update: (data: WebSocketMessage) => {
      invalidateOrderCaches(data);
    },
    'order-update': (data: WebSocketMessage) => {
      invalidateOrderCaches(data);
    },
    order_status: (data: WebSocketMessage) => {
      invalidateOrderCaches(data);
    },
    'order-status': (data: WebSocketMessage) => {
      invalidateOrderCaches(data);
    },
    order_shipped: (data: WebSocketMessage) => {
      invalidateOrderCaches(data);
      if (triggerPush) {
        scheduleSuccessNotification('Order Shipped', 'Your order is on the way!', data);
        useNotificationStore.getState().showNotification('Order Shipped', 'Your order is on the way!', 'order', data);
      }
    },
    order_delivered: (data: WebSocketMessage) => {
      invalidateOrderCaches(data);
      if (triggerPush) {
        scheduleSuccessNotification('Order Delivered', 'Your order has been delivered!', data);
        useNotificationStore.getState().showNotification('Order Delivered', 'Your order has been delivered!', 'success', data);
      }
    },
    order_cancelled: (data: WebSocketMessage) => {
      invalidateOrderCaches(data);
      if (triggerPush) {
        scheduleGenericNotification('Order Cancelled', 'An order has been cancelled.', data);
        useNotificationStore.getState().showNotification('Order Cancelled', 'An order has been cancelled.', 'info', data);
      }
    },
    rental_booked: (data: WebSocketMessage) => {
      invalidateOrderCaches(data);
      playMechanicNotificationSound();
      if (triggerPush) {
        scheduleGenericNotification('Rental Booking', 'A new vehicle rental booking was received!', data);
        useNotificationStore.getState().showNotification('Rental Booking', 'A new vehicle rental booking was received!', 'order', data);
      }
    },
    rental_update: (data: WebSocketMessage) => {
      invalidateOrderCaches(data);
    },
    'rental-update': (data: WebSocketMessage) => {
      invalidateOrderCaches(data);
    },

    // ── Bidding Events ────────────────────────────────────────────────────────
    bid_placed: (data: WebSocketMessage) => {
      invalidateBiddingCaches(data);
      if (triggerPush) {
        scheduleGenericNotification('New Bid Placed', 'A new bid was placed on an auction.', data);
        useNotificationStore.getState().showNotification('New Bid Placed', 'A new bid was placed on an auction.', 'info', data);
      }
    },
    new_bid: (data: WebSocketMessage) => {
      invalidateBiddingCaches(data);
      if (triggerPush) {
        scheduleGenericNotification('New Bid', 'A new bid was submitted.', data);
        useNotificationStore.getState().showNotification('New Bid', 'A new bid was submitted.', 'info', data);
      }
    },
    bid_updated: (data: WebSocketMessage) => {
      invalidateBiddingCaches(data);
    },
    bid_accepted: (data: WebSocketMessage) => {
      invalidateBiddingCaches(data);
      if (triggerPush) {
        scheduleSuccessNotification('Bid Accepted', 'Your bid has been accepted by the seller!', data);
        useNotificationStore.getState().showNotification('Bid Accepted', 'Your bid has been accepted by the seller!', 'success', data);
      }
    },
    bid_rejected: (data: WebSocketMessage) => {
      invalidateBiddingCaches(data);
      if (triggerPush) {
        scheduleGenericNotification('Bid Rejected', 'Your bid was not accepted.', data);
        useNotificationStore.getState().showNotification('Bid Rejected', 'Your bid was not accepted.', 'info', data);
      }
    },

    // ── Repair Status Update Events (top-level, ALL naming variants) ──────────
    // Backend may use underscore OR hyphen — all variants are handled explicitly.
    repair_update: handleRepairStatusChange,
    'repair-update': handleRepairStatusChange,
    repair_status: handleRepairStatusChange,
    'repair-status': handleRepairStatusChange,
    repair_accepted: handleRepairStatusChange,
    'repair-accepted': handleRepairStatusChange,
    repair_in_transit: handleRepairStatusChange,
    'repair-in-transit': handleRepairStatusChange,
    repair_arrived: handleRepairStatusChange,
    'repair-arrived': handleRepairStatusChange,
    repair_in_progress: handleRepairStatusChange,
    'repair-in-progress': handleRepairStatusChange,
    repair_completed: handleRepairStatusChange,
    'repair-completed': handleRepairStatusChange,
    order_accepted: handleRepairStatusChange,
    'order-accepted': handleRepairStatusChange,

    // ── Real-time Job Taken / Removed by Another Mechanic ─────────────────────
    repair_taken: (data: WebSocketMessage) => {
      removeOrderFromPendingCache(data);
    },
    'repair-taken': (data: WebSocketMessage) => {
      removeOrderFromPendingCache(data);
    },
    order_taken: (data: WebSocketMessage) => {
      removeOrderFromPendingCache(data);
    },
    'order-taken': (data: WebSocketMessage) => {
      removeOrderFromPendingCache(data);
    },
    repair_request_removed: (data: WebSocketMessage) => {
      removeOrderFromPendingCache(data);
    },
    'repair-request-removed': (data: WebSocketMessage) => {
      removeOrderFromPendingCache(data);
    },
    repair_assigned: (data: WebSocketMessage) => {
      removeOrderFromPendingCache(data);
    },

    // ── Customer Cancellation Event ───────────────────────────────────────────
    // Fires when a customer cancels an active repair request.
    repair_cancelled: (data: WebSocketMessage) => {
      removeOrderFromPendingCache(data);
      if (triggerPush) {
        scheduleGenericNotification(
          'Job Cancelled',
          'A customer has cancelled their repair request.',
          data
        );
        useNotificationStore.getState().showNotification(
          'Job Cancelled',
          'A customer has cancelled their repair request.',
          'info',
          data
        );
      }
    },
    'repair-cancelled': (data: WebSocketMessage) => {
      removeOrderFromPendingCache(data);
      if (triggerPush) {
        scheduleGenericNotification(
          'Job Cancelled',
          'A customer has cancelled their repair request.',
          data
        );
        useNotificationStore.getState().showNotification(
          'Job Cancelled',
          'A customer has cancelled their repair request.',
          'info',
          data
        );
      }
    },


    // ── Support/Chat Events ───────────────────────────────────────────────────
    chat_message: (data: WebSocketMessage) => {
      queryClient.refetchQueries({ queryKey: ['support-conversations'] });
      queryClient.refetchQueries({ queryKey: ['support-messages'] });
      invalidateChatCaches(data);
    },
    new_message: (data: WebSocketMessage) => {
      queryClient.refetchQueries({ queryKey: ['support-conversations'] });
      invalidateChatCaches(data);
    },
    support_update: () => queryClient.refetchQueries({ queryKey: ['support-conversations'] }),

    // ── Canonical Backend Notification Events ─────────────────────────────────
    'notification.count': () => {
      queryClient.refetchQueries({ queryKey: ['support-conversations'] });
      queryClient.refetchQueries({ queryKey: ['primary-profile'] });
      invalidateProfileCaches();
    },
    'notification.count_update': (_data: any) => {
      queryClient.refetchQueries({ queryKey: ['support-conversations'] });
      queryClient.refetchQueries({ queryKey: [...userProfileKeys.notifications()] });
      invalidateProfileCaches();
    },

    // Top-level account & KYC approval events
    profile_approved: () => invalidateProfileCaches(),
    'profile-approved': () => invalidateProfileCaches(),
    account_approved: () => invalidateProfileCaches(),
    'account-approved': () => invalidateProfileCaches(),
    merchant_approved: () => invalidateProfileCaches(),
    'merchant-approved': () => invalidateProfileCaches(),
    mechanic_approved: () => invalidateProfileCaches(),
    'mechanic-approved': () => invalidateProfileCaches(),
    kyc_approved: () => invalidateProfileCaches(),
    'kyc-approved': () => invalidateProfileCaches(),
    kyc_update: () => invalidateProfileCaches(),
    'kyc-update': () => invalidateProfileCaches(),
    kyc_verified: () => invalidateProfileCaches(),
    'kyc-verified': () => invalidateProfileCaches(),

    // Notification wrapper — nested .type field may be any of the repair variants
    'notification.new': (data: WebSocketMessage) => {
      queryClient.refetchQueries({ queryKey: ['support-conversations'] });
      queryClient.refetchQueries({ queryKey: ['support-messages'] });
      playMechanicNotificationSound();

      const notifData = data.notification || data.data || data;
      if (notifData) {
        const title = notifData.title || 'Notification';
        const message = notifData.message || notifData.body || notifData.description || 'You have a new update';
        const type: string = notifData.notification_type || notifData.type || '';

        const isProfileUpdate = isProfileOrKycUpdate(type, title, message);
        if (isProfileUpdate) {
          invalidateProfileCaches();
        }

        const isRepair =
          isRepairUpdateType(type) ||
          type.includes('repair') ||
          type.includes('transit') ||
          type.includes('accepted') ||
          title.toLowerCase().includes('repair') ||
          title.toLowerCase().includes('transit') ||
          title.toLowerCase().includes('mechanic') ||
          message.toLowerCase().includes('repair') ||
          message.toLowerCase().includes('transit') ||
          message.toLowerCase().includes('status has been updated');

        if (isRepair) {
          invalidateRepairCaches(notifData);
        }

        const isChat = type === 'support_chat' || type === 'chat_message' || type === 'chat' || type === 'p2p';
        if (isChat) {
          invalidateChatCaches(notifData);
        }

        if (triggerPush) {
          if (type === 'success' || isProfileUpdate) {
            scheduleSuccessNotification(title, message, notifData);
          } else {
            scheduleGenericNotification(title, message, notifData);
          }
        }

        useNotificationStore.getState().showNotification(
          title,
          message,
          isChat ? 'chat' : (type === 'success' || isProfileUpdate) ? 'success' : 'order',
          notifData
        );
      }
    },

    notification: (data: WebSocketMessage) => {
      queryClient.refetchQueries({ queryKey: ['support-conversations'] });
      playMechanicNotificationSound();

      const notifData = data.notification || data.data || data;
      if (notifData) {
        const title = notifData.title || 'Notification';
        const message = notifData.message || notifData.body || notifData.description || 'You have a new update';
        const type: string = notifData.notification_type || notifData.type || '';

        const isProfileUpdate = isProfileOrKycUpdate(type, title, message);
        if (isProfileUpdate) {
          invalidateProfileCaches();
        }

        const isRepair =
          isRepairUpdateType(type) ||
          type.includes('repair') ||
          type.includes('transit') ||
          type.includes('accepted') ||
          title.toLowerCase().includes('repair') ||
          title.toLowerCase().includes('transit') ||
          title.toLowerCase().includes('mechanic') ||
          message.toLowerCase().includes('repair') ||
          message.toLowerCase().includes('transit') ||
          message.toLowerCase().includes('status has been updated');

        if (isRepair) {
          invalidateRepairCaches(notifData);
        }

        const isChat = type === 'support_chat' || type === 'chat_message' || type === 'chat' || type === 'p2p';
        if (isChat) {
          invalidateChatCaches(notifData);
        }

        if (triggerPush) {
          if (type === 'success' || isProfileUpdate) {
            scheduleSuccessNotification(title, message, notifData);
          } else {
            scheduleGenericNotification(title, message, notifData);
          }
        }

        useNotificationStore.getState().showNotification(
          title,
          message,
          isChat ? 'chat' : (type === 'success' || isProfileUpdate) ? 'success' : 'order',
          notifData
        );
      }
    },

    message: () => queryClient.refetchQueries({ queryKey: ['support-conversations'] }),
    update: () => queryClient.refetchQueries({ queryKey: ['support-conversations'] }),

  }), [
    onNewOrder,
    queryClient,
    triggerPush,
    invalidateRepairCaches,
    invalidateChatCaches,
    invalidateOrderCaches,
    invalidateBiddingCaches,
    invalidateProfileCaches,
    isProfileOrKycUpdate,
    removeOrderFromPendingCache,
    handleRepairStatusChange,
  ]);

  const { isConnected, reconnect } = useWebSocket({
    urlPath: 'notifications/',
    eventHandlers,
    enabled,
  });

  return { isConnected, reconnect };
};
