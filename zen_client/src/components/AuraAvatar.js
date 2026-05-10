import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../theme';

import { AuthContext } from '../contexts/AuthContext';

export default function AuraAvatar({ user, size = 44, moments = [], viewedIds = new Set(), style }) {
  const { user: currentUser } = React.useContext(AuthContext);
  const myId = currentUser?._id || currentUser?.id;
  const isMe = user?.id === myId || user?._id === myId;
  
  const userMoments = moments.filter(m => m.user?.id === user?.id || m.userId === user?.id);
  const hasUnwatched = userMoments.some(m => !viewedIds.has(m.id));

  let haloColor = null;

  if (userMoments.length > 0) {
    haloColor = isMe
      ? (hasUnwatched ? COLORS.auraSapphire : COLORS.auraCharcoal)
      : (hasUnwatched ? COLORS.auraEmerald : COLORS.auraCharcoal);
  }

  const avatarSize = size;
  const haloSize = avatarSize + 6;
  const initial = (user?.username || user?.fullName || '?')[0].toUpperCase();

  return (
    <View style={[styles.container, style]}>
      {haloColor && (
        <View
          style={[
            styles.halo,
            {
              width: haloSize,
              height: haloSize,
              borderRadius: haloSize / 2,
              borderColor: haloColor,
            },
          ]}
        />
      )}
      <View style={[styles.avatarContainer, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
        {user?.avatar ? (
          <Image
            source={{ uri: user.avatar }}
            style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
          />
        ) : (
          <View style={[styles.initials, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
            <Text style={[styles.initialText, { fontSize: avatarSize * 0.38 }]}>{initial}</Text>
          </View>
        )}
      </View>
      {user?.isOnline && (
        <View style={[styles.onlineDot, { bottom: 0, right: 0 }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    borderWidth: 2.5,
  },
  avatarContainer: {
    overflow: 'hidden',
    backgroundColor: COLORS.primaryLight,
  },
  initials: {
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.online,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
});
