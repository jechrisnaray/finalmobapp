import { useState } from 'react';
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
import { router } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';

type Frequency = 'daily' | 'weekly' | 'custom';

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function AddHabitScreen() {
  const { user } = useAuth();
  const createHabit = useMutation(api.habits.createHabit);

  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [selectedColor, setSelectedColor] = useState<string>(Config.HABIT_COLORS[0]);
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const frequencyOptions: { value: Frequency; label: string; icon: string; desc: string }[] = [
    { value: 'daily', label: 'Harian', icon: '📅', desc: 'Setiap hari' },
    { value: 'weekly', label: 'Mingguan', icon: '📆', desc: '1x seminggu' },
    { value: 'custom', label: 'Custom', icon: '⚙️', desc: 'Hari tertentu' },
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
      await createHabit({
        userId: user.userId,
        title: title.trim(),
        frequency,
        color: selectedColor,
        customDays: frequency === 'custom' ? customDays : undefined,
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal menambahkan habit');
    } finally {
      setIsLoading(false);
    }
  };

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
        <Text style={styles.headerTitle}>Habit Baru</Text>
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
          <Text style={styles.previewFreq}>
            {frequencyOptions.find((f) => f.value === frequency)?.icon}{' '}
            {frequencyOptions.find((f) => f.value === frequency)?.label}
          </Text>
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
            autoFocus
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
                <Text style={styles.frequencyIcon}>{option.icon}</Text>
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

        {/* Custom Days Picker — hanya muncul kalau custom */}
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

        {/* Weekly info */}
        {frequency === 'weekly' && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.infoText}>
              Cukup selesaikan 1x dalam seminggu (Senin–Minggu). Progress reset setiap Senin.
            </Text>
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
              <Ionicons name="add-circle" size={22} color={Colors.white} />
              <Text style={styles.submitText}>Tambah Habit</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  previewCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewDot: { width: 12, height: 12, borderRadius: 6 },
  previewTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  previewFreq: { fontSize: FontSize.xs, color: Colors.textMuted },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  frequencyRow: { flexDirection: 'row', gap: Spacing.sm },
  frequencyOption: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  frequencyOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  frequencyIcon: { fontSize: 24, marginBottom: 4 },
  frequencyLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  frequencyLabelActive: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  frequencyDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dayChipText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  dayChipTextActive: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  selectedDaysText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    marginTop: Spacing.sm,
    fontWeight: FontWeight.medium,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryFaded,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  infoText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    flex: 1,
    lineHeight: 18,
  },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: Colors.white,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});