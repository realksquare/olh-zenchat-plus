import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Image, Modal, Platform, KeyboardAvoidingView
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Search, X, Music } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, TYPOGRAPHY } from '../theme';
import api from '../services/api';

export default function MusicPicker({ visible, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const renderTrack = ({ item }) => {
    return (
      <View style={styles.track}>
        {item.coverUrl
          ? <Image source={{ uri: item.coverUrl }} style={styles.cover} />
          : <View style={[styles.cover, styles.coverPlaceholder]}><Music size={20} color={COLORS.textMuted} /></View>
        }
        <View style={styles.trackInfo}>
          <View style={styles.trackHeader}>
            <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.sourceTag, { backgroundColor: item.source === 'iTunes' ? '#FF2D55' : '#00C7F2' }]}>
              <Text style={styles.sourceTagText}>{item.source}</Text>
            </View>
          </View>
          <Text style={styles.trackArtist} numberOfLines={1}>• {item.artist}</Text>
        </View>
        <TouchableOpacity style={styles.selectBtn} onPress={() => { onSelect(item); onClose(); }}>
          <Text style={styles.selectBtnText}>Select</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </BlurView>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheet}
      >
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>#moments.</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <Search size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={search}
            placeholder="Search tracks (30s previews)..."
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
      </KeyboardAvoidingView>
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
    paddingBottom: 40,
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
    justifyContent: 'space-between',
  },
  title: {
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: ROUNDING.md,
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
    paddingBottom: SPACING.xl,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: ROUNDING.md,
  },
  coverPlaceholder: {
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: { flex: 1 },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sourceTag: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  sourceTagText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  trackTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    flexShrink: 1,
  },
  trackArtist: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    marginTop: 2,
  },
  selectBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
