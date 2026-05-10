import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Audio } from 'expo-av';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert, ActivityIndicator, Modal, TextInput,
  RefreshControl, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import {
  Plus, Music, Camera, Image as ImageIcon, X, Check, Eye, Trash2,
  Play, Pause, Send
} from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, TYPOGRAPHY, SHADOWS } from '../theme';
import { AuthContext } from '../contexts/AuthContext';
import AuraAvatar from '../components/AuraAvatar';
import MusicPicker from '../components/MusicPicker';
import api from '../services/api';
import { uploadMedia } from '../services/upload';

function groupMomentsByUser(moments, myId) {
  const map = new Map();
  for (const m of moments) {
    const uid = m.user?.id;
    if (!uid) continue;
    if (!map.has(uid)) map.set(uid, { user: m.user, moments: [] });
    map.get(uid).moments.push(m);
  }
  const arr = [...map.values()];
  const myIdx = arr.findIndex(g => g.user.id === myId);
  if (myIdx > 0) {
    const [me] = arr.splice(myIdx, 1);
    arr.unshift(me);
  }
  return arr;
}


export default function MomentsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);
  const myId = user?._id || user?.id;

  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewedIds, setViewedIds] = useState(new Set());
  const [creating, setCreating] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [draft, setDraft] = useState({ content: '', song: null, startTime: 0, duration: 18 });
  const [uploading, setUploading] = useState(false);
  
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seekerWidth, setSeekerWidth] = useState(280);

  useEffect(() => { fetchMoments(); }, []);

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const togglePlayback = async () => {
    if (!draft.song?.previewUrl) return;
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.setPositionAsync(draft.startTime * 1000);
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: draft.song.previewUrl },
        { shouldPlay: true, positionMillis: draft.startTime * 1000 }
      );
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate((s) => {
        if (s.didJustFinish || s.positionMillis >= (draft.startTime + draft.duration) * 1000) {
          newSound.stopAsync();
          setIsPlaying(false);
        }
      });
    }
  };

  const updateStartTime = async (time) => {
    setDraft(d => ({ ...d, startTime: time }));
    if (sound) {
      await sound.setPositionAsync(time * 1000);
    }
  };

  const fetchMoments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/moments');
      const list = res.data.moments || [];
      setMoments(list);
      setViewedIds(new Set(list.filter(m => m.viewedByMe).map(m => m.id)));
    } catch {}
    finally { setLoading(false); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMoments();
    setRefreshing(false);
  }, []);

  const publishMoment = async () => {
    if (!draft.content.trim() && !draft.song) return;
    setUploading(true);
    try {
      await api.post('/moments', {
        content: draft.content.trim() || null,
        songData: draft.song ? { ...draft.song, startTime: draft.startTime, duration: draft.duration } : null,
        type: 'text'
      });
      if (sound) await sound.unloadAsync();
      setCreating(false);
      setDraft({ content: '', song: null, startTime: 0, duration: 18 });
      await fetchMoments();
    } catch (err) {
      Alert.alert('Failed', 'Could not post your moment. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteMyMoment = (momentId) => {
    Alert.alert('Delete Moment', 'Remove this moment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/moments/${momentId}`);
            setMoments(prev => prev.filter(m => m.id !== momentId));
          } catch {}
        },
      },
    ]);
  };

  const groups = groupMomentsByUser(moments, myId);
  const myGroup = groups.find(g => g.user.id === myId);

  const renderGroup = ({ item: group }) => {
    const isMe = group.user.id === myId;
    const firstMoment = group.moments[0];

    return (
      <TouchableOpacity
        style={styles.groupCard}
        onPress={() => {
          group.moments.forEach(m => {
            if (!viewedIds.has(m.id)) {
              setViewedIds(prev => new Set([...prev, m.id]));
            }
          });
          navigation.navigate('MomentViewer', { moments: group.moments, startIndex: 0 });
        }}
      >
        <View style={styles.groupThumb}>
          <View style={styles.thumbContent}>
            {firstMoment.songData ? (
               <Image source={{ uri: firstMoment.songData.coverUrl }} style={styles.thumbSongCover} />
            ) : (
              <Text style={styles.thumbText} numberOfLines={3}>{firstMoment.content}</Text>
            )}
          </View>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={StyleSheet.absoluteFill}
          />
          <AuraAvatar user={group.user} size={40} moments={group.moments} viewedIds={viewedIds} style={styles.thumbAvatar} />
          
          <View style={styles.groupMeta}>
            <Text style={styles.groupName} numberOfLines={1}>{group.user.username}</Text>
            <Text style={styles.groupCount}>{group.moments.length} moment{group.moments.length !== 1 ? 's' : ''}</Text>
          </View>
          {isMe && (
            <TouchableOpacity
              style={styles.deleteThumbBtn}
              onPress={() => deleteMyMoment(firstMoment.id)}
            >
              <Trash2 size={13} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>#moments.</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreating(true)}>
          <Plus size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xxl }} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={g => g.user.id}
          renderItem={renderGroup}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <TouchableOpacity style={styles.addYoursCard} onPress={() => setCreating(true)}>
              <View style={styles.addYoursContent}>
                <AuraAvatar user={user} size={56} moments={myGroup?.moments || []} viewedIds={viewedIds} />
                <View style={styles.addYoursText}>
                   <Text style={styles.addYoursLabel}>
                    {myGroup ? 'Add to your #moments.' : 'Share your #moment.'}
                  </Text>
                  <Text style={styles.addYoursSub}>Minimalistic. Expressive.</Text>
                </View>
                <Plus size={20} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No moments from your contacts yet</Text>
          }
        />
      )}

      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.createCard}>
            <View style={styles.createHeader}>
              <Text style={styles.createTitle}>#moments.</Text>
              <TouchableOpacity onPress={() => setCreating(false)} style={styles.closeBtn}>
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputArea}>
              <View style={styles.inputIconContainer}>
                 <Plus size={24} color={COLORS.textDim} />
              </View>
              <Text style={styles.inputPrompt}>Capture your thought</Text>
              <Text style={styles.inputSubPrompt}>Minimalistic. Expressive. 49 characters.</Text>
              
              <TextInput
                style={styles.mainInput}
                placeholder="Share your thoughts..."
                placeholderTextColor={COLORS.textMuted}
                value={draft.content}
                onChangeText={t => setDraft(d => ({ ...d, content: t }))}
                selectionColor={COLORS.primary}
                maxLength={49}
                multiline
              />
              
              <Text style={styles.charCount}>{draft.content.length}/49</Text>
            </View>

            {draft.song && (
              <View style={styles.cropperCard}>
                <View style={styles.cropperHeader}>
                  <TouchableOpacity style={styles.cropperPlayBtn} onPress={togglePlayback}>
                    {isPlaying ? <Pause size={20} color="#fff" /> : <Play size={20} color="#fff" />}
                  </TouchableOpacity>
                  <View style={styles.cropperInfo}>
                    <Text style={styles.cropperSongTitle} numberOfLines={1}>{draft.song.title}</Text>
                    <Text style={styles.cropperArtist} numberOfLines={1}>{draft.song.artist}</Text>
                  </View>
                  <View style={styles.cropperDurationRow}>
                    {[18, 24, 30].map(d => (
                      <TouchableOpacity 
                        key={d} 
                        style={[styles.durationChip, draft.duration === d && styles.durationChipActive]}
                        onPress={() => setDraft(v => ({ ...v, duration: d }))}
                      >
                        <Text style={[styles.durationText, draft.duration === d && styles.durationTextActive]}>{d}s</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity onPress={() => { if(sound) sound.unloadAsync(); setDraft(d => ({ ...d, song: null })); }} style={styles.cropperRemoveBtn}>
                    <X size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.seekerContainer}>
                   <View 
                     style={styles.seekerTrack}
                     onLayout={(e) => setSeekerWidth(e.nativeEvent.layout.width)}
                   >
                     <View 
                       style={[
                         styles.seekerThumb, 
                         { left: `${(draft.startTime / ((draft.song.totalDuration || 30) - draft.duration)) * 100}%` }
                       ]} 
                     />
                     <TouchableOpacity 
                       style={StyleSheet.absoluteFill} 
                       activeOpacity={1}
                       onPress={(e) => {
                         const x = e.nativeEvent.locationX;
                         const percent = Math.max(0, Math.min(1, x / seekerWidth));
                         const newStart = Math.floor(percent * ((draft.song.totalDuration || 30) - draft.duration));
                         updateStartTime(Math.max(0, newStart));
                       }}
                     />
                   </View>
                </View>
              </View>
            )}

            <View style={styles.createActions}>
              <TouchableOpacity style={styles.musicBtn} onPress={() => setShowMusicPicker(true)}>
                <Music size={20} color={draft.song ? COLORS.primary : COLORS.text} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.publishBtn, (!draft.content.trim() && !draft.song) && styles.publishBtnDisabled]} 
                onPress={publishMoment} 
                disabled={uploading || (!draft.content.trim() && !draft.song)}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.publishBtnText}>Live the #moment.</Text>
                    <Send size={16} color="#fff" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <MusicPicker
        visible={showMusicPicker}
        onSelect={song => setDraft(d => ({ ...d, song }))}
        onClose={() => setShowMusicPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  addBtn: {
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  columnWrapper: { gap: SPACING.md },
  addYoursCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  addYoursContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  addYoursText: {
    flex: 1,
  },
  addYoursLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  addYoursSub: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    marginTop: 2,
  },
  groupCard: {
    flex: 1,
  },
  groupThumb: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: ROUNDING.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumbContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  thumbSongCover: {
    width: '80%',
    aspectRatio: 1,
    borderRadius: ROUNDING.md,
  },
  thumbText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    textAlign: 'center',
  },
  thumbAvatar: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
  },
  groupMeta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
  },
  groupName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  groupCount: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
  },
  deleteThumbBtn: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: ROUNDING.full,
    padding: 6,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xxl,
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  createCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDING.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    ...SHADOWS.card,
  },
  createHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  createTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  closeBtn: {
    padding: SPACING.xs,
    backgroundColor: COLORS.background,
    borderRadius: ROUNDING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputArea: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
    borderRadius: ROUNDING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    marginBottom: SPACING.xl,
  },
  inputIconContainer: {
    width: 48,
    height: 48,
    borderRadius: ROUNDING.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  inputPrompt: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  inputSubPrompt: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    marginBottom: SPACING.lg,
  },
  mainInput: {
    width: '100%',
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.md,
    textAlign: 'center',
    minHeight: 60,
  },
  charCount: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    marginTop: SPACING.md,
    alignSelf: 'flex-start',
  },
  selectedSong: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: ROUNDING.md,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  selectedSongCover: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  selectedSongInfo: {
    flex: 1,
  },
  selectedSongTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: '600',
  },
  selectedSongArtist: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  cropperCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: ROUNDING.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: SPACING.xl,
  },
  cropperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cropperPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropperInfo: {
    flex: 1,
  },
  cropperSongTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  cropperArtist: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  cropperDurationRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  durationChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationChipActive: {
    backgroundColor: COLORS.primary,
  },
  durationText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  durationTextActive: {
    color: '#fff',
  },
  cropperRemoveBtn: {
    padding: 4,
  },
  seekerContainer: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xs,
  },
  seekerTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    justifyContent: 'center',
  },
  seekerThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: COLORS.primary,
    marginLeft: -7,
  },
  createActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  musicBtn: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: ROUNDING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  publishBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2563EB', // A slightly brighter blue for the CTA
    paddingVertical: SPACING.md,
    borderRadius: ROUNDING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtnDisabled: {
    opacity: 0.5,
  },
  publishBtnText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
