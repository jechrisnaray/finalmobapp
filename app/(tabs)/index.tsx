import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { getTodayString, getGreeting, formatDate, getCurrentWeekDates } from '@/utils/helpers';
import { LinearGradient } from 'expo-linear-gradient';
import { SkeletonCard, SkeletonText } from '@/components/SkeletonLoader';

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

  // Fetch weekly moods
  const weekDates = getCurrentWeekDates();
  const weeklyMoods = useQuery(
    api.moodLogs.getWeeklyMoods,
    user
      ? {
          userId: user.userId,
          startDate: weekDates[0],
          endDate: weekDates[6],
        }
      : 'skip'
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

  const [habitAnims] = useState<Record<string, Animated.Value>>({});

  const handleToggle = async (habitId: Id<'habits'>) => {
    if (!user) return;
    
    // Scale animation
    if (!habitAnims[habitId]) {
      habitAnims[habitId] = new Animated.Value(1);
    }
    
    Animated.sequence([
      Animated.spring(habitAnims[habitId], { toValue: 0.95, useNativeDriver: true }),
      Animated.spring(habitAnims[habitId], { toValue: 1, useNativeDriver: true }),
    ]).start();

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

  // 🧪 Specialized Stats
  const waterHabit = habits?.find(h => h.type === 'water');
  const exerciseHabit = habits?.find(h => h.type === 'exercise');
  const sleepHabit = habits?.find(h => h.type === 'sleep');

  const waterLog = waterHabit ? todayLogs?.find(l => l.habitId === waterHabit._id) : null;
  const exerciseLog = exerciseHabit ? todayLogs?.find(l => l.habitId === exerciseHabit._id) : null;
  const sleepLog = sleepHabit ? todayLogs?.find(l => l.habitId === sleepHabit._id) : null;

  const waterProgress = waterHabit ? {
    current: waterLog?.value ?? 0,
    target: waterHabit.targetValue ?? 8,
    unit: 'gelas' // Explicitly use 'gelas' for water
  } : null;

  const exerciseProgress = exerciseHabit ? {
    current: exerciseLog?.value ?? 0,
    target: exerciseHabit.targetValue ?? 30,
    unit: exerciseHabit.unit ?? 'menit'
  } : null;

  const sleepProgress = sleepHabit ? {
    current: sleepLog?.value ?? 0,
    target: sleepHabit.targetValue ?? 8,
    unit: sleepHabit.unit ?? 'jam'
  } : null;

  // 🔔 In-app reminder
  const [showReminder, setShowReminder] = useState(false);
  const reminderAnim = useRef(new Animated.Value(-100)).current;

  // Empty state pulse animation
  const emptyAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (habits && habits.length === 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(emptyAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
          Animated.timing(emptyAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [habits]);

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
      return 'Belum ada habit yang selesai hari ini. Yuk mulai satu langkah kecil!';
    }
    const remaining = totalHabits - completedToday;
    return `Tinggal ${remaining} habit lagi! Kamu sudah di jalur yang tepat`;
  };

  // Loading UI
  if (habits === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scrollContent}>
          <SkeletonText width={120} style={{ marginBottom: 10 }} />
          <SkeletonText width={200} style={{ marginBottom: 30 }} />
          <View style={styles.statsRow}>
            <SkeletonCard style={{ flex: 1, height: 100 }} />
            <SkeletonCard style={{ flex: 1, height: 100 }} />
            <SkeletonCard style={{ flex: 1, height: 100 }} />
          </View>
          <SkeletonCard style={{ height: 120, marginVertical: 20 }} />
          <SkeletonText width={150} style={{ marginBottom: 20 }} />
          <SkeletonCard style={{ marginBottom: 12 }} />
          <SkeletonCard style={{ marginBottom: 12 }} />
          <SkeletonCard style={{ marginBottom: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={[styles.name, (user?.name?.length ?? 0) > 15 && { color: Colors.primary }]}>
              {user?.name ?? 'User'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.coachButton}
            onPress={() => router.push('/ai-coach')}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.primary} />
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
            <Ionicons name="notifications-outline" size={18} color={Colors.textMuted} />
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
          <View style={[styles.statCard, { borderColor: 'rgba(52,211,153,0.4)', borderWidth: 1 }]}>
            <Ionicons name="checkmark-done-outline" size={20} color={Colors.primary} />
            <Ionicons name="checkmark-done" size={60} color={Colors.primary} style={styles.cardBgIcon} />
            <Text style={styles.statValue}>
              {completedToday}
            </Text>
            <Text style={styles.statLabel}>Selesai</Text>
          </View>
          <View style={[styles.statCard, { borderColor: 'rgba(96,165,250,0.4)', borderWidth: 1 }]}>
            <Ionicons name="today-outline" size={20} color={Colors.secondary} />
            <Text style={styles.statValue}>
              {completedToday}/{totalHabits}
            </Text>
            <Text style={styles.statLabel}>Hari Ini</Text>
          </View>
          <View style={[styles.statCard, { borderColor: 'rgba(245,158,11,0.4)', borderWidth: 1 }]}>
            <Ionicons name="happy-outline" size={20} color={Colors.warning} />
            <Text style={styles.statValue}>
              {todayMood
                ? Config.MOOD_LABELS[todayMood.mood - 1]
                : '-'}
            </Text>
            <Text style={styles.statLabel}>Mood</Text>
          </View>
        </View>

        {/* Weekly Mood Trend */}
        <View style={styles.moodTrendContainer}>
          <Text style={styles.trendTitle}>Tren Mood Minggu Ini</Text>
          <View style={styles.trendRow}>
            {weekDates.map((dateStr) => {
              // Pick the latest log if multiple exist for the same date
              const dayLogs = weeklyMoods?.filter((m) => m.date === dateStr);
              const moodLog = dayLogs && dayLogs.length > 0 
                ? dayLogs.sort((a, b) => b._creationTime - a._creationTime)[0] 
                : null;
              const moodValue = moodLog?.mood || 0;
              const isToday = dateStr === today;
              
              return (
                <View key={dateStr} style={styles.trendPoint}>
                  <View 
                    style={[
                      styles.trendBar, 
                      { 
                        height: moodValue === 0 ? 4 : (moodValue / 5) * 40,
                        backgroundColor: moodValue > 0 ? Config.MOOD_COLORS[moodValue - 1] : Colors.border,
                        opacity: moodValue > 0 ? 1 : 0.3
                      },
                      isToday && { borderColor: Colors.primary, borderWidth: 1 }
                    ]} 
                  />
                  <Text style={[styles.trendDay, isToday && { color: Colors.primary, fontWeight: 'bold' }]}>
                    {['Mi', 'Se', 'Sl', 'Rb', 'Ka', 'Ju', 'Sa'][new Date(dateStr).getDay()]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Specialized Progress Row */}
        {(waterProgress || exerciseProgress || sleepProgress) && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.specializedRow}
          >
            {waterProgress && (
              <View style={[styles.specializedCard, { borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
                <Ionicons name="water" size={24} color="#3B82F6" />
                <View>
                  <Text style={styles.specializedTitle}>Water</Text>
                  <Text style={styles.specializedValue}>
                    {waterProgress.current}/{waterProgress.target} {waterProgress.unit}
                  </Text>
                </View>
              </View>
            )}
            {exerciseProgress && (
              <View style={[styles.specializedCard, { borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                <Ionicons name="fitness" size={24} color="#10B981" />
                <View>
                  <Text style={styles.specializedTitle}>Exercise</Text>
                  <Text style={styles.specializedValue}>
                    {exerciseProgress.current}/{exerciseProgress.target} {exerciseProgress.unit}
                  </Text>
                </View>
              </View>
            )}
            {sleepProgress && (
              <View style={[styles.specializedCard, { borderColor: 'rgba(139, 92, 246, 0.3)' }]}>
                <Ionicons name="moon" size={24} color="#8B5CF6" />
                <View>
                  <Text style={styles.specializedTitle}>Sleep</Text>
                  <Text style={styles.specializedValue}>
                    {sleepProgress.current}/{sleepProgress.target} {sleepProgress.unit}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}

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
              <LinearGradient
                colors={['#34D399', '#60A5FA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
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
                Luar biasa! Semua habit selesai.
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
              <Animated.Text style={[styles.emptyEmoji, { transform: [{ scale: emptyAnim }] }]}>📋</Animated.Text>
              <Text style={styles.emptyText}>Belum ada habit.</Text>
              <Text style={styles.emptySubtext}>Tap untuk menambahkan!</Text>
            </TouchableOpacity>
          )}

          {/* Habit List */}
          {todayHabits && todayHabits.length > 0 && (
            <View style={styles.habitList}>
              {todayHabits.slice(0, 5).map((habit) => {
                const done = isHabitDone(habit._id);
                if (!habitAnims[habit._id]) habitAnims[habit._id] = new Animated.Value(1);
                
                return (
                  <Animated.View key={habit._id} style={{ transform: [{ scale: habitAnims[habit._id] }] }}>
                    <TouchableOpacity
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
                            shadowColor: habit.color,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 3,
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
                      {done && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>

        {/* AI Coach Tip */}
        <View style={styles.section}>
          <View style={styles.aiTitleRow}>
            <Ionicons name="sparkles-outline" size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Wellness Spark</Text>
          </View>
          <View style={styles.aiCard}>
            <Text style={{ position:'absolute', right:12, top:10, fontSize:18, opacity:0.5 }}>🤖</Text>
            <Text style={styles.aiText}>
              {completedToday === 0 && totalHabits > 0
                ? 'Mulai hari ini dengan menyelesaikan satu habit kecil. Langkah kecil membawa perubahan besar!'
                : completedToday === totalHabits && totalHabits > 0
                ? 'Kerja bagus! Semua habit hari ini sudah selesai. Tetap konsisten dan jaga momentummu!'
                : totalHabits === 0
                ? 'Mulai dengan 1-2 kebiasaan sederhana. Konsistensi lebih penting daripada jumlah!'
                : `Sudah ${completedToday} dari ${totalHabits} habit selesai. Lanjutkan, kamu hampir berhasil!`}
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
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  name: {
    fontSize: FontSize.xxl,
    color: Colors.text,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  coachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderColor: 'rgba(52,211,153,0.3)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: Colors.backgroundCard,
    overflow: 'hidden',
    position: 'relative',
  },
  cardBgIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    opacity: 0.05,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  moodTrendContainer: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  trendTitle: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 60,
  },
  trendPoint: {
    alignItems: 'center',
    flex: 1,
  },
  trendBar: {
    width: 20,
    borderRadius: 10,
    backgroundColor: Colors.border,
  },
  trendDay: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 6,
  },
  specializedRow: {
    paddingRight: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  specializedCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    minWidth: 160,
  },
  specializedTitle: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
  },
  specializedValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: '#34D399',
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
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: '#1F2937',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressComplete: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
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
    marginBottom: Spacing.lg,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  seeAllText: {
    fontSize: FontSize.sm,
    color: '#34D399',
    fontWeight: FontWeight.semibold,
  },
  emptyCard: {
    backgroundColor: 'rgba(52,211,153,0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  habitList: {
    gap: Spacing.sm,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  habitItemDone: {
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderColor: 'rgba(52,211,153,0.3)',
  },
  habitCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
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
    color: Colors.textMuted,
  },
  aiCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
  },
  aiText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontWeight: FontWeight.medium,
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reminderText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    lineHeight: 20,
  },
});


