import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Image, Modal
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Search, X, Music, Check } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, TYPOGRAPHY } from '../theme';
import api from '../services/api';

export default function MusicPicker({ visible, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const search = async (text) => {
    setQuery(text);
    if (text.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await api.get('/music/search', { params: { q: text } });
      setResults(res.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const confirm = () => {
    if (selected) onSelect(selected);
    onClose();
  };

  const renderTrack = ({ item }) => {
    const isSelected = selected?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.track, isSelected && styles.trackSelected]}
        onPress={() => setSelected(isSelected ? null : item)}
      >
        {item.coverUrl
          ? <Image source={{ uri: item.coverUrl }} style={styles.cover} />
          : <View style={[styles.cover, styles.coverPlaceholder]}><Music size={20} color={COLORS.textMuted} /></View>
        }
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
          <View style={styles.sourceTag}>
            <Text style={styles.sourceText}>{item.source}</Text>
          </View>
        </View>
        {isSelected && <Check size={18} color={COLORS.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </BlurView>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Music size={20} color={COLORS.primary} />
          <Text style={styles.title}>Pick a song</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <Search size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={search}
            placeholder="Search iTunes + Deezer..."
            placeholderTextColor={COLORS.textMuted}
            autoFocus
            autoCapitalize="none"
            selectionColor={COLORS.primary}
          />
          {loading && <ActivityIndicator size="small" color={COLORS.primary} />}
        </View>

        <FlatList
          data={results}
          keyExtractor={i => i.id}
          renderItem={renderTrack}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query.length >= 2 && !loading
              ? <Text style={styles.empty}>No tracks found</Text>
              : null
          }
        />

        {selected && (
          <View style={styles.confirmBar}>
            <Text style={styles.confirmText} numberOfLines={1}>
              {selected.title} - {selected.artist}
            </Text>
            <TouchableOpacity style={styles.confirmBtn} onPress={confirm}>
              <Text style={styles.confirmBtnText}>Add to Aura</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: ROUNDING.xxl,
    borderTopRightRadius: ROUNDING.xxl,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: SPACING.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    flex: 1,
  },
  closeBtn: {
    padding: SPACING.xs,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: ROUNDING.full,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: ROUNDING.full,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    height: 44,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.md,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: ROUNDING.lg,
    gap: SPACING.sm,
    marginBottom: 2,
  },
  trackSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: ROUNDING.sm,
  },
  coverPlaceholder: {
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: { flex: 1 },
  trackTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  trackArtist: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    marginTop: 2,
  },
  sourceTag: {
    marginTop: 4,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: ROUNDING.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  sourceText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
  },
  empty: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  confirmBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  confirmText: {
    color: COLORS.textDim,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    flex: 1,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: ROUNDING.full,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
