import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketEventHandlers {
  onConnected?: (data: { user_id: number; online_users: number[] }) => void;
  onChatMessage?: (msg: any) => void;
  onPresenceUpdate?: (data: { user_id: number; is_online: boolean }) => void;
  onNotification?: (notif: any) => void;
  onFriendsUpdated?: (data: { user_id: number; friend_id: number }) => void;
  onTypingIndicator?: (data: { conversation_id: number; user_id: number; is_typing: boolean }) => void;
  onMessageSeen?: (data: { conversation_id: number; user_id: number; message_id: number }) => void;
  onMessageUnsent?: (data: { message_id: number; conversation_id: number }) => void;
  onMessageReaction?: (data: { message_id: number; conversation_id: number; user_id: number; emoji?: string }) => void;
  onNewPost?: (post: any) => void;
  onNewReel?: (reel: any) => void;
}

export function useWebSocket(userId: number | null | undefined, handlers: WebSocketEventHandlers) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const disposedRef = useRef<boolean>(false);
  const userIdRef = useRef<number | null | undefined>(userId);
  userIdRef.current = userId;
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const stopHeartbeat = useCallback(() => {
    if (pingIntervalRef.current !== null) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    pingIntervalRef.current = window.setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 15000); // Send heartbeat every 15s to keep connection alive
  }, [stopHeartbeat]);

  const connect = useCallback(() => {
    const activeUserId = userIdRef.current;
    if (!activeUserId || disposedRef.current) return;

    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    // Build ws protocol and url
    let wsUrl: string;
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    if (apiBase && (apiBase.startsWith('http://') || apiBase.startsWith('https://'))) {
      const url = new URL(apiBase);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const basePath = url.pathname.replace(/\/+$/, '');
      wsUrl = `${protocol}//${url.host}${basePath}/ws`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/api/ws`;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposedRef.current || wsRef.current !== ws) {
          ws.close();
          return;
        }
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset backoff on successful connect
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;

          if (type === 'pong') {
            return;
          }

          if (type === 'connected') {
            if (Array.isArray(data.online_users)) {
              setOnlineUserIds(data.online_users);
            }
            handlersRef.current.onConnected?.(data);
          } else if (type === 'presence_update') {
            setOnlineUserIds((prev) => {
              if (data.is_online) {
                return prev.includes(data.user_id) ? prev : [...prev, data.user_id];
              } else {
                return prev.filter((id) => id !== data.user_id);
              }
            });
            handlersRef.current.onPresenceUpdate?.(data);
          } else if (type === 'chat_message') {
            handlersRef.current.onChatMessage?.(data.message);
          } else if (type === 'notification') {
            handlersRef.current.onNotification?.(data.notification);
          } else if (type === 'friends_updated') {
            handlersRef.current.onFriendsUpdated?.(data);
          } else if (type === 'typing_indicator') {
            handlersRef.current.onTypingIndicator?.(data);
          } else if (type === 'message_seen') {
            handlersRef.current.onMessageSeen?.(data);
          } else if (type === 'message_unsent') {
            handlersRef.current.onMessageUnsent?.(data);
          } else if (type === 'message_reaction') {
            handlersRef.current.onMessageReaction?.(data);
          } else if (type === 'new_post') {
            handlersRef.current.onNewPost?.(data.post);
          } else if (type === 'new_reel') {
            handlersRef.current.onNewReel?.(data.reel);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message', err);
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        setIsConnected(false);
        stopHeartbeat();

        // Exponential backoff reconnect only if this hook instance is still active for a signed-in user
        if (!disposedRef.current && userIdRef.current) {
          const attempt = reconnectAttemptsRef.current;
          const delay = Math.min(1000 * Math.pow(2, attempt), 15000);
          reconnectAttemptsRef.current = attempt + 1;

          clearReconnectTimer();
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, delay);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
    }
  }, [clearReconnectTimer, startHeartbeat, stopHeartbeat]);

  useEffect(() => {
    disposedRef.current = false;

    if (!userId) {
      clearReconnectTimer();
      stopHeartbeat();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setOnlineUserIds([]);
      return;
    }

    reconnectAttemptsRef.current = 0;
    connect();

    // Reconnect immediately if tab becomes visible, focused, or network comes back online
    const ensureConnected = () => {
      if (document.visibilityState !== 'hidden' && userIdRef.current) {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          reconnectAttemptsRef.current = 0;
          clearReconnectTimer();
          connect();
        }
      }
    };
    document.addEventListener('visibilitychange', ensureConnected);
    window.addEventListener('focus', ensureConnected);
    window.addEventListener('online', ensureConnected);

    return () => {
      disposedRef.current = true;
      document.removeEventListener('visibilitychange', ensureConnected);
      window.removeEventListener('focus', ensureConnected);
      window.removeEventListener('online', ensureConnected);
      clearReconnectTimer();
      stopHeartbeat();
      if (wsRef.current) {
        const current = wsRef.current;
        wsRef.current = null;
        current.close();
      }
    };
  }, [userId, connect, clearReconnectTimer, stopHeartbeat]);

  const sendEvent = useCallback((event: Record<string, any>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  const sendTyping = useCallback((conversationId: number, isTyping: boolean, participantIds: number[]) => {
    sendEvent({
      type: 'typing_indicator',
      conversation_id: conversationId,
      is_typing: isTyping,
      participant_ids: participantIds
    });
  }, [sendEvent]);

  return {
    isConnected,
    onlineUserIds,
    sendEvent,
    sendTyping
  };
}
