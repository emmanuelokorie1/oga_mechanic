import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../stores/userStore';
import { ENV_CONFIG } from '../config/env';
import { secureStorage } from '../utils/secureStorage';

export type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

export type EventHandlers = {
  [eventType: string]: (data: WebSocketMessage) => void;
};

export type UseWebSocketOptions = {
  urlPath: string; // The specific segment (e.g., 'chat/support-123')
  eventHandlers?: EventHandlers;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  enabled?: boolean;
};

// Shared connection pool by urlPath to prevent duplicate concurrent WebSockets
interface Subscriber {
  id: string;
  eventHandlersRef: React.MutableRefObject<EventHandlers>;
  onConnectRef: React.MutableRefObject<(() => void) | undefined>;
  onDisconnectRef: React.MutableRefObject<(() => void) | undefined>;
  setIsConnected: (connected: boolean) => void;
}

interface SharedConnection {
  ws: WebSocket | null;
  subscribers: Map<string, Subscriber>;
  reconnectTimeout: ReturnType<typeof setTimeout> | null;
  reconnectAttempts: number;
  messageQueue: string[];
  cleanPath: string;
}

const sharedPool = new Map<string, SharedConnection>();

/**
 * Production-Ready WebSocket Hook with Connection Pooling
 * Features: Connection Pooling by urlPath, Exponential Backoff, Closure Protection, Automatic Queue Flushing.
 */
