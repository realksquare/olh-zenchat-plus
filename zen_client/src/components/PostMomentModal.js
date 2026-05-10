import React, { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Plus, Music, X, Play, Pause, Send } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, TYPOGRAPHY, SHADOWS } from '../theme';
import MusicPicker from './MusicPicker';
import api from '../services/api';

export default function PostMomentModal({ visible, onClose, onPublished }) {
  const [draft, setDraft] = useState({ content: '', song: null, startTime: 0, duration: 18 });
  const [uploading, setUploading] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seekerWidth, setSeekerWidth] = useState(280);

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
      setDraft({ content: '', song: null, startTime: 0, duration: 18 });
      onPublished?.();
      onClose();
    } catch (err) {
      console.error('Failed to post moment:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.createCard}>
          <View style={styles.createHeader}>
            <Text style={styles.createTitle}>#moment.</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
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
      <MusicPicker
        visible={showMusicPicker}
        onSelect={song => setDraft(d => ({ ...d, song }))}
        onClose={() => setShowMusicPicker(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#2563EB',
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
