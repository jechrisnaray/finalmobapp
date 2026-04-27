import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

const WORKOUTS = [
  {
    id: '1',
    title: 'Pemanasan Dinamis',
    duration: '5 Menit',
    difficulty: 'Mudah',
    exercises: [
      'Putar Leher (30 detik)',
      'Putar Bahu (30 detik)',
      'Lari di Tempat (1 menit)',
      'Jumping Jacks (1 menit)',
      'High Knees (1 menit)',
      'Butt Kicks (1 menit)',
    ],
    color: '#34D399',
    icon: 'fitness-outline',
  },
  {
    id: '2',
    title: 'Latihan Kekuatan Dasar',
    duration: '15 Menit',
    difficulty: 'Menengah',
    exercises: [
      'Push Up (10x3)',
      'Squats (15x3)',
      'Lunges (10 tiap kaki x3)',
      'Plank (45 detik x3)',
      'Crunches (15x3)',
    ],
    color: '#60A5FA',
    icon: 'barbell-outline',
  },
  {
    id: '3',
    title: 'Pendinginan & Stretching',
    duration: '10 Menit',
    difficulty: 'Mudah',
    exercises: [
      'Cobra Stretch (45 detik)',
      'Child\'s Pose (1 menit)',
      'Hamstring Stretch (45 detik tiap kaki)',
      'Quadriceps Stretch (45 detik tiap kaki)',
      'Pernapasan Dalam (2 menit)',
    ],
    color: '#F59E0B',
    icon: 'body-outline',
  },
];

export default function WorkoutGuideScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Guide</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['#34D399', '#60A5FA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View>
              <Text style={styles.heroTitle}>Mulai Hidup Aktif</Text>
              <Text style={styles.heroSubtitle}>Panduan latihan sederhana untuk dilakukan di rumah.</Text>
            </View>
            <Ionicons name="fitness" size={60} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        </View>

        <Text style={styles.sectionTitle}>Rekomendasi Latihan</Text>

        {WORKOUTS.map((workout) => (
          <TouchableOpacity key={workout.id} style={styles.workoutCard} activeOpacity={0.8}>
            <View style={[styles.iconBox, { backgroundColor: `${workout.color}20` }]}>
              <Ionicons name={workout.icon as any} size={28} color={workout.color} />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutTitle}>{workout.title}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{workout.duration}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="stats-chart-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{workout.difficulty}</Text>
                </View>
              </View>
              
              <View style={styles.exercisePreview}>
                {workout.exercises.slice(0, 3).map((ex, i) => (
                  <Text key={i} style={styles.exerciseItem}>• {ex}</Text>
                ))}
                {workout.exercises.length > 3 && (
                  <Text style={styles.moreText}>+{workout.exercises.length - 3} lainnya...</Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}

        <View style={styles.tipBox}>
          <Ionicons name="bulb-outline" size={24} color={Colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>Tips Sehat</Text>
            <Text style={styles.tipText}>
              Jangan lupa minum air putih sebelum dan sesudah latihan untuk menjaga hidrasi tubuh.
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  heroCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  heroGradient: {
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    maxWidth: '70%',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  exercisePreview: {
    gap: 2,
  },
  exerciseItem: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  moreText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  tipTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.warning,
    marginBottom: 4,
  },
  tipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
