import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import useWebSocket, { WebSocketMessage } from './useWebSocket';
import { scheduleGenericNotification, scheduleSuccessNotification, formatBrandedNotificationCopy } from '../services/notificationService';
import { useNotificationStore } from '@/stores/notificationStore';
import { useArrivalCodeStore } from '@/stores/arrivalCodeStore';
import { mechanicAPI } from '@/lib/api/mechanic';
import { userProfileKeys, useActiveRoleProfile } from './useUserProfile';
import { useProfileStore } from './useProfileStore';
import { playMechanicNotificationSound, playGeneralNotificationSound } from '../utils/sound';

// Module-level deduplication and throttling to prevent cascade of identical invalidations across hook instances
const lastInvalidationMap = new Map<string, number>();

function shouldThrottleInvalidation(key: string, cooldownMs: number = 1500): boolean {
  const now = Date.now();
  const last = lastInvalidationMap.get(key) || 0;
  if (now - last < cooldownMs) {
    return true; // Already invalidated within cooldown window
  }
  lastInvalidationMap.set(key, now);
  return false;
}

let lastSoundTimestamp = 0;
function playDebouncedMechanicSound(cooldownMs: number = 2500) {
  const now = Date.now();
  if (now - lastSoundTimestamp < cooldownMs) return;
  lastSoundTimestamp = now;
  playMechanicNotificationSound();
}

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
  const { isMechanic } = useActiveRoleProfile();

  const isUuidLike = (val?: string | null): boolean => {
    if (!val) return false;
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(val).trim()) || String(val).length >= 26;
  };

  const extractOrderId = useCallback((data?: any): string | null => {
    if (!data) return null;
    const candidates = [
      data?.related_object_id,
      data?.repair_request_id,
      data?.repair_request,
      data?.related_id,
      data?.order_id,
      data?.request_id,
      data?.data?.related_object_id,
      data?.data?.repair_request_id,
      data?.data?.repair_request,
      data?.data?.related_id,
      data?.data?.order_id,
      data?.data?.request_id,
      data?.notification?.related_object_id,
      data?.notification?.repair_request_id,
      data?.notification?.repair_request,
      data?.notification?.related_id,
      data?.notification?.order_id,
      data?.order?.repair_request_id,
      data?.order?.id,
      data?.data?.id,
      data?.id,
    ].filter(Boolean);

    // Prioritize candidate matching a valid UUID string
    const uuidCandidate = candidates.find((c) => isUuidLike(String(c)));
    if (uuidCandidate) return String(uuidCandidate);

    return candidates[0] ? String(candidates[0]) : null;
  }, []);

  const resolveOrderPayload = useCallback((data: any) => {
    if (!data) return data;
    const rawPayload = data.order || data.data?.order || data.data || data;
    const resolvedId = extractOrderId(data) || extractOrderId(rawPayload);
    if (rawPayload && typeof rawPayload === 'object') {
      const bestId = (resolvedId && isUuidLike(resolvedId))
        ? resolvedId
        : (isUuidLike(rawPayload.id) ? rawPayload.id : (resolvedId || rawPayload.id));
      return {
        ...rawPayload,
        repair_request_id: bestId,
        id: bestId,
        related_object_id: resolvedId,
      };
    }
    return rawPayload;
  }, [extractOrderId]);

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

    // 2. Invalidate list queries selectively based on active role (only active queries refetched, with throttling)
    if (isMechanic) {
      if (!shouldThrottleInvalidation('mechanic-repair-requests', 1500)) {
        queryClient.invalidateQueries({ queryKey: ['mechanic', 'repair-requests'], refetchType: 'active' });
      }
      if (!shouldThrottleInvalidation('mechanic-analytics', 2000)) {
        queryClient.invalidateQueries({ queryKey: ['mechanic', 'analytics'], refetchType: 'active' });
      }
    } else {
      if (!shouldThrottleInvalidation('user-repair-requests', 1500)) {
        queryClient.invalidateQueries({ queryKey: ['user', 'repair-requests'], refetchType: 'active' });
      }
    }

    // 3. Invalidate detail queries cleanly (only active query refetched, avoiding prefix duplicates)
    if (orderId) {
      if (!shouldThrottleInvalidation(`repair-request-${orderId}`, 1500)) {
        queryClient.invalidateQueries({ queryKey: ['repair-request', String(orderId)], refetchType: 'active' });
      }
    } else {
      if (!shouldThrottleInvalidation('repair-request-generic', 1500)) {
        queryClient.invalidateQueries({ queryKey: ['repair-request'], refetchType: 'active' });
      }
    }

    // 4. Trigger onRepairUpdate callback
    if (onRepairUpdate) {
      onRepairUpdate(orderId, inferredStatus || '', data);
    }
  }, [queryClient, extractOrderId, onRepairUpdate, isMechanic]);

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
    if (shouldThrottleInvalidation('user-profile-caches', 3000)) {
      return;
    }
    queryClient.invalidateQueries({ queryKey: userProfileKeys.all, refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['primary-profile'], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ['merchant-analytics'], refetchType: 'active' });
    useProfileStore.getState().setIsProfileComplete(true);
  }, [queryClient]);

  const isProfileOrKycUpdate = useCallback((type: string = '', title: string = '', message: string = '') => {
    const t = type.toLowerCase();
    const tit = title.toLowerCase();
    const msg = message.toLowerCase();

    // STRICT: Only genuine KYC / profile status lifecycle changes
    // MUST NOT match mechanic repair requests, orders, or general notifications!
    return (
      t === 'kyc_approved' ||
      t === 'kyc_rejected' ||
      t === 'kyc_verified' ||
      t === 'kyc_update' ||
      t === 'kyc-update' ||
      t === 'nin_verification' ||
      t === 'nin_verified' ||
      t === 'account_approved' ||
      t === 'profile_completed' ||
      t === 'merchant_approved' ||
      t === 'mechanic_approved' ||
      tit.includes('kyc approved') ||
      tit.includes('kyc verified') ||
      tit.includes('nin verified') ||
      tit.includes('account approved') ||
      msg.includes('kyc has been approved') ||
      msg.includes('account has been approved') ||
      msg.includes('profile has been approved')
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
    type === 'repair-update' ||
    type === 'repair_updated' ||
    type === 'repair-updated' ||
    type === 'repair_request_updated' ||
    type === 'repair-request-updated' ||
    type === 'request_updated' ||
    type === 'request-updated' ||
    type === 'repair_edited' ||
    type === 'repair-edited' ||
    type === 'order_updated' ||
    type === 'order-updated';

  const handleRepairStatusChange = useCallback((data: WebSocketMessage) => {
    // 1. Play notification sound & haptics (debounced)
    playDebouncedMechanicSound();

    // 2. Extract status and order info
    const rawData = (data as any)?.data || data;
    const status: string = (data as any)?.status || rawData?.status || '';
    const orderId = extractOrderId(data);

    // 3. Cache management (removeOrderFromPendingCache already invalidates caches)
    if (status && status !== 'pending') {
      removeOrderFromPendingCache(data);
    } else {
      invalidateRepairCaches(data);
    }

    // 4. Construct user-friendly, branded title & message
    const rawTitle = rawData?.title || (data as any)?.title;
    const rawMessage = rawData?.message || (data as any)?.message || rawData?.body;

    const isRawServerString =
      !rawTitle ||
      !rawMessage ||
      (typeof rawTitle === 'string' && rawTitle.includes('_')) ||
      (typeof rawMessage === 'string' && rawMessage.includes('_')) ||
      (typeof rawTitle === 'string' && rawTitle.toLowerCase().includes('in_transit')) ||
      (typeof rawMessage === 'string' && rawMessage.toLowerCase().includes('in_transit'));

    let title = rawTitle;
    let message = rawMessage;

    if (isRawServerString || status) {
      switch (status) {
        case 'accepted':
          title = 'Mechanic Confirmed ✅';
          message = 'A mechanic has accepted your repair order and is preparing to dispatch!';
          break;
        case 'in_transit':
        case 'on_the_way':
          title = 'Mechanic On The Way 🚗';
          message = 'Your specialist is currently heading to your location. E.T.A ~10-15 mins.';
          break;
        case 'arrived':
          title = 'Mechanic Arrived 📍';
          message = 'The mechanic has arrived at your location! Check your arrival code.';
          break;
        case 'in_progress':
          title = 'Repair In Progress 🔧';
          message = isMechanic 
            ? 'Repair is in progress. Complete work and mark finished when done.' 
            : 'The mechanic has started working on your vehicle.';
          break;
        case 'completed':
          title = isMechanic ? 'Repair Marked Complete 🏁' : 'Repair Completed 🎉';
          message = isMechanic 
            ? 'You marked the repair as completed. Waiting for customer to verify.' 
            : 'Your mechanic has finished the repair. Please inspect and verify completion.';
          break;
        case 'verify_completed':
        case 'verified':
          title = isMechanic ? 'Job Verified by Customer! 🎉' : 'Job Verified ✅';
          message = isMechanic 
            ? 'The customer has confirmed and verified your repair. Your payment is being processed!' 
            : 'You have confirmed the service completion. Tap to leave a review!';
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
          if (isRawServerString) {
            title = String(rawTitle || 'Repair Order Update')
              .replace(/verify_completed/gi, 'Job Verified')
              .replace(/in_transit/gi, 'On The Way')
              .replace(/in_progress/gi, 'In Progress')
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (l: string) => l.toUpperCase());
            message = String(
              rawMessage ||
                (status
                  ? `Repair request status updated to ${status.replace(/_/g, ' ')}.`
                  : 'Your repair request has been updated.')
            ).replace(/verify_completed/gi, 'verified').replace(/_/g, ' ');
          }
          break;
      }
    }

    const bannerPayload = {
      ...data,
      related_object_id: orderId,
      notification_type: 'repair_update',
      status,
    };

    // For customers: suppress in-app banner for verify_completed (they already see in-page confirmation and button changes to Give Review)
    // For mechanics: ALWAYS show the celebratory banner so they know the customer verified!
    const isCustomerVerifying = !isMechanic && (status === 'verify_completed' || status === 'verified');

    if (!isCustomerVerifying) {
      useNotificationStore.getState().showNotification(
        title,
        message,
        (status === 'verify_completed' || status === 'verified') ? 'success' : 'order',
        bannerPayload
      );
    }

    // 5. Trigger Arrival Code Modal for Customer when mechanic arrives
    if ((status === 'arrived' || title?.toLowerCase().includes('arrived') || message?.toLowerCase().includes('arrived')) && orderId) {
      const rawOtp = data?.otp_code || data?.data?.otp_code || data?.order?.otp_code;
      if (rawOtp) {
        useArrivalCodeStore.getState().showArrivalModal({
          orderId: String(orderId),
          otpCode: String(rawOtp),
          mechanicName: data?.mechanic_name || (data?.mechanic?.first_name ? `${data.mechanic.first_name} ${data.mechanic.last_name || ''}`.trim() : undefined),
          mechanicPhone: data?.mechanic_phone || data?.mechanic?.phone_number,
        });
      } else {
        mechanicAPI.getRepairRequestDetail(String(orderId)).then((res: any) => {
          const detail = res?.data || res;
          if (detail?.otp_code) {
            useArrivalCodeStore.getState().showArrivalModal({
              orderId: String(orderId),
              otpCode: String(detail.otp_code),
              mechanicName: detail?.mechanic ? `${detail.mechanic.first_name || ''} ${detail.mechanic.last_name || ''}`.trim() : undefined,
              mechanicPhone: detail?.mechanic?.phone_number,
              serviceAddress: detail?.service_address,
            });
          }
        }).catch(() => {});
      }
    } else if (
      status === 'in_progress' || 
      status === 'completed' || 
      status === 'inspecting' ||
      rawData?.is_otp_verified ||
      (data as any)?.is_otp_verified
    ) {
      useArrivalCodeStore.getState().markVerified();
    }

    if (triggerPush) {
      if (status === 'verify_completed' || status === 'verified') {
        scheduleSuccessNotification(title, message, bannerPayload);
      } else {
        scheduleGenericNotification(title, message, bannerPayload);
      }
    }
  }, [extractOrderId, removeOrderFromPendingCache, invalidateRepairCaches, triggerPush, isMechanic]);

  const eventHandlers = useMemo(() => ({

    // ── New Order Events (All backend naming conventions) ─────────────────────
    new_repair_request: (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      // Toast suppressed: NewOrderBanner modal presents incoming requests directly
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    'new-repair-request': (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      // Toast suppressed: NewOrderBanner modal presents incoming requests directly
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    new_repair: (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      // Toast suppressed: NewOrderBanner modal presents incoming requests directly
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    'new-repair': (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      // Toast suppressed: NewOrderBanner modal presents incoming requests directly
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    repair_request: (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      // Toast suppressed: NewOrderBanner modal presents incoming requests directly
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    'repair-request': (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      // Toast suppressed: NewOrderBanner modal presents incoming requests directly
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    mechanic_request: (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      // Toast suppressed: NewOrderBanner modal presents incoming requests directly
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    'mechanic-request': (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      // Toast suppressed: NewOrderBanner modal presents incoming requests directly
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    new_mechanic_request: (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      // Toast suppressed: NewOrderBanner modal presents incoming requests directly
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    'new-mechanic-request': (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      // Toast suppressed: NewOrderBanner modal presents incoming requests directly
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    repair_created: (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      // Toast suppressed: NewOrderBanner modal presents incoming requests directly
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    'repair-created': (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      // Toast suppressed: NewOrderBanner modal presents incoming requests directly
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    request_created: (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      // Toast suppressed: NewOrderBanner modal presents incoming requests directly
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    'request-created': (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Repair Request';
      const message = notifData?.message || notifData?.body || 'You have a new mechanic order nearby!';
      // Toast suppressed: NewOrderBanner modal presents incoming requests directly
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    new_order: (data: WebSocketMessage) => {
      if (isMechanic) {
        invalidateRepairCaches(data);
      } else {
        invalidateOrderCaches(data);
      }
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Order';
      const message = notifData?.message || notifData?.body || 'A new order has been placed.';
      // Toast suppressed when onNewOrder modal handler is active
      if (!onNewOrder) {
        useNotificationStore.getState().showNotification(title, message, 'order', notifData);
      }
      if (triggerPush) {
        scheduleGenericNotification(title, message, notifData);
      }
    },

    'new-order': (data: WebSocketMessage) => {
      if (isMechanic) {
        invalidateRepairCaches(data);
      } else {
        invalidateOrderCaches(data);
      }
      const orderPayload = resolveOrderPayload(data);
      if (onNewOrder) onNewOrder(orderPayload);
      playDebouncedMechanicSound();
      const notifData = data.notification || data.data || data;
      const title = notifData?.title || 'New Order';
      const message = notifData?.message || notifData?.body || 'A new order has been placed.';
      // Toast suppressed when onNewOrder modal handler is active
      if (!onNewOrder) {
        useNotificationStore.getState().showNotification(title, message, 'order', notifData);
      }
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
      playDebouncedMechanicSound();
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

    // ── Repair Status & Edit Update Events (top-level, ALL naming variants) ───
    // Backend may use underscore OR hyphen — all variants are handled explicitly.
    repair_update: handleRepairStatusChange,
    'repair-update': handleRepairStatusChange,
    repair_updated: handleRepairStatusChange,
    'repair-updated': handleRepairStatusChange,
    repair_request_updated: handleRepairStatusChange,
    'repair-request-updated': handleRepairStatusChange,
    request_updated: handleRepairStatusChange,
    'request-updated': handleRepairStatusChange,
    repair_edited: handleRepairStatusChange,
    'repair-edited': handleRepairStatusChange,
    order_updated: handleRepairStatusChange,
    'order-updated': handleRepairStatusChange,
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
    verify_completed: handleRepairStatusChange,
    'verify-completed': handleRepairStatusChange,
    repair_verify_completed: handleRepairStatusChange,
    'repair-verify-completed': handleRepairStatusChange,
    repair_verified: handleRepairStatusChange,
    'repair-verified': handleRepairStatusChange,
    job_verified: handleRepairStatusChange,
    'job-verified': handleRepairStatusChange,
    order_accepted: handleRepairStatusChange,
    'order-accepted': handleRepairStatusChange,

    // ── OTP & Arrival Verification Events ─────────────────────────────────────
    otp_verified: (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      useArrivalCodeStore.getState().markVerified();
    },
    'otp-verified': (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      useArrivalCodeStore.getState().markVerified();
    },
    repair_otp_verified: (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      useArrivalCodeStore.getState().markVerified();
    },
    'repair-otp-verified': (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      useArrivalCodeStore.getState().markVerified();
    },
    arrival_verified: (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      useArrivalCodeStore.getState().markVerified();
    },
    'arrival-verified': (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      useArrivalCodeStore.getState().markVerified();
    },
    code_verified: (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      useArrivalCodeStore.getState().markVerified();
    },
    'code-verified': (data: WebSocketMessage) => {
      invalidateRepairCaches(data);
      useArrivalCodeStore.getState().markVerified();
    },

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
      playGeneralNotificationSound();
    },
    new_message: (data: WebSocketMessage) => {
      queryClient.refetchQueries({ queryKey: ['support-conversations'] });
      invalidateChatCaches(data);
      playGeneralNotificationSound();
    },
    support_update: () => queryClient.refetchQueries({ queryKey: ['support-conversations'] }),

    // ── Canonical Backend Notification Events ─────────────────────────────────
    'notification.count': () => {
      queryClient.invalidateQueries({ queryKey: userProfileKeys.notifications(), refetchType: 'active' });
    },
    'notification.count_update': (_data: any) => {
      queryClient.invalidateQueries({ queryKey: userProfileKeys.notifications(), refetchType: 'active' });
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
      const notifData = data.notification || data.data || data;
      if (notifData) {
        const rawTitle = notifData.title || 'Notification';
        const rawMessage = notifData.message || notifData.body || notifData.description || 'You have a new update';
        const type: string = notifData.notification_type || notifData.type || '';

        const branded = formatBrandedNotificationCopy(rawTitle, rawMessage, isMechanic);
        const title = branded.title;
        const message = branded.body;

        const isProfileUpdate = isProfileOrKycUpdate(type, title, message);
        if (isProfileUpdate) {
          invalidateProfileCaches();
        }

        const isRepair =
          isRepairUpdateType(type) ||
          type.includes('repair') ||
          type.includes('transit') ||
          type.includes('accepted') ||
          type.includes('mechanic') ||
          type.includes('order') ||
          title.toLowerCase().includes('repair') ||
          title.toLowerCase().includes('transit') ||
          title.toLowerCase().includes('mechanic') ||
          title.toLowerCase().includes('order') ||
          message.toLowerCase().includes('repair') ||
          message.toLowerCase().includes('transit') ||
          message.toLowerCase().includes('mechanic') ||
          message.toLowerCase().includes('order') ||
          message.toLowerCase().includes('status has been updated');

        let isNewOrderOrRequest = false;
        if (isRepair) {
          invalidateRepairCaches(notifData);
          isNewOrderOrRequest =
            type.includes('new') ||
            type.includes('request') ||
            title.toLowerCase().includes('new') ||
            title.toLowerCase().includes('request') ||
            message.toLowerCase().includes('new') ||
            message.toLowerCase().includes('request');

          if (isNewOrderOrRequest) {
            playDebouncedMechanicSound();
            if (onNewOrder) {
              onNewOrder(resolveOrderPayload(notifData));
            }
          } else {
            playGeneralNotificationSound();
          }
        } else {
          playGeneralNotificationSound();
        }

        const isChat = type === 'support_chat' || type === 'chat_message' || type === 'chat' || type === 'p2p';
        if (isChat) {
          queryClient.invalidateQueries({ queryKey: ['support-conversations'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['support-messages'], refetchType: 'active' });
          invalidateChatCaches(notifData);
        }

        const isOtpVerifiedEvent =
          type.includes('otp') ||
          type.includes('arrival_verified') ||
          type.includes('code_verified') ||
          title.toLowerCase().includes('verified') ||
          message.toLowerCase().includes('code verified') ||
          message.toLowerCase().includes('arrival confirmed') ||
          notifData?.is_otp_verified;

        if (isOtpVerifiedEvent) {
          useArrivalCodeStore.getState().markVerified();
        }

        if (triggerPush) {
          if (type === 'success' || isProfileUpdate || isMechanic) {
            scheduleSuccessNotification(title, message, notifData);
          } else {
            scheduleGenericNotification(title, message, notifData);
          }
        }

        const isCustomerVerifying =
          !isMechanic &&
          (type.includes('verify_completed') ||
            rawTitle.toLowerCase().includes('verify_completed') ||
            rawMessage.toLowerCase().includes('verify_completed') ||
            title.toLowerCase().includes('verified'));

        if (!(isRepair && isNewOrderOrRequest) && !isCustomerVerifying) {
          useNotificationStore.getState().showNotification(
            title,
            message,
            isChat ? 'chat' : (type === 'success' || isProfileUpdate || isMechanic) ? 'success' : 'order',
            notifData
          );
        }
      }
    },

    notification: (data: WebSocketMessage) => {
      const notifData = data.notification || data.data || data;
      if (notifData) {
        const rawTitle = notifData.title || 'Notification';
        const rawMessage = notifData.message || notifData.body || notifData.description || 'You have a new update';
        const type: string = notifData.notification_type || notifData.type || '';

        const branded = formatBrandedNotificationCopy(rawTitle, rawMessage, isMechanic);
        const title = branded.title;
        const message = branded.body;

        const isProfileUpdate = isProfileOrKycUpdate(type, title, message);
        if (isProfileUpdate) {
          invalidateProfileCaches();
        }

        const isRepair =
          isRepairUpdateType(type) ||
          type.includes('repair') ||
          type.includes('transit') ||
          type.includes('accepted') ||
          type.includes('mechanic') ||
          type.includes('order') ||
          title.toLowerCase().includes('repair') ||
          title.toLowerCase().includes('transit') ||
          title.toLowerCase().includes('mechanic') ||
          title.toLowerCase().includes('order') ||
          message.toLowerCase().includes('repair') ||
          message.toLowerCase().includes('transit') ||
          message.toLowerCase().includes('mechanic') ||
          message.toLowerCase().includes('order') ||
          message.toLowerCase().includes('status has been updated');

        let isNewOrderOrRequest = false;
        if (isRepair) {
          invalidateRepairCaches(notifData);
          isNewOrderOrRequest =
            type.includes('new') ||
            type.includes('request') ||
            title.toLowerCase().includes('new') ||
            title.toLowerCase().includes('request') ||
            message.toLowerCase().includes('new') ||
            message.toLowerCase().includes('request');

          if (isNewOrderOrRequest) {
            playDebouncedMechanicSound();
            if (onNewOrder) {
              onNewOrder(resolveOrderPayload(notifData));
            }
          } else {
            playGeneralNotificationSound();
          }
        } else {
          playGeneralNotificationSound();
        }

        const isChat = type === 'support_chat' || type === 'chat_message' || type === 'chat' || type === 'p2p';
        if (isChat) {
          queryClient.invalidateQueries({ queryKey: ['support-conversations'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['support-messages'], refetchType: 'active' });
          invalidateChatCaches(notifData);
        }

        const isOtpVerifiedEvent =
          type.includes('otp') ||
          type.includes('arrival_verified') ||
          type.includes('code_verified') ||
          title.toLowerCase().includes('verified') ||
          message.toLowerCase().includes('code verified') ||
          message.toLowerCase().includes('arrival confirmed') ||
          notifData?.is_otp_verified;

        if (isOtpVerifiedEvent) {
          useArrivalCodeStore.getState().markVerified();
        }

        if (triggerPush) {
          if (type === 'success' || isProfileUpdate || isMechanic) {
            scheduleSuccessNotification(title, message, notifData);
          } else {
            scheduleGenericNotification(title, message, notifData);
          }
        }

        const isCustomerVerifying =
          !isMechanic &&
          (type.includes('verify_completed') ||
            rawTitle.toLowerCase().includes('verify_completed') ||
            rawMessage.toLowerCase().includes('verify_completed') ||
            title.toLowerCase().includes('verified'));

        if (!(isRepair && isNewOrderOrRequest) && !isCustomerVerifying) {
          useNotificationStore.getState().showNotification(
            title,
            message,
            isChat ? 'chat' : (type === 'success' || isProfileUpdate || isMechanic) ? 'success' : 'order',
            notifData
          );
        }
      }
    },

    message: () => queryClient.invalidateQueries({ queryKey: ['support-conversations'], refetchType: 'active' }),
    update: () => {},

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
    isMechanic,
  ]);

  const { isConnected, reconnect } = useWebSocket({
    urlPath: 'notifications/',
    eventHandlers,
    enabled,
  });

  return { isConnected, reconnect };
};
