import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { SocketContext } from './SocketContext';
import { AuthContext } from './AuthContext';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { channel, isConnected } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial chats via REST
  const fetchChats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/chats');
      setChats(res.data.chats || []);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchChats();
    } else {
      setChats([]); // Clear chats on logout
    }
  }, [user]);

  // Listen to real-time socket events for chat updates
  useEffect(() => {
    if (!channel) return;

    const messageRef = channel.on('receive_message', ({ message }) => {
      // Update local state when a new message arrives
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat._id === message.chat) {
            return { ...chat, latestMessage: message };
          }
          return chat;
        });
      });
    });

    const newChatRef = channel.on('new_chat', ({ chat }) => {
      setChats((prev) => [chat, ...prev]);
    });

    return () => {
      channel.off('receive_message', messageRef);
      channel.off('new_chat', newChatRef);
    };
  }, [channel]);

  return (
    <ChatContext.Provider value={{ chats, loading, fetchChats }}>
      {children}
    </ChatContext.Provider>
  );
};
