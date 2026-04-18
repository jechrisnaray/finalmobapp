import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { getTodayString, formatDate, getCurrentWeekDates } from '@/utils/helpers';

export default function MoodScreen() {
  const { user } = useAuth();
  const today = getTodayString();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const scaleAnims = useRef(
    Config.MOOD_EMOJIS.map(() => new Animated.Value(1))
  ).current;

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

  // Average mood
  const averageMood = useQuery(
    api.moodLogs.getAverageMood,
    user
      ? {
          userId: user.userId,
          startDate: weekDates[0],
          endDate: weekDates[6],
        }
      : 'skip'
  );

  const createMoodLog = useMutation(api.moodLogs.createMoodLog);

  // Pre-fill if already logged today
  useEffect(() => {
    if (todayMood) {
      setSelectedMood(todayMood.mood);
      setNote(todayMood.note || '');
    }
  }, [todayMood]);

  const handleMoodSelect = (moodIndex: number) => {
    const moodValue = moodIndex + 1;
    setSelectedMood(moodValue);

    // Animate selected emoji
    Animated.sequence([
      Animated.timing(scaleAnims[moodIndex], {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[moodIndex], {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Reset other animations
    scaleAnims.forEach((anim, i) => {
      if (i !== moodIndex) {
        Animated.timing(anim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();
      }
    });
  };

  const handleSave = async () => {
    if (!selectedMood || !user) return;

    setIsSaving(true);
    try {
      await createMoodLog({
        userId: user.userId,
        mood: selectedMood,
        note: note.trim() || undefined,
        date: today,
      });
      Alert.alert('Berhasil! ✨', 'Mood hari ini sudah tersimpan.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal menyimpan mood');
    } finally {
      setIsSaving(false);
    }
  };

  const getMoodColor = (mood: number) => {
    const moodColors: Record<number, string> = {
      1: Colors.mood1,
      2: Colors.mood2,
      3: Colors.mood3,
      4: Colors.mood4,
      5: Colors.mood5,
    };
    return moodColors[mood] || Colors.textMuted;
  };

  const getDayLabel = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return days[date.getDay()];
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mood Tracker</Text>
          <Text style={styles.subtitle}>{formatDate(today)}</Text>
        </View>

        {/* Mood Selector */}
        <View style={styles.moodSection}>
          <Text style={styles.sectionTitle}>Bagaimana perasaanmu hari ini?</Text>
          <View style={styles.moodRow}>
            {Config.MOOD_EMOJIS.map((emoji, index) => {
              const moodValue = index + 1;
              const isSelected = selectedMood === moodValue;
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleMoodSelect(index)}
                  activeOpacity={0.7}
                  style={styles.moodButton}
                >
                  <Animated.View
                    style={[
                      styles.emojiContainer,
                      isSelected && {
                        backgroundColor: `${getMoodColor(moodValue)}20`,
                        borderColor: getMoodColor(moodValue),
                      },
                      { transform: [{ scale: scaleAnims[index] }] },
                    ]}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </Animated.View>
                  <Text
                    style={[
                      styles.moodLabel,
                      isSelected && { color: getMoodColor(moodValue), fontWeight: FontWeight.bold },
                    ]}
                  >
                    {Config.MOOD_LABELS[index]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Note Input */}
        <View style={styles.noteSection}>
          <Text style={styles.sectionTitle}>Catatan (opsional)</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Ceritakan tentang hari ini..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{note.length}/200</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            !selectedMood && styles.saveButtonDisabled,
            selectedMood && { backgroundColor: getMoodColor(selectedMood) },
          ]}
          onPress={handleSave}
          disabled={!selectedMood || isSaving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {isSaving
              ? 'Menyimpan...'
              : todayMood
              ? 'Update Mood ✏️'
              : 'Simpan Mood ✨'}
          </Text>
        </TouchableOpacity>

        {/* Weekly Chart */}
        <View style={styles.weekSection}>
          <Text style={styles.sectionTitle}>Mood Minggu Ini</Text>
          {averageMood && (
            <View style={styles.averageRow}>
              <Text style={styles.averageLabel}>Rata-rata:</Text>
              <Text style={[styles.averageValue, { color: getMoodColor(Math.round(averageMood.average)) }]}>
                {Config.MOOD_EMOJIS[Math.round(averageMood.average) - 1]} {averageMood.average.toFixed(1)}
              </Text>
            </View>
          )}
          <View style={styles.weekChart}>
            {weekDates.map((dateStr) => {
              const moodLog = weeklyMoods?.find((m) => m.date === dateStr);
              const isToday = dateStr === today;
              const barHeight = moodLog ? (moodLog.mood / 5) * 80 : 6;

              return (
                <View key={dateStr} style={styles.dayColumn}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: moodLog
                            ? getMoodColor(moodLog.mood)
                            : Colors.backgroundInput,
                        },
                      ]}
                    />
                  </View>
                  {moodLog && (
                    <Text style={styles.barEmoji}>
                      {Config.MOOD_EMOJIS[moodLog.mood - 1]}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.dayLabel,
                      isToday && styles.dayLabelToday,
                    ]}
                  >
                    {getDayLabel(dateStr)}
                  </Text>
                  {isToday && <View style={styles.todayDot} />}
                </View>
              );
            })}
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
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  moodSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodButton: {
    alignItems: 'center',
    flex: 1,
  },
  emojiContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: Spacing.xs,
  },
  emojiText: {
    fontSize: 28,
  },
  moodLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },
  noteSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  noteInput: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  saveButton: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.backgroundInput,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  weekSection: {
    paddingHorizontal: Spacing.lg,
  },
  averageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  averageLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  averageValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  weekChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    height: 80,
    justifyContent: 'flex-end',
    marginBottom: Spacing.xs,
  },
  bar: {
    width: 18,
    borderRadius: 9,
    minHeight: 6,
  },
  barEmoji: {
    fontSize: 14,
    marginBottom: 2,
  },
  dayLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  dayLabelToday: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
});
