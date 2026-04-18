import { action } from './_generated/server';
import { v } from 'convex/values';

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

// ─── Action ───────────────────────────────────────────────────────────────────

export const chat = action({
    args: {
        messages: v.array(messageValidator),
        userName: v.string(),
        habits: v.array(habitContextValidator),
        todayMood: v.optional(v.number()), // ✅ fixed: was v.string()
        completedToday: v.number(),
        totalHabits: v.number(),
    },
    handler: async (_ctx, args) => {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('GROQ_API_KEY is not configured in Convex environment variables.');
        }

        // ── Build system prompt ──────────────────────────────────────────────────
        const habitSummary =
            args.habits.length > 0
                ? args.habits
                    .map(
                        (h) =>
                            `• ${h.title} (${h.frequency}) — ${h.isDoneToday ? '✅ selesai hari ini' : '⏳ belum selesai'}`
                    )
                    .join('\n')
                : 'Belum ada habit yang dibuat.';

        const systemPrompt = `Kamu adalah AI Coach HealthySteps — asisten kesehatan dan produktivitas yang ramah, suportif, dan berbicara dalam Bahasa Indonesia.

Konteks pengguna hari ini:
- Nama: ${args.userName}
- Mood hari ini: ${args.todayMood !== undefined ? `${args.todayMood}/10` : 'belum diisi'}
- Habit selesai: ${args.completedToday} dari ${args.totalHabits}
- Daftar habit:
${habitSummary}

Panduan respons:
- Gunakan Bahasa Indonesia yang hangat dan natural
- Beri saran yang spesifik dan actionable berdasarkan konteks di atas
- Jaga respons ringkas (maks 3–4 paragraf)
- Gunakan emoji secukupnya agar lebih menarik
- Selalu ingatkan bahwa saranmu bukan pengganti dokter jika topik medis
- Jangan ulangi sapaan di setiap pesan`;

        // ── Call Groq API ────────────────────────────────────────────────────────
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                max_tokens: 600,
                temperature: 0.75,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...args.messages,
                ],
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Groq API error ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        const reply: string = data.choices?.[0]?.message?.content ?? 'Maaf, saya tidak bisa membalas saat ini.';

        return { reply };
    },
});