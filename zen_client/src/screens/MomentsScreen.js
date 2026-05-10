import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert, ActivityIndicator, Modal, TextInput,
  RefreshControl, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import {
  Plus, Music, Camera, Image as ImageIcon, X, Check, Eye, Trash2
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
  const [draft, setDraft] = useState({ uri: null, mediaType: 'image', caption: '', song: null });
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchMoments(); }, []);

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

  const pickMedia = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setDraft(d => ({ ...d, uri: result.assets[0].uri, mediaType: type }));
      setCreating(true);
    }
  };

  const publishMoment = async () => {
    if (!draft.uri) return;
    setUploading(true);
    try {
      const { success, url } = await uploadMedia(draft.uri, draft.mediaType);
      if (!success || !url) throw new Error('Upload failed');

      await api.post('/moments', {
        mediaUrl: url,
        mediaType: draft.mediaType,
        caption: draft.caption.trim() || null,
        songData: draft.song || null,
      });
      setCreating(false);
      setDraft({ uri: null, mediaType: 'image', caption: '', song: null });
      await fetchMoments();
    } catch (err) {
      Alert.alert('Failed', 'Could not post your Aura. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteMyMoment = (momentId) => {
    Alert.alert('Delete Aura', 'Remove this moment?', [
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
    const hasUnwatched = group.moments.some(m => !viewedIds.has(m.id));

    const haloColor = isMe
      ? (hasUnwatched ? COLORS.auraSapphire : COLORS.auraCharcoal)
      : (hasUnwatched ? COLORS.auraEmerald : COLORS.auraCharcoal);

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
          <Image source={{ uri: firstMoment.mediaUrl }} style={styles.thumbImg} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.haloRing, { borderColor: haloColor }]} />
          <View style={styles.groupMeta}>
            <Text style={styles.groupName} numberOfLines={1}>{group.user.username}</Text>
            <Text style={styles.groupCount}>{group.moments.length} aura{group.moments.length !== 1 ? 's' : ''}</Text>
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
        <Text style={styles.headerTitle}>Aura</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => pickMedia('image')}>
          <Camera size={18} color={COLORS.text} />
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
            <TouchableOpacity style={styles.addYoursCard} onPress={() => pickMedia('image')}>
              <LinearGradient
                colors={[COLORS.primaryDark, COLORS.primary]}
                style={styles.addYoursGradient}
              >
                {myGroup
                  ? <Image source={{ uri: myGroup.moments[0]?.mediaUrl }} style={StyleSheet.absoluteFill} blurRadius={2} />
                  : null}
                <View style={styles.addYoursIcon}>
                  <Plus size={28} color="#fff" />
                </View>
                <Text style={styles.addYoursLabel}>
                  {myGroup ? 'Add to your Aura' : 'Share your Aura'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No moments from your contacts yet</Text>
          }
        />
      )}

      <Modal visible={creating} transparent animationType="slide" onRequestClose={() => setCreating(false)}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[styles.createSheet, { paddingBottom: insets.bottom + SPACING.md }]}>
          <View style={styles.createHeader}>
            <TouchableOpacity onPress={() => setCreating(false)} disabled={uploading}>
              <X size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
            <Text style={styles.createTitle}>New Aura</Text>
            <TouchableOpacity onPress={publishMoment} disabled={uploading || !draft.uri} style={styles.publishBtn}>
              {uploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.publishBtnText}>Share</Text>}
            </TouchableOpacity>
          </View>

          {draft.uri && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: draft.uri }} style={styles.previewImg} resizeMode="cover" />
            </View>
          )}

          <View style={styles.captionRow}>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption..."
              placeholderTextColor={COLORS.textMuted}
              value={draft.caption}
              onChangeText={t => setDraft(d => ({ ...d, caption: t }))}
              selectionColor={COLORS.primary}
              maxLength={200}
            />
          </View>

          <View style={styles.draftActions}>
            <TouchableOpacity style={styles.draftAction} onPress={() => pickMedia('image')}>
              <ImageIcon size={20} color={COLORS.textDim} />
              <Text style={styles.draftActionLabel}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.draftAction} onPress={() => pickMedia('video')}>
              <Camera size={20} color={COLORS.textDim} />
              <Text style={styles.draftActionLabel}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.draftAction, draft.song && styles.draftActionActive]}
              onPress={() => setShowMusicPicker(true)}
            >
              <Music size={20} color={draft.song ? COLORS.primary : COLORS.textDim} />
              <Text style={[styles.draftActionLabel, draft.song && { color: COLORS.primary }]}>
                {draft.song ? draft.song.title.slice(0, 12) : 'Music'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
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
    backgroundColor: COLORS.primaryLight,
    borderRadius: ROUNDING.full,
  },
  listContent: {
    padding: SPACING.sm,
    paddingBottom: SPACING.xxxl,
  },
  columnWrapper: { gap: SPACING.sm },
  addYoursCard: {
    width: '100%',
    height: 120,
    borderRadius: ROUNDING.lg,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  addYoursGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  addYoursIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addYoursLabel: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  groupCard: {
    flex: 1,
  },
  groupThumb: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: ROUNDING.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  thumbImg: { width: '100%', height: '100%' },
  haloRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: ROUNDING.lg,
    borderWidth: 3,
  },
  groupMeta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.sm,
  },
  groupName: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  groupCount: {
    color: 'rgba(255,255,255,0.7)',
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
  createSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: ROUNDING.xxl,
    borderTopRightRadius: ROUNDING.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '85%',
  },
  createHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  createTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  publishBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: ROUNDING.full,
    minWidth: 60,
    alignItems: 'center',
  },
  publishBtnText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  previewContainer: {
    marginHorizontal: SPACING.xl,
    height: 220,
    borderRadius: ROUNDING.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  previewImg: { width: '100%', height: '100%' },
  captionRow: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  captionInput: {
    backgroundColor: COLORS.background,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: ROUNDING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSizes.md,
  },
  draftActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  draftAction: {
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: ROUNDING.md,
  },
  draftActionActive: {
    backgroundColor: COLORS.primaryLight,
  },
  draftActionLabel: {
    color: COLORS.textDim,
    fontSize: TYPOGRAPHY.fontSizes.xs,
  },
});
