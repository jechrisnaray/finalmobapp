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

  // Entrance animation for today's card
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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
      
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [todayMood]);

  const handleMoodSelect = (moodIndex: number) => {
    const moodValue = moodIndex + 1;
    setSelectedMood(moodValue);

    // Animate selected emoji
    Animated.sequence([
      Animated.spring(scaleAnims[moodIndex], { toValue: 1.2, useNativeDriver: true }),
      Animated.spring(scaleAnims[moodIndex], { toValue: 1, useNativeDriver: true }),
    ]).start();

    // Fade others
    scaleAnims.forEach((anim, i) => {
      if (i !== moodIndex) {
        Animated.timing(anim, { toValue: 0.8, duration: 200, useNativeDriver: true }).start();
      } else {
        Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
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
      Alert.alert('Berhasil', 'Mood hari ini sudah tersimpan.');
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

  const dayLabelsFull = ['Buruk Sekali', 'Kurang', 'Oke', 'Baik', 'Sangat Baik'];

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
              const moodColor = getMoodColor(moodValue);
              
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
                        backgroundColor: `${moodColor}20`,
                        borderColor: moodColor,
                        shadowColor: moodColor,
                        shadowRadius: 12,
                        shadowOpacity: 0.6,
                        elevation: 10,
                      },
                      { transform: [{ scale: scaleAnims[index] }] },
                      !isSelected && selectedMood !== null ? { opacity: 0.5 } : {}
                    ]}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </Animated.View>
                  <Text
                    style={[
                      styles.moodLabel,
                      isSelected && { color: moodColor, fontWeight: FontWeight.bold },
                    ]}
                  >
                    {dayLabelsFull[index]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Today's Summary Card if exists */}
        {todayMood && (
          <Animated.View style={[styles.todayCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], borderColor: getMoodColor(todayMood.mood) }]}>
            <Text style={styles.todayEmoji}>{Config.MOOD_EMOJIS[todayMood.mood - 1]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.todayTitle}>Mood Kamu Hari Ini</Text>
              <Text style={styles.todayValue}>{Config.MOOD_LABELS[todayMood.mood - 1]}</Text>
            </View>
          </Animated.View>
        )}

        {/* Note Input */}
        <View style={styles.noteSection}>
          <Text style={styles.sectionTitle}>Apa yang kamu pikirkan?</Text>
          <TextInput
            style={[styles.noteInput, !!selectedMood && { borderColor: `${getMoodColor(selectedMood)}40` }]}
            value={note}
            onChangeText={setNote}
            placeholder="Ceritakan perasaanmu hari ini..."
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
            !!selectedMood && { backgroundColor: getMoodColor(selectedMood) },
          ]}
          onPress={handleSave}
          disabled={!selectedMood || isSaving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {isSaving
              ? 'Menyimpan...'
              : todayMood
              ? 'Update Mood'
              : 'Simpan Mood'}
          </Text>
        </TouchableOpacity>

        {/* Weekly Chart */}
        <View style={styles.weekSection}>
          <Text style={styles.sectionTitle}>Mood Minggu Ini</Text>
          
          <View style={styles.chartContainer}>
            <View style={styles.chartRow}>
              {weekDates.map((dateStr) => {
                const moodLog = weeklyMoods?.find((m) => m.date === dateStr);
                const [y, m, d] = dateStr.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const isToday = dateStr === today;
                const moodValue = moodLog?.mood || 0;
                
                return (
                  <View key={dateStr} style={styles.barColumn}>
                    <Text style={styles.barValue}>{moodValue > 0 ? moodValue : ''}</Text>
                    <View style={styles.barWrapper}>
                      <View 
                        style={[
                          styles.barFill, 
                          { 
                            height: moodValue === 0 ? 8 : (moodValue / 5) * 80,
                            backgroundColor: moodValue > 0 ? getMoodColor(moodValue) : '#3D4F63',
                            opacity: moodValue > 0 ? 1 : 0.2
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.barDay, isToday && { color: Colors.primary, fontWeight: 'bold' }]}>
                      {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][dateObj.getDay()]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Average Display */}
          {averageMood && averageMood.average > 0 && (
            <View style={styles.averageSection}>
              <View style={styles.gaugeContainer}>
                <View style={[styles.gaugeFill, { width: `${(averageMood.average / 5) * 100}%`, backgroundColor: getMoodColor(Math.round(averageMood.average)) }]} />
              </View>
              <Text style={styles.averageText}>
                Rata-rata: <Text style={{ fontWeight: 'bold', color: getMoodColor(Math.round(averageMood.average)) }}>{averageMood.average.toFixed(1)} ({Config.MOOD_LABELS[Math.round(averageMood.average)-1]})</Text>
              </Text>
            </View>
          )}
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
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  moodSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  moodButton: {
    alignItems: 'center',
    flex: 1,
  },
  emojiContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundInput,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: Spacing.xs,
  },
  emojiText: {
    fontSize: 28,
  },
  moodLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  todayCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  todayEmoji: {
    fontSize: 40,
  },
  todayTitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  todayValue: {
    fontSize: FontSize.lg,
    color: Colors.text,
    fontWeight: FontWeight.bold,
  },
  noteSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  noteInput: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minHeight: 120,
  },
  charCount: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  saveButton: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.backgroundInput,
    opacity: 0.5,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  weekSection: {
    paddingHorizontal: Spacing.lg,
  },
  chartContainer: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barValue: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  barWrapper: {
    height: 100,
    width: 28,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 14,
  },
  barDay: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 8,
  },
  averageSection: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  gaugeContainer: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.backgroundInput,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
  },
  averageText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});


