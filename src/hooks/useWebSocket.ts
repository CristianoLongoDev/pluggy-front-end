import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/lib/tokenStorage';

interface WebSocketMessage {
  type: string;
  data?: any;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: WebSocketMessage) => void;
  subscribe: (callback: (message: WebSocketMessage) => void) => () => void;
}

export const useWebSocket = (url: string): UseWebSocketReturn => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const subscribers = useRef<((message: WebSocketMessage) => void)[]>([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(1000);

  const connect = useCallback(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        reconnectDelay.current = 1000;

        const currentToken = getAccessToken();
        if (ws.current && currentToken) {
          const authMessage = {
            type: 'authenticate',
            data: { token: currentToken },
          };
          ws.current.send(JSON.stringify(authMessage));
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          subscribers.current.forEach(callback => callback(message));

          switch (message.type) {
            case 'connection_confirmed':
              if (ws.current) {
                ws.current.send(JSON.stringify({
                  type: 'subscribe_conversations',
                  data: { conversation_ids: [] },
                }));
              }
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);

        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(() => connect(), reconnectDelay.current);
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, [url]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close(1000, 'Manual disconnect');
      ws.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((callback: (message: WebSocketMessage) => void) => {
    subscribers.current.push(callback);
    return () => {
      subscribers.current = subscribers.current.filter(sub => sub !== callback);
    };
  }, []);

  useEffect(() => {
    let pingInterval: NodeJS.Timeout;
    if (isConnected) {
      pingInterval = setInterval(() => sendMessage({ type: 'ping' }), 30000);
    }
    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [isConnected, sendMessage]);

  useEffect(() => {
    if (user) {
      connect();
    }
    return () => disconnect();
  }, [user, connect, disconnect]);

  return { isConnected, lastMessage, sendMessage, subscribe };
};
