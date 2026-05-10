import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Animated
} from 'react-native';
import { MoreVertical, Pin, UserPlus, Trash2, PinOff } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, TYPOGRAPHY, SHADOWS } from '../theme';
import AuraAvatar from './AuraAvatar';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (diff < 7 * 86400000) {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  }
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function getLastMessagePreview(lastMessage) {
  if (!lastMessage) return 'No messages yet';
  if (lastMessage.isDeleted) return 'Message deleted';
  switch (lastMessage.type) {
    case 'image': return 'Photo';
    case 'video': return 'Video';
    case 'voice': return 'Voice message';
    default: return lastMessage.content || '';
  }
}

export default function ChatCard({ chat, currentUser, moments = [], viewedMomentIds = new Set(), onPress, onPin, onAddContact, onDelete }) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const dotsRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const otherUser = chat.participants?.[0];
  const displayName = chat.isGroup ? chat.groupName : (otherUser?.username || otherUser?.fullName || 'Unknown');
  const preview = getLastMessagePreview(chat.lastMessage);
  const time = formatTime(chat.lastMessage?.createdAt || chat.updatedAt);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };

  const openMenu = () => {
    dotsRef.current?.measureInWindow((x, y, w, h) => {
      setMenuPos({ x: x - 130, y: y + h + 4 });
      setMenuVisible(true);
    });
  };

  const action = (fn) => {
    setMenuVisible(false);
    setTimeout(fn, 150);
  };

  return (
    <>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={handlePress}>
          <View style={styles.avatarWrap}>
            <AuraAvatar
              user={otherUser}
              size={48}
              moments={moments}
              viewedIds={viewedMomentIds}
            />
          </View>

          <View style={styles.info}>
            <View style={styles.topRow}>
              <View style={styles.nameRow}>
                {chat.isPinned && <Pin size={12} color={COLORS.textMuted} style={{ marginRight: 4 }} />}
                <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              </View>
              <Text style={styles.time}>{time}</Text>
            </View>
            <View style={styles.bottomRow}>
              <Text style={styles.preview} numberOfLines={1}>{preview}</Text>
              {chat.unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            ref={dotsRef}
            style={styles.dotsButton}
            onPress={openMenu}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>

      <Modal transparent visible={menuVisible} onRequestClose={() => setMenuVisible(false)} animationType="none">
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menu, { top: menuPos.y, left: menuPos.x }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => action(onPin)}>
              {chat.isPinned
                ? <PinOff size={15} color={COLORS.textDim} />
                : <Pin size={15} color={COLORS.textDim} />}
              <Text style={styles.menuText}>{chat.isPinned ? 'Unpin chat' : 'Pin chat'}</Text>
            </TouchableOpacity>
            {!chat.isGroup && otherUser && (
              <TouchableOpacity style={styles.menuItem} onPress={() => action(onAddContact)}>
                <UserPlus size={15} color={COLORS.textDim} />
                <Text style={styles.menuText}>Add to contacts</Text>
              </TouchableOpacity>
            )}
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => action(onDelete)}>
              <Trash2 size={15} color={COLORS.error} />
              <Text style={[styles.menuText, { color: COLORS.error }]}>Delete chat</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    marginHorizontal: SPACING.sm,
    marginBottom: 2,
    borderRadius: ROUNDING.lg,
  },
  avatarWrap: {
    marginRight: SPACING.md,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  name: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    flex: 1,
  },
  time: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    flex: 1,
    marginRight: SPACING.sm,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: ROUNDING.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  dotsButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  menu: {
    position: 'absolute',
    width: 180,
    backgroundColor: '#1E2530',
    borderRadius: ROUNDING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
    paddingVertical: SPACING.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.sm,
  },
  menuText: {
    color: COLORS.textDim,
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },
});
