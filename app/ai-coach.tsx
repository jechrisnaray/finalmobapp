import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { getTodayString } from '@/utils/helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

// ─── Typing Indicator Component ───────────────────────────────────────────────

const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0.6)).current;
  const dot2 = useRef(new Animated.Value(0.6)).current;
  const dot3 = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const animate = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.6, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={[styles.typingDot, { transform: [{ scale: dot1 }] }]} />
      <Animated.View style={[styles.typingDot, { transform: [{ scale: dot2 }] }]} />
      <Animated.View style={[styles.typingDot, { transform: [{ scale: dot3 }] }]} />
    </View>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AiCoachScreen() {
  const { user } = useAuth();
  const today = getTodayString();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Status pulse
  const statusAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(statusAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(statusAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Fetch user context for personalized responses
  const habits = useQuery(
    api.habits.getHabits,
    user ? { userId: user.userId } : 'skip'
  );
  const todayLogs = useQuery(
    api.habitLogs.getLogsByDate,
    user ? { userId: user.userId, date: today } : 'skip'
  );
  const todayMood = useQuery(
    api.moodLogs.getMoodByDate,
    user ? { userId: user.userId, date: today } : 'skip'
  );

  // Fetch chat history from DB
  const history = useQuery(
    api.aiCoach.getHistory,
    user ? { userId: user.userId } : 'skip'
  );

  const sendMessage = useAction(api.aiCoach.chat);
  const saveUserMessage = useMutation(api.aiCoach.saveMessage);
  const getRecommendations = useAction(api.aiCoach.generateRecommendations);
  const analyzeProgress = useAction(api.aiCoach.analyzeProgress);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Sync history from DB only once on load
  useEffect(() => {
    if (history && messages.length === 0) {
      if (history.length === 0) {
        // Welcome message if no history
        setMessages([
          {
            id: '0',
            role: 'assistant',
            content: `Halo ${user?.name ?? 'User'}!\n\nSaya AI Coach HealthySteps — siap menemani perjalanan hidup sehatmu.\n\nApa yang ingin kamu tinggalkan atau capai hari ini?`,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages(
          history.map((h) => ({
            id: h._id,
            role: h.role,
            content: h.content,
            timestamp: new Date(h.timestamp),
          }))
        );
      }
    }
  }, [history]);

  const buildHistoryForAi = useCallback(
    (currentMessages: Message[]) => {
      return currentMessages
        .filter((m) => !m.isError && m.id !== '0')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));
    },
    []
  );

  const buildHabitContext = useCallback(() => {
    if (!habits || !todayLogs) return [];
    return habits.map((h) => ({
      title: h.title,
      frequency: h.frequency,
      isDoneToday: todayLogs.some((l) => l.habitId === h._id && l.isDone),
    }));
  }, [habits, todayLogs]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
    if (!text || isTyping || !user) return;

    if (showSuggestions) setShowSuggestions(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Save user message to DB
    await saveUserMessage({
      userId: user.userId,
      role: 'user',
      content: text,
    });

    try {
      const { reply } = await sendMessage({
        userId: user.userId,
        messages: buildHistoryForAi([...messages, userMessage]),
        userName: user.name,
        habits: buildHabitContext(),
        todayMood: todayMood?.mood,
        completedToday: todayLogs?.filter((l) => l.isDone).length ?? 0,
        totalHabits: habits?.length ?? 0,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Ups, sedang ada gangguan pada AI. Coba sesaat lagi ya.',
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAction = async (type: 'recommend' | 'analyze') => {
    if (!user || isActionLoading) return;
    setIsActionLoading(true);
    setIsTyping(true);
    if (showSuggestions) setShowSuggestions(false);

    try {
      if (type === 'recommend') {
        const hTitles = habits?.map((h) => h.title) ?? [];
        const { recommendation } = await getRecommendations({
          userId: user.userId,
          userName: user.name,
          existingHabits: hTitles,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `**Rekomendasi untukmu:**\n\n${recommendation}`,
            timestamp: new Date(),
          },
        ]);
      } else {
        const stats = `Habit: ${habits?.length ?? 0}, Selesai hari ini: ${todayLogs?.filter(l => l.isDone).length ?? 0}`;
        const { analysis } = await analyzeProgress({
          userId: user.userId,
          userName: user.name,
          stats: stats,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `**Analisis Progres:**\n\n${analysis}`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', 'Gagal memproses permintaan AI.');
    } finally {
      setIsActionLoading(false);
      setIsTyping(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatarCircle}>
             <Text style={{ fontSize: 20 }}>🤖</Text>
             <Animated.View style={[styles.onlineIndicator, { transform: [{ scale: statusAnim }] }]} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Coach</Text>
            <Text style={styles.headerSubtitle}>Selalu siap membantu</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.bubbleRow,
              msg.role === 'user' ? styles.bubbleRowUser : styles.bubbleRowAssistant,
            ]}
          >
            {msg.role === 'assistant' && (
              <View style={styles.botAvatarCircle}>
                <Text style={{ fontSize: 14 }}>🤖</Text>
              </View>
            )}
            <View
              style={[
                styles.bubble,
                msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                msg.isError && styles.bubbleError,
              ]}
            >
              <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
                {msg.content}
              </Text>
              <Text style={[styles.timestamp, msg.role === 'user' ? styles.timestampUser : styles.timestampAssistant]}>
                {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        ))}
        {isTyping && !isActionLoading && (
          <View style={[styles.bubbleRow, styles.bubbleRowAssistant]}>
            <View style={styles.botAvatarCircle}><Text style={{ fontSize: 14 }}>🤖</Text></View>
            <View style={[styles.bubble, styles.bubbleAssistant]}>
               <TypingIndicator />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Suggestions */}
      {showSuggestions && (
        <View style={styles.suggestionOuter}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionRow}>
            <TouchableOpacity style={styles.actionPill} onPress={() => handleAction('recommend')} disabled={isActionLoading}>
              <Ionicons name="sparkles" size={16} color={Colors.primary} />
              <Text style={styles.actionChipText}>Beri Rekomendasi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionPill} onPress={() => handleAction('analyze')} disabled={isActionLoading}>
              <Ionicons name="bar-chart" size={16} color={Colors.primary} />
              <Text style={styles.actionChipText}>Analisis Progres</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionPill} onPress={() => setInputText('Bagaimana cara menjaga konsistensi?')}>
              <Text style={styles.actionChipText}>Tips Konsisten</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Tanya Coach..."
              placeholderTextColor={Colors.textMuted}
              multiline
              editable={!isTyping}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnDisabled]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || isTyping}
            >
              <Ionicons name="arrow-up" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginLeft: Spacing.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34D399',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    gap: Spacing.lg,
  },
  bubbleRow: {
    flexDirection: 'row',
    maxWidth: '85%',
    gap: 8,
  },
  bubbleRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  bubbleRowAssistant: {
    alignSelf: 'flex-start',
  },
  botAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#243044',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  bubble: {
    borderRadius: 18,
    padding: 12,
    paddingHorizontal: 14,
  },
  bubbleUser: {
    backgroundColor: '#34D399',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#243044',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.2)',
  },
  bubbleError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: Colors.background,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.6,
  },
  timestampUser: {
    color: Colors.background,
    textAlign: 'right',
  },
  timestampAssistant: {
    color: Colors.textMuted,
  },
  typingContainer: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  suggestionOuter: {
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  suggestionRow: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  actionPill: {
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionChipText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
  inputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingTop: 8,
    backgroundColor: Colors.background,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#243044',
    borderRadius: 28,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});