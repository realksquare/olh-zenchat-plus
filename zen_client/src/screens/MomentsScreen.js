import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { COLORS, SPACING, TYPOGRAPHY, ROUNDING } from '../theme';
import { Music, PlaySquare, Plus } from 'lucide-react-native';
import api from '../services/api';

const { width, height } = Dimensions.get('window');

export default function MomentsScreen() {
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    fetchMoments();
  }, []);

  const fetchMoments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/moments');
      setMoments(res.data.moments || []);
    } catch (error) {
      console.error('Failed to fetch moments:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMomentCard = ({ item }) => {
    return (
      <View style={styles.momentCard}>
        {item.mediaUrl?.endsWith('.mp4') ? (
          <Video
            ref={videoRef}
            style={styles.media}
            source={{ uri: item.mediaUrl }}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay
            isMuted={false}
          />
        ) : (
          <View style={[styles.media, styles.placeholderMedia]}>
            <PlaySquare color={COLORS.textMuted} size={48} />
          </View>
        )}
        
        <View style={styles.overlay}>
          <View style={styles.authorInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.user?.name?.[0] || '?'}</Text>
            </View>
            <Text style={styles.authorName}>{item.user?.name || 'Unknown'}</Text>
          </View>
          
          {item.music && (
            <View style={styles.musicTag}>
              <Music color={COLORS.text} size={16} style={{ marginRight: 4 }} />
              <Text style={styles.musicText} numberOfLines={1}>
                {item.music.title} - {item.music.artist}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Moments</Text>
        <TouchableOpacity style={styles.addButton}>
          <Plus color={COLORS.text} size={24} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={moments}
          keyExtractor={(item) => item._id}
          renderItem={renderMomentCard}
          showsVerticalScrollIndicator={false}
          snapToInterval={height * 0.7 + SPACING.md}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No moments right now. Share one!</Text>
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
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  addButton: {
    padding: SPACING.xs,
  },
  listContent: {
    padding: SPACING.md,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  momentCard: {
    width: '100%',
    height: height * 0.7,
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDING.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    position: 'relative',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  placeholderMedia: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    paddingTop: SPACING.xl,
    // Note: a gradient would be better here via expo-linear-gradient
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  authorName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  musicTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: ROUNDING.full,
    alignSelf: 'flex-start',
    maxWidth: '80%', // Fix for long song names from earlier conversation context
  },
  musicText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
});
