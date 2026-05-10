import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, ScrollView, Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Users, MessageSquare, Activity, Shield,
  UserX, UserCheck, Trash2, Star, ChevronRight
} from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, TYPOGRAPHY, SHADOWS } from '../theme';
import api from '../services/api';

function StatCard({ icon, label, value, color }) {
  return (
    <View style={[statStyles.card, SHADOWS.subtle]}>
      <View style={[statStyles.iconWrap, { backgroundColor: `${color}22` }]}>
        {React.cloneElement(icon, { color, size: 22 })}
      </View>
      <Text style={statStyles.value}>{value ?? '-'}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDING.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  value: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    textAlign: 'center',
  },
});

export default function AdminScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [sRes, uRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
      ]);
      setStats(sRes.data);
      setUsers(uRes.data.users || []);
    } catch (err) {
      Alert.alert('Access denied', err.response?.data?.message || 'Admin access required');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const toggleSuspend = (userId, isSuspended) => {
    Alert.alert(
      isSuspended ? 'Unsuspend user' : 'Suspend user',
      isSuspended ? 'Restore account access?' : 'Block this account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSuspended ? 'Unsuspend' : 'Suspend',
          style: isSuspended ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await api.post(`/admin/suspend/${userId}`);
              setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, isSuspended: !isSuspended } : u
              ));
            } catch {}
          },
        },
      ]
    );
  };

  const toggleVerify = async (userId, isVerified) => {
    try {
      await api.post(`/admin/verify/${userId}`);
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, isVerified: !isVerified } : u
      ));
    } catch {}
  };

  const deleteUser = (userId, username) => {
    Alert.alert(
      'Delete user',
      `Permanently delete @${username}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/users/${userId}`);
              setUsers(prev => prev.filter(u => u.id !== userId));
            } catch {}
          },
        },
      ]
    );
  };

  const renderUser = ({ item }) => (
    <View style={userStyles.row}>
      <View style={userStyles.avatar}>
        {item.avatar
          ? <Image source={{ uri: item.avatar }} style={userStyles.avatarImg} />
          : <Text style={userStyles.avatarInitial}>{(item.username || '?')[0].toUpperCase()}</Text>}
        {item.isVerified && (
          <View style={userStyles.verifiedBadge}>
            <Star size={9} color="#fff" />
          </View>
        )}
      </View>
      <View style={userStyles.info}>
        <Text style={userStyles.username}>@{item.username}</Text>
        <Text style={userStyles.role}>{item.role}</Text>
      </View>
      {item.isSuspended && (
        <View style={userStyles.suspendedTag}>
          <Text style={userStyles.suspendedText}>Suspended</Text>
        </View>
      )}
      <View style={userStyles.actions}>
        <TouchableOpacity
          style={userStyles.actionBtn}
          onPress={() => toggleVerify(item.id, item.isVerified)}
        >
          <UserCheck size={16} color={item.isVerified ? COLORS.success : COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={userStyles.actionBtn}
          onPress={() => toggleSuspend(item.id, item.isSuspended)}
        >
          <UserX size={16} color={item.isSuspended ? COLORS.warning : COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={userStyles.actionBtn}
          onPress={() => deleteUser(item.id, item.username)}
        >
          <Trash2 size={16} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Shield size={20} color={COLORS.primary} />
        <Text style={styles.headerTitle}>Admin panel</Text>
      </View>

      <View style={styles.tabs}>
        {['overview', 'users'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'overview' ? (
        <ScrollView
          contentContainerStyle={styles.overview}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          <View style={styles.statsGrid}>
            <StatCard icon={<Users />} label="Total users" value={stats?.totalUsers} color={COLORS.primary} />
            <StatCard icon={<Activity />} label="Active today" value={stats?.dauCount} color={COLORS.success} />
          </View>
          <View style={styles.statsGrid}>
            <StatCard icon={<MessageSquare />} label="Messages" value={stats?.messagesCount} color={COLORS.warning} />
            <StatCard icon={<Shield />} label="Server" value={stats?.serverStatus?.phoenix || 'Online'} color={COLORS.auraEmerald} />
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => u.id}
          renderItem={renderUser}
          contentContainerStyle={styles.userList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
        />
      )}
    </View>
  );
}

const userStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  avatarInitial: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.fontSizes.md,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  info: { flex: 1 },
  username: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  role: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    textTransform: 'capitalize',
  },
  suspendedTag: {
    backgroundColor: `${COLORS.warning}22`,
    borderRadius: ROUNDING.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  suspendedText: {
    color: COLORS.warning,
    fontSize: TYPOGRAPHY.fontSizes.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: 2,
  },
  actionBtn: {
    padding: SPACING.sm,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  backBtn: { padding: SPACING.xs },
  headerTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  overview: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  userList: {
    paddingBottom: SPACING.xxxl,
  },
  empty: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xxl,
  },
});
