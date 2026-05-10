import React, { useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY, ROUNDING } from '../theme';
import { MessageCircle } from 'lucide-react-native';
import { ChatContext } from '../contexts/ChatContext';
import { AuthContext } from '../contexts/AuthContext';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { chats, loading } = useContext(ChatContext);
  const { user } = useContext(AuthContext);

  const renderItem = ({ item }) => {
    // Determine the chat name (if group chat, use chatName, else use other user's name)
    let chatName = item.isGroupChat ? item.chatName : 'Unknown';
    if (!item.isGroupChat) {
      const otherUser = item.users.find((u) => u._id !== user._id);
      if (otherUser) chatName = otherUser.name;
    }

    const latestMessage = item.latestMessage ? item.latestMessage.content : 'No messages yet';

    return (
      <TouchableOpacity 
        style={styles.chatCard}
        onPress={() => navigation.navigate('ChatScreen', { chatId: item._id, chatName })}
      >
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{chatName[0]}</Text>
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{chatName}</Text>
          </View>
          <Text style={styles.chatMessage} numberOfLines={1}>{latestMessage}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <MessageCircle color={COLORS.primary} size={24} />
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xl }}>
              No chats found.
            </Text>
          }
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xxl + 10,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  listContent: {
    padding: SPACING.sm,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDING.md,
    marginBottom: SPACING.sm,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  chatMessage: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
});
