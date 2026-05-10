import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Modal, FlatList, ActivityIndicator, Image
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Search, X, MessageCirclePlus } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, TYPOGRAPHY } from '../theme';
import { ChatContext } from '../contexts/ChatContext';
import api from '../services/api';

export default function NewChatModal({ visible, onClose, onChatCreated }) {
  const { fetchChats } = useContext(ChatContext);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(null);

  const search = async (text) => {
    setQuery(text);
    if (text.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get('/chats/users', { params: { q: text } });
      setResults(res.data.users || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const startChat = async (user) => {
    setCreating(user.id);
    try {
      const res = await api.post('/chats', { participantId: user.id });
      await fetchChats();
      onChatCreated?.(res.data.chat, user.username || user.fullName || 'Chat');
      onClose();
    } catch {
      setCreating(null);
    }
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity style={styles.userRow} onPress={() => startChat(item)} disabled={creating === item.id}>
      <View style={styles.avatar}>
        {item.avatar
          ? <Image source={{ uri: item.avatar }} style={styles.avatarImg} />
          : <Text style={styles.avatarInitial}>{(item.username || '?')[0].toUpperCase()}</Text>
        }
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        {item.fullName ? <Text style={styles.fullName}>{item.fullName}</Text> : null}
      </View>
      {creating === item.id
        ? <ActivityIndicator size="small" color={COLORS.primary} />
        : <MessageCirclePlus size={20} color={COLORS.primary} />}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </BlurView>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>New chat</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <Search size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={search}
            placeholder="Search by username or email..."
            placeholderTextColor={COLORS.textMuted}
            autoFocus
            autoCapitalize="none"
            selectionColor={COLORS.primary}
          />
          {searching && <ActivityIndicator size="small" color={COLORS.primary} />}
        </View>

        <FlatList
          data={results}
          keyExtractor={i => i.id}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query.length >= 2 && !searching
              ? <Text style={styles.empty}>No users found</Text>
              : query.length > 0
              ? null
              : <Text style={styles.empty}>Type at least 2 characters to search</Text>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: ROUNDING.xxl,
    borderTopRightRadius: ROUNDING.xxl,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: SPACING.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  closeBtn: {
    padding: SPACING.xs,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: ROUNDING.full,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: ROUNDING.full,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    height: 44,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.md,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: ROUNDING.lg,
    gap: SPACING.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 44, height: 44 },
  avatarInitial: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  userInfo: { flex: 1 },
  username: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  fullName: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
  empty: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
});
