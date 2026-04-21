import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
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

interface Habit {
  _id: Id<'habits'>;
  title: string;
  frequency: 'daily' | 'weekly' | 'custom';
  color: string;
  customDays?: number[];
}

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
    api.habitLogs.getLogsByDateRange,
    user ? { userId: user.userId, startDate: weekDates[0], endDate: weekDates[6] } : 'skip'
  );

  const toggleHabit = useMutation(api.habitLogs.toggleHabitLog);
  const deleteHabit = useMutation(api.habits.deleteHabit);

  // Filter: hanya tampilkan habit yang dijadwalkan hari ini
  const todayDayIndex = new Date().getDay(); // 0=Minggu, 6=Sabtu

  const isHabitScheduledToday = (habit: Habit): boolean => {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly') return true; 
    if (habit.frequency === 'custom') {
      return habit.customDays?.includes(todayDayIndex) ?? false;
    }
    return true;
  };

  const todayHabits = showAll
    ? habits
    : habits?.filter((h: any) => isHabitScheduledToday(h as Habit));

  const isHabitDone = (habitId: Id<'habits'>) => {
    return todayLogs?.some((log) => log.habitId === habitId && log.isDone) ?? false;
  };

  const handleToggle = async (habitId: Id<'habits'>) => {
    if (!user) return;
    try {
      await toggleHabit({ habitId, userId: user.userId, date: today });
    } catch (error) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat mengupdate habit.');
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
              Alert.alert('Gagal', 'Tidak bisa menghapus habit saat ini.');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (habitId: Id<'habits'>) => {
    router.push({ pathname: '/edit-habit', params: { habitId } });
  };

  const completedCount = (todayHabits as Habit[])?.filter((h) => isHabitDone(h._id)).length ?? 0;
  const totalCount = (todayHabits as Habit[])?.length ?? 0;
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
              <Ionicons name="flame" size={14} color={'#F59E0B'} />
              <Text style={styles.headerStreakText}>{bestStreak}</Text>
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
              const dayLogs = weekLogs?.filter(l => l.date === dateStr && l.isDone);
              const [y, m, d] = dateStr.split('-').map(Number);
              const dateObj = new Date(y, m - 1, d);
              const dayLabel = DAY_LABELS[dateObj.getDay()];
              const isToday = dateStr === today;
              
              const hasDone = (dayLogs?.length ?? 0) > 0;

              return (
                <View key={dateStr} style={styles.weekDotColumn}>
                  <View
                    style={[
                      styles.weekDot,
                      hasDone && styles.weekDotDone,
                      isToday && !hasDone && styles.weekDotToday,
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
            <Ionicons name="checkmark-circle-outline" size={56} color={Colors.textMuted} />
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

        {/* Habit List */}
        {todayHabits && todayHabits.length > 0 && (
          <View style={styles.habitList}>
            {(todayHabits as Habit[]).map((habit) => {
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
                  <View
                    style={[
                      styles.habitColorStrip,
                      { backgroundColor: habit.color },
                    ]}
                  />

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
                        <Ionicons name="calendar-outline" size={10} color={Colors.textMuted} />
                        <Text style={styles.frequencyText}>
                          {habit.frequency === 'daily'
                            ? 'Harian'
                            : habit.frequency === 'weekly'
                              ? 'Mingguan'
                              : `${habit.customDays && habit.customDays.length > 0
                                  ? habit.customDays
                                      .slice()
                                      .sort((a, b) => a - b)
                                      .map((d) => DAY_LABELS[d])
                                      .join(', ')
                                  : 'Custom'}`}
                        </Text>
                      </View>

                      {streak > 0 && (
                        <View style={styles.streakBadge}>
                          <Ionicons name="flame" size={12} color={'#F59E0B'} />
                          <Text style={styles.streakText}>
                            {streak} hari
                          </Text>
                        </View>
                      )}

                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(habit._id)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="pencil-outline" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>

                  {done && (
                    <View style={styles.doneIndicator}>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
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
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerStreakBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  headerStreakText: {
    fontSize: FontSize.sm,
    color: '#F59E0B',
    fontWeight: FontWeight.bold,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  weekStrip: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  weekStripTitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  weekDotColumn: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  weekDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.backgroundInput,
  },
  weekDotDone: {
    backgroundColor: Colors.primary,
  },
  weekDotToday: {
    backgroundColor: Colors.transparent,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  weekDotLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
  },
  weekDotLabelToday: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  filterText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  progressSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
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
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 85 : 70,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
    textAlign: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
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
    overflow: 'hidden',
  },
  habitCardDone: {
    backgroundColor: 'rgba(52, 211, 153, 0.05)',
  },
  habitCardUnscheduled: {
    opacity: 0.5,
  },
  habitColorStrip: {
    width: 4,
    height: 44,
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 9,
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
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  habitTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  habitMeta: {
    flexDirection: 'row',
    marginTop: 6,
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  frequencyBadge: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  frequencyText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  streakBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: FontWeight.bold,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.backgroundInput,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
  doneIndicator: {
    marginLeft: Spacing.xs,
  },
});