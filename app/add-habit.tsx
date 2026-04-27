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
  const [type, setType] = useState<'general' | 'water' | 'exercise' | 'sleep'>('general');
  const [targetValue, setTargetValue] = useState('8');
  const [unit, setUnit] = useState('gelas');
  const [isLoading, setIsLoading] = useState(false);

  const habitTypes: { value: typeof type; label: string; icon: any; unit: string; defaultTarget: string }[] = [
    { value: 'general', label: 'Umum', icon: 'list', unit: '', defaultTarget: '' },
    { value: 'water', label: 'Air', icon: 'water', unit: 'gelas', defaultTarget: '8' },
    { value: 'exercise', label: 'Olahraga', icon: 'fitness', unit: 'menit', defaultTarget: '30' },
    { value: 'sleep', label: 'Tidur', icon: 'moon', unit: 'jam', defaultTarget: '8' },
  ];

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

  const handleTypeChange = (newType: typeof type) => {
    setType(newType);
    const config = habitTypes.find(t => t.value === newType);
    if (config) {
      setUnit(config.unit);
      setTargetValue(config.defaultTarget);
      if (newType === 'water' && !title) setTitle('Minum Air Putih');
      if (newType === 'exercise' && !title) setTitle('Olahraga Harian');
      if (newType === 'sleep' && !title) setTitle('Istirahat Cukup');
    }
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
        type,
        targetValue: type !== 'general' ? parseInt(targetValue) : undefined,
        unit: type !== 'general' ? unit : undefined,
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

        {/* Category Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategori Habit</Text>
          <View style={styles.typeRow}>
            {habitTypes.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.typeOption,
                  type === t.value && { backgroundColor: `${selectedColor}20`, borderColor: selectedColor }
                ]}
                onPress={() => handleTypeChange(t.value)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={t.icon} 
                  size={20} 
                  color={type === t.value ? selectedColor : Colors.textMuted} 
                />
                <Text style={[styles.typeLabel, type === t.value && { color: selectedColor }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
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

        {/* Goal Input (Numeric) — only for specialized types */}
        {type !== 'general' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Target Harian</Text>
            <View style={styles.goalRow}>
              <TextInput
                style={[styles.input, { flex: 1, textAlign: 'center' }]}
                value={targetValue}
                onChangeText={setTargetValue}
                keyboardType="numeric"
                placeholder="0"
              />
              <View style={styles.unitBox}>
                <Text style={styles.unitText}>{unit}</Text>
              </View>
            </View>
          </View>
        )}

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
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  charCount: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
    fontWeight: FontWeight.medium,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  typeOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unitBox: {
    backgroundColor: Colors.backgroundElevated,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
  frequencyRow: { flexDirection: 'row', gap: Spacing.sm },
  frequencyOption: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frequencyOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
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
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: Colors.border,
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
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.2)',
  },
  infoText: {
    fontSize: 12,
    color: Colors.secondary,
    flex: 1,
    lineHeight: 18,
    fontWeight: FontWeight.medium,
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
    borderColor: Colors.text,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  submitDisabled: { opacity: 0.4 },
  submitText: {
    color: Colors.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
});