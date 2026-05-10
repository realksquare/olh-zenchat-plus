import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  FlatList, Image, Animated, Easing, StatusBar
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Music, Eye } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, TYPOGRAPHY } from '../theme';
import api from '../services/api';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MOMENT_DURATION = 5000;

export default function MomentViewer() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { moments = [], startIndex = 0 } = route.params || {};

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const flatListRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);

  const current = moments[currentIndex];

  const markViewed = useCallback(async (id) => {
    try { await api.post(`/moments/${id}/view`); } catch {}
  }, []);

  const stopProgress = () => {
    animRef.current?.stop();
    progressAnim.setValue(0);
  };

  const goNext = useCallback(() => {
    stopProgress();
    if (currentIndex < moments.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      flatListRef.current?.scrollToIndex({ index: next, animated: false });
    } else {
      navigation.goBack();
    }
  }, [currentIndex, moments.length, navigation]);

  const goPrev = useCallback(() => {
    stopProgress();
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      flatListRef.current?.scrollToIndex({ index: prev, animated: false });
    }
  }, [currentIndex]);

  useEffect(() => {
    if (current) markViewed(current.id);
  }, [currentIndex]);

  useEffect(() => {
    if (!current || current.mediaType === 'video') return;
    progressAnim.setValue(0);
    animRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: MOMENT_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished) goNext();
    });
    return stopProgress;
  }, [currentIndex]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const handleVideoStatus = (status) => {
    if (status.didJustFinish) goNext();
  };

  const song = current?.songData;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <FlatList
        ref={flatListRef}
        data={moments}
        keyExtractor={i => i.id}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {item.mediaType === 'video'
              ? <Video
                  source={{ uri: item.mediaUrl }}
                  style={styles.media}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={item.id === current?.id}
                  isLooping={false}
                  onPlaybackStatusUpdate={handleVideoStatus}
                />
              : <Image source={{ uri: item.mediaUrl }} style={styles.media} resizeMode="cover" />
            }
          </View>
        )}
      />

      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent']}
        style={[styles.topGradient, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.progressRow}>
          {moments.map((_, i) => (
            <View key={i} style={styles.progressTrack}>
              {i < currentIndex && <View style={styles.progressFull} />}
              {i === currentIndex && (
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              )}
            </View>
          ))}
        </View>

        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.username}>{current?.user?.username || 'Unknown'}</Text>
            {current?.viewCount !== undefined && (
              <View style={styles.viewCount}>
                <Eye size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.viewCountText}>{current.viewCount}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={[styles.bottomGradient, { paddingBottom: insets.bottom + SPACING.md }]}
      >
        {current?.caption ? (
          <Text style={styles.caption}>{current.caption}</Text>
        ) : null}
        {song && (
          <BlurView intensity={30} tint="dark" style={styles.musicTag}>
            <Music size={14} color="#fff" />
            <Text style={styles.musicText} numberOfLines={1}>
              {song.title} - {song.artist}
            </Text>
            <View style={[styles.sourceChip, song.source === 'iTunes' ? styles.itunesChip : styles.deezerChip]}>
              <Text style={styles.sourceChipText}>{song.source}</Text>
            </View>
          </BlurView>
        )}
      </LinearGradient>

      <TouchableOpacity style={styles.tapLeft} onPress={goPrev} />
      <TouchableOpacity style={styles.tapRight} onPress={goNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  slide: { width: SCREEN_W, height: SCREEN_H },
  media: { width: SCREEN_W, height: SCREEN_H },
  topGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 160,
    paddingHorizontal: SPACING.md,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFull: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  backBtn: { padding: SPACING.xs },
  userInfo: { flex: 1 },
  username: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  viewCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  viewCountText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: TYPOGRAPHY.fontSizes.xs,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 200,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'flex-end',
  },
  caption: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSizes.md,
    marginBottom: SPACING.sm,
  },
  musicTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: ROUNDING.full,
    overflow: 'hidden',
    gap: SPACING.sm,
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  musicText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSizes.sm,
    flex: 1,
  },
  sourceChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: ROUNDING.sm,
  },
  itunesChip: { backgroundColor: '#FC3C44' },
  deezerChip: { backgroundColor: '#EF5466' },
  sourceChipText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  tapLeft: {
    position: 'absolute',
    left: 0, top: 100,
    width: '35%', height: SCREEN_H - 100,
  },
  tapRight: {
    position: 'absolute',
    right: 0, top: 100,
    width: '65%', height: SCREEN_H - 100,
  },
});
