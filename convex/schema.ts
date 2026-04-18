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

  habitLogs: defineTable({
    habitId: v.id('habits'),
    userId: v.id('users'),
    date: v.string(),
    isDone: v.boolean(),
  })
    .index('by_habit_and_date', ['habitId', 'date'])
    .index('by_user_and_date', ['userId', 'date']),

  moodLogs: defineTable({
    userId: v.id('users'),
    mood: v.number(),
    note: v.optional(v.string()),
    date: v.string(),
  }).index('by_user_and_date', ['userId', 'date']),

  sessions: defineTable({
    userId: v.id('users'),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_user', ['userId']),
});