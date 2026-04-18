import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { getTodayString, getGreeting, formatDate } from '@/utils/helpers';

export default function HomeScreen() {
  const { user } = useAuth();
  const today = getTodayString();

  // Fetch habits
  const habits = useQuery(
    api.habits.getHabits,
    user ? { userId: user.userId } : 'skip'
  );

  // Fetch today's logs
  const todayLogs = useQuery(
    api.habitLogs.getLogsByDate,
    user ? { userId: user.userId, date: today } : 'skip'
  );


  // Fetch today's mood
  const todayMood = useQuery(
    api.moodLogs.getMoodByDate,
    user ? { userId: user.userId, date: today } : 'skip'
  );

  // Toggle habit
  const toggleHabit = useMutation(api.habitLogs.toggleHabitLog);

  // Filter: only show habits scheduled for today
  const todayDayIndex = new Date().getDay();
  const todayHabits = habits?.filter((habit) => {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly') return true;
    if (habit.frequency === 'custom') {
      return habit.customDays?.includes(todayDayIndex) ?? false;
    }
    return true;
  });

  const isHabitDone = (habitId: Id<'habits'>) => {
    return todayLogs?.some((log) => log.habitId === habitId && log.isDone) ?? false;
  };

  const handleToggle = async (habitId: Id<'habits'>) => {
    if (!user) return;
    try {
      await toggleHabit({
        habitId,
        userId: user.userId,
        date: today,
      });
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const greeting = getGreeting();
  const completedToday = todayHabits?.filter((h) => isHabitDone(h._id)).length ?? 0;
  const totalHabits = todayHabits?.length ?? 0;

  // 🔔 In-app reminder
  const [showReminder, setShowReminder] = useState(false);
  const reminderAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Show reminder if user has habits but hasn't completed them all
    if (totalHabits > 0 && completedToday < totalHabits) {
      const timer = setTimeout(() => {
        setShowReminder(true);
        Animated.spring(reminderAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 8,
        }).start();
      }, 1500); // Delay 1.5s after screen loads
      return () => clearTimeout(timer);
    } else {
      setShowReminder(false);
      reminderAnim.setValue(-100);
    }
  }, [totalHabits, completedToday]);

  const dismissReminder = () => {
    Animated.timing(reminderAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowReminder(false));
  };

  const getReminderMessage = () => {
    if (completedToday === 0) {
      return 'Belum ada habit yang selesai hari ini. Yuk mulai satu langkah kecil! 🌱';
    }
    const remaining = totalHabits - completedToday;
    return `Tinggal ${remaining} habit lagi! Kamu sudah di jalur yang tepat 💪`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.name}>{user?.name ?? 'User'}</Text>
          </View>
          <TouchableOpacity
            style={styles.coachButton}
            onPress={() => router.push('/ai-coach')}
            activeOpacity={0.7}
          >
            <Text style={styles.coachEmoji}>🤖</Text>
          </TouchableOpacity>
        </View>

        {/* Date */}
        <Text style={styles.dateText}>{formatDate(today)}</Text>

        {/* 🔔 In-App Reminder Banner */}
        {showReminder && (
          <Animated.View
            style={[
              styles.reminderBanner,
              { transform: [{ translateY: reminderAnim }] },
            ]}
          >
            <Text style={styles.reminderIcon}>🔔</Text>
            <Text style={styles.reminderText}>{getReminderMessage()}</Text>
            <TouchableOpacity
              onPress={dismissReminder}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: Colors.primaryFaded }]}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>
              {completedToday}
            </Text>
            <Text style={styles.statLabel}>Selesai</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.secondaryFaded }]}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={styles.statValue}>
              {completedToday}/{totalHabits}
            </Text>
            <Text style={styles.statLabel}>Hari Ini</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Text style={styles.statEmoji}>
              {todayMood
                ? Config.MOOD_EMOJIS[todayMood.mood - 1]
                : '😐'}
            </Text>
            <Text style={styles.statValue}>
              {todayMood
                ? Config.MOOD_LABELS[todayMood.mood - 1]
                : '-'}
            </Text>
            <Text style={styles.statLabel}>Mood</Text>
          </View>
        </View>

        {/* Progress */}
        {totalHabits > 0 && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Progress Hari Ini</Text>
              <Text style={styles.progressPercent}>
                {Math.round((completedToday / totalHabits) * 100)}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${(completedToday / totalHabits) * 100}%`,
                  },
                ]}
              />
            </View>
            {completedToday === totalHabits && totalHabits > 0 && (
              <Text style={styles.progressComplete}>
                🎉 Semua habit selesai! Kerja bagus!
              </Text>
            )}
          </View>
        )}

        {/* Today's Habits */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Habit Hari Ini</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/habits')}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          {/* Empty State */}
          {habits && habits.length === 0 && (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => router.push('/add-habit')}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyText}>Belum ada habit.</Text>
              <Text style={styles.emptySubtext}>Tap untuk menambahkan!</Text>
            </TouchableOpacity>
          )}

          {/* Habit List */}
          {todayHabits && todayHabits.length > 0 && (
            <View style={styles.habitList}>
              {todayHabits.slice(0, 5).map((habit) => {
                const done = isHabitDone(habit._id);
                return (
                  <TouchableOpacity
                    key={habit._id}
                    style={[styles.habitItem, done && styles.habitItemDone]}
                    onPress={() => handleToggle(habit._id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.habitCheckbox,
                        done && {
                          backgroundColor: habit.color,
                          borderColor: habit.color,
                        },
                      ]}
                    >
                      {done && (
                        <Ionicons name="checkmark" size={14} color={Colors.white} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.habitTitle,
                        done && styles.habitTitleDone,
                      ]}
                    >
                      {habit.title}
                    </Text>
                    {done && <Text style={styles.doneEmoji}>✨</Text>}
                  </TouchableOpacity>
                );
              })}
              {todayHabits.length > 5 && (
                <TouchableOpacity
                  style={styles.moreButton}
                  onPress={() => router.push('/(tabs)/habits')}
                >
                  <Text style={styles.moreText}>
                    +{todayHabits.length - 5} lainnya
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* AI Coach Tip */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Tips Wellness</Text>
          <View style={styles.aiCard}>
            <Text style={styles.aiText}>
              {completedToday === 0 && totalHabits > 0
                ? 'Mulai hari ini dengan menyelesaikan satu habit kecil. Langkah kecil membawa perubahan besar! 🌟'
                : completedToday === totalHabits && totalHabits > 0
                ? 'Kerja bagus! Semua habit hari ini sudah selesai. Tetap konsisten dan jaga momentummu! 💪'
                : totalHabits === 0
                ? 'Mulai dengan 1-2 kebiasaan sederhana. Konsistensi lebih penting daripada jumlah! 🎯'
                : `Sudah ${completedToday} dari ${totalHabits} habit selesai. Lanjutkan, kamu hampir berhasil! 🚀`}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  greeting: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  name: {
    fontSize: FontSize.hero,
    color: Colors.text,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.xs,
  },
  coachButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  coachEmoji: {
    fontSize: 24,
  },
  dateText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  progressTitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  progressPercent: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: Colors.backgroundInput,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 5,
  },
  progressComplete: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  seeAllText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.sm,
  },
  emptyCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  habitList: {
    gap: Spacing.xs,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  habitItemDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: Colors.primaryFaded,
  },
  habitCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  habitTitle: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  habitTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  doneEmoji: {
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
  moreButton: {
    alignItems: 'center',
    padding: Spacing.sm,
  },
  moreText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  aiCard: {
    backgroundColor: Colors.primaryFaded,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  aiText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 22,
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    gap: Spacing.sm,
  },
  reminderIcon: {
    fontSize: 20,
  },
  reminderText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
});
