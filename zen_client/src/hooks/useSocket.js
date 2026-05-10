import { useEffect, useState, useRef, useContext } from 'react';
import { Socket } from 'phoenix';
import { AuthContext } from '../contexts/AuthContext';
import { WS_URL } from '../services/api';

export const useSocket = () => {
  const { user, token } = useContext(AuthContext);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  const socketRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!token || !user) return;

    // Initialize Phoenix Socket
    const socket = new Socket(`${WS_URL}/websocket`, {
      params: { token, deviceType: 'app' },
    });

    socket.onOpen(() => setIsConnected(true));
    socket.onClose(() => setIsConnected(false));
    socket.onError(() => setIsConnected(false));

    socket.connect();
    socketRef.current = socket;

    // Join the personal user channel
    const channel = socket.channel(`user:${user._id}`, {});
    
    channel.join()
      .receive('ok', () => console.log('Joined user channel successfully'))
      .receive('error', (resp) => console.log('Failed to join user channel', resp));

    // Handle incoming events
    channel.on('user_online', ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
    });

    channel.on('user_offline', ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    channelRef.current = channel;

    // Cleanup on unmount or logout
    return () => {
      channel.leave();
      socket.disconnect();
      setIsConnected(false);
    };
  }, [token, user]);

  return {
    socket: socketRef.current,
    channel: channelRef.current,
    isConnected,
    onlineUsers,
  };
};
