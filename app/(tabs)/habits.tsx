import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { getTodayString, formatDate, getCurrentWeekDates } from '@/utils/helpers';

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function HabitsScreen() {
  const { user } = useAuth();
  const today = getTodayString();
  const [showAll, setShowAll] = useState(false);

  const habits = useQuery(
    api.habits.getHabits,
    user ? { userId: user.userId } : 'skip'
  );

  const todayLogs = useQuery(
    api.habitLogs.getLogsByDate,
    user ? { userId: user.userId, date: today } : 'skip'
  );

  // 🔥 Streak untuk semua habit sekaligus
  const streakMap = useQuery(
    api.habits.getAllStreaks,
    user ? { userId: user.userId, today } : 'skip'
  );

  // 📅 Weekly history — logs for the whole week
  const weekDates = getCurrentWeekDates();
  const weekLogs = useQuery(
    api.habitLogs.getLogsByDate,
    user ? { userId: user.userId, date: today } : 'skip'
  );

  const toggleHabit = useMutation(api.habitLogs.toggleHabitLog);
  const deleteHabit = useMutation(api.habits.deleteHabit);

  // Filter: hanya tampilkan habit yang dijadwalkan hari ini
  const todayDayIndex = new Date().getDay(); // 0=Minggu, 6=Sabtu

  const isHabitScheduledToday = (habit: {
    frequency: string;
    customDays?: number[];
  }): boolean => {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly') return true; // weekly selalu muncul
    if (habit.frequency === 'custom') {
      return habit.customDays?.includes(todayDayIndex) ?? false;
    }
    return true;
  };

  const todayHabits = showAll
    ? habits
    : habits?.filter(isHabitScheduledToday);

  const isHabitDone = (habitId: Id<'habits'>) => {
    return todayLogs?.some((log) => log.habitId === habitId && log.isDone) ?? false;
  };

  const handleToggle = async (habitId: Id<'habits'>) => {
    if (!user) return;
    try {
      await toggleHabit({ habitId, userId: user.userId, date: today });
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const handleDelete = (habitId: Id<'habits'>, title: string) => {
    Alert.alert(
      'Hapus Habit',
      `Yakin ingin menghapus "${title}"? Semua data log akan ikut terhapus.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHabit({ habitId });
            } catch (error) {
              console.error('Delete error:', error);
            }
          },
        },
      ]
    );
  };

  const handleEdit = (habitId: Id<'habits'>) => {
    router.push({ pathname: '/edit-habit', params: { habitId } });
  };

  const completedCount = todayHabits?.filter((h) => isHabitDone(h._id)).length ?? 0;
  const totalCount = todayHabits?.length ?? 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Hitung total streak hari ini untuk ditampilkan di header
  const bestStreak = streakMap
    ? Math.max(0, ...Object.values(streakMap))
    : 0;

  // Count habits not scheduled today (for showing filter badge)
  const hiddenCount = habits && todayHabits
    ? habits.length - todayHabits.length
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Habit Tracker</Text>
          <Text style={styles.subtitle}>{formatDate(today)}</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Best streak badge di header */}
          {bestStreak > 0 && (
            <View style={styles.headerStreakBadge}>
              <Text style={styles.headerStreakText}>🔥 {bestStreak}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/add-habit')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Week History Strip */}
      {habits && habits.length > 0 && (
        <View style={styles.weekStrip}>
          <Text style={styles.weekStripTitle}>Minggu Ini</Text>
          <View style={styles.weekDots}>
            {weekDates.map((dateStr) => {
              const [y, m, d] = dateStr.split('-').map(Number);
              const dateObj = new Date(y, m - 1, d);
              const dayLabel = DAY_LABELS[dateObj.getDay()];
              const isToday = dateStr === today;
              const isPast = dateStr < today;

              // Check how many habits were done on that date
              // We only have todayLogs for today, so show dots based on available info
              const hasDoneToday = isToday && completedCount > 0;
              const allDoneToday = isToday && completedCount === totalCount && totalCount > 0;

              return (
                <View key={dateStr} style={styles.weekDotColumn}>
                  <View
                    style={[
                      styles.weekDot,
                      isToday && allDoneToday && styles.weekDotDone,
                      isToday && hasDoneToday && !allDoneToday && styles.weekDotPartial,
                      isToday && !hasDoneToday && styles.weekDotToday,
                      !isToday && isPast && styles.weekDotPast,
                    ]}
                  />
                  <Text
                    style={[
                      styles.weekDotLabel,
                      isToday && styles.weekDotLabelToday,
                    ]}
                  >
                    {dayLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Filter Toggle */}
      {habits && habits.length > 0 && hiddenCount > 0 && (
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowAll(!showAll)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showAll ? 'filter' : 'filter-outline'}
            size={16}
            color={Colors.primary}
          />
          <Text style={styles.filterText}>
            {showAll
              ? `Tampilkan hari ini saja`
              : `+${hiddenCount} habit lain tidak dijadwalkan hari ini`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Progress Bar */}
      {totalCount > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              {completedCount}/{totalCount} selesai
            </Text>
            <Text style={styles.progressPercent}>
              {Math.round(progressPercent)}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
            />
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {habits === undefined && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Memuat habits...</Text>
          </View>
        )}

        {/* Empty State */}
        {habits && habits.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={styles.emptyText}>Belum ada habit</Text>
            <Text style={styles.emptySubtext}>
              Tambahkan kebiasaan baik pertamamu!
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/add-habit')}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={20} color={Colors.white} />
              <Text style={styles.emptyButtonText}>Tambah Habit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today empty (filters hide everything) */}
        {todayHabits && todayHabits.length === 0 && habits && habits.length > 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>😌</Text>
            <Text style={styles.emptyText}>Tidak ada habit hari ini</Text>
            <Text style={styles.emptySubtext}>
              Semua habit custom dijadwalkan di hari lain
            </Text>
          </View>
        )}

        {/* Habit List */}
        {todayHabits && todayHabits.length > 0 && (
          <View style={styles.habitList}>
            {todayHabits.map((habit) => {
              const done = isHabitDone(habit._id);
              const streak = streakMap?.[habit._id] ?? 0;
              const isScheduled = isHabitScheduledToday(habit);

              return (
                <TouchableOpacity
                  key={habit._id}
                  style={[
                    styles.habitCard,
                    done && styles.habitCardDone,
                    !isScheduled && styles.habitCardUnscheduled,
                  ]}
                  onPress={() => handleToggle(habit._id)}
                  onLongPress={() => handleDelete(habit._id, habit.title)}
                  activeOpacity={0.7}
                >
                  {/* Color indicator */}
                  <View
                    style={[
                      styles.habitColorStrip,
                      { backgroundColor: habit.color },
                    ]}
                  />

                  {/* Checkbox */}
                  <View
                    style={[
                      styles.checkbox,
                      done && { backgroundColor: habit.color, borderColor: habit.color },
                    ]}
                  >
                    {done && (
                      <Ionicons name="checkmark" size={16} color={Colors.white} />
                    )}
                  </View>

                  {/* Habit Info */}
                  <View style={styles.habitInfo}>
                    <Text
                      style={[
                        styles.habitTitle,
                        done && styles.habitTitleDone,
                      ]}
                    >
                      {habit.title}
                    </Text>
                    <View style={styles.habitMeta}>
                      <View style={styles.frequencyBadge}>
                        <Text style={styles.frequencyText}>
                          {habit.frequency === 'daily'
                            ? '📅 Harian'
                            : habit.frequency === 'weekly'
                              ? '📆 Mingguan'
                              : `⚙️ ${habit.customDays && habit.customDays.length > 0
                                  ? habit.customDays
                                      .slice()
                                      .sort((a, b) => a - b)
                                      .map((d) => DAY_LABELS[d])
                                      .join(', ')
                                  : 'Custom'}`}
                        </Text>
                      </View>

                      {/* 🔥 Streak Badge */}
                      {streak > 0 && (
                        <View style={styles.streakBadge}>
                          <Text style={styles.streakText}>
                            🔥 {streak} hari
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Edit button */}
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(habit._id)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="pencil-outline" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>

                  {/* Done indicator */}
                  {done && (
                    <View style={styles.doneIndicator}>
                      <Text style={styles.doneEmoji}>✨</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Tip */}
        {habits && habits.length > 0 && (
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>
              Tap untuk checklist, tekan lama untuk menghapus, ✏️ untuk edit
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerStreakBadge: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  headerStreakText: {
    fontSize: FontSize.sm,
    color: '#F97316',
    fontWeight: FontWeight.bold,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  // Week history strip
  weekStrip: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  weekStripTitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
  },
  weekDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weekDotColumn: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.xs,
  },
  weekDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.backgroundInput,
  },
  weekDotDone: {
    backgroundColor: Colors.primary,
  },
  weekDotPartial: {
    backgroundColor: Colors.warning,
  },
  weekDotToday: {
    backgroundColor: Colors.backgroundInput,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  weekDotPast: {
    backgroundColor: Colors.backgroundInput,
  },
  weekDotLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  weekDotLabelToday: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  // Filter toggle
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  filterText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  progressSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressText: {
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
    height: 8,
    backgroundColor: Colors.backgroundInput,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  habitList: {
    gap: Spacing.sm,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  habitCardDone: {
    borderColor: Colors.primaryFaded,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  habitCardUnscheduled: {
    opacity: 0.5,
  },
  habitColorStrip: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  habitInfo: {
    flex: 1,
  },
  habitTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  habitTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  habitMeta: {
    flexDirection: 'row',
    marginTop: 4,
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  frequencyBadge: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  frequencyText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  // 🔥 Streak styles
  streakBadge: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  streakText: {
    fontSize: FontSize.xs,
    color: '#F97316',
    fontWeight: FontWeight.semibold,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.backgroundInput,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
  doneIndicator: {
    marginLeft: Spacing.xs,
  },
  doneEmoji: {
    fontSize: 18,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryFaded,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  tipIcon: {
    fontSize: 16,
  },
  tipText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
  },
});