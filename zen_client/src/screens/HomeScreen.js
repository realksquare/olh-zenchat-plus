import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ScrollView, RefreshControl, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search, MessageCirclePlus, LogOut, Settings, X
} from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, TYPOGRAPHY, SHADOWS } from '../theme';
import { ChatContext } from '../contexts/ChatContext';
import { AuthContext } from '../contexts/AuthContext';
import ChatCard from '../components/ChatCard';
import ShimmerCard from '../components/ShimmerCard';
import AuraAvatar from '../components/AuraAvatar';
import ProfileModal from '../components/ProfileModal';
import NewChatModal from '../components/NewChatModal';
import api from '../services/api';

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { chats, loading, fetchChats, pinChat, deleteChat, addContact, markRead } = useContext(ChatContext);
  const { user, logout } = useContext(AuthContext);

  const [searchQuery, setSearchQuery] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [moments, setMoments] = useState([]);
  const [viewedMomentIds, setViewedMomentIds] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMoments();
  }, []);

  const fetchMoments = async () => {
    try {
      const res = await api.get('/moments');
      setMoments(res.data.moments || []);
    } catch {}
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchChats(), fetchMoments()]);
    setRefreshing(false);
  }, [fetchChats]);

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  const filteredChats = searchQuery.trim()
    ? chats.filter(chat => {
        const name = chat.isGroup
          ? chat.groupName
          : chat.participants?.[0]?.username || chat.participants?.[0]?.fullName || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : chats;

  const handleChatPress = (chat) => {
    const otherUser = chat.participants?.[0];
    const chatName = chat.isGroup ? chat.groupName : (otherUser?.username || otherUser?.fullName || 'Chat');
    markRead(chat.id);
    navigation.navigate('ChatScreen', { chatId: chat.id, chatName, otherUser, chat });
  };

  const handleNewChatCreated = (chat, chatName) => {
    const otherUser = chat.participants?.[0];
    navigation.navigate('ChatScreen', { chatId: chat.id, chatName, otherUser, chat });
  };

  const uniqueMomentUsers = moments.reduce((acc, m) => {
    if (m.user && !acc.find(u => u.id === m.user.id)) acc.push(m.user);
    return acc;
  }, []);

  const handleAuraTap = (auraUser) => {
    const userMoments = moments.filter(m => m.user?.id === auraUser.id);
    navigation.navigate('MomentViewer', { moments: userMoments, startIndex: 0 });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowProfile(true)} style={styles.headerAvatar}>
          <AuraAvatar user={user} size={36} moments={moments} viewedIds={viewedMomentIds} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ZenChat<Text style={styles.plus}>+</Text></Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowNewChat(true)} style={styles.iconBtn}>
            <MessageCirclePlus size={22} color={COLORS.textDim} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.iconBtn}>
            <LogOut size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {uniqueMomentUsers.length > 0 && (
        <View style={styles.auraRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.auraScroll}>
            {uniqueMomentUsers.map(auraUser => (
              <TouchableOpacity key={auraUser.id} style={styles.auraItem} onPress={() => handleAuraTap(auraUser)}>
                <AuraAvatar user={auraUser} size={52} moments={moments} viewedIds={viewedMomentIds} />
                <Text style={styles.auraName} numberOfLines={1}>{auraUser.username}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.searchContainer}>
        <Search size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          selectionColor={COLORS.primary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.shimmerList}>
          {[1, 2, 3, 4, 5].map(i => <ShimmerCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatCard
              chat={item}
              currentUser={user}
              moments={moments}
              viewedMomentIds={viewedMomentIds}
              onPress={() => handleChatPress(item)}
              onPin={() => pinChat(item.id)}
              onAddContact={() => {
                const other = item.participants?.[0];
                if (other) addContact(other.id);
              }}
              onDelete={() => {
                Alert.alert('Delete chat', 'Remove this chat?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteChat(item.id) },
                ]);
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <LinearGradient
                colors={[COLORS.primaryLight, 'transparent']}
                style={styles.emptyGlow}
              />
              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptySubtitle}>Start a conversation with someone</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowNewChat(true)}>
                <Text style={styles.emptyBtnText}>New chat</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} />
      <NewChatModal
        visible={showNewChat}
        onClose={() => setShowNewChat(false)}
        onChatCreated={handleNewChatCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerAvatar: {
    marginRight: SPACING.sm,
  },
  headerTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: -0.5,
  },
  plus: {
    color: COLORS.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: SPACING.sm,
    borderRadius: ROUNDING.full,
  },
  auraRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  auraScroll: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  auraItem: {
    alignItems: 'center',
    width: 64,
  },
  auraName: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    marginTop: 4,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: ROUNDING.full,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    height: 40,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
  shimmerList: {
    flex: 1,
    paddingTop: SPACING.sm,
  },
  listContent: {
    paddingVertical: SPACING.xs,
    paddingBottom: SPACING.xl,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyGlow: {
    position: 'absolute',
    top: -20,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.4,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    marginBottom: SPACING.xl,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: ROUNDING.full,
    ...SHADOWS.glow,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
