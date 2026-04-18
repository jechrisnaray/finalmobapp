import { useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAction, useQuery } from 'convex/react';
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

// ─── Quick suggestions ────────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  { label: '💪 Tips motivasi', text: 'Kasih saya tips motivasi untuk konsisten membangun habit!' },
  { label: '🎯 Cara build habit', text: 'Bagaimana cara terbaik memulai dan mempertahankan habit baru?' },
  { label: '😴 Tips tidur', text: 'Saya sering susah tidur. Ada tips untuk tidur lebih berkualitas?' },
  { label: '😰 Atasi stres', text: 'Saya lagi stres akhir-akhir ini. Gimana cara mengatasinya?' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AiCoachScreen() {
  const { user } = useAuth();
  const today = getTodayString();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

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

  const sendMessage = useAction(api.aiCoach.chat);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Halo ${user?.name ?? 'User'}! 👋\n\nSaya AI Coach HealthySteps — siap menemani perjalanan hidup sehatmu. Saya sudah lihat progress habit dan moodmu hari ini, jadi saran saya akan lebih personal untukmu.\n\nAda yang ingin kamu tanyakan atau ceritakan?`,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Build context for AI (last 10 messages only, to keep token count low)
  const buildHistory = useCallback(
    (currentMessages: Message[]) => {
      return currentMessages
        .filter((m) => !m.isError && m.id !== '0') // exclude welcome & errors
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
    if (!text || isTyping) return;
    if (!user) {
      Alert.alert('Error', 'Silakan login terlebih dahulu');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { reply } = await sendMessage({
        messages: buildHistory(nextMessages),
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
      // Show error as a message bubble, not an alert
      const errMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Ups, ada masalah saat menghubungi AI. Pastikan GROQ_API_KEY sudah dikonfigurasi di Convex environment variables, lalu coba lagi.',
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errMessage]);
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleQuickQuestion = (text: string) => {
    handleSend(text);
  };

  const showOnlyWelcome = messages.length === 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>🤖</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Coach</Text>
            <View style={styles.onlineBadge}>
              <View style={[styles.onlineDot, isTyping && styles.onlineDotTyping]} />
              <Text style={styles.onlineText}>
                {isTyping ? 'Mengetik...' : 'Groq AI • Online'}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Context banner — shown briefly at top */}
      {habits !== undefined && (
        <View style={styles.contextBanner}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
          <Text style={styles.contextText}>
            AI melihat {habits.length} habit &amp; mood hari ini untuk saran yang lebih personal
          </Text>
        </View>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
        keyboardShouldPersistTaps="handled"
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
              <View style={styles.botAvatarSmall}>
                <Text style={{ fontSize: 16 }}>🤖</Text>
              </View>
            )}
            <View
              style={[
                styles.bubble,
                msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                msg.isError && styles.bubbleError,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  msg.role === 'user' && styles.bubbleTextUser,
                  msg.isError && styles.bubbleTextError,
                ]}
              >
                {msg.content}
              </Text>
              <Text
                style={[
                  styles.timestamp,
                  msg.role === 'user' ? styles.timestampUser : styles.timestampAssistant,
                ]}
              >
                {msg.timestamp.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <View style={[styles.bubbleRow, styles.bubbleRowAssistant]}>
            <View style={styles.botAvatarSmall}>
              <Text style={{ fontSize: 16 }}>🤖</Text>
            </View>
            <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>AI sedang berpikir...</Text>
            </View>
          </View>
        )}

        {/* Quick questions — only at start */}
        {showOnlyWelcome && (
          <View style={styles.quickSection}>
            <Text style={styles.quickTitle}>Mulai dengan pertanyaan ini:</Text>
            <View style={styles.quickGrid}>
              {QUICK_QUESTIONS.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.quickChip}
                  onPress={() => handleQuickQuestion(q.text)}
                  activeOpacity={0.7}
                  disabled={isTyping}
                >
                  <Text style={styles.quickChipText}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Tanya sesuatu..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
            onSubmitEditing={() => handleSend()}
            editable={!isTyping}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || isTyping) && styles.sendBtnDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isTyping}
            activeOpacity={0.7}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={inputText.trim() ? Colors.white : Colors.textMuted}
              />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.disclaimer}>
          AI Coach memberi saran umum — bukan pengganti dokter.
        </Text>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryFaded,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  onlineDotTyping: {
    backgroundColor: Colors.warning,
  },
  onlineText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  contextText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  bubbleRow: {
    flexDirection: 'row',
    maxWidth: '87%',
    gap: Spacing.xs,
  },
  bubbleRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  bubbleRowAssistant: {
    alignSelf: 'flex-start',
  },
  botAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    flexShrink: 0,
  },
  bubble: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    maxWidth: '100%',
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: Colors.backgroundCard,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: Colors.error,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  bubbleText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: Colors.white,
  },
  bubbleTextError: {
    color: Colors.error,
  },
  typingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  timestampUser: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  timestampAssistant: {
    color: Colors.textMuted,
  },
  quickSection: {
    marginTop: Spacing.md,
  },
  quickTitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: FontWeight.medium,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickChip: {
    backgroundColor: Colors.primaryFaded,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  quickChipText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.backgroundLight,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.md,
    color: Colors.text,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: Colors.border,
    lineHeight: 22,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.backgroundInput,
  },
  disclaimer: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.backgroundLight,
  },
});