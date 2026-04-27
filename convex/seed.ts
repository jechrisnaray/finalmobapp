import { mutation } from './_generated/server';
import { v } from 'convex/values';

export const seedData = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const userId = args.userId;

    // 1. Create 15 Habits
    const habitTitles = [
      { title: 'Olahraga Pagi', color: '#EF4444', freq: 'daily', type: 'exercise', target: 30, unit: 'menit' },
      { title: 'Baca Buku 15 Menit', color: '#F59E0B', freq: 'daily', type: 'general' },
      { title: 'Meditasi', color: '#10B981', freq: 'daily', type: 'general' },
      { title: 'Minum Air 2L', color: '#3B82F6', freq: 'daily', type: 'water', target: 8, unit: 'gelas' },
      { title: 'Belajar Coding', color: '#6366F1', freq: 'daily', type: 'general' },
      { title: 'Jurnal Harian', color: '#8B5CF6', freq: 'weekly', type: 'general' },
      { title: 'Tidur Sebelum Jam 11', color: '#1E293B', freq: 'daily', type: 'sleep', target: 8, unit: 'jam' },
      { title: 'Makan Sayur', color: '#059669', freq: 'daily', type: 'general' },
      { title: 'Latihan Pernapasan', color: '#06B6D4', freq: 'daily', type: 'general' },
      { title: 'No Social Media 1 Jam', color: '#F43F5E', freq: 'daily', type: 'general' },
      { title: 'Bersih-bersih Kamar', color: '#D946EF', freq: 'weekly', type: 'general' },
      { title: 'Review Keuangan', color: '#FACC15', freq: 'weekly', type: 'general' },
      { title: 'Telpon Orang Tua', color: '#FB923C', freq: 'weekly', type: 'general' },
      { title: 'Jalan Santai', color: '#4ADE80', freq: 'daily', type: 'exercise', target: 20, unit: 'menit' },
      { title: 'Skincare Routine', color: '#FBCFE8', freq: 'daily', type: 'general' },
    ];

    const habitIds = [];
    for (const h of habitTitles) {
      const id = await ctx.db.insert('habits', {
        userId,
        title: h.title,
        type: h.type as any,
        targetValue: (h as any).target,
        unit: (h as any).unit,
        color: h.color,
        frequency: h.freq as any,
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      });
      habitIds.push(id);
    }

    // 2. Create Progress for last 21 days
    const today = new Date();
    for (let i = 21; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Randomly complete 70-90% of habits each day
      for (const habitId of habitIds) {
        if (Math.random() > 0.3) {
          await ctx.db.insert('habit_progress', {
            userId,
            habitId,
            date: dateStr,
            isDone: true,
            value: 1,
          });
        }
      }

      // Add mood logs
      await ctx.db.insert('moodLogs', {
        userId,
        mood: Math.floor(Math.random() * 5) + 1,
        note: i % 5 === 0 ? 'Hari yang produktif!' : undefined,
        date: dateStr,
      });
    }

    // 3. Create AI History
    const history = [
      { role: 'user', content: 'Bagaimana cara konsisten olahraga?' },
      { role: 'assistant', content: 'Mulai dengan durasi singkat, misalnya 10 menit setiap pagi. Konsistensi lebih penting daripada intensitas di awal.' },
      { role: 'user', content: 'Saya merasa lelah hari ini.' },
      { role: 'assistant', content: 'Tidak apa-apa untuk beristirahat. Pastikan tidur cukup malam ini dan coba lagi besok dengan semangat baru.' },
    ];

    for (const msg of history) {
      await ctx.db.insert('ai_history', {
        userId,
        role: msg.role as any,
        content: msg.content,
        timestamp: Date.now() - 1000000,
      });
    }

    // 4. Create AI Recommendations
    await ctx.db.insert('ai_recommendations', {
      userId,
      type: 'recommendation',
      content: 'Berdasarkan rutinitasmu, mencoba Yoga di sore hari bisa membantu fleksibilitas tubuh.',
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
    });

    return { success: true, habitsCount: habitIds.length };
  },
});
