import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, 
  KeyboardAvoidingView, Platform, Image, SafeAreaView
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY, ROUNDING } from '../theme';
import { Send, Image as ImageIcon, ArrowLeft, Camera } from 'lucide-react-native';
import { SocketContext } from '../contexts/SocketContext';
import { AuthContext } from '../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { chatId, chatName } = route.params || {};
  
  const { user } = useContext(AuthContext);
  const { channel } = useContext(SocketContext);
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  useEffect(() => {
    fetchMessages();
  }, [chatId]);

  useEffect(() => {
    if (!channel) return;

    const messageRef = channel.on('receive_message', ({ message }) => {
      if (message.chat === chatId) {
        setMessages((prev) => [...prev, message]);
        // Scroll to bottom when new message arrives
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });

    return () => {
      channel.off('receive_message', messageRef);
    };
  }, [channel, chatId]);

  const fetchMessages = async () => {
    if (!chatId) return;
    try {
      const res = await api.get(`/messages/${chatId}`);
      setMessages(res.data.messages || []);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || !channel) return;
    
    // Optimistic UI update could go here
    const tempId = Date.now().toString();
    
    channel.push('send_message', {
      chatId,
      content: inputText.trim(),
      type: 'text',
      cid: tempId
    });

    setInputText('');
  };

  const pickImage = async () => {
    // Basic image picker flow for phase 3 setup
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      // Future logic: Upload to Cloudinary, then send message via socket
      console.log('Image picked:', result.assets[0].uri);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender._id === user._id;
    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
        <Text style={isMe ? styles.myMessageText : styles.theirMessageText}>
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{chatName || 'Chat'}</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id || item.cid || Math.random().toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
            <ImageIcon color={COLORS.textMuted} size={24} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Send color={inputText.trim() ? COLORS.text : COLORS.textMuted} size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  messageList: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: SPACING.md,
    borderRadius: ROUNDING.lg,
    marginBottom: SPACING.sm,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: ROUNDING.sm,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceLight,
    borderBottomLeftRadius: ROUNDING.sm,
  },
  myMessageText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.md,
  },
  theirMessageText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attachButton: {
    padding: SPACING.sm,
    marginRight: SPACING.xs,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: ROUNDING.xl,
    fontSize: TYPOGRAPHY.fontSizes.md,
    maxHeight: 100,
  },
  sendButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    borderRadius: ROUNDING.full,
    width: 44,
    height: 44,
  },
  sendButtonDisabled: {
    backgroundColor: 'transparent',
  },
});
