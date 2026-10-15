import { useEffect, useRef, useState, useCallback } from 'react';
import { authService } from '../services/authService';

export interface WebSocketEventHandlers {
  onChatMessage?: (msg: any) => void;
  onPresenceUpdate?: (data: { user_id: number; is_online: boolean }) => void;
  onNotification?: (notif: any) => void;
  onTypingIndicator?: (data: { conversation_id: number; user_id: number; is_typing: boolean }) => void;
  onMessageSeen?: (data: { conversation_id: number; user_id: number; message_id: number }) => void;
  onMessageUnsent?: (data: { message_id: number; conversation_id: number }) => void;
  onMessageReaction?: (data: { message_id: number; conversation_id: number; user_id: number; emoji?: string }) => void;
  onNewPost?: (post: any) => void;
}

export function useWebSocket(handlers: WebSocketEventHandlers) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    const user = authService.getUser();
    if (!user) return;

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
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;

          if (type === 'connected') {
            if (Array.isArray(data.online_users)) {
              setOnlineUserIds(data.online_users);
            }
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
          }
        } catch (err) {
          console.error('Error parsing WebSocket message', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt reconnect after 3 seconds if user still logged in
        if (authService.getUser()) {
          setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

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
