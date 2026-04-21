import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';

type Frequency = 'daily' | 'weekly' | 'custom';

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function EditHabitScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ habitId: string }>();
  const habitId = params.habitId as Id<'habits'>;

  const habit = useQuery(api.habits.getHabit, { habitId });
  const updateHabit = useMutation(api.habits.updateHabit);

  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [selectedColor, setSelectedColor] = useState<string>(Config.HABIT_COLORS[0]);
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pre-fill form with existing habit data
  useEffect(() => {
    if (habit) {
      setTitle(habit.title);
      setFrequency(habit.frequency);
      setSelectedColor(habit.color);
      setCustomDays(habit.customDays ?? []);
    }
  }, [habit]);

  const frequencyOptions: { value: Frequency; label: string; icon: any; desc: string }[] = [
    { value: 'daily', label: 'Harian', icon: 'calendar-outline', desc: 'Setiap hari' },
    { value: 'weekly', label: 'Mingguan', icon: 'calendar', desc: '1x seminggu' },
    { value: 'custom', label: 'Custom', icon: 'settings-outline', desc: 'Hari tertentu' },
  ];

  const toggleDay = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Nama habit harus diisi');
      return;
    }
    if (frequency === 'custom' && customDays.length === 0) {
      Alert.alert('Error', 'Pilih minimal 1 hari untuk habit custom');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'Silakan login terlebih dahulu');
      return;
    }

    setIsLoading(true);
    try {
      await updateHabit({
        habitId,
        title: title.trim(),
        frequency,
        color: selectedColor,
        customDays: frequency === 'custom' ? customDays : undefined,
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengupdate habit');
    } finally {
      setIsLoading(false);
    }
  };

  if (!habit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat data habit...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Habit</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Preview Card */}
        <View style={[styles.previewCard, { borderLeftColor: selectedColor }]}>
          <View style={[styles.previewDot, { backgroundColor: selectedColor }]} />
          <Text style={styles.previewTitle}>
            {title.trim() || 'Nama Habit'}
          </Text>
          <View style={styles.previewMeta}>
            <Ionicons 
              name={frequencyOptions.find((f) => f.value === frequency)?.icon} 
              size={12} 
              color={Colors.textMuted} 
            />
            <Text style={styles.previewFreq}>
              {frequencyOptions.find((f) => f.value === frequency)?.label}
            </Text>
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nama Habit</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Contoh: Minum 8 gelas air"
            placeholderTextColor={Colors.textMuted}
            maxLength={50}
          />
          <Text style={styles.charCount}>{title.length}/50</Text>
        </View>

        {/* Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frekuensi</Text>
          <View style={styles.frequencyRow}>
            {frequencyOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.frequencyOption,
                  frequency === option.value && styles.frequencyOptionActive,
                ]}
                onPress={() => setFrequency(option.value)}
                activeOpacity={0.7}
              >
                <View style={styles.frequencyIconContainer}>
                  <Ionicons 
                    name={option.icon} 
                    size={24} 
                    color={frequency === option.value ? Colors.primary : Colors.textSecondary} 
                  />
                </View>
                <Text
                  style={[
                    styles.frequencyLabel,
                    frequency === option.value && styles.frequencyLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={styles.frequencyDesc}>{option.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Days Picker */}
        {frequency === 'custom' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pilih Hari</Text>
            <Text style={styles.sectionSubtitle}>
              Habit akan aktif di hari yang dipilih
            </Text>
            <View style={styles.daysRow}>
              {DAY_LABELS.map((label, index) => {
                const isSelected = customDays.includes(index);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayChip,
                      isSelected && { backgroundColor: selectedColor, borderColor: selectedColor },
                    ]}
                    onPress={() => toggleDay(index)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        isSelected && styles.dayChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {customDays.length > 0 && (
              <Text style={styles.selectedDaysText}>
                {customDays
                  .sort()
                  .map((d) => DAY_LABELS[d])
                  .join(', ')}
              </Text>
            )}
          </View>
        )}

        {/* Color Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Warna</Text>
          <View style={styles.colorGrid}>
            {Config.HABIT_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionActive,
                ]}
                onPress={() => setSelectedColor(color)}
                activeOpacity={0.7}
              >
                {selectedColor === color && (
                  <Ionicons name="checkmark" size={20} color={Colors.white} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
              <Text style={styles.submitText}>Simpan Perubahan</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  previewCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.01)',
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.backgroundInput,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewDot: { width: 14, height: 14, borderRadius: 7 },
  previewTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  previewFreq: { fontSize: 11, color: Colors.textSecondary, fontWeight: FontWeight.bold },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  sectionSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  charCount: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
    fontWeight: FontWeight.medium,
  },
  frequencyRow: { flexDirection: 'row', gap: Spacing.sm },
  frequencyOption: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  frequencyOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  frequencyIconContainer: {
    marginBottom: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frequencyLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
  frequencyLabelActive: {
    color: Colors.primary,
  },
  frequencyDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dayChip: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  dayChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
  dayChipTextActive: {
    color: Colors.white,
  },
  selectedDaysText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: Spacing.md,
    fontWeight: FontWeight.bold,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorOption: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: Colors.white,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    elevation: 5,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  submitDisabled: { opacity: 0.4 },
  submitText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
});

