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

/**
 * Production-Ready WebSocket Hook
 * Features: Exponential Backoff, Closure Protection (Ref-based handlers), Stable Connection Refs, Exhaustive Logging.
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
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const eventHandlersRef = useRef<EventHandlers>(eventHandlers);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const messageQueue = useRef<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Silent in production — connection state is surfaced via isConnected
  
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

  const connect = useCallback(() => {
    // 1. Clear existing timeouts
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    const currentToken = activeToken || storeToken;

    // Verify required conditions
    if (!enabled || !urlPath || !currentToken) {
      if (!currentToken && enabled && urlPath) {
        (async () => {
          try {
            const token = (await secureStorage.getSecureItem('auth_token')) || (await AsyncStorage.getItem('auth_token'));
            if (token) {
              setActiveToken(token);
            }
          } catch (_) {}
        })();
      }
      if (ws.current) {
        ws.current.onopen = null;
        ws.current.onmessage = null;
        ws.current.onerror = null;
        ws.current.onclose = null;
        ws.current.close();
        ws.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Clean up existing connection
    if (ws.current) {
      ws.current.onclose = null;
      ws.current.close();
    }

    // URL Construction
    const baseRaw = ENV_CONFIG.WEBSOCKET_URL.replace(/\/$/, '');
    const protocol = baseRaw.startsWith('wss') ? 'wss' : 'ws';
    const baseNoProto = baseRaw.replace(/^wss?:\/\//, '');
    const cleanPath = urlPath.replace(/^\//, '');
    const fullPath = `${baseNoProto}/${cleanPath}`.replace(/\/+/g, '/');
    const finalUrl = `${protocol}://${fullPath}?token=${currentToken}`;

    try {
      ws.current = new WebSocket(finalUrl);

      ws.current.onopen = () => {
        console.log('🟢 [WebSocket Connected]:', fullPath);
        reconnectAttempts.current = 0;
        setIsConnected(true);
        // Flush any messages queued before socket opened (e.g. read_messages)
        while (messageQueue.current.length > 0) {
          const queued = messageQueue.current.shift();
          if (queued && ws.current?.readyState === WebSocket.OPEN) {
            console.log('🚀 [WebSocket Outgoing Flushed]:', queued);
            ws.current.send(queued);
          }
        }
        onConnectRef.current?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          const rawType = data.type || data.event || data.action || data.notification_type || '';
          console.log('📡 [WebSocket Incoming]:', rawType, data);

          let handler = eventHandlersRef.current[rawType];
          if (!handler && typeof rawType === 'string') {
            handler =
              eventHandlersRef.current[rawType.replace(/-/g, '_')] ||
              eventHandlersRef.current[rawType.replace(/_/g, '-')] ||
              eventHandlersRef.current[rawType.replace(/\./g, '_')];
          }

          if (handler) {
            handler(data);
          } else {
            const fallback = eventHandlersRef.current['*'] || eventHandlersRef.current['message'];
            if (fallback) {
              fallback(data);
            }
          }
        } catch (error) {
          // Silently ignore malformed WS messages
        }
      };

      ws.current.onclose = (event) => {
        console.log('🔴 [WebSocket Disconnected]:', fullPath, event.code, event.reason);
        setIsConnected(false);
        onDisconnectRef.current?.();
        // Exponential backoff: 3s, 6s... max 30s
        if (enabled && reconnect) {
          reconnectAttempts.current += 1;
          const backoff = Math.min(reconnectInterval * Math.pow(2, reconnectAttempts.current - 1), 30000);
          reconnectTimeout.current = setTimeout(connect, backoff);
        }
      };

      ws.current.onerror = (err) => {
        console.warn('⚠️ [WebSocket Error]:', fullPath, err);
        ws.current?.close();
      };

    } catch (err) {
      console.warn('⚠️ [WebSocket Setup Failed]:', fullPath, err);
    }
  }, [urlPath, enabled, reconnect, reconnectInterval, activeToken, storeToken]);

  // Handle (re)connection logic
  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }
    };
  }, [connect]);

  /**
   * Safe sendMessage function
   */
  // Bug 6 fix: urlPath is not used inside sendMessage's body (it reads from
  // ws.current directly). Keeping it in deps caused a new callback reference
  // every time the URL changed, destabilising downstream memoised hooks.
  const sendMessage = useCallback((type: string, payload: object = {}, isRaw: boolean = false) => {
    const data = isRaw ? payload : { type, ...payload };
    const serialized = JSON.stringify(data);

    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('🚀 [WebSocket Outgoing]:', type, data);
      ws.current.send(serialized);
    } else {
      console.log('⏳ [WebSocket Queueing payload for connection]:', type, data);
      messageQueue.current.push(serialized);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isConnected, sendMessage, reconnect: connect };
}