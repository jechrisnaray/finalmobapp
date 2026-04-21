import { action, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { api } from './_generated/api';

// ─── Types ────────────────────────────────────────────────────────────────────

const messageValidator = v.object({
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
});

const habitContextValidator = v.object({
    title: v.string(),
    frequency: v.string(),
    isDoneToday: v.boolean(),
});

// ─── Persistence ─────────────────────────────────────────────────────────────

export const getHistory = query({
    args: { userId: v.id('users') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('ai_history')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .order('asc')
            .collect();
    },
});

export const saveMessage = mutation({
    args: {
        userId: v.id('users'),
        role: v.union(v.literal('user'), v.literal('assistant')),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert('ai_history', {
            userId: args.userId,
            role: args.role,
            content: args.content,
            timestamp: Date.now(),
        });
    },
});

// ─── Actions ──────────────────────────────────────────────────────────────────

export const chat = action({
    args: {
        userId: v.id('users'),
        messages: v.array(messageValidator), // History from client or DB
        userName: v.string(),
        habits: v.array(habitContextValidator),
        todayMood: v.optional(v.number()),
        completedToday: v.number(),
        totalHabits: v.number(),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error('GROQ_API_KEY not configured.');

        const habitSummary = args.habits.length > 0
            ? args.habits.map(h => `• ${h.title} (${h.frequency}) — ${h.isDoneToday ? '✅' : '⏳'}`).join('\n')
            : 'Belum ada habit.';

        const systemPrompt = `Kamu adalah AI Coach HealthySteps.
User: ${args.userName}
Mood: ${args.todayMood ?? 'N/A'}
Habits: ${args.completedToday}/${args.totalHabits} selesai.
Daftar:
${habitSummary}

Berikan respons ramah, singkat (max 3 paragraf), dan actionable dalam Bahasa Indonesia.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'system', content: systemPrompt }, ...args.messages],
                temperature: 0.7,
            }),
        });

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content ?? 'Maaf, saya sedang offline.';

        // Save assistant message back to DB
        await ctx.runMutation(api.aiCoach.saveMessage, {
            userId: args.userId,
            role: 'assistant',
            content: reply,
        });

        return { reply };
    },
});

export const generateRecommendations = action({
    args: {
        userId: v.id('users'),
        userName: v.string(),
        existingHabits: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error('GROQ_API_KEY not configured.');

        const systemPrompt = `Berikan 3 rekomendasi habit baru untuk ${args.userName} berdasarkan habit yang sudah ada: ${args.existingHabits.join(', ')}.
        Format: Berikan dalam bentuk list poin yang menarik. Gunakan Bahasa Indonesia.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'system', content: systemPrompt }],
                temperature: 0.8,
            }),
        });

        const data = await response.json();
        const recommendation = data.choices?.[0]?.message?.content ?? 'Coba meditasi atau minum air putih lebih banyak.';

        // Save to recommendations table
        await ctx.runMutation(api.aiCoach.saveRecommendation, {
            userId: args.userId,
            type: 'recommendation',
            content: recommendation,
        });

        return { recommendation };
    },
});

export const analyzeProgress = action({
    args: {
        userId: v.id('users'),
        userName: v.string(),
        stats: v.string(), // Summary of last week's logs
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error('GROQ_API_KEY not configured.');

        const systemPrompt = `Analisis progres habit ${args.userName} minggu ini:
        ${args.stats}
        Berikan evaluasi jujur dan saran perbaikan. Gunakan Bahasa Indonesia.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'system', content: systemPrompt }],
                temperature: 0.6,
            }),
        });

        const data = await response.json();
        const analysis = data.choices?.[0]?.message?.content ?? 'Kamu sudah cukup baik, pertahankan!';

        // Save to recommendations table
        await ctx.runMutation(api.aiCoach.saveRecommendation, {
            userId: args.userId,
            type: 'analysis',
            content: analysis,
        });

        return { analysis };
    },
});

export const saveRecommendation = mutation({
    args: {
        userId: v.id('users'),
        type: v.string(),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert('ai_recommendations', {
            userId: args.userId,
            type: args.type,
            content: args.content,
            date: new Date().toISOString().split('T')[0],
            createdAt: Date.now(),
        });
    },
});

export const getRecommendations = query({
    args: { userId: v.id('users') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('ai_recommendations')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .order('desc')
            .take(5);
    },
});