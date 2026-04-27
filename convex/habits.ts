import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getHabits = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('habits')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
  },
});

export const getHabit = query({
  args: { habitId: v.id('habits') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.habitId);
  },
});

export const createHabit = mutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    type: v.union(
      v.literal('general'),
      v.literal('water'),
      v.literal('exercise'),
      v.literal('sleep')
    ),
    targetValue: v.optional(v.number()),
    unit: v.optional(v.string()),
    frequency: v.union(
      v.literal('daily'),
      v.literal('weekly'),
      v.literal('custom')
    ),
    color: v.string(),
    customDays: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const habitId = await ctx.db.insert('habits', {
      userId: args.userId,
      title: args.title,
      type: args.type,
      targetValue: args.targetValue,
      unit: args.unit,
      frequency: args.frequency,
      color: args.color,
      createdAt: Date.now(),
      customDays: args.frequency === 'custom' ? (args.customDays ?? []) : undefined,
    });
    return habitId;
  },
});

export const updateHabit = mutation({
  args: {
    habitId: v.id('habits'),
    title: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal('general'),
      v.literal('water'),
      v.literal('exercise'),
      v.literal('sleep')
    )),
    targetValue: v.optional(v.number()),
    unit: v.optional(v.string()),
    frequency: v.optional(
      v.union(
        v.literal('daily'),
        v.literal('weekly'),
        v.literal('custom')
      )
    ),
    color: v.optional(v.string()),
    customDays: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const { habitId, ...updates } = args;
    const cleanUpdates: Record<string, any> = {};
    if (updates.title !== undefined) cleanUpdates.title = updates.title;
    if (updates.type !== undefined) cleanUpdates.type = updates.type;
    if (updates.targetValue !== undefined) cleanUpdates.targetValue = updates.targetValue;
    if (updates.unit !== undefined) cleanUpdates.unit = updates.unit;
    if (updates.frequency !== undefined) cleanUpdates.frequency = updates.frequency;
    if (updates.color !== undefined) cleanUpdates.color = updates.color;
    if (updates.customDays !== undefined) cleanUpdates.customDays = updates.customDays;
    await ctx.db.patch(habitId, cleanUpdates);
    return habitId;
  },
});

export const deleteHabit = mutation({
  args: { habitId: v.id('habits') },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query('habit_progress')
      .withIndex('by_habit_and_date', (q) => q.eq('habitId', args.habitId))
      .collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
    await ctx.db.delete(args.habitId);
    return args.habitId;
  },
});

export const getAllStreaks = query({
  args: { userId: v.id('users'), today: v.string() },
  handler: async (ctx, args) => {
    const habits = await ctx.db
      .query('habits')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    if (habits.length === 0) return {};

    const allLogs = await ctx.db
      .query('habit_progress')
      .withIndex('by_user_and_date', (q) => q.eq('userId', args.userId))
      .filter((q) => q.eq(q.field('isDone'), true))
      .collect();

    // Use client-provided today for timezone correctness
    const today = args.today;
    const yest = new Date(
      Number(today.slice(0, 4)),
      Number(today.slice(5, 7)) - 1,
      Number(today.slice(8, 10))
    );
    yest.setDate(yest.getDate() - 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const yesterday = `${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`;

    const streakMap: Record<string, number> = {};

    for (const habit of habits) {
      const dates = [
        ...new Set(
          allLogs
            .filter((l) => l.habitId === habit._id)
            .map((l) => l.date)
        ),
      ].sort().reverse();

      if (dates.length === 0 || (dates[0] !== today && dates[0] !== yesterday)) {
        streakMap[habit._id] = 0;
        continue;
      }

      let streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const curr = new Date(dates[i - 1]);
        const prev = new Date(dates[i]);
        const diffDays = Math.floor(
          (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) streak++;
        else break;
      }
      streakMap[habit._id] = streak;
    }

    return streakMap;
  },
});