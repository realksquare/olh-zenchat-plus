import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, SafeAreaView, Alert, Image, ActivityIndicator
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  Send, Image as ImageIcon, ArrowLeft, X, Mic, CheckCheck, Check
} from 'lucide-react-native';
import uuid from 'react-native-uuid';
import { COLORS, SPACING, ROUNDING, TYPOGRAPHY, SHADOWS } from '../theme';
import { SocketContext } from '../contexts/SocketContext';
import { AuthContext } from '../contexts/AuthContext';
import { ChatContext } from '../contexts/ChatContext';
import MessageBubble from '../components/MessageBubble';
import AuraAvatar from '../components/AuraAvatar';
import TypingIndicator from '../components/TypingIndicator';
import api from '../services/api';
import { uploadMedia } from '../services/upload';

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { chatId, chatName, otherUser } = route.params || {};

  const { user } = useContext(AuthContext);
  const { channel } = useContext(SocketContext);
  const { markRead } = useContext(ChatContext);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [typingInfo, setTypingInfo] = useState(null);
  const [isMutual, setIsMutual] = useState(false);
  const [uploading, setUploading] = useState(false);

  const flatListRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  const myId = user?._id || user?.id;

  useEffect(() => {
    fetchMessages();
    markRead?.(chatId);
    return () => {
      stopTyping();
      clearTimeout(typingTimerRef.current);
    };
  }, [chatId]);

  useEffect(() => {
    if (!channel) return;

    const msgRef = channel.on('receive_message', ({ message }) => {
      if (message.chatId !== chatId) return;
      setMessages(prev => {
        const exists = prev.some(m => m.id === message.id || (m.cid && m.cid === message.cid));
        if (exists) {
          return prev.map(m => (m.cid && m.cid === message.cid) ? { ...message, cid: undefined } : m);
        }
        return [...prev, message];
      });
      scrollToEnd();
      if (message.senderId !== myId) {
        channel.push('message_read', { chatId });
        markRead?.(chatId);
      }
    });

    const editRef = channel.on('message_edited', ({ message }) => {
      if (message.chatId !== chatId) return;
      setMessages(prev => prev.map(m => m.id === message.id ? message : m));
    });

    const deleteRef = channel.on('message_deleted', ({ messageId, deleteFor }) => {
      if (deleteFor === 'everyone') {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isDeleted: true, content: 'Message deleted' } : m));
      } else {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    });

    const typingRef = channel.on('typing_status', ({ userId, isTyping, scramble }) => {
      if (userId === myId) return;
      setTypingInfo(isTyping ? { userId, scramble } : null);
      if (isTyping) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setTypingInfo(null), 4000);
      }
    });

    const readRef = channel.on('messages_read', ({ chatId: cid }) => {
      if (cid !== chatId) return;
      setMessages(prev => prev.map(m => m.senderId === myId ? { ...m, isRead: true } : m));
    });

    return () => {
      channel.off('receive_message', msgRef);
      channel.off('message_edited', editRef);
      channel.off('message_deleted', deleteRef);
      channel.off('typing_status', typingRef);
      channel.off('messages_read', readRef);
    };
  }, [channel, chatId, myId]);

  const fetchMessages = async () => {
    if (!chatId) return;
    try {
      const res = await api.get(`/messages/${chatId}`);
      setMessages(res.data.messages || []);
      scrollToEnd(false);
    } catch (err) {
      console.error('Fetch messages failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToEnd = (animated = true) => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated }), 80);
  };

  const startTyping = () => {
    if (!channel || isTypingRef.current) return;
    isTypingRef.current = true;
    channel.push('typing_start', { chatId, scramble: isMutual });
  };

  const stopTyping = () => {
    if (!channel || !isTypingRef.current) return;
    isTypingRef.current = false;
    channel.push('typing_stop', { chatId });
  };

  const handleTextChange = (text) => {
    setInputText(text);
    if (text.length > 0) {
      startTyping();
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(stopTyping, 2000);
    } else {
      stopTyping();
    }
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !channel) return;

    if (editingMsg) {
      channel.push('edit_message', { chatId, messageId: editingMsg.id, newContent: text });
      setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: text, isEdited: true } : m));
      setEditingMsg(null);
      setInputText('');
      stopTyping();
      return;
    }

    const cid = uuid.v4();
    const optimistic = {
      id: null,
      cid,
      content: text,
      type: 'text',
      senderId: myId,
      sender: user,
      chatId,
      isRead: false,
      isDelivered: false,
      isDeleted: false,
      isStarred: false,
      isEdited: false,
      replyToId: replyTo?.id || null,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimistic]);
    scrollToEnd();

    channel.push('send_message', {
      chatId,
      content: text,
      type: 'text',
      cid,
      replyTo: replyTo?.id || null,
    });

    setInputText('');
    setReplyTo(null);
    stopTyping();
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.75,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    const { success, url } = await uploadMedia(result.assets[0].uri, 'image');
    setUploading(false);

    if (!success || !url) { Alert.alert('Upload failed', 'Could not upload image.'); return; }

    const cid = uuid.v4();
    const optimistic = {
      id: null, cid, content: '', type: 'image', mediaUrl: url,
      senderId: myId, sender: user, chatId,
      isRead: false, isDelivered: false, isDeleted: false,
      isStarred: false, isViewOnce: false,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    scrollToEnd();

    channel?.push('send_message', { chatId, content: '', type: 'image', mediaUrl: url, cid });
  };

  const handleDelete = (message, deleteFor) => {
    Alert.alert(
      'Delete message',
      deleteFor === 'everyone' ? 'Delete for everyone?' : 'Delete for you?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            channel?.push('delete_message', { chatId, messageId: message.id, deleteFor });
            if (deleteFor === 'self') {
              setMessages(prev => prev.filter(m => m.id !== message.id));
            }
          },
        },
      ]
    );
  };

  const handleStar = async (message) => {
    const newVal = !message.isStarred;
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, isStarred: newVal } : m));
    try {
      await api.post(`/messages/${message.id}/${newVal ? 'star' : 'unstar'}`);
    } catch {}
  };

  const handleViewOnce = async (messageId) => {
    try { await api.post(`/messages/${messageId}/view`); } catch {}
  };

  const handleEdit = (message) => {
    setEditingMsg(message);
    setInputText(message.content);
  };

  const cancelEdit = () => {
    setEditingMsg(null);
    setInputText('');
  };

  const renderMessage = useCallback(({ item }) => {
    const isMe = item.senderId === myId;
    return (
      <MessageBubble
        message={item}
        isMe={isMe}
        onReply={setReplyTo}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStar={handleStar}
        onViewOnce={handleViewOnce}
      />
    );
  }, [myId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={COLORS.text} size={22} />
          </TouchableOpacity>
          <AuraAvatar user={otherUser} size={36} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{chatName || 'Chat'}</Text>
            {otherUser?.isOnline && (
              <Text style={styles.onlineText}>Online</Text>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id || item.cid || String(Math.random())}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onLayout={() => scrollToEnd(false)}
            removeClippedSubviews={false}
          />
        )}

        {typingInfo && (
          <TypingIndicator isMutual={isMutual} username={otherUser?.username} />
        )}

        {(replyTo || editingMsg) && (
          <View style={styles.contextBanner}>
            <View style={styles.contextBar} />
            <View style={styles.contextInfo}>
              <Text style={styles.contextLabel}>
                {editingMsg ? 'Editing message' : `Replying to ${replyTo?.sender?.username || 'message'}`}
              </Text>
              <Text style={styles.contextPreview} numberOfLines={1}>
                {(editingMsg || replyTo)?.content || 'Media'}
              </Text>
            </View>
            <TouchableOpacity onPress={editingMsg ? cancelEdit : () => setReplyTo(null)}>
              <X size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage} disabled={uploading}>
            {uploading
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <ImageIcon color={COLORS.textMuted} size={22} />}
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={editingMsg ? 'Edit message...' : 'Type a message...'}
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            selectionColor={COLORS.primary}
          />
          <TouchableOpacity
            style={[styles.sendBtn, inputText.trim() && styles.sendBtnActive]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Send color={inputText.trim() ? '#fff' : COLORS.textMuted} size={18} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.surface },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  backBtn: { padding: SPACING.xs },
  headerInfo: { flex: 1 },
  headerName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  onlineText: {
    color: COLORS.online,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    marginTop: 1,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    paddingVertical: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  contextBar: {
    width: 3,
    height: 32,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  contextInfo: { flex: 1 },
  contextLabel: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: 2,
  },
  contextPreview: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.xs,
  },
  attachBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: ROUNDING.xl,
    fontSize: TYPOGRAPHY.fontSizes.md,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.glow,
  },
});
