import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Modal, ActivityIndicator, ScrollView, Image, Alert
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, User, Mail, Lock, AtSign, Check } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, TYPOGRAPHY, SHADOWS } from '../theme';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';

export default function ProfileModal({ visible, onClose }) {
  const { user, setUser } = useContext(AuthContext);
  const [username, setUsername] = useState(user?.username || '');
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.[0]) {
      const uri = res.assets[0].uri;
      const form = new FormData();
      form.append('media', { uri, name: 'avatar.jpg', type: 'image/jpeg' });
      try {
        const r = await api.post('/messages/media', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (r.data?.url) setAvatar(r.data.url);
      } catch {
        setAvatar(uri);
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      const payload = {};
      if (username !== user?.username) payload.username = username.trim();
      if (fullName !== user?.fullName) payload.full_name = fullName.trim();
      if (avatar !== user?.avatar) payload.avatar = avatar;
      if (password.trim()) payload.password = password.trim();

      if (Object.keys(payload).length === 0) {
        setLoading(false);
        onClose();
        return;
      }

      const res = await api.put('/auth/me', payload);
      if (res.data?.user && setUser) {
        setUser(res.data.user);
      }
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); }, 800);
    } catch (err) {
      const msg = err.response?.data?.message || 'Update failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const initials = (user?.username || user?.fullName || '?')[0].toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </BlurView>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>Edit Profile</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImg} />
            ) : (
              <LinearGradient colors={[COLORS.primaryDark, COLORS.primary]} style={styles.avatarImg}>
                <Text style={styles.avatarInitial}>{initials}</Text>
              </LinearGradient>
            )}
            <View style={styles.cameraBadge}>
              <Camera size={14} color={COLORS.text} />
            </View>
          </TouchableOpacity>

          <Field icon={<AtSign size={18} color={COLORS.textMuted} />} label="Username" value={username} onChangeText={setUsername} placeholder="your_username" autoCapitalize="none" />
          <Field icon={<User size={18} color={COLORS.textMuted} />} label="Display name" value={fullName} onChangeText={setFullName} placeholder="Display name" />
          <Field icon={<Mail size={18} color={COLORS.textMuted} />} label="Email" value={email} editable={false} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field icon={<Lock size={18} color={COLORS.textMuted} />} label="New password" value={password} onChangeText={setPassword} placeholder="Leave blank to keep current" secureTextEntry />

          <TouchableOpacity style={[styles.saveBtn, SHADOWS.glow]} onPress={handleSave} disabled={loading}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveBtnGradient}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : success ? (
                <Check size={20} color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save changes</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Field({ icon, label, value, onChangeText, placeholder, editable = true, ...rest }) {
  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={[fieldStyles.inputRow, !editable && fieldStyles.disabled]}>
        {icon}
        <TextInput
          style={fieldStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          editable={editable}
          selectionColor={COLORS.primary}
          {...rest}
        />
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  group: { marginBottom: SPACING.md },
  label: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.fontSizes.xs, marginBottom: SPACING.xs, marginLeft: 2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: ROUNDING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    height: 48,
  },
  disabled: { opacity: 0.5 },
  input: { flex: 1, color: COLORS.text, fontSize: TYPOGRAPHY.fontSizes.md },
});

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: ROUNDING.xxl,
    borderTopRightRadius: ROUNDING.xxl,
    maxHeight: '90%',
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  closeBtn: {
    padding: SPACING.xs,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: ROUNDING.full,
  },
  body: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.sm,
  },
  avatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 34,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  saveBtn: {
    marginTop: SPACING.lg,
    borderRadius: ROUNDING.md,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
