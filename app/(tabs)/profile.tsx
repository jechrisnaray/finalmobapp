import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const updateUser = useMutation(api.users.updateUser);

  // Fetch habits count
  const habits = useQuery(
    api.habits.getHabits,
    user ? { userId: user.userId } : 'skip'
  );

  // Fetch mood history
  const moodHistory = useQuery(
    api.moodLogs.getMoodHistory,
    user ? { userId: user.userId, limit: 999 } : 'skip'
  );

  // Pre-fill edit fields
  useEffect(() => {
    if (user) {
      setEditName(user.name);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!editName.trim() || editName.trim().length < 2) {
      Alert.alert('Error', 'Nama minimal 2 karakter');
      return;
    }

    setIsSaving(true);
    try {
      await updateUser({
        userId: user.userId,
        name: editName.trim(),
      });
      setIsEditing(false);
      Alert.alert('Berhasil ✨', 'Profil berhasil diperbarui');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memperbarui profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Keluar',
      'Yakin ingin keluar dari akun?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const getInitial = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
        </View>

        {/* Avatar & Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user ? getInitial(user.name) : 'U'}
            </Text>
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nama"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditing(false);
                    setEditName(user?.name ?? '');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                  activeOpacity={0.7}
                >
                  <Text style={styles.saveButtonText}>
                    {isSaving ? 'Menyimpan...' : 'Simpan'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.userName}>{user?.name ?? 'User'}</Text>
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={() => setIsEditing(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
                <Text style={styles.editProfileText}>Edit Profil</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{habits?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Total Habit</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{moodHistory?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Mood Logs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {moodHistory && moodHistory.length > 0
                ? (
                  moodHistory.reduce((sum, m) => sum + m.mood, 0) /
                  moodHistory.length
                ).toFixed(1)
                : '-'}
            </Text>
            <Text style={styles.statLabel}>Avg Mood</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="chatbubble-ellipses-outline"
            label="AI Coach"
            onPress={() => router.push('/ai-coach')}
          />
          <MenuItem
            icon="add-circle-outline"
            label="Tambah Habit"
            onPress={() => router.push('/add-habit')}
          />
          <MenuItem
            icon="information-circle-outline"
            label="Tentang Aplikasi"
            onPress={() =>
              Alert.alert(
                Config.APP_NAME,
                `${Config.APP_TAGLINE}\n\nVersi 1.0.0\nDibuat dengan ❤️ menggunakan React Native, Expo & Convex`,
              )
            }
          />
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.logoutText}>Keluar</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>
          {Config.APP_NAME} v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      activeOpacity={0.6}
      onPress={onPress}
    >
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  userName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primaryFaded,
    borderRadius: BorderRadius.full,
  },
  editProfileText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  editForm: {
    width: '100%',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  editInput: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  menuSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  logoutSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  logoutText: {
    fontSize: FontSize.md,
    color: Colors.error,
    fontWeight: FontWeight.semibold,
  },
  version: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: Spacing.xl,
  },
});