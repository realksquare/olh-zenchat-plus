import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  FlatList, Image, Animated, Easing, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Music, Eye } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, TYPOGRAPHY, SHADOWS } from '../theme';
import api from '../services/api';
import AuraAvatar from '../components/AuraAvatar';

import { Audio } from 'expo-av';

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
  const [sound, setSound] = useState(null);

  const current = moments[currentIndex];

  useEffect(() => {
    return () => { if (sound) sound.unloadAsync(); };
  }, [sound]);

  const playSong = async (song) => {
    if (sound) await sound.unloadAsync();
    if (!song?.previewUrl) return;
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: song.previewUrl },
      { shouldPlay: true, positionMillis: (song.startTime || 0) * 1000 }
    );
    setSound(newSound);
  };

  useEffect(() => {
    if (current?.songData) {
      playSong(current.songData);
    } else if (sound) {
      sound.stopAsync();
    }
  }, [currentIndex]);

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

  const [viewedIds, setViewedIds] = useState(new Set());

  useEffect(() => {
    if (current) {
      markViewed(current.id);
      setViewedIds(prev => new Set([...prev, current.id]));
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!current || current.mediaType === 'video') return;
    const duration = (current.songData?.duration || 5) * 1000;
    progressAnim.setValue(0);
    animRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: duration,
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
        renderItem={({ item }) => {
          const song = item.songData;
          return (
            <View style={styles.slide}>
               <LinearGradient
                colors={['#1F2937', '#0F172A']}
                style={StyleSheet.absoluteFill}
              />
              
              <View style={styles.centerContent}>
                {song ? (
                  <View style={styles.songContainer}>
                    <Image source={{ uri: song.coverUrl }} style={styles.songArtwork} />
                    <View style={styles.visualizer}>
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <View key={i} style={[styles.visBar, { height: 8 + Math.random() * 12 }]} />
                      ))}
                    </View>
                    <View style={styles.songBadgeRow}>
                      <View style={[styles.songBadge, { backgroundColor: song.source === 'iTunes' ? '#FF2D55' : '#00C7F2' }]}>
                         <Text style={styles.songBadgeText}>{song.source}</Text>
                      </View>
                      <View style={styles.songBadge}>
                         <Text style={styles.songBadgeText}>{song.duration}s</Text>
                      </View>
                    </View>
                    <Text style={styles.songTitle}>{song.title}</Text>
                    <Text style={styles.songArtist}>{song.artist}</Text>
                  </View>
                ) : (
                  <Text style={styles.momentText}>{item.content}</Text>
                )}
              </View>
            </View>
          );
        }}
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
             <AuraAvatar user={current?.user} size={40} moments={moments} viewedIds={viewedIds} />
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.username}>{current?.user?.username || 'Unknown'}</Text>
            <Text style={styles.timeAgo}>{current?.inserted_at ? 'Just now' : ''}</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.viewCount}>
              <Eye size={18} color="#fff" />
              <Text style={styles.viewCountText}>{current?.viewCount || 0}</Text>
            </View>
            <TouchableOpacity style={styles.moreBtn} onPress={() => navigation.goBack()}>
               <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.footer}>
        <Text style={styles.footerText}>#moments. - powered by OLH ZenChat.</Text>
      </View>

      <TouchableOpacity style={styles.tapLeft} onPress={goPrev} />
      <TouchableOpacity style={styles.tapRight} onPress={goNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  slide: { width: SCREEN_W, height: SCREEN_H, justifyContent: 'center', alignItems: 'center' },
  centerContent: {
    width: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  songContainer: {
    alignItems: 'center',
  },
  songArtwork: {
    width: 180,
    height: 180,
    borderRadius: ROUNDING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  visualizer: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    height: 20,
    marginBottom: SPACING.xl,
  },
  visBar: {
    width: 3,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  songBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  songBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  songBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  songTitle: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  songArtist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: TYPOGRAPHY.fontSizes.md,
    marginTop: 4,
    textAlign: 'center',
  },
  momentText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 38,
  },
  topGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: SPACING.md,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: SPACING.lg,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    gap: SPACING.md,
  },
  userInfo: { flex: 1 },
  username: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  viewCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewCountText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: 0, right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  tapLeft: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: '30%',
  },
  tapRight: {
    position: 'absolute',
    right: 0, top: 0, bottom: 0,
    width: '70%',
  },
});
