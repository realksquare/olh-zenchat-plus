import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';
import { SocketContext } from './SocketContext';
import { AuthContext } from './AuthContext';
import { getItemAsync, setItemAsync } from '../services/storage';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { channel } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = useCallback(async () => {
    try {
      if (chats.length === 0) {
        const cached = await getItemAsync('zenChats');
        if (cached) setChats(JSON.parse(cached));
      }
      setLoading(true);
      const res = await api.get('/chats');
      const freshChats = res.data.chats || [];
      setChats(freshChats);
      await setItemAsync('zenChats', JSON.stringify(freshChats));
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  }, [chats.length]);

  useEffect(() => {
    if (user) {
      fetchChats();
    } else {
      setChats([]);
    }
  }, [user]);

  useEffect(() => {
    if (!channel) return;

    const messageRef = channel.on('receive_message', ({ message }) => {
      setChats((prev) => {
        const updated = prev.map((chat) => {
          if (chat.id === message.chatId) {
            return {
              ...chat,
              lastMessage: message,
              unreadCount: message.senderId !== user?._id && message.senderId !== user?.id
                ? (chat.unreadCount || 0) + 1
                : chat.unreadCount,
            };
          }
          return chat;
        });
        return updated.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
          const ta = a.lastMessage?.createdAt || a.updatedAt || 0;
          const tb = b.lastMessage?.createdAt || b.updatedAt || 0;
          return new Date(tb) - new Date(ta);
        });
      });
    });

    const newChatRef = channel.on('new_chat', ({ chat }) => {
      setChats((prev) => {
        if (prev.some(c => c.id === chat.id)) return prev;
        return [chat, ...prev];
      });
    });

    const readRef = channel.on('messages_read', ({ chatId }) => {
      setChats((prev) => prev.map(c =>
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      ));
    });

    return () => {
      channel.off('receive_message', messageRef);
      channel.off('new_chat', newChatRef);
      channel.off('messages_read', readRef);
    };
  }, [channel, user]);

  const pinChat = async (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    const endpoint = chat?.isPinned ? `/chats/${chatId}/unpin` : `/chats/${chatId}/pin`;
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, isPinned: !c.isPinned } : c));
    try {
      await api.post(endpoint);
    } catch {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, isPinned: !c.isPinned } : c));
    }
  };

  const deleteChat = async (chatId) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    try {
      await api.delete(`/chats/${chatId}`);
    } catch {
      await fetchChats();
    }
  };

  const addContact = async (userId) => {
    try {
      await api.post(`/auth/contacts/${userId}`);
    } catch (err) {
      console.error('Add contact failed:', err);
    }
  };

  const markRead = (chatId) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
  };

  return (
    <ChatContext.Provider value={{ chats, loading, fetchChats, pinChat, deleteChat, addContact, markRead }}>
      {children}
    </ChatContext.Provider>
  );
};
