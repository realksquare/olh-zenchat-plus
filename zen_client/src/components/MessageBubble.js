import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Reply, Star, Edit2, Trash2, Eye } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, TYPOGRAPHY, SHADOWS } from '../theme';

function getBubbleColor(msg, isMe) {
  if (!isMe) return COLORS.surface;
  if (msg.isRead) return COLORS.msgSeen;
  if (msg.isDelivered) return COLORS.msgDelivered;
  return COLORS.msgSent;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function MessageBubble({ message, isMe, onReply, onEdit, onDelete, onStar, onViewOnce }) {
  const [viewOnceRevealed, setViewOnceRevealed] = useState(false);
  const [longPressMenu, setLongPressMenu] = useState(false);

  const bubgBg = getBubbleColor(message, isMe);
  const isDeleted = message.isDeleted;

  const handleLongPress = () => setLongPressMenu(true);
  const closeMenu = () => setLongPressMenu(false);

  const renderContent = () => {
    if (isDeleted) {
      return (
        <Text style={styles.deletedText}>Message deleted</Text>
      );
    }

    if (message.type === 'image' || message.type === 'video') {
      if (message.isViewOnce && !viewOnceRevealed) {
        return (
          <TouchableOpacity onPress={() => { setViewOnceRevealed(true); onViewOnce?.(message.id); }} style={styles.viewOnceContainer}>
            <BlurView intensity={60} style={StyleSheet.absoluteFill} tint="dark" />
            <Eye size={28} color={COLORS.text} />
            <Text style={styles.viewOnceLabel}>View once - tap to reveal</Text>
          </TouchableOpacity>
        );
      }
      return (
        <Image
          source={{ uri: message.mediaUrl }}
          style={styles.mediaImage}
          resizeMode="cover"
        />
      );
    }

    return (
      <Text style={[styles.contentText, isMe && styles.contentTextMe]}>
        {message.content}
      </Text>
    );
  };

  return (
    <Pressable onLongPress={handleLongPress} style={[styles.row, isMe ? styles.rowMe : styles.rowThem]}>
      <View style={[
        styles.bubble,
        { backgroundColor: bubgBg },
        isMe ? styles.bubbleMe : styles.bubbleThem,
        message.isStarred && styles.bubbleStarred,
        isMe && SHADOWS.subtle,
      ]}>
        {message.replyToId && (
          <View style={styles.replyPreview}>
            <View style={styles.replyBar} />
            <Text style={styles.replyText} numberOfLines={1}>Replying to message</Text>
          </View>
        )}

        {renderContent()}

        <View style={styles.metaRow}>
          {message.isEdited && !isDeleted && (
            <Text style={styles.editedLabel}>edited</Text>
          )}
          {message.isStarred && <Star size={10} color={COLORS.warning} style={{ marginRight: 3 }} />}
          <Text style={[styles.timeText, isMe && styles.timeTextMe]}>
            {formatTime(message.createdAt)}
          </Text>
        </View>
      </View>

      {longPressMenu && (
        <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu}>
          <View style={[styles.contextMenu, isMe ? styles.contextMenuMe : styles.contextMenuThem]}>
            <TouchableOpacity style={styles.ctxItem} onPress={() => { closeMenu(); onReply?.(message); }}>
              <Reply size={14} color={COLORS.textDim} />
              <Text style={styles.ctxText}>Reply</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctxItem} onPress={() => { closeMenu(); onStar?.(message); }}>
              <Star size={14} color={message.isStarred ? COLORS.warning : COLORS.textDim} />
              <Text style={styles.ctxText}>{message.isStarred ? 'Unstar' : 'Star'}</Text>
            </TouchableOpacity>
            {isMe && !isDeleted && (
              <TouchableOpacity style={styles.ctxItem} onPress={() => { closeMenu(); onEdit?.(message); }}>
                <Edit2 size={14} color={COLORS.textDim} />
                <Text style={styles.ctxText}>Edit</Text>
              </TouchableOpacity>
            )}
            <View style={styles.ctxDivider} />
            <TouchableOpacity style={styles.ctxItem} onPress={() => { closeMenu(); onDelete?.(message, 'everyone'); }}>
              <Trash2 size={14} color={COLORS.error} />
              <Text style={[styles.ctxText, { color: COLORS.error }]}>Delete for everyone</Text>
            </TouchableOpacity>
            {isMe && (
              <TouchableOpacity style={styles.ctxItem} onPress={() => { closeMenu(); onDelete?.(message, 'self'); }}>
                <Trash2 size={14} color={COLORS.textMuted} />
                <Text style={[styles.ctxText, { color: COLORS.textMuted }]}>Delete for me</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
  },
  rowMe: { alignItems: 'flex-end' },
  rowThem: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: ROUNDING.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minWidth: 60,
  },
  bubbleMe: {
    borderBottomRightRadius: ROUNDING.sm,
  },
  bubbleThem: {
    borderBottomLeftRadius: ROUNDING.sm,
  },
  bubbleStarred: {
    borderWidth: 1,
    borderColor: `${COLORS.warning}55`,
  },
  contentText: {
    color: COLORS.textDim,
    fontSize: TYPOGRAPHY.fontSizes.md,
    lineHeight: 20,
  },
  contentTextMe: {
    color: COLORS.text,
  },
  deletedText: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    gap: 3,
  },
  editedLabel: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontStyle: 'italic',
  },
  timeText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
  },
  timeTextMe: {
    color: 'rgba(255,255,255,0.5)',
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: ROUNDING.sm,
    padding: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  replyBar: {
    width: 3,
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginRight: SPACING.xs,
    minHeight: 16,
  },
  replyText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    flex: 1,
  },
  mediaImage: {
    width: 200,
    height: 200,
    borderRadius: ROUNDING.md,
  },
  viewOnceContainer: {
    width: 200,
    height: 200,
    borderRadius: ROUNDING.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  viewOnceLabel: {
    color: COLORS.textDim,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  contextMenu: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: '#1E2530',
    borderRadius: ROUNDING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.xs,
    minWidth: 180,
    ...SHADOWS.card,
    zIndex: 99,
  },
  contextMenuMe: { right: 0 },
  contextMenuThem: { left: 0 },
  ctxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  ctxText: {
    color: COLORS.textDim,
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
  ctxDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },
});