export default function useWebSocket({
  urlPath,
  eventHandlers = {},
  onConnect,
  onDisconnect,
  reconnect = true,
  reconnectInterval = 3000,
  enabled = true,
}: UseWebSocketOptions) {
  const subscriberId = useRef(`sub_${Math.random().toString(36).slice(2)}`).current;
  const eventHandlersRef = useRef<EventHandlers>(eventHandlers);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const [isConnected, setIsConnected] = useState(false);

  // Use state for local token to handle hydration fallback
  const storeToken = useUserStore((state) => state.accessToken);
  const [activeToken, setActiveToken] = useState<string | null>(storeToken || null);

  useEffect(() => {
    let isMounted = true;
    if (storeToken) {
      setActiveToken(storeToken);
    } else {
      (async () => {
        try {
          const token = (await secureStorage.getSecureItem('auth_token')) || (await AsyncStorage.getItem('auth_token'));
          if (token && isMounted) {
            setActiveToken(token);
            const refreshToken = (await secureStorage.getSecureItem('refresh_token')) || (await AsyncStorage.getItem('refresh_token')) || '';
            useUserStore.getState().setTokens(token, refreshToken);
          }
        } catch (_) {}
      })();
    }
    return () => {
      isMounted = false;
    };
  }, [storeToken]);

  // Update refs to latest callbacks to avoid closure staleness without reconnecting
  useEffect(() => {
    eventHandlersRef.current = eventHandlers;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
  }, [eventHandlers, onConnect, onDisconnect]);

  const cleanPath = urlPath?.replace(/^\/+|\/+$/g, '') || '';

  const connect = useCallback(() => {
    const currentToken = activeToken || storeToken;
    if (!enabled || !cleanPath || !currentToken) {
      return;
    }

    let shared = sharedPool.get(cleanPath);
    if (!shared) {
      shared = {
        ws: null,
        subscribers: new Map(),
        reconnectTimeout: null,
        reconnectAttempts: 0,
        messageQueue: [],
        cleanPath,
      };
      sharedPool.set(cleanPath, shared);
    }

    // Register this subscriber
    shared.subscribers.set(subscriberId, {
      id: subscriberId,
      eventHandlersRef,
      onConnectRef,
      onDisconnectRef,
      setIsConnected,
    });

    // If socket is already open, notify immediately
    if (shared.ws && shared.ws.readyState === WebSocket.OPEN) {
      setIsConnected(true);
      return;
    }

    // If socket is already connecting, let it finish
    if (shared.ws && shared.ws.readyState === WebSocket.CONNECTING) {
      return;
    }

    // Clear existing timeouts
    if (shared.reconnectTimeout) {
      clearTimeout(shared.reconnectTimeout);
      shared.reconnectTimeout = null;
    }

    // URL Construction
    const baseRaw = ENV_CONFIG.WEBSOCKET_URL.replace(/\/$/, '');
    const protocol = baseRaw.startsWith('wss') ? 'wss' : 'ws';
    const baseNoProto = baseRaw.replace(/^wss?:\/\//, '');
    const fullPath = `${baseNoProto}/${cleanPath}`.replace(/\/+/g, '/');
    const finalUrl = `${protocol}://${fullPath}?token=${currentToken}`;

    try {
      const socket = new WebSocket(finalUrl);
      shared.ws = socket;

      socket.onopen = () => {
        console.log('🟢 [WebSocket Shared Connected]:', cleanPath, `(Subscribers: ${shared?.subscribers.size})`);
        if (shared) {
          shared.reconnectAttempts = 0;
          shared.subscribers.forEach((sub) => {
            sub.setIsConnected(true);
            sub.onConnectRef.current?.();
          });

          // Flush any queued messages
          while (shared.messageQueue.length > 0) {
            const queued = shared.messageQueue.shift();
            if (queued && shared.ws?.readyState === WebSocket.OPEN) {
              shared.ws.send(queued);
            }
          }
        }
      };

      socket.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          const rawType = data.type || data.event || data.action || data.notification_type || '';

          if (shared) {
            shared.subscribers.forEach((sub) => {
              let handler = sub.eventHandlersRef.current[rawType];
              if (!handler && typeof rawType === 'string') {
                handler =
                  sub.eventHandlersRef.current[rawType.replace(/-/g, '_')] ||
                  sub.eventHandlersRef.current[rawType.replace(/_/g, '-')] ||
                  sub.eventHandlersRef.current[rawType.replace(/\./g, '_')];
              }

              if (handler) {
                handler(data);
              } else {
                const fallback = sub.eventHandlersRef.current['*'] || sub.eventHandlersRef.current['message'];
                if (fallback) {
                  fallback(data);
                }
              }
            });
          }
        } catch {
          // Silently ignore malformed WS frames
        }
      };

      socket.onclose = (event) => {
        console.log('🔴 [WebSocket Shared Disconnected]:', cleanPath, event.code, event.reason);
        if (shared) {
          shared.subscribers.forEach((sub) => {
            sub.setIsConnected(false);
            sub.onDisconnectRef.current?.();
          });

          if (enabled && reconnect && shared.subscribers.size > 0) {
            shared.reconnectAttempts += 1;
            const backoff = Math.min(reconnectInterval * Math.pow(2, shared.reconnectAttempts - 1), 30000);
            shared.reconnectTimeout = setTimeout(connect, backoff);
          }
        }
      };

      socket.onerror = (err) => {
        console.warn('⚠️ [WebSocket Shared Error]:', cleanPath, err);
        socket.close();
      };
    } catch (err) {
      console.warn('⚠️ [WebSocket Shared Setup Failed]:', cleanPath, err);
    }
  }, [cleanPath, enabled, reconnect, reconnectInterval, activeToken, storeToken, subscriberId]);

  useEffect(() => {
    connect();
    return () => {
      const shared = sharedPool.get(cleanPath);
      if (shared) {
        shared.subscribers.delete(subscriberId);
        if (shared.subscribers.size === 0) {
          // No more active subscribers for this path, clean up connection
          if (shared.reconnectTimeout) {
            clearTimeout(shared.reconnectTimeout);
          }
          if (shared.ws) {
            shared.ws.onclose = null;
            shared.ws.close();
            shared.ws = null;
          }
          sharedPool.delete(cleanPath);
        }
      }
    };
  }, [cleanPath, connect, subscriberId]);

  const sendMessage = useCallback((type: string, payload: object = {}, isRaw: boolean = false) => {
    const data = isRaw ? payload : { type, ...payload };
    const serialized = JSON.stringify(data);
    const shared = sharedPool.get(cleanPath);

    if (shared?.ws?.readyState === WebSocket.OPEN) {
      shared.ws.send(serialized);
    } else if (shared) {
      shared.messageQueue.push(serialized);
    }
  }, [cleanPath]);

  return { isConnected, sendMessage, reconnect: connect };
}