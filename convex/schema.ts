import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    passwordHash: v.string(),
    createdAt: v.number(),
  }).index('by_name', ['name']),

  habits: defineTable({
    userId: v.id('users'),
    title: v.string(),
    type: v.optional(v.union(
      v.literal('general'),
      v.literal('water'),
      v.literal('exercise'),
      v.literal('sleep')
    )),
    targetValue: v.optional(v.number()), // Target per hari (misal: 8 gelas, 30 menit)
    unit: v.optional(v.string()), // Satuan (misal: 'gelas', 'menit', 'jam')
    frequency: v.union(
      v.literal('daily'),
      v.literal('weekly'),
      v.literal('custom')
    ),
    color: v.string(),
    createdAt: v.number(),
    // Untuk custom: [0,1,2,3,4,5,6] = Minggu-Sabtu
    customDays: v.optional(v.array(v.number())),
  }).index('by_user', ['userId']),

  habit_progress: defineTable({
    habitId: v.id('habits'),
    userId: v.id('users'),
    date: v.string(),
    isDone: v.boolean(),
    value: v.optional(v.number()), // Progres numerik (misal: sudah minum 3 gelas)
  })
    .index('by_habit_and_date', ['habitId', 'date'])
    .index('by_user_and_date', ['userId', 'date']),

  moodLogs: defineTable({
    userId: v.id('users'),
    mood: v.number(),
    note: v.optional(v.string()),
    date: v.string(),
  }).index('by_user_and_date', ['userId', 'date']),

  ai_history: defineTable({
    userId: v.id('users'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
    timestamp: v.number(),
  }).index('by_user', ['userId']),

  ai_recommendations: defineTable({
    userId: v.id('users'),
    type: v.string(), // recommendation, analysis, suggestion
    content: v.string(),
    date: v.string(),
    createdAt: v.number(),
  }).index('by_user', ['userId']),

  sessions: defineTable({
    userId: v.id('users'),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_user', ['userId']),
});